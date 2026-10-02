import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';
import type { DB } from '../../db/types';

const INT8_OID = 20;

/**
 * bigint columns (money in centavos, counts) come back as TypeScript numbers.
 * A value past Number.MAX_SAFE_INTEGER would lose digits, so it fails loudly instead.
 */
export function parseInt8(value: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new RangeError(
      `The bigint ${value} is too large to read as a number without losing digits.`,
    );
  }
  return parsed;
}

pg.types.setTypeParser(INT8_OID, parseInt8);

export type Database = Kysely<DB>;

/**
 * The server's database: the brewpoint_app login (DATABASE_URL), where row-level security
 * always applies. Tenant queries go through withTenant in tenant-transaction.ts.
 */
export function createDb(connectionString: string): Database {
  return new Kysely<DB>({
    dialect: new PostgresDialect({ pool: new pg.Pool({ connectionString }) }),
  });
}

export type PlatformDatabase = Kysely<DB> & { readonly __platform: true };

/**
 * The staff console's database: the brewpoint_platform login (PLATFORM_DATABASE_URL). It reads
 * the platform tables and, across shops, only the tables BrewPoint runs; never shop business data.
 * A separate type, so code that needs the platform connection cannot be given the app's by mistake.
 */
export function createPlatformDb(connectionString: string): PlatformDatabase {
  return createDb(connectionString) as PlatformDatabase;
}
