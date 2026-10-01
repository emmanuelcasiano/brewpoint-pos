import { sql, type Kysely, type Transaction } from 'kysely';
import type { DB } from '../../db/types';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type TenantTransaction = Transaction<DB>;

/**
 * Runs fn in a transaction where row-level security shows and accepts only this tenant's rows.
 * The tenant is set with set_config(..., true), the parameterised form of SET LOCAL, so it ends
 * with the transaction and never leaks to the next request on a pooled connection.
 * Every tenant query in the server goes through here.
 */
export async function withTenant<T>(
  db: Kysely<DB>,
  tenantId: string,
  fn: (trx: TenantTransaction) => Promise<T>,
): Promise<T> {
  if (!UUID.test(tenantId)) {
    throw new TypeError(`withTenant needs the tenant's UUID, but got "${tenantId}".`);
  }
  return db.transaction().execute(async (trx) => {
    await sql`select set_config('app.tenant_id', ${tenantId}, true)`.execute(trx);
    return fn(trx);
  });
}
