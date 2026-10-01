import { sql } from 'kysely';
import { createMigrationDb, createMigrator, createOwnerDb } from './migrator';
import { bootstrapRoles, setAppRolePassword } from './roles';

export interface TestDatabaseUrls {
  /** neondb_owner (or postgres in CI), direct connection: resets, migrates, seeds. */
  owner: string;
  /** brewpoint_app, pooled connection: what the server will use. */
  app: string;
}

export type TestDatabaseCheck =
  | { ok: true; urls: TestDatabaseUrls }
  | { ok: false; reason: 'missing' | 'unsafe'; message: string };

/**
 * Database tests wipe the database they use, so they run only when both test URLs are set
 * and neither points at the development database (pooled or direct).
 */
export function checkTestDatabaseUrls(env: Record<string, string | undefined>): TestDatabaseCheck {
  const owner = env.MIGRATION_TEST_DATABASE_URL;
  const app = env.TEST_DATABASE_URL;
  if (!owner || !app) {
    return {
      ok: false,
      reason: 'missing',
      message:
        'Database tests need MIGRATION_TEST_DATABASE_URL and TEST_DATABASE_URL in .env (see .env.example).',
    };
  }

  let ownerKey: string;
  let appKey: string;
  let devKeys: string[];
  try {
    ownerKey = databaseKey(owner);
    appKey = databaseKey(app);
    devKeys = [env.DATABASE_URL, env.MIGRATION_DATABASE_URL]
      .filter((url): url is string => Boolean(url))
      .map(databaseKey);
  } catch {
    return {
      ok: false,
      reason: 'unsafe',
      message: 'A database URL in .env is not a valid connection string.',
    };
  }

  if (devKeys.includes(ownerKey) || devKeys.includes(appKey)) {
    return {
      ok: false,
      reason: 'unsafe',
      message:
        'The test database URLs point at the development database. Database tests wipe their database, so point MIGRATION_TEST_DATABASE_URL and TEST_DATABASE_URL at the separate test branch.',
    };
  }
  if (ownerKey !== appKey) {
    return {
      ok: false,
      reason: 'unsafe',
      message:
        'MIGRATION_TEST_DATABASE_URL and TEST_DATABASE_URL point at different databases. Both must be the test branch.',
    };
  }
  return { ok: true, urls: { owner, app } };
}

/** Host, port and database, with Neon's -pooler removed: the pooled and direct URL are the same database. */
function databaseKey(connectionString: string): string {
  const url = new URL(connectionString);
  const [endpoint = '', ...rest] = url.hostname.split('.');
  const host = [endpoint.replace(/-pooler$/, ''), ...rest].join('.');
  return `${host}:${url.port || '5432'}${url.pathname}`;
}

/** The test URLs when database tests should run, or undefined to skip them. Unsafe URLs throw. */
export function testDatabaseUrls(): TestDatabaseUrls | undefined {
  const check = checkTestDatabaseUrls(process.env);
  if (check.ok) return check.urls;
  if (check.reason === 'unsafe') throw new Error(check.message);
  return undefined;
}

/** For use inside a describe.skipIf(!testDatabaseUrls()) block. */
export function requireTestDatabaseUrls(): TestDatabaseUrls {
  const urls = testDatabaseUrls();
  if (!urls) throw new Error('Database tests ran without a test database.');
  return urls;
}

/**
 * Wipes the test database and builds it from empty: roles, every migration, and the app
 * login's password taken from TEST_DATABASE_URL so the tests log in exactly like the server.
 */
export async function prepareTestDatabase(urls: TestDatabaseUrls): Promise<void> {
  const owner = createOwnerDb(urls.owner);
  try {
    await sql`DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;`.execute(owner);
    await bootstrapRoles(owner);
    await setAppRolePassword(owner, decodeURIComponent(new URL(urls.app).password));
  } finally {
    await owner.destroy();
  }

  const migrationDb = createMigrationDb(urls.owner);
  try {
    const { error } = await createMigrator(migrationDb).migrateToLatest();
    if (error) {
      throw error instanceof Error
        ? error
        : new Error(`Migrating the test database failed: ${JSON.stringify(error)}`);
    }
  } finally {
    await migrationDb.destroy();
  }
}
