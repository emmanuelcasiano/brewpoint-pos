import { sql, type Kysely } from 'kysely';
import { NO_MIGRATIONS, type Migrator } from 'kysely/migration';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createMigrationDb, createMigrator } from './migrator';
import { requireTestDatabaseUrls, testDatabaseUrls } from './test-database';
import type { DB } from './types';

const MIGRATION_COUNT = 13;
const TABLE_COUNT = 74;

// The global setup has already migrated the test database from empty to the latest migration.
describe.skipIf(!testDatabaseUrls())('migrations', () => {
  let db: Kysely<DB>;
  let migrator: Migrator;

  beforeAll(() => {
    db = createMigrationDb(requireTestDatabaseUrls().owner);
    migrator = createMigrator(db);
  });

  afterAll(async () => {
    await db.destroy();
  });

  async function tableCount(): Promise<number> {
    const result = await sql<{ count: number }>`
      SELECT count(*)::int AS count FROM pg_tables
      WHERE schemaname = 'public' AND tablename NOT LIKE 'kysely%'
    `.execute(db);
    return result.rows[0]?.count ?? -1;
  }

  it('builds all 74 tables from empty', async () => {
    const migrations = await migrator.getMigrations();

    expect(migrations).toHaveLength(MIGRATION_COUNT);
    expect(migrations.every((migration) => migration.executedAt)).toBe(true);
    expect(await tableCount()).toBe(TABLE_COUNT);
  });

  it('never deletes rows through a foreign key: no ON DELETE CASCADE or SET NULL', async () => {
    const result = await sql<{ name: string }>`
      SELECT conname AS name FROM pg_constraint
      WHERE contype = 'f' AND connamespace = 'public'::regnamespace AND confdeltype <> 'a'
    `.execute(db);

    expect(result.rows).toEqual([]);
  });

  it('goes back one step and forward again', async () => {
    const down = await migrator.migrateDown();
    expect(down.error).toBeUndefined();
    expect(down.results?.map((r) => [r.migrationName, r.direction, r.status])).toEqual([
      ['0013-auth', 'Down', 'Success'],
    ]);

    const up = await migrator.migrateToLatest();
    expect(up.error).toBeUndefined();
    expect(up.results?.map((r) => [r.migrationName, r.direction, r.status])).toEqual([
      ['0013-auth', 'Up', 'Success'],
    ]);
  });

  it('goes all the way back to empty and up again, so every down step works', async () => {
    const down = await migrator.migrateTo(NO_MIGRATIONS);
    expect(down.error).toBeUndefined();
    expect(down.results).toHaveLength(MIGRATION_COUNT);
    expect(await tableCount()).toBe(0);

    const up = await migrator.migrateToLatest();
    expect(up.error).toBeUndefined();
    expect(up.results).toHaveLength(MIGRATION_COUNT);
    expect(await tableCount()).toBe(TABLE_COUNT);
  });
});
