import { sql, type Kysely, type Transaction } from 'kysely';
import type { LockState } from '@brewpoint/shared';
import type { Database } from '../../core/db/client';
import type { TenantTransaction } from '../../core/db/tenant-transaction';
import type { DB } from '../../db/types';

// ---------------------------------------------------------------- shop users

/**
 * The one query that runs before the shop is known: auth_find_user returns only the user's
 * id and shop for an exact email (migration 0013). Everything after it runs in withTenant.
 */
export async function findUserByEmail(
  db: Database,
  email: string,
): Promise<{ userId: string; tenantId: string } | undefined> {
  const result = await sql<{ user_id: string; tenant_id: string }>`
    SELECT user_id, tenant_id FROM auth_find_user(${email})
  `.execute(db);
  const row = result.rows[0];
  return row ? { userId: row.user_id, tenantId: row.tenant_id } : undefined;
}

export interface SignInUser {
  id: string;
  name: string;
  email: string;
  status: string;
  passwordHash: string | null;
  lock: LockState;
}

/** The user row, locked for this transaction so two sign-ins count wrong tries one at a time. */
export async function lockUserForSignIn(
  trx: TenantTransaction,
  userId: string,
): Promise<SignInUser | undefined> {
  const row = await trx
    .selectFrom('users')
    .select([
      'id',
      'name',
      'email',
      'status',
      'password_hash',
      'failed_sign_in_count',
      'locked_until',
    ])
    .where('id', '=', userId)
    .forUpdate()
    .executeTakeFirst();
  return row
    ? {
        id: row.id,
        name: row.name,
        email: row.email,
        status: row.status,
        passwordHash: row.password_hash,
        lock: { failedCount: row.failed_sign_in_count, lockedUntil: row.locked_until },
      }
    : undefined;
}

export async function saveUserLock(
  trx: TenantTransaction,
  userId: string,
  lock: LockState,
): Promise<void> {
  await trx
    .updateTable('users')
    .set({ failed_sign_in_count: lock.failedCount, locked_until: lock.lockedUntil })
    .where('id', '=', userId)
    .execute();
}

/** Clears wrong tries and records the sign-in as the user's latest activity. */
export async function markUserSignedIn(
  trx: TenantTransaction,
  userId: string,
  now: Date,
): Promise<void> {
  await trx
    .updateTable('users')
    .set({ failed_sign_in_count: 0, locked_until: null, last_active_at: now })
    .where('id', '=', userId)
    .execute();
}

export async function setUserPassword(
  trx: TenantTransaction,
  userId: string,
  passwordHash: string,
  activate: boolean,
): Promise<void> {
  await trx
    .updateTable('users')
    .set({
      password_hash: passwordHash,
      failed_sign_in_count: 0,
      locked_until: null,
      ...(activate ? { status: 'active' } : {}),
    })
    .where('id', '=', userId)
    .execute();
}

// ---------------------------------------------------------------- one-time links

export type LinkPurpose = 'invite' | 'password_reset';

export async function createAuthToken(
  trx: TenantTransaction,
  token: {
    tenantId: string;
    userId: string;
    purpose: LinkPurpose;
    hash: string;
    expiresAt: Date;
    now: Date;
  },
): Promise<void> {
  await trx
    .insertInto('auth_tokens')
    .values({
      tenant_id: token.tenantId,
      user_id: token.userId,
      purpose: token.purpose,
      token_hash: token.hash,
      expires_at: token.expiresAt,
      created_at: token.now,
    })
    .execute();
}

/** Marks a user's unused links of this kind as used, so only the newest one works. */
export async function retireAuthTokens(
  trx: TenantTransaction,
  userId: string,
  purpose: LinkPurpose,
  now: Date,
): Promise<void> {
  await trx
    .updateTable('auth_tokens')
    .set({ used_at: now })
    .where('user_id', '=', userId)
    .where('purpose', '=', purpose)
    .where('used_at', 'is', null)
    .execute();
}

export interface LinkRow {
  id: string;
  purpose: LinkPurpose;
  expiresAt: Date;
  usedAt: Date | null;
  userId: string;
  name: string;
  email: string;
  status: string;
}

export async function findAuthToken(
  trx: TenantTransaction,
  hash: string,
  forUpdate: boolean,
): Promise<LinkRow | undefined> {
  const row = await trx
    .selectFrom('auth_tokens')
    .innerJoin('users', 'users.id', 'auth_tokens.user_id')
    .select([
      'auth_tokens.id',
      'auth_tokens.purpose',
      'auth_tokens.expires_at',
      'auth_tokens.used_at',
      'users.id as userId',
      'users.name',
      'users.email',
      'users.status',
    ])
    .where('auth_tokens.token_hash', '=', hash)
    .$if(forUpdate, (qb) => qb.forUpdate())
    .executeTakeFirst();
  return row
    ? {
        id: row.id,
        purpose: row.purpose as LinkPurpose,
        expiresAt: row.expires_at,
        usedAt: row.used_at,
        userId: row.userId,
        name: row.name,
        email: row.email,
        status: row.status,
      }
    : undefined;
}

export async function markAuthTokenUsed(
  trx: TenantTransaction,
  tokenId: string,
  now: Date,
): Promise<void> {
  await trx.updateTable('auth_tokens').set({ used_at: now }).where('id', '=', tokenId).execute();
}

// ---------------------------------------------------------------- POS PINs

export interface PinUser {
  id: string;
  name: string;
  email: string;
  roleName: string;
  pinHash: string;
}

/**
 * Active users with a PIN who work at this branch (or at every branch), with the role they
 * hold here: a branch assignment wins over an all-branches one.
 */
export async function listPinUsers(trx: TenantTransaction, branchId: string): Promise<PinUser[]> {
  const rows = await trx
    .selectFrom('users')
    .innerJoin('user_assignments', 'user_assignments.user_id', 'users.id')
    .innerJoin('roles', 'roles.id', 'user_assignments.role_id')
    .select([
      'users.id',
      'users.name',
      'users.email',
      'users.pin_hash',
      'roles.name as roleName',
      'user_assignments.branch_id',
    ])
    .where('users.status', '=', 'active')
    .where('users.pin_hash', 'is not', null)
    .where((eb) =>
      eb.or([
        eb('user_assignments.branch_id', '=', branchId),
        eb('user_assignments.branch_id', 'is', null),
      ]),
    )
    .orderBy('users.name')
    .orderBy('user_assignments.branch_id', (ob) => ob.asc().nullsLast())
    .execute();

  const byUser = new Map<string, PinUser>();
  for (const row of rows) {
    if (byUser.has(row.id) || !row.pin_hash) continue;
    byUser.set(row.id, {
      id: row.id,
      name: row.name,
      email: row.email,
      roleName: row.roleName,
      pinHash: row.pin_hash,
    });
  }
  return [...byUser.values()];
}

/** The PIN tries of one user on one device, locked for this transaction. */
export async function lockPinTries(
  trx: TenantTransaction,
  key: { tenantId: string; userId: string; deviceId: string },
): Promise<LockState> {
  await trx
    .insertInto('pin_lockouts')
    .values({ tenant_id: key.tenantId, user_id: key.userId, device_id: key.deviceId })
    .onConflict((oc) => oc.columns(['user_id', 'device_id']).doNothing())
    .execute();
  const row = await trx
    .selectFrom('pin_lockouts')
    .select(['failed_count', 'locked_until'])
    .where('user_id', '=', key.userId)
    .where('device_id', '=', key.deviceId)
    .forUpdate()
    .executeTakeFirstOrThrow();
  return { failedCount: row.failed_count, lockedUntil: row.locked_until };
}

export async function savePinTries(
  trx: TenantTransaction,
  key: { userId: string; deviceId: string },
  lock: LockState,
  now: Date,
): Promise<void> {
  await trx
    .updateTable('pin_lockouts')
    .set({ failed_count: lock.failedCount, locked_until: lock.lockedUntil, updated_at: now })
    .where('user_id', '=', key.userId)
    .where('device_id', '=', key.deviceId)
    .execute();
}

/** A PIN sign-in is activity, but leaves the back-office password's wrong-try count alone. */
export async function touchUserActivity(
  trx: TenantTransaction,
  userId: string,
  now: Date,
): Promise<void> {
  await trx.updateTable('users').set({ last_active_at: now }).where('id', '=', userId).execute();
}

export async function userExists(trx: TenantTransaction, userId: string): Promise<boolean> {
  const row = await trx
    .selectFrom('users')
    .select('id')
    .where('id', '=', userId)
    .executeTakeFirst();
  return row !== undefined;
}

export interface ShopSummary {
  shop: { id: string; name: string; accentHex: string };
  branches: { id: string; name: string }[];
  device: { id: string; name: string } | null;
}

/** The names the signed-in screens show: the shop, the user's branches and the register. */
export async function shopSummary(
  trx: TenantTransaction,
  tenantId: string,
  branchIds: string[],
  deviceId: string | null,
): Promise<ShopSummary> {
  const tenant = await trx
    .selectFrom('tenants')
    .select(['id', 'name', 'accent_hex'])
    .where('id', '=', tenantId)
    .executeTakeFirstOrThrow();
  const branches =
    branchIds.length === 0
      ? []
      : await trx
          .selectFrom('branches')
          .select(['id', 'name'])
          .where('id', 'in', branchIds)
          .orderBy('name')
          .execute();
  const device = deviceId
    ? await trx
        .selectFrom('devices')
        .select(['id', 'name'])
        .where('id', '=', deviceId)
        .executeTakeFirst()
    : undefined;
  return {
    shop: { id: tenant.id, name: tenant.name, accentHex: tenant.accent_hex },
    branches,
    device: device ?? null,
  };
}

export async function deviceName(trx: TenantTransaction, deviceId: string): Promise<string> {
  const row = await trx
    .selectFrom('devices')
    .select('name')
    .where('id', '=', deviceId)
    .executeTakeFirst();
  return row?.name ?? 'a register';
}

// ---------------------------------------------------------------- staff (platform connection)

type PlatformTrx = Transaction<DB>;

export interface SignInStaff {
  id: string;
  name: string;
  email: string;
  status: string;
  passwordHash: string;
  totpSecretEnc: string | null;
  lock: LockState;
}

export async function lockStaffByEmail(
  trx: PlatformTrx,
  email: string,
): Promise<SignInStaff | undefined> {
  return lockStaff(trx, 'email', email);
}

export async function lockStaffById(
  trx: PlatformTrx,
  staffId: string,
): Promise<SignInStaff | undefined> {
  return lockStaff(trx, 'id', staffId);
}

async function lockStaff(
  trx: PlatformTrx,
  column: 'id' | 'email',
  value: string,
): Promise<SignInStaff | undefined> {
  const row = await trx
    .selectFrom('platform_users')
    .select([
      'id',
      'name',
      'email',
      'status',
      'password_hash',
      'totp_secret_enc',
      'failed_sign_in_count',
      'locked_until',
    ])
    .where(column, '=', value)
    .forUpdate()
    .executeTakeFirst();
  return row
    ? {
        id: row.id,
        name: row.name,
        email: row.email,
        status: row.status,
        passwordHash: row.password_hash,
        totpSecretEnc: row.totp_secret_enc,
        lock: { failedCount: row.failed_sign_in_count, lockedUntil: row.locked_until },
      }
    : undefined;
}

export async function saveStaffLock(
  trx: PlatformTrx,
  staffId: string,
  lock: LockState,
): Promise<void> {
  await trx
    .updateTable('platform_users')
    .set({ failed_sign_in_count: lock.failedCount, locked_until: lock.lockedUntil })
    .where('id', '=', staffId)
    .execute();
}

export async function markStaffSignedIn(
  trx: PlatformTrx,
  staffId: string,
  now: Date,
): Promise<void> {
  await trx
    .updateTable('platform_users')
    .set({ failed_sign_in_count: 0, locked_until: null, last_active_at: now })
    .where('id', '=', staffId)
    .execute();
}

/** True once the staff member has signed in before (any earlier session, open or not). */
export async function staffHasSignedInBefore(db: Kysely<DB>, staffId: string): Promise<boolean> {
  const row = await db
    .selectFrom('platform_sessions')
    .select('id')
    .where('staff_id', '=', staffId)
    .limit(1)
    .executeTakeFirst();
  return row !== undefined;
}

export async function setStaffTotp(
  trx: PlatformTrx,
  staffId: string,
  totpSecretEnc: string,
): Promise<void> {
  await trx
    .updateTable('platform_users')
    .set({ totp_secret_enc: totpSecretEnc })
    .where('id', '=', staffId)
    .execute();
}

export async function updateStaffSession(
  db: Kysely<DB>,
  sessionId: string,
  changes: { stage?: string; pendingTotpSecretEnc?: string | null; lastSeenAt?: Date },
): Promise<void> {
  await db
    .updateTable('platform_sessions')
    .set({
      ...(changes.stage !== undefined ? { stage: changes.stage } : {}),
      ...(changes.pendingTotpSecretEnc !== undefined
        ? { pending_totp_secret_enc: changes.pendingTotpSecretEnc }
        : {}),
      ...(changes.lastSeenAt !== undefined ? { last_seen_at: changes.lastSeenAt } : {}),
    })
    .where('id', '=', sessionId)
    .execute();
}

/**
 * Stores this pending two-step secret unless the session already has one, in one statement so
 * two requests at once agree, and returns the one stored.
 */
export async function keepPendingTotpSecret(
  db: Kysely<DB>,
  sessionId: string,
  encrypted: string,
): Promise<string> {
  const row = await db
    .updateTable('platform_sessions')
    .set({
      pending_totp_secret_enc: sql<string>`coalesce(pending_totp_secret_enc, ${encrypted})`,
    })
    .where('id', '=', sessionId)
    .returning('pending_totp_secret_enc')
    .executeTakeFirstOrThrow();
  if (!row.pending_totp_secret_enc) throw new Error('The pending two-step secret was not stored.');
  return row.pending_totp_secret_enc;
}

export async function pendingTotpSecret(db: Kysely<DB>, sessionId: string): Promise<string | null> {
  const row = await db
    .selectFrom('platform_sessions')
    .select('pending_totp_secret_enc')
    .where('id', '=', sessionId)
    .executeTakeFirst();
  return row?.pending_totp_secret_enc ?? null;
}
