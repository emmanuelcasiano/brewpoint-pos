import { uuidv7 } from '@brewpoint/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resolveDemoDevice } from '../../core/auth/device';
import { verifySecret } from '../../core/auth/password';
import { resolveShopSession } from '../../core/auth/sessions';
import { withTenant } from '../../core/db/tenant-transaction';
import { createMigrationDb } from '../../db/migrator';
import { DEMO_SHOPS, seedDemo } from '../../db/seed/demo';
import { seedReference } from '../../db/seed/reference';
import { requireTestDatabaseUrls, testDatabaseUrls } from '../../db/test-database';
import { listPinUsers, recordDeviceEvents, signInWithPin, signOutPos } from './pos.service';
import {
  auditSentences,
  createTestShop,
  DEMO_DEVICE_KEY,
  errorOf,
  setUserStatus,
  testClock,
  testDeps,
  type TestDeps,
  type TestShop,
} from './test-support';

const IP = '203.0.113.8';

describe.skipIf(!testDatabaseUrls())('POS PIN sign-in', () => {
  const clock = testClock();
  let deps: TestDeps;
  let shop: TestShop;

  beforeAll(() => {
    deps = testDeps(requireTestDatabaseUrls(), clock);
  });

  beforeEach(async () => {
    clock.set(new Date('2026-10-03T07:00:00Z'));
    shop = await createTestShop(deps);
  });

  afterAll(async () => {
    await deps.close();
  });

  const pinSignIn = (userId: string, pin: string, device = shop.device) =>
    signInWithPin(deps, { device, userId, pin, ipAddress: IP });

  async function addDevice(name: string) {
    const deviceId = uuidv7();
    await withTenant(deps.db, shop.tenantId, (trx) =>
      trx
        .insertInto('devices')
        .values({
          id: deviceId,
          tenant_id: shop.tenantId,
          branch_id: shop.mainBranchId,
          name,
          model: 'iPad',
          app_version: '0.1.0',
          license_expires_at: '2027-10-02T00:00:00+08:00',
        })
        .execute(),
    );
    return { deviceId, tenantId: shop.tenantId, branchId: shop.mainBranchId, name };
  }

  it("lists the branch's active people with a PIN, with their role here", async () => {
    const users = await listPinUsers(deps, shop.device);

    expect(users.map(({ name, roleName }) => ({ name, roleName }))).toEqual([
      { name: 'Ana Cruz', roleName: 'Cashier' },
      { name: 'Carla Owner', roleName: 'Owner' },
    ]);
    const ana = users.find((user) => user.id === shop.cashier.id);
    expect(ana?.pinHash).toMatch(/^\$argon2id\$/);
    expect(await verifySecret(ana?.pinHash ?? null, '1234')).toBe(true);
  });

  it('drops a deactivated user from the list, so the device loses them at the next refresh', async () => {
    await setUserStatus(deps, shop, shop.cashier.id, 'deactivated');

    const users = await listPinUsers(deps, shop.device);

    expect(users.map((user) => user.name)).toEqual(['Carla Owner']);
  });

  it('signs a cashier in with their PIN on this register', async () => {
    const result = await pinSignIn(shop.cashier.id, '1234');

    expect(result.identity).toMatchObject({
      surface: 'pos',
      userId: shop.cashier.id,
      tenantId: shop.tenantId,
      deviceId: shop.device.deviceId,
      branchIds: [shop.mainBranchId],
      roles: [{ branchId: shop.mainBranchId, roleName: 'Cashier' }],
    });
    expect(await auditSentences(deps, shop.tenantId, shop.cashier.id)).toEqual([
      { sentence: 'Signed in on T1', is_sensitive: false, device_id: shop.device.deviceId },
    ]);
  });

  it('counts down wrong PINs, then locks the user on this device for 5 minutes', async () => {
    expect((await errorOf(pinSignIn(shop.cashier.id, '0000'))).message).toBe(
      'Wrong PIN. 4 tries left on this device.',
    );
    expect(await errorOf(pinSignIn(shop.cashier.id, '0000'))).toMatchObject({
      code: 'wrong_pin',
      message: 'Wrong PIN. 3 tries left on this device.',
      details: { triesLeft: 3 },
    });
    await errorOf(pinSignIn(shop.cashier.id, '0000'));
    await errorOf(pinSignIn(shop.cashier.id, '0000'));
    const fifth = await errorOf(pinSignIn(shop.cashier.id, '0000'));

    expect(fifth).toMatchObject({
      code: 'pin_locked',
      status: 423,
      message: 'Wrong PIN 5 times. Ana Cruz is locked on this device until 3:05 PM.',
      details: { lockedUntil: '2026-10-03T07:05:00.000Z' },
    });
    expect((await errorOf(pinSignIn(shop.cashier.id, '1234'))).code).toBe('pin_locked');
    expect(await auditSentences(deps, shop.tenantId, shop.cashier.id)).toEqual([
      {
        sentence: 'Wrong PIN 5 times on T1, locked for 5 minutes',
        is_sensitive: true,
        device_id: shop.device.deviceId,
      },
    ]);

    const t2 = await addDevice('T2');
    await expect(pinSignIn(shop.cashier.id, '1234', t2)).resolves.toMatchObject({
      identity: { deviceId: t2.deviceId },
    });

    clock.advance(5 * 60_000);
    await expect(pinSignIn(shop.cashier.id, '1234')).resolves.toMatchObject({
      identity: { userId: shop.cashier.id },
    });
  });

  it('starts the count again after a correct PIN', async () => {
    await errorOf(pinSignIn(shop.cashier.id, '0000'));
    await errorOf(pinSignIn(shop.cashier.id, '0000'));
    await pinSignIn(shop.cashier.id, '1234');

    expect((await errorOf(pinSignIn(shop.cashier.id, '0000'))).message).toBe(
      'Wrong PIN. 4 tries left on this device.',
    );
  });

  it('refuses people who do not work at this branch, and deactivated people', async () => {
    for (const person of [shop.elsewhere, shop.former]) {
      expect(await errorOf(pinSignIn(person.id, person.pin))).toMatchObject({
        code: 'pin_user_unavailable',
        status: 403,
      });
    }
  });

  it('keeps a POS session open with no idle limit until sign-out', async () => {
    const { token } = await pinSignIn(shop.cashier.id, '1234');

    clock.advance(30 * 60 * 60_000);
    expect((await resolveShopSession(deps.db, token, 'pos', clock.now())).ok).toBe(true);
    expect((await resolveShopSession(deps.db, token, 'backoffice', clock.now())).ok).toBe(false);

    await signOutPos(deps, token);

    expect((await resolveShopSession(deps.db, token, 'pos', clock.now())).ok).toBe(false);
    const sentences = (await auditSentences(deps, shop.tenantId, shop.cashier.id)).map(
      (r) => r.sentence,
    );
    expect(sentences).toEqual(['Signed in on T1', 'Signed out on T1']);
  });

  it("records the register's own events once each, with the time they happened", async () => {
    const happenedAt = new Date('2026-10-03T06:58:00Z');
    const events = [
      { id: uuidv7(), type: 'signed_in' as const, userId: shop.cashier.id, happenedAt },
      { id: uuidv7(), type: 'signed_out' as const, userId: shop.cashier.id, happenedAt },
      { id: uuidv7(), type: 'signed_in' as const, userId: uuidv7(), happenedAt },
    ];

    const first = await recordDeviceEvents(deps, shop.device, events);
    const again = await recordDeviceEvents(deps, shop.device, events);

    expect(first).toEqual({ recorded: 2, skipped: [events[2]?.id] });
    expect(again).toEqual({ recorded: 0, skipped: [events[2]?.id] });
    const rows = await withTenant(deps.db, shop.tenantId, (trx) =>
      trx
        .selectFrom('audit_log')
        .select(['sentence', 'client_created_at', 'synced_at', 'device_id'])
        .where('entity_id', '=', shop.cashier.id)
        .orderBy('id')
        .execute(),
    );
    expect(rows).toEqual([
      {
        sentence: 'Signed in on T1',
        client_created_at: happenedAt,
        synced_at: clock.now(),
        device_id: shop.device.deviceId,
      },
      {
        sentence: 'Signed out on T1',
        client_created_at: happenedAt,
        synced_at: clock.now(),
        device_id: shop.device.deviceId,
      },
    ]);
  });

  it('locks the user on the server too when the register reports a PIN lock', async () => {
    const happenedAt = new Date('2026-10-03T06:58:00Z');

    await recordDeviceEvents(deps, shop.device, [
      { id: uuidv7(), type: 'pin_locked', userId: shop.cashier.id, happenedAt },
    ]);

    expect(await errorOf(pinSignIn(shop.cashier.id, '1234'))).toMatchObject({
      code: 'pin_locked',
      message: 'Wrong PIN 5 times. Ana Cruz is locked on this device until 3:03 PM.',
    });
    expect(await auditSentences(deps, shop.tenantId, shop.cashier.id)).toEqual([
      {
        sentence: 'Wrong PIN 5 times on T1, locked for 5 minutes',
        is_sensitive: true,
        device_id: shop.device.deviceId,
      },
    ]);
  });
});

describe.skipIf(!testDatabaseUrls())('the demo device check (until Module 06)', () => {
  const clock = testClock();
  let deps: TestDeps;
  const demo = DEMO_SHOPS[0]!;

  beforeAll(async () => {
    const urls = requireTestDatabaseUrls();
    deps = testDeps(urls, clock);
    const migrator = createMigrationDb(urls.owner);
    try {
      await seedReference(migrator);
      await seedDemo(migrator);
    } finally {
      await migrator.destroy();
    }
  });

  afterAll(async () => {
    await deps.close();
  });

  it('knows the seeded register when the server runs locally and the key matches', async () => {
    const device = await resolveDemoDevice(deps.db, deps.config, demo.device.id, DEMO_DEVICE_KEY);

    expect(device).toEqual({
      deviceId: demo.device.id,
      tenantId: demo.tenant.id,
      branchId: demo.branch.id,
      name: 'T1',
    });
  });

  it('refuses a wrong key, an unknown device, and any request outside local', async () => {
    const config = deps.config;

    expect(
      await resolveDemoDevice(deps.db, config, demo.device.id, 'wrong-key-wrong-key'),
    ).toBeNull();
    expect(await resolveDemoDevice(deps.db, config, uuidv7(), DEMO_DEVICE_KEY)).toBeNull();
    for (const appEnv of ['staging', 'production'] as const) {
      expect(
        await resolveDemoDevice(deps.db, { ...config, appEnv }, demo.device.id, DEMO_DEVICE_KEY),
      ).toBeNull();
    }
    expect(
      await resolveDemoDevice(deps.db, { appEnv: 'local' }, demo.device.id, DEMO_DEVICE_KEY),
    ).toBeNull();
  });
});
