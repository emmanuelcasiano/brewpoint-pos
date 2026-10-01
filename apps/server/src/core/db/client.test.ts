import { sql, type Kysely } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { requireTestDatabaseUrls, testDatabaseUrls } from '../../db/test-database';
import type { DB } from '../../db/types';
import { createDb, parseInt8 } from './client';

describe('parseInt8', () => {
  it('reads centavos as a number', () => {
    expect(parseInt8('124500')).toBe(124_500);
    expect(parseInt8('-5000')).toBe(-5_000);
  });

  it('reads the largest safe integer', () => {
    expect(parseInt8('9007199254740991')).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('refuses a value that would lose digits', () => {
    expect(() => parseInt8('9007199254740993')).toThrow(
      'The bigint 9007199254740993 is too large to read as a number without losing digits.',
    );
  });
});

describe.skipIf(!testDatabaseUrls())('createDb', () => {
  let db: Kysely<DB>;

  beforeAll(() => {
    db = createDb(requireTestDatabaseUrls().app);
  });

  afterAll(async () => {
    await db.destroy();
  });

  it('returns bigint columns as numbers', async () => {
    const result = await sql<{ total: unknown }>`SELECT 124500::bigint AS total`.execute(db);

    expect(result.rows[0]?.total).toBe(124_500);
  });
});
