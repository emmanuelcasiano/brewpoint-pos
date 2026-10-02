import type { TenantTransaction } from '../db/tenant-transaction';

export interface AuditEntry {
  /** Set when the row comes from a device, so sending it twice keeps one row. */
  id?: string;
  tenantId: string;
  branchId?: string | null;
  /** Who did it; null for the system. */
  userId: string | null;
  actionCode: string;
  /** A real-value sentence: "Wrong PIN 5 times on T1, locked for 5 minutes". */
  sentence: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  isSensitive: boolean;
  happenedAt: Date;
  deviceId?: string | null;
  /** When it happened on the device; defaults to happenedAt. */
  clientCreatedAt?: Date;
  /** When the server got a device's row; empty for rows the server writes itself. */
  syncedAt?: Date | null;
}

/**
 * Appends one row to the shop's audit_log, inside the caller's tenant transaction so it is
 * kept only if the action is. audit_log is append-only for the app.
 * Returns false when a device sent a row the log already has.
 */
export async function writeAudit(trx: TenantTransaction, entry: AuditEntry): Promise<boolean> {
  const result = await trx
    .insertInto('audit_log')
    .values({
      ...(entry.id ? { id: entry.id } : {}),
      tenant_id: entry.tenantId,
      branch_id: entry.branchId ?? null,
      user_id: entry.userId,
      action_code: entry.actionCode,
      sentence: entry.sentence,
      entity_type: entry.entityType,
      entity_id: entry.entityId,
      before: entry.before === undefined ? null : JSON.stringify(entry.before),
      after: entry.after === undefined ? null : JSON.stringify(entry.after),
      is_sensitive: entry.isSensitive,
      happened_at: entry.happenedAt,
      device_id: entry.deviceId ?? null,
      client_created_at: entry.clientCreatedAt ?? entry.happenedAt,
      synced_at: entry.syncedAt ?? null,
    })
    .onConflict((oc) => oc.column('id').doNothing())
    .executeTakeFirst();
  return Number(result.numInsertedOrUpdatedRows ?? 0) > 0;
}
