import { uuidv7 } from '@brewpoint/shared';
import { sql, type Kysely } from 'kysely';
import { withTenant } from '../core/db/tenant-transaction';
import type { DB } from './types';

// Test data built from the live catalog: one valid row per table per tenant (and one row per
// global table), so the row-level security test covers every table without a hand-written
// fixture each. Test-only; nothing in the server imports it.

export type Row = Record<string, unknown>;

interface Column {
  table: string;
  column: string;
  type: string;
  nullable: boolean;
  hasDefault: boolean;
}

interface ForeignKey {
  table: string;
  column: string;
  refTable: string;
  refColumn: string;
}

const GLOBAL = 'global';

export class Fixtures {
  private readonly rows = new Map<string, Map<string, Row>>();

  private constructor(
    private readonly columns: Map<string, Column[]>,
    private readonly foreignKeys: Map<string, ForeignKey>,
    readonly primaryKeys: Map<string, string[]>,
    readonly tableOrder: string[],
  ) {}

  /** Reads the catalog and inserts one row per table for each tenant, as the migrator. */
  static async insert(db: Kysely<DB>, tenantIds: readonly string[]): Promise<Fixtures> {
    const fixtures = await Fixtures.fromCatalog(db);
    const globalTables = fixtures.tableOrder.filter((table) => !fixtures.isTenantScoped(table));
    const tenantTables = fixtures.tableOrder.filter((table) => fixtures.isTenantScoped(table));

    const globalRows = globalTables.map((table) => fixtures.addRow(table, GLOBAL));
    await sql.raw(insertScript(globalTables, globalRows)).execute(db);

    for (const tenantId of tenantIds) {
      const tenantRows = tenantTables.map((table) => fixtures.addRow(table, tenantId));
      await withTenant(db, tenantId, (trx) =>
        sql.raw(insertScript(tenantTables, tenantRows)).execute(trx),
      );
    }
    return fixtures;
  }

  private static async fromCatalog(db: Kysely<DB>): Promise<Fixtures> {
    const columnRows = await sql<Column>`
      SELECT c.table_name AS "table", c.column_name AS "column", c.udt_name AS "type",
        c.is_nullable = 'YES' AS "nullable", c.column_default IS NOT NULL AS "hasDefault"
      FROM information_schema.columns c
      JOIN information_schema.tables t USING (table_schema, table_name)
      WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE'
        AND c.table_name NOT LIKE 'kysely%'
      ORDER BY c.table_name, c.ordinal_position
    `.execute(db);
    const keyRows = await sql<ForeignKey & { kind: 'f' | 'p' }>`
      SELECT con.contype AS "kind", cl.relname AS "table", a.attname AS "column",
        rcl.relname AS "refTable", ra.attname AS "refColumn"
      FROM pg_constraint con
      JOIN pg_class cl ON cl.oid = con.conrelid
      JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = ANY (con.conkey)
      LEFT JOIN pg_class rcl ON rcl.oid = con.confrelid
      LEFT JOIN pg_attribute ra ON ra.attrelid = con.confrelid AND ra.attnum = con.confkey[1]
      WHERE con.connamespace = 'public'::regnamespace AND con.contype IN ('f', 'p')
        AND cl.relname NOT LIKE 'kysely%'
    `.execute(db);

    const columns = new Map<string, Column[]>();
    for (const column of columnRows.rows) {
      columns.set(column.table, [...(columns.get(column.table) ?? []), column]);
    }
    const foreignKeys = new Map<string, ForeignKey>();
    const primaryKeys = new Map<string, string[]>();
    for (const key of keyRows.rows) {
      if (key.kind === 'f') foreignKeys.set(`${key.table}.${key.column}`, key);
      else primaryKeys.set(key.table, [...(primaryKeys.get(key.table) ?? []), key.column]);
    }
    return new Fixtures(columns, foreignKeys, primaryKeys, insertOrder(columns, foreignKeys));
  }

  isTenantScoped(table: string): boolean {
    return table === 'tenants' || this.tenantColumn(table) !== undefined;
  }

  /** The column that says which tenant a row belongs to: id for tenants, tenant_id elsewhere. */
  tenantColumn(table: string): string | undefined {
    if (table === 'tenants') return 'id';
    return this.columns.get(table)?.some((c) => c.column === 'tenant_id') ? 'tenant_id' : undefined;
  }

  /** The row inserted for this tenant (or the global row). */
  rowOf(table: string, tenantId: string): Row {
    const row = this.rows.get(table)?.get(this.isTenantScoped(table) ? tenantId : GLOBAL);
    if (!row) throw new Error(`No fixture row for ${table} and tenant ${tenantId}.`);
    return row;
  }

  /** A new valid row for this tenant that is not inserted: unique keys, parents of that tenant. */
  newRow(table: string, tenantId: string): Row {
    const row: Row = {};
    for (const column of this.columns.get(table) ?? []) {
      const value = this.valueFor(column, tenantId);
      if (value !== undefined) row[column.column] = value;
    }
    return row;
  }

  private addRow(table: string, scope: string): Row {
    const row = this.newRow(table, scope);
    const byScope = this.rows.get(table) ?? new Map<string, Row>();
    byScope.set(scope, row);
    this.rows.set(table, byScope);
    return row;
  }

  private valueFor(column: Column, tenantId: string): unknown {
    const { table, column: name } = column;
    if (name === this.tenantColumn(table)) return tenantId;

    const foreignKey = this.foreignKeys.get(`${table}.${name}`);
    if (foreignKey && !column.nullable) {
      return this.rowOf(foreignKey.refTable, tenantId)[foreignKey.refColumn];
    }
    // Client-supplied primary keys, as a device would send them.
    if (name === 'id' && column.type === 'uuid') return uuidv7();
    if (column.nullable || column.hasDefault) return undefined;
    return sampleValue(column);
  }
}

function sampleValue({ table, column, type }: Column): unknown {
  switch (type) {
    case 'uuid':
      return uuidv7();
    case 'text':
      return `${table}.${column}.${uuidv7().slice(-12)}`;
    case 'int4':
    case 'int8':
    case 'numeric':
      return 1;
    case 'bool':
      return true;
    case 'timestamptz':
      return '2026-10-02T09:00:00+08:00';
    case 'date':
      return '2026-10-02';
    case 'time':
      return '07:00';
    case 'jsonb':
      return '{}';
    case '_text':
    case '_uuid':
      return '{}';
    case 'inet':
      return '127.0.0.1';
    default:
      throw new Error(`The fixture builder has no sample value for ${table}.${column} (${type}).`);
  }
}

/** Parents before children, following the foreign keys the builder fills: NOT NULL ones and tenant_id. */
function insertOrder(
  columns: Map<string, Column[]>,
  foreignKeys: Map<string, ForeignKey>,
): string[] {
  const requiredParents = new Map<string, Set<string>>();
  for (const [table, tableColumns] of columns) {
    const parents = new Set<string>();
    for (const column of tableColumns) {
      const foreignKey = foreignKeys.get(`${table}.${column.column}`);
      const filled = !column.nullable || column.column === 'tenant_id';
      if (foreignKey && filled && foreignKey.refTable !== table) {
        parents.add(foreignKey.refTable);
      }
    }
    requiredParents.set(table, parents);
  }

  const order: string[] = [];
  const placed = new Set<string>();
  while (order.length < requiredParents.size) {
    const ready = [...requiredParents.keys()].filter(
      (table) =>
        !placed.has(table) && [...(requiredParents.get(table) ?? [])].every((p) => placed.has(p)),
    );
    if (ready.length === 0) throw new Error('The NOT NULL foreign keys form a cycle.');
    for (const table of ready.sort()) {
      order.push(table);
      placed.add(table);
    }
  }
  return order;
}

/** A SQL literal for a generated test value. Test data only, never user input. */
export function literal(value: unknown): string {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'string') return `'${value.replaceAll("'", "''")}'`;
  throw new Error(`Cannot write ${typeof value} as a SQL literal.`);
}

export function insertStatement(table: string, row: Row): string {
  const names = Object.keys(row);
  const values = names.map((name) => literal(row[name]));
  return `INSERT INTO ${table} (${names.join(', ')}) VALUES (${values.join(', ')})`;
}

function insertScript(tables: string[], rows: Row[]): string {
  return tables.map((table, i) => `${insertStatement(table, rows[i] ?? {})};`).join('\n');
}
