import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { CompiledQuery, Kysely, PostgresDialect } from 'kysely';
import { FileMigrationProvider, Migrator } from 'kysely/migration';
import pg from 'pg';
import { MIGRATOR_ROLE } from './roles';

const MIGRATION_FOLDER = path.join(import.meta.dirname, 'migrations');

/**
 * A connection for migrations and seeds: the owner login, switched to
 * brewpoint_migrator so every table has the same owner in every environment.
 * Needs a direct (not pooled) connection string, because SET ROLE lasts for the session.
 */
export function createMigrationDb(connectionString: string): Kysely<unknown> {
  return new Kysely<unknown>({
    dialect: new PostgresDialect({
      pool: new pg.Pool({ connectionString, max: 1 }),
      onCreateConnection: async (connection) => {
        await connection.executeQuery(CompiledQuery.raw(`SET ROLE ${MIGRATOR_ROLE}`));
      },
    }),
  });
}

/** The owner login itself, for creating roles and resetting a test database. */
export function createOwnerDb(connectionString: string): Kysely<unknown> {
  return new Kysely<unknown>({
    dialect: new PostgresDialect({ pool: new pg.Pool({ connectionString, max: 1 }) }),
  });
}

export function createMigrator(db: Kysely<unknown>): Migrator {
  return new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: MIGRATION_FOLDER,
      // Windows paths are not valid import specifiers; file URLs work everywhere.
      import: (file) => import(pathToFileURL(file).href),
    }),
  });
}
