import { PERMISSIONS } from '@brewpoint/shared';
import type { Kysely } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDb } from '../../core/db/client';
import { withTenant } from '../../core/db/tenant-transaction';
import { createMigrationDb } from '../migrator';
import { requireTestDatabaseUrls, testDatabaseUrls } from '../test-database';
import type { DB } from '../types';
import { verifySecret } from '../../core/auth/password';
import { DEMO_PASSWORD, DEMO_SHOPS, DEMO_STAFF, seedDemo, seedDemoStaff } from './demo';
import { PLAN_IDS, seedReference, SUPERADMIN_ROLE_ID } from './reference';

async function seed(db: Kysely<DB>): Promise<void> {
  await seedReference(db);
  await seedDemo(db);
  await seedDemoStaff(db);
}

const KAPE_DAVAO = DEMO_SHOPS[0]!;

/** Everything the seed writes, read back in a fixed order. */
async function snapshot(db: Kysely<DB>): Promise<unknown> {
  const reference = {
    permissions: await db.selectFrom('permissions').selectAll().orderBy('code').execute(),
    plans: await db.selectFrom('plans').selectAll().orderBy('id').execute(),
    planPrices: await db.selectFrom('plan_prices').selectAll().orderBy('id').execute(),
    staff: await db
      .selectFrom('platform_users')
      .selectAll()
      .where('id', '=', DEMO_STAFF.id)
      .execute(),
  };
  const shops = [];
  for (const shop of DEMO_SHOPS) {
    shops.push(
      await withTenant(db, shop.tenant.id, async (trx) => ({
        tenants: await trx.selectFrom('tenants').selectAll().execute(),
        branches: await trx.selectFrom('branches').selectAll().orderBy('id').execute(),
        users: await trx.selectFrom('users').selectAll().orderBy('id').execute(),
        roles: await trx.selectFrom('roles').selectAll().orderBy('id').execute(),
        assignments: await trx.selectFrom('user_assignments').selectAll().orderBy('id').execute(),
        devices: await trx.selectFrom('devices').selectAll().orderBy('id').execute(),
      })),
    );
  }
  return { reference, shops };
}

describe.skipIf(!testDatabaseUrls())('seed', () => {
  let migrator: Kysely<DB>;
  let app: Kysely<DB>;

  beforeAll(() => {
    const urls = requireTestDatabaseUrls();
    migrator = createMigrationDb(urls.owner);
    app = createDb(urls.app);
  });

  afterAll(async () => {
    await Promise.all([migrator.destroy(), app.destroy()]);
  });

  it('loads the permissions, the plans and the two demo shops', async () => {
    await seed(migrator);

    // Other test files share this database, so look only at the rows the seed owns.
    const permissions = await app
      .selectFrom('permissions')
      .select(['code', 'group_name as group', 'label'])
      .where(
        'code',
        'in',
        PERMISSIONS.map((p) => p.code),
      )
      .orderBy('code')
      .execute();
    expect(permissions).toEqual([...PERMISSIONS].sort((a, b) => (a.code < b.code ? -1 : 1)));

    const plans = await app
      .selectFrom('plans')
      .select(['name', 'price_monthly'])
      .where('id', 'in', Object.values(PLAN_IDS))
      .orderBy('price_monthly')
      .execute();
    expect(plans).toEqual([
      { name: 'Starter', price_monthly: 69_900 },
      { name: 'Growth', price_monthly: 149_900 },
      { name: 'Multi-branch', price_monthly: 349_900 },
    ]);

    for (const shop of DEMO_SHOPS) {
      const people = await withTenant(app, shop.tenant.id, (trx) =>
        trx.selectFrom('users').select(['name', 'tenant_id']).orderBy('id').execute(),
      );
      expect(people).toEqual(
        [shop.owner, ...shop.cashiers].map((person) => ({
          name: person.name,
          tenant_id: shop.tenant.id,
        })),
      );
    }
  });

  it('gives the owners a password and PIN, and Ana PIN 1234 only', async () => {
    const users = await withTenant(app, KAPE_DAVAO.tenant.id, (trx) =>
      trx.selectFrom('users').select(['email', 'password_hash', 'pin_hash']).execute(),
    );
    const carlo = users.find((u) => u.email === 'carlo@kapedavao.test');
    const ana = users.find((u) => u.email === 'ana@kapedavao.test');

    expect(await verifySecret(carlo?.password_hash ?? null, DEMO_PASSWORD)).toBe(true);
    expect(await verifySecret(carlo?.pin_hash ?? null, '1111')).toBe(true);
    expect(ana?.password_hash).toBeNull();
    expect(await verifySecret(ana?.pin_hash ?? null, '1234')).toBe(true);
  });

  it('makes the owner an Owner of every branch and Ana a Cashier at Main branch', async () => {
    const assignments = await withTenant(app, KAPE_DAVAO.tenant.id, (trx) =>
      trx
        .selectFrom('user_assignments')
        .innerJoin('users', 'users.id', 'user_assignments.user_id')
        .innerJoin('roles', 'roles.id', 'user_assignments.role_id')
        .select(['users.name', 'roles.name as role', 'user_assignments.branch_id'])
        .orderBy('users.id')
        .execute(),
    );

    expect(assignments).toEqual([
      { name: 'Carlo Reyes', role: 'Owner', branch_id: null },
      { name: 'Ana Cruz', role: 'Cashier', branch_id: KAPE_DAVAO.branch.id },
    ]);
  });

  it('adds the Superadmin staff role and the dev staff account', async () => {
    const staff = await migrator
      .selectFrom('platform_users')
      .innerJoin('platform_roles', 'platform_roles.id', 'platform_users.role_id')
      .select([
        'platform_users.email',
        'platform_users.password_hash',
        'platform_users.totp_secret_enc',
        'platform_roles.id as role_id',
        'platform_roles.name',
      ])
      .where('platform_users.id', '=', DEMO_STAFF.id)
      .executeTakeFirstOrThrow();

    expect(staff).toMatchObject({
      email: DEMO_STAFF.email,
      role_id: SUPERADMIN_ROLE_ID,
      name: 'Superadmin',
      totp_secret_enc: null,
    });
    expect(await verifySecret(staff.password_hash, DEMO_PASSWORD)).toBe(true);
  });

  it('gives a user seeded before sign-in existed a password and PIN, once', async () => {
    const carlo = KAPE_DAVAO.owner;
    await withTenant(migrator, KAPE_DAVAO.tenant.id, (trx) =>
      trx
        .updateTable('users')
        .set({ password_hash: null, pin_hash: null })
        .where('id', '=', carlo.id)
        .execute(),
    );

    await seed(migrator);

    const after = await withTenant(app, KAPE_DAVAO.tenant.id, (trx) =>
      trx
        .selectFrom('users')
        .select(['password_hash', 'pin_hash'])
        .where('id', '=', carlo.id)
        .executeTakeFirstOrThrow(),
    );
    expect(await verifySecret(after.password_hash, DEMO_PASSWORD)).toBe(true);
    expect(await verifySecret(after.pin_hash, '1111')).toBe(true);
  });

  it('changes nothing when it runs a second time', async () => {
    await seed(migrator);
    const before = await snapshot(migrator);

    await seed(migrator);

    expect(await snapshot(migrator)).toEqual(before);
  });
});
