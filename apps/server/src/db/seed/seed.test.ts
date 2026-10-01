import { PERMISSIONS } from '@brewpoint/shared';
import type { Kysely } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDb } from '../../core/db/client';
import { withTenant } from '../../core/db/tenant-transaction';
import { createMigrationDb } from '../migrator';
import { requireTestDatabaseUrls, testDatabaseUrls } from '../test-database';
import type { DB } from '../types';
import { DEMO_SHOPS, seedDemo } from './demo';
import { PLAN_IDS, seedReference } from './reference';

async function seed(db: Kysely<DB>): Promise<void> {
  await seedReference(db);
  await seedDemo(db);
}

/** Everything the seed writes, read back in a fixed order. */
async function snapshot(db: Kysely<DB>): Promise<unknown> {
  const reference = {
    permissions: await db.selectFrom('permissions').selectAll().orderBy('code').execute(),
    plans: await db.selectFrom('plans').selectAll().orderBy('id').execute(),
    planPrices: await db.selectFrom('plan_prices').selectAll().orderBy('id').execute(),
  };
  const shops = [];
  for (const shop of DEMO_SHOPS) {
    shops.push(
      await withTenant(db, shop.tenant.id, async (trx) => ({
        tenants: await trx.selectFrom('tenants').selectAll().execute(),
        branches: await trx.selectFrom('branches').selectAll().orderBy('id').execute(),
        users: await trx.selectFrom('users').selectAll().orderBy('id').execute(),
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
      const owners = await withTenant(app, shop.tenant.id, (trx) =>
        trx.selectFrom('users').select(['name', 'tenant_id']).execute(),
      );
      expect(owners).toEqual([{ name: shop.owner.name, tenant_id: shop.tenant.id }]);
    }
  });

  it('changes nothing when it runs a second time', async () => {
    await seed(migrator);
    const before = await snapshot(migrator);

    await seed(migrator);

    expect(await snapshot(migrator)).toEqual(before);
  });
});
