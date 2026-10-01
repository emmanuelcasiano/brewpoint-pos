import { uuidv7 } from '@brewpoint/shared';
import { sql, type Kysely } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDb } from '../core/db/client';
import { withTenant } from '../core/db/tenant-transaction';
import { Fixtures, insertStatement, literal } from './fixtures';
import { createMigrationDb, createSessionRoleDb } from './migrator';
import { PLATFORM_ROLE } from './roles';
import { requireTestDatabaseUrls, testDatabaseUrls } from './test-database';
import type { DB } from './types';

// Every one of the 70 tables is in exactly one of these lists; a test below fails when a new
// table is added without deciding which.

/** Rows belong to one shop. Row-level security limits them to the tenant on the transaction. */
const TENANT_TABLES = [
  'tenants',
  'branches',
  'users',
  'roles',
  'role_permissions',
  'user_assignments',
  'devices',
  'pairing_codes',
  'subscriptions',
  'invoices',
  'invoice_lines',
  'billing_customers',
  'payment_methods',
  'payment_events',
  'credit_notes',
  'register_sessions',
  'cash_counts',
  'cash_movements',
  'sales',
  'sale_lines',
  'sale_line_modifiers',
  'sale_discounts',
  'payments',
  'refunds',
  'refund_lines',
  'discount_rules',
  'tenant_payment_methods',
  'categories',
  'products',
  'modifier_groups',
  'modifiers',
  'product_modifier_groups',
  'recipe_lines',
  'modifier_recipe_lines',
  'inventory_items',
  'item_branch_settings',
  'batches',
  'stock_movements',
  'stock_counts',
  'stock_count_lines',
  'suppliers',
  'supplier_items',
  'purchase_orders',
  'purchase_order_lines',
  'goods_receipts',
  'goods_receipt_lines',
  'alerts',
  'alert_reads',
  'notification_settings',
  'notification_deliveries',
  'audit_log',
  'support_access_grants',
  'tenant_events',
  'data_requests',
  'tenant_feature_overrides',
  'device_error_reports',
  'announcement_reads',
  'support_tickets',
  'support_ticket_messages',
];

/** The same for every shop; shops may read them. */
const SHOP_READABLE_GLOBAL_TABLES = [
  'plans',
  'plan_prices',
  'permissions',
  'feature_flags',
  'app_releases',
  'announcements',
];

/** BrewPoint staff only; the app has no access at all. */
const PLATFORM_ONLY_TABLES = [
  'platform_users',
  'platform_roles',
  'platform_permissions',
  'platform_role_permissions',
  'platform_audit_log',
];

const RLS_VIOLATION = /^42501 new row violates row-level security policy/;
const PERMISSION_DENIED = /^42501 permission denied for table/;

const tenantA = uuidv7();
const tenantB = uuidv7();

describe.skipIf(!testDatabaseUrls())('row-level security', () => {
  let app: Kysely<DB>;
  let migrator: Kysely<DB>;
  let platform: Kysely<DB>;
  let fixtures: Fixtures;
  let appPrivileges: Map<string, { insert: boolean; update: boolean }>;
  let visibleToA: Map<string, string[]>;
  let visibleToB: Map<string, string[]>;
  let visibleWithNoTenant: Map<string, string[]>;
  let insertAsAWithBsId: Map<string, string>;
  let moveAsRowToB: Map<string, string>;

  beforeAll(async () => {
    const urls = requireTestDatabaseUrls();
    app = createDb(urls.app);
    migrator = createMigrationDb(urls.owner);
    platform = createSessionRoleDb(urls.owner, PLATFORM_ROLE);

    fixtures = await Fixtures.insert(migrator, [tenantA, tenantB]);
    appPrivileges = await privilegesOf(migrator, 'brewpoint_app', TENANT_TABLES);

    visibleToA = await withTenant(app, tenantA, (trx) => visibleTenants(trx, fixtures));
    visibleToB = await withTenant(app, tenantB, (trx) => visibleTenants(trx, fixtures));
    visibleWithNoTenant = await visibleTenants(app, fixtures);

    insertAsAWithBsId = await attemptAsTenant(
      app,
      tenantA,
      TENANT_TABLES.map((table) => [
        table,
        insertStatement(table, fixtures.newRow(table, tenantB)),
      ]),
    );
    moveAsRowToB = await attemptAsTenant(
      app,
      tenantA,
      TENANT_TABLES.map((table) => [
        table,
        moveToTenantStatement(fixtures, table, tenantA, tenantB),
      ]),
    );
  });

  afterAll(async () => {
    await Promise.all([app.destroy(), migrator.destroy(), platform.destroy()]);
  });

  describe('every table is covered', () => {
    it('puts each of the 70 tables in exactly one list', async () => {
      const tables = await sql<{ name: string }>`
        SELECT tablename AS name FROM pg_tables
        WHERE schemaname = 'public' AND tablename NOT LIKE 'kysely%'
      `.execute(migrator);
      const listed = [...TENANT_TABLES, ...SHOP_READABLE_GLOBAL_TABLES, ...PLATFORM_ONLY_TABLES];

      expect(new Set(listed).size).toBe(listed.length);
      expect(tables.rows.map((t) => t.name).sort()).toEqual([...listed].sort());
      expect(listed).toHaveLength(70);
    });

    it('forces row-level security with a tenant_isolation policy on every tenant table, and on no other', async () => {
      const result = await sql<{ name: string; forced: boolean; policies: string[] }>`
        SELECT c.relname AS name, c.relrowsecurity AND c.relforcerowsecurity AS forced,
          coalesce(array_agg(p.policyname::text) FILTER (WHERE p.policyname IS NOT NULL), '{}') AS policies
        FROM pg_class c
        LEFT JOIN pg_policies p ON p.schemaname = 'public' AND p.tablename = c.relname
        WHERE c.relnamespace = 'public'::regnamespace AND c.relkind = 'r' AND c.relname NOT LIKE 'kysely%'
        GROUP BY c.relname, c.relrowsecurity, c.relforcerowsecurity
      `.execute(migrator);

      for (const table of result.rows) {
        const isTenantTable = TENANT_TABLES.includes(table.name);
        expect({ table: table.name, forced: table.forced }).toEqual({
          table: table.name,
          forced: isTenantTable,
        });
        expect(table.policies.includes('tenant_isolation')).toBe(isTenantTable);
      }
    });
  });

  describe.each(TENANT_TABLES)('%s', (table) => {
    it("with tenant A set, shows only tenant A's rows", () => {
      expect(visibleToA.get(table)).toEqual([tenantA]);
      expect(visibleToB.get(table)).toEqual([tenantB]);
    });

    it('with no tenant set, shows no rows', () => {
      expect(visibleWithNoTenant.get(table) ?? []).toEqual([]);
    });

    it("with tenant A set, refuses a new row with tenant B's id", () => {
      const expected = appPrivileges.get(table)?.insert ? RLS_VIOLATION : PERMISSION_DENIED;
      expect(insertAsAWithBsId.get(table)).toMatch(expected);
    });

    it("with tenant A set, refuses to move tenant A's row to tenant B", () => {
      const expected = appPrivileges.get(table)?.update ? RLS_VIOLATION : PERMISSION_DENIED;
      expect(moveAsRowToB.get(table)).toMatch(expected);
    });
  });

  describe('the app role', () => {
    it('is not a superuser and cannot bypass row-level security', async () => {
      const result = await sql<{ rolsuper: boolean; rolbypassrls: boolean }>`
        SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user
      `.execute(app);

      expect(result.rows).toEqual([{ rolsuper: false, rolbypassrls: false }]);
    });

    it('is refused when it turns row security off and then reads a tenant table', async () => {
      // SET LOCAL, not SET: through the pooler a session setting would outlive this test.
      const attempt = app.transaction().execute(async (trx) => {
        await sql`SET LOCAL row_security = off`.execute(trx);
        await sql`SELECT * FROM sales`.execute(trx);
      });

      await expect(attempt).rejects.toThrow(
        'query would be affected by row-level security policy for table "sales"',
      );
    });

    it('cannot switch row-level security off on a table', async () => {
      await expect(sql`ALTER TABLE sales DISABLE ROW LEVEL SECURITY`.execute(app)).rejects.toThrow(
        'must be owner of table sales',
      );
    });

    it('cannot become the migrator', async () => {
      const attempt = app.transaction().execute(async (trx) => {
        await sql`SET LOCAL ROLE brewpoint_migrator`.execute(trx);
      });

      await expect(attempt).rejects.toThrow('permission denied to set role "brewpoint_migrator"');
    });

    it("cannot change or remove tenant B's rows while tenant A is set", async () => {
      const sale = fixtures.rowOf('sales', tenantB);
      const recipeLine = fixtures.rowOf('recipe_lines', tenantB);

      const [updated, deleted] = await withTenant(app, tenantA, async (trx) => [
        await sql`UPDATE sales SET status = 'voided' WHERE id = ${sale.id}`.execute(trx),
        await sql`DELETE FROM recipe_lines WHERE id = ${recipeLine.id}`.execute(trx),
      ]);

      expect(updated.numAffectedRows).toBe(0n);
      expect(deleted.numAffectedRows).toBe(0n);
    });

    it('cannot read staff tables', async () => {
      for (const table of PLATFORM_ONLY_TABLES) {
        await expect(sql`SELECT * FROM ${sql.table(table)}`.execute(app)).rejects.toThrow(
          `permission denied for table ${table}`,
        );
      }
    });

    it('can read the global tables shops need', async () => {
      for (const table of SHOP_READABLE_GLOBAL_TABLES) {
        const result = await sql`SELECT * FROM ${sql.table(table)}`.execute(app);
        expect(result.rows.length).toBeGreaterThan(0);
      }
    });

    it('cannot change or remove audit_log or stock_movements rows', async () => {
      for (const table of ['audit_log', 'stock_movements']) {
        await expect(
          withTenant(app, tenantA, (trx) =>
            sql`UPDATE ${sql.table(table)} SET synced_at = now()`.execute(trx),
          ),
        ).rejects.toThrow(`permission denied for table ${table}`);
        await expect(
          withTenant(app, tenantA, (trx) => sql`DELETE FROM ${sql.table(table)}`.execute(trx)),
        ).rejects.toThrow(`permission denied for table ${table}`);
      }
    });
  });

  describe('the platform role', () => {
    it('sees both shops in the tables BrewPoint runs, with no tenant set', async () => {
      for (const table of ['tenants', 'subscriptions', 'invoices', 'support_tickets']) {
        const column = table === 'tenants' ? 'id' : 'tenant_id';
        const result = await sql<{ tenant: string }>`
          SELECT DISTINCT ${sql.ref(column)}::text AS tenant FROM ${sql.table(table)}
          WHERE ${sql.ref(column)} IN (${tenantA}, ${tenantB})
        `.execute(platform);

        expect(result.rows.map((r) => r.tenant).sort()).toEqual([tenantA, tenantB].sort());
      }
    });

    it("cannot read a shop's business data", async () => {
      for (const table of ['sales', 'stock_movements', 'products', 'users']) {
        await expect(sql`SELECT * FROM ${sql.table(table)}`.execute(platform)).rejects.toThrow(
          `permission denied for table ${table}`,
        );
      }
    });
  });
});

/** For each tenant table, the distinct tenants whose rows this connection can see. */
async function visibleTenants(
  executor: Kysely<DB>,
  fixtures: Fixtures,
): Promise<Map<string, string[]>> {
  const selects = TENANT_TABLES.map(
    (table) =>
      sql`SELECT ${table}::text AS "table", ${sql.ref(fixtures.tenantColumn(table) ?? 'tenant_id')}::text AS tenant FROM ${sql.table(table)}`,
  );
  const result = await sql<{ table: string; tenants: string[] }>`
    SELECT "table", array_agg(DISTINCT tenant) AS tenants
    FROM (${sql.join(selects, sql` UNION ALL `)}) AS visible
    GROUP BY "table"
  `.execute(executor);
  return new Map(result.rows.map((row) => [row.table, row.tenants]));
}

/**
 * Runs each statement as the given tenant, in one round trip, and returns how each ended
 * ("succeeded" or "<SQLSTATE> <message>"). A temporary function runs each one in its own
 * subtransaction, and the whole transaction is rolled back, so nothing is kept.
 */
async function attemptAsTenant(
  db: Kysely<DB>,
  tenantId: string,
  statements: [table: string, statement: string][],
): Promise<Map<string, string>> {
  const rollback = new Error('roll back the attempts');
  let outcomes = new Map<string, string>();
  try {
    await withTenant(db, tenantId, async (trx) => {
      await sql`
        CREATE FUNCTION pg_temp.attempt(statement text) RETURNS text LANGUAGE plpgsql AS $$
        BEGIN
          EXECUTE statement;
          RETURN 'succeeded';
        EXCEPTION WHEN OTHERS THEN
          RETURN SQLSTATE || ' ' || SQLERRM;
        END $$
      `.execute(trx);
      const result = await sql<{ table: string; outcome: string }>`
        SELECT t AS "table", pg_temp.attempt(s) AS outcome
        FROM unnest(${statements.map(([table]) => table)}::text[], ${statements.map(([, s]) => s)}::text[]) AS x(t, s)
      `.execute(trx);
      outcomes = new Map(result.rows.map((row) => [row.table, row.outcome]));
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
  return outcomes;
}

function moveToTenantStatement(
  fixtures: Fixtures,
  table: string,
  from: string,
  to: string,
): string {
  const row = fixtures.rowOf(table, from);
  const tenantColumn = fixtures.tenantColumn(table) ?? 'tenant_id';
  const where = (fixtures.primaryKeys.get(table) ?? [])
    .map((column) => `${column} = ${literal(row[column])}`)
    .join(' AND ');
  return `UPDATE ${table} SET ${tenantColumn} = ${literal(to)} WHERE ${where}`;
}

async function privilegesOf(
  db: Kysely<DB>,
  role: string,
  tables: string[],
): Promise<Map<string, { insert: boolean; update: boolean }>> {
  const result = await sql<{ table: string; insert: boolean; update: boolean }>`
    SELECT t AS "table", has_table_privilege(${role}::name, t, 'INSERT') AS "insert",
      has_table_privilege(${role}::name, t, 'UPDATE') AS "update"
    FROM unnest(${tables}::text[]) AS t
  `.execute(db);
  return new Map(result.rows.map(({ table, insert, update }) => [table, { insert, update }]));
}
