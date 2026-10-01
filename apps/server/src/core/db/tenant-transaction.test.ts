import { uuidv7 } from '@brewpoint/shared';
import { sql, type Kysely } from 'kysely';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { requireTestDatabaseUrls, testDatabaseUrls } from '../../db/test-database';
import type { DB } from '../../db/types';
import { createDb } from './client';
import { withTenant } from './tenant-transaction';

async function currentTenant(db: Kysely<DB>): Promise<string> {
  const result = await sql<{ tenant: string | null }>`
    SELECT current_setting('app.tenant_id', true) AS tenant
  `.execute(db);
  return result.rows[0]?.tenant ?? '';
}

describe('withTenant', () => {
  it('refuses a tenant id that is not a UUID, before touching the database', async () => {
    const db = createDb('postgresql://nobody@127.0.0.1:1/none');
    const fn = vi.fn();

    await expect(withTenant(db, 'kape-davao', fn)).rejects.toThrow(
      'withTenant needs the tenant\'s UUID, but got "kape-davao".',
    );
    expect(fn).not.toHaveBeenCalled();
    await db.destroy();
  });

  describe.skipIf(!testDatabaseUrls())('against the test database', () => {
    const tenantId = uuidv7();
    let db: Kysely<DB>;

    beforeAll(() => {
      db = createDb(requireTestDatabaseUrls().app);
    });

    afterAll(async () => {
      await db.destroy();
    });

    it('sets the tenant inside the transaction and returns what fn returns', async () => {
      const seen = await withTenant(db, tenantId, (trx) => currentTenant(trx));

      expect(seen).toBe(tenantId);
    });

    it('clears the tenant when the transaction commits', async () => {
      await withTenant(db, tenantId, (trx) => currentTenant(trx));

      expect(await currentTenant(db)).toBe('');
    });

    it('clears the tenant when the transaction rolls back', async () => {
      await expect(
        withTenant(db, tenantId, () => Promise.reject(new Error('the sale failed'))),
      ).rejects.toThrow('the sale failed');

      expect(await currentTenant(db)).toBe('');
    });
  });
});
