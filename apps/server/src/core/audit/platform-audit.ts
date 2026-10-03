import type { Kysely, Transaction } from 'kysely';
import type { DB } from '../../db/types';

export interface PlatformAuditEntry {
  /** Who did it; null for the system. */
  staffId: string | null;
  /** The shop it touched, if any. */
  targetTenantId?: string | null;
  grantId?: string | null;
  actionCode: string;
  /** A real-value sentence: "Signed in to the staff console". */
  sentence: string;
  entityType?: string | null;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  reason?: string | null;
  isSensitive: boolean;
  ipAddress: string;
  happenedAt: Date;
}

/**
 * Appends one row to platform_audit_log, for every staff action. Pass the platform
 * transaction so the row is kept only if the action is. Append-only for the platform role.
 */
export async function writePlatformAudit(
  db: Kysely<DB> | Transaction<DB>,
  entry: PlatformAuditEntry,
): Promise<void> {
  await db
    .insertInto('platform_audit_log')
    .values({
      staff_id: entry.staffId,
      target_tenant_id: entry.targetTenantId ?? null,
      grant_id: entry.grantId ?? null,
      action_code: entry.actionCode,
      sentence: entry.sentence,
      entity_type: entry.entityType ?? null,
      entity_id: entry.entityId ?? null,
      before: entry.before === undefined ? null : JSON.stringify(entry.before),
      after: entry.after === undefined ? null : JSON.stringify(entry.after),
      reason: entry.reason ?? null,
      is_sensitive: entry.isSensitive,
      ip_address: entry.ipAddress,
      happened_at: entry.happenedAt,
    })
    .execute();
}
