import { randomBytes } from 'node:crypto';
import { uuidv7 } from '@brewpoint/shared';
import { hashSecret } from '../../core/auth/password';
import { encryptTotpSecret } from '../../core/auth/totp';
import { createDb, createPlatformDb } from '../../core/db/client';
import { withTenant } from '../../core/db/tenant-transaction';
import { isAppError } from '../../core/errors';
import { LogMailer } from '../../core/mail/mailer';
import type { TestDatabaseUrls } from '../../db/test-database';
import type { AuthDeps } from './deps';

// Test-only. Each test file builds its own shop and staff, with fresh ids and emails, so it
// depends neither on the seed nor on other test files sharing the database.

export const PASSWORD = 'correct horse battery';

/** The AppError a call fails with; fails the test if it succeeds or throws anything else. */
export async function errorOf(
  promise: Promise<unknown>,
): Promise<{ code: string; message: string; status: number; details: Record<string, unknown> }> {
  try {
    await promise;
  } catch (error) {
    if (isAppError(error)) {
      return {
        code: error.code,
        message: error.message,
        status: error.status,
        details: error.details,
      };
    }
    throw error;
  }
  throw new Error('Expected the call to fail, but it succeeded.');
}
export const DEMO_DEVICE_KEY = 'demo-device-key-for-tests';

export interface TestClock {
  now: () => Date;
  advance: (ms: number) => void;
  set: (at: Date) => void;
}

export function testClock(start = new Date('2026-10-03T07:00:00Z')): TestClock {
  let current = start;
  return {
    now: () => current,
    advance: (ms) => {
      current = new Date(current.getTime() + ms);
    },
    set: (at) => {
      current = at;
    },
  };
}

export interface TestDeps extends AuthDeps {
  mailer: LogMailer;
  close: () => Promise<void>;
}

export function testDeps(urls: TestDatabaseUrls, clock: TestClock): TestDeps {
  const db = createDb(urls.app);
  const platformDb = createPlatformDb(urls.platform);
  return {
    db,
    platformDb,
    mailer: new LogMailer(),
    config: {
      appEnv: 'local',
      backofficeUrl: 'http://127.0.0.1:5173',
      totpKey: randomBytes(32),
      demoDeviceKey: DEMO_DEVICE_KEY,
    },
    now: clock.now,
    close: async () => {
      await Promise.all([db.destroy(), platformDb.destroy()]);
    },
  };
}

export interface TestPerson {
  id: string;
  name: string;
  email: string;
  pin: string;
}

export interface TestShop {
  tenantId: string;
  mainBranchId: string;
  otherBranchId: string;
  device: { deviceId: string; tenantId: string; branchId: string; name: string };
  /** Owner of every branch, with a password and PIN 1111. */
  owner: TestPerson;
  /** Cashier at the main branch, PIN 1234, no password. */
  cashier: TestPerson;
  /** Cashier at the other branch only, PIN 4321. */
  elsewhere: TestPerson;
  /** Deactivated, at the main branch, with a password and PIN 9999. */
  former: TestPerson;
}

function person(name: string, pin: string): TestPerson {
  const id = uuidv7();
  return { id, name, email: `${name.split(' ')[0]?.toLowerCase()}-${id}@test.brewpoint`, pin };
}

export async function createTestShop(deps: AuthDeps): Promise<TestShop> {
  const tenantId = uuidv7();
  const mainBranchId = uuidv7();
  const otherBranchId = uuidv7();
  const deviceId = uuidv7();
  const ownerRole = uuidv7();
  const cashierRole = uuidv7();
  const shop: TestShop = {
    tenantId,
    mainBranchId,
    otherBranchId,
    device: { deviceId, tenantId, branchId: mainBranchId, name: 'T1' },
    owner: person('Carla Owner', '1111'),
    cashier: person('Ana Cruz', '1234'),
    elsewhere: person('Ben Other', '4321'),
    former: person('Dina Former', '9999'),
  };
  const passwordHash = await hashSecret(PASSWORD);
  const people = [
    { p: shop.owner, status: 'active', role: ownerRole, branch: null, withPassword: true },
    {
      p: shop.cashier,
      status: 'active',
      role: cashierRole,
      branch: mainBranchId,
      withPassword: false,
    },
    {
      p: shop.elsewhere,
      status: 'active',
      role: cashierRole,
      branch: otherBranchId,
      withPassword: false,
    },
    {
      p: shop.former,
      status: 'deactivated',
      role: cashierRole,
      branch: mainBranchId,
      withPassword: true,
    },
  ].map((entry) => ({ ...entry, password: entry.withPassword ? passwordHash : null }));
  const pinHashes = await Promise.all(people.map(({ p }) => hashSecret(p.pin)));

  await withTenant(deps.db, tenantId, async (trx) => {
    await trx
      .insertInto('tenants')
      .values({
        id: tenantId,
        name: 'Test Kape',
        timezone: 'Asia/Manila',
        accent_hex: '#E2A13B',
        status: 'trial',
      })
      .execute();
    await trx
      .insertInto('branches')
      .values([
        {
          id: mainBranchId,
          tenant_id: tenantId,
          name: 'Main branch',
          address: 'Davao',
          is_active: true,
        },
        {
          id: otherBranchId,
          tenant_id: tenantId,
          name: 'Second branch',
          address: 'Davao',
          is_active: true,
        },
      ])
      .execute();
    await trx
      .insertInto('devices')
      .values({
        id: deviceId,
        tenant_id: tenantId,
        branch_id: mainBranchId,
        name: 'T1',
        model: 'iPad',
        app_version: '0.1.0',
        license_expires_at: '2027-10-02T00:00:00+08:00',
      })
      .execute();
    await trx
      .insertInto('roles')
      .values([
        {
          id: ownerRole,
          tenant_id: tenantId,
          name: 'Owner',
          summary: 'Runs the shop.',
          is_locked: true,
        },
        {
          id: cashierRole,
          tenant_id: tenantId,
          name: 'Cashier',
          summary: 'Sells.',
          is_locked: false,
        },
      ])
      .execute();

    await trx
      .insertInto('users')
      .values(
        people.map(({ p, password, status }, i) => ({
          id: p.id,
          tenant_id: tenantId,
          name: p.name,
          email: p.email,
          password_hash: password,
          pin_hash: pinHashes[i] ?? null,
          status,
        })),
      )
      .execute();
    await trx
      .insertInto('user_assignments')
      .values(
        people.map(({ p, role, branch }) => ({
          tenant_id: tenantId,
          user_id: p.id,
          branch_id: branch,
          role_id: role,
        })),
      )
      .execute();
  });
  return shop;
}

export async function setUserStatus(
  deps: AuthDeps,
  shop: TestShop,
  userId: string,
  status: string,
): Promise<void> {
  await withTenant(deps.db, shop.tenantId, (trx) =>
    trx.updateTable('users').set({ status }).where('id', '=', userId).execute(),
  );
}

/** The sentences written to the shop's audit log for this user, oldest first. */
export async function auditSentences(
  deps: AuthDeps,
  tenantId: string,
  userId: string,
): Promise<{ sentence: string; is_sensitive: boolean; device_id: string | null }[]> {
  return withTenant(deps.db, tenantId, (trx) =>
    trx
      .selectFrom('audit_log')
      .select(['sentence', 'is_sensitive', 'device_id'])
      .where('entity_id', '=', userId)
      .orderBy('happened_at')
      .orderBy('id')
      .execute(),
  );
}

export interface TestStaff {
  id: string;
  email: string;
  /** The two-step secret, when the account was made with two-step on. */
  totpSecret: string | null;
}

export async function createTestStaff(
  deps: AuthDeps,
  options: { totpSecret?: string; status?: string } = {},
): Promise<TestStaff> {
  const roleId = uuidv7();
  const id = uuidv7();
  const email = `staff-${id}@test.brewpoint`;
  await deps.platformDb
    .insertInto('platform_roles')
    .values({ id: roleId, name: `Superadmin ${roleId}`, summary: 'Test role.' })
    .execute();
  await deps.platformDb
    .insertInto('platform_users')
    .values({
      id,
      name: 'Maria Staff',
      email,
      password_hash: await hashSecret(PASSWORD),
      totp_secret_enc: options.totpSecret
        ? encryptTotpSecret(options.totpSecret, deps.config.totpKey)
        : null,
      role_id: roleId,
      status: options.status ?? 'active',
    })
    .execute();
  return { id, email, totpSecret: options.totpSecret ?? null };
}

export async function staffAuditSentences(deps: AuthDeps, staffId: string): Promise<string[]> {
  const rows = await deps.platformDb
    .selectFrom('platform_audit_log')
    .select('sentence')
    .where('staff_id', '=', staffId)
    .orderBy('happened_at')
    .orderBy('id')
    .execute();
  return rows.map((row) => row.sentence);
}
