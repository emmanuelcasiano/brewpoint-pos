import type { Kysely, Transaction } from 'kysely';
import type { Database, PlatformDatabase } from '../db/client';
import { withTenant, type TenantTransaction } from '../db/tenant-transaction';
import type { DB } from '../../db/types';
import {
  loadBranchAccess,
  type ShopIdentity,
  type StaffIdentity,
  type StaffStage,
  type Surface,
} from './identity';
import { hashToken, isStaffToken, newShopToken, newStaffToken, shopTokenTenant } from './tokens';

const HOUR = 60 * 60_000;

/** Back-office and staff sessions end after this long without a request. POS sessions do not. */
export const IDLE_LIMIT_MS = 12 * HOUR;
/** A staff sign-in waiting for its two-step code (or setup) ends after this. */
export const TWO_STEP_LIMIT_MS = 10 * 60_000;
/** last_seen_at is written at most this often, so busy screens do not write on every request. */
const TOUCH_EVERY_MS = 60_000;

export type SessionCheck<T> =
  { ok: true; identity: T } | { ok: false; reason: 'missing' | 'expired' | 'deactivated' };

export type RevokeReason =
  'signed_out' | 'expired' | 'password_reset' | 'deactivated' | 'two_step_expired' | 'locked';

// ---------------------------------------------------------------- shop sessions

export async function createShopSession(
  trx: TenantTransaction,
  session: {
    tenantId: string;
    userId: string;
    surface: Surface;
    deviceId: string | null;
    ipAddress: string;
    now: Date;
  },
): Promise<{ token: string; sessionId: string }> {
  const { token, hash } = newShopToken(session.tenantId);
  const row = await trx
    .insertInto('sessions')
    .values({
      tenant_id: session.tenantId,
      user_id: session.userId,
      surface: session.surface,
      device_id: session.deviceId,
      token_hash: hash,
      ip_address: session.ipAddress,
      created_at: session.now,
      last_seen_at: session.now,
    })
    .returning('id')
    .executeTakeFirstOrThrow();
  return { token, sessionId: row.id };
}

/**
 * The identity behind a shop token on this surface, checked on every request: the session is
 * open, the user is still active (a deactivated user is refused at once), and a back-office
 * session has not been idle for 12 hours.
 */
export async function resolveShopSession(
  db: Database,
  token: string,
  surface: Surface,
  now: Date,
): Promise<SessionCheck<ShopIdentity>> {
  const tenantId = shopTokenTenant(token);
  if (!tenantId) return { ok: false, reason: 'missing' };

  return withTenant<SessionCheck<ShopIdentity>>(db, tenantId, async (trx) => {
    const row = await trx
      .selectFrom('sessions')
      .innerJoin('users', 'users.id', 'sessions.user_id')
      .select([
        'sessions.id',
        'sessions.last_seen_at',
        'sessions.device_id',
        'users.id as userId',
        'users.name',
        'users.email',
        'users.status',
      ])
      .where('sessions.token_hash', '=', hashToken(token))
      .where('sessions.surface', '=', surface)
      .where('sessions.revoked_at', 'is', null)
      .executeTakeFirst();
    if (!row) return { ok: false, reason: 'missing' };

    if (row.status !== 'active') {
      await revokeShopSession(trx, row.id, 'deactivated', now);
      return { ok: false, reason: 'deactivated' };
    }
    const idleFor = now.getTime() - row.last_seen_at.getTime();
    if (surface === 'backoffice' && idleFor >= IDLE_LIMIT_MS) {
      await revokeShopSession(trx, row.id, 'expired', now);
      return { ok: false, reason: 'expired' };
    }
    if (idleFor >= TOUCH_EVERY_MS) {
      await trx
        .updateTable('sessions')
        .set({ last_seen_at: now })
        .where('id', '=', row.id)
        .execute();
      await trx
        .updateTable('users')
        .set({ last_active_at: now })
        .where('id', '=', row.userId)
        .execute();
    }

    const access = await loadBranchAccess(trx, row.userId);
    return {
      ok: true,
      identity: {
        kind: 'shop',
        sessionId: row.id,
        surface,
        userId: row.userId,
        name: row.name,
        email: row.email,
        tenantId,
        deviceId: row.device_id,
        ...access,
      },
    };
  });
}

export async function revokeShopSession(
  trx: TenantTransaction,
  sessionId: string,
  reason: RevokeReason,
  now: Date,
): Promise<void> {
  await trx
    .updateTable('sessions')
    .set({ revoked_at: now, revoke_reason: reason })
    .where('id', '=', sessionId)
    .where('revoked_at', 'is', null)
    .execute();
}

/** Ends every open session of a user (after a password reset, or deactivation in Module 16). */
export async function revokeUserSessions(
  trx: TenantTransaction,
  userId: string,
  reason: RevokeReason,
  now: Date,
): Promise<void> {
  await trx
    .updateTable('sessions')
    .set({ revoked_at: now, revoke_reason: reason })
    .where('user_id', '=', userId)
    .where('revoked_at', 'is', null)
    .execute();
}

// ---------------------------------------------------------------- staff sessions

type PlatformExecutor = PlatformDatabase | Transaction<DB>;

export async function createStaffSession(
  db: PlatformExecutor,
  session: { staffId: string; stage: StaffStage; ipAddress: string; now: Date },
): Promise<{ token: string; sessionId: string }> {
  const { token, hash } = newStaffToken();
  const row = await db
    .insertInto('platform_sessions')
    .values({
      staff_id: session.staffId,
      stage: session.stage,
      token_hash: hash,
      ip_address: session.ipAddress,
      created_at: session.now,
      last_seen_at: session.now,
    })
    .returning('id')
    .executeTakeFirstOrThrow();
  return { token, sessionId: row.id };
}

/**
 * The staff identity behind a token, at any stage. An active session ends after 12 hours
 * without a request; a session still waiting for two-step ends 10 minutes after the password.
 * The caller decides which stages a route accepts.
 */
export async function resolveStaffSession(
  db: Kysely<DB>,
  token: string,
  now: Date,
): Promise<SessionCheck<StaffIdentity>> {
  if (!isStaffToken(token)) return { ok: false, reason: 'missing' };

  const row = await db
    .selectFrom('platform_sessions')
    .innerJoin('platform_users', 'platform_users.id', 'platform_sessions.staff_id')
    .innerJoin('platform_roles', 'platform_roles.id', 'platform_users.role_id')
    .select([
      'platform_sessions.id',
      'platform_sessions.stage',
      'platform_sessions.created_at',
      'platform_sessions.last_seen_at',
      'platform_users.id as staffId',
      'platform_users.name',
      'platform_users.email',
      'platform_users.status',
      'platform_users.totp_secret_enc',
      'platform_roles.id as roleId',
      'platform_roles.name as roleName',
    ])
    .where('platform_sessions.token_hash', '=', hashToken(token))
    .where('platform_sessions.revoked_at', 'is', null)
    .executeTakeFirst();
  if (!row) return { ok: false, reason: 'missing' };

  const stage = row.stage as StaffStage;
  if (row.status !== 'active') {
    await revokeStaffSession(db, row.id, 'deactivated', now);
    return { ok: false, reason: 'deactivated' };
  }
  const expired =
    stage === 'active'
      ? now.getTime() - row.last_seen_at.getTime() >= IDLE_LIMIT_MS
      : now.getTime() - row.created_at.getTime() >= TWO_STEP_LIMIT_MS;
  if (expired) {
    await revokeStaffSession(db, row.id, stage === 'active' ? 'expired' : 'two_step_expired', now);
    return { ok: false, reason: 'expired' };
  }
  if (stage === 'active' && now.getTime() - row.last_seen_at.getTime() >= TOUCH_EVERY_MS) {
    await db
      .updateTable('platform_sessions')
      .set({ last_seen_at: now })
      .where('id', '=', row.id)
      .execute();
    await db
      .updateTable('platform_users')
      .set({ last_active_at: now })
      .where('id', '=', row.staffId)
      .execute();
  }

  return {
    ok: true,
    identity: {
      kind: 'staff',
      sessionId: row.id,
      staffId: row.staffId,
      name: row.name,
      email: row.email,
      roleId: row.roleId,
      roleName: row.roleName,
      stage,
      twoStepOn: row.totp_secret_enc !== null,
    },
  };
}

export async function revokeStaffSession(
  db: Kysely<DB>,
  sessionId: string,
  reason: RevokeReason,
  now: Date,
): Promise<void> {
  await db
    .updateTable('platform_sessions')
    .set({ revoked_at: now, revoke_reason: reason })
    .where('id', '=', sessionId)
    .where('revoked_at', 'is', null)
    .execute();
}
