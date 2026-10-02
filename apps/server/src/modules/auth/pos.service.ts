import type { DeviceAuthEventType } from '@brewpoint/shared';
import { writeAudit } from '../../core/audit/audit';
import type { DeviceIdentity } from '../../core/auth/device';
import { loadBranchAccess } from '../../core/auth/identity';
import { isLocked, PIN_LOCK, recordFailure, UNLOCKED } from '../../core/auth/lockout';
import { verifySecret } from '../../core/auth/password';
import { createShopSession, resolveShopSession, revokeShopSession } from '../../core/auth/sessions';
import { withTenant, type TenantTransaction } from '../../core/db/tenant-transaction';
import type { AppError } from '../../core/errors';
import type { AuthDeps } from './deps';
import { pinLocked, pinUserUnavailable, wrongPin } from './errors';
import { fail, succeed, unwrap, type Outcome } from './outcome';
import * as repo from './repository';
import type { ShopSignIn } from './shop.service';

const LOCK_SENTENCE = (device: string) =>
  `Wrong PIN ${PIN_LOCK.maxFailures} times on ${device}, locked for ${PIN_LOCK.lockMinutes} minutes`;

/**
 * The people who may sign in on this register, with their PIN hashes, for the POS to keep
 * and check offline. Deactivated users are left out, so they drop off the device at the next
 * refresh.
 */
export function listPinUsers(deps: AuthDeps, device: DeviceIdentity): Promise<repo.PinUser[]> {
  return withTenant(deps.db, device.tenantId, (trx) => repo.listPinUsers(trx, device.branchId));
}

/**
 * Online PIN sign-in on a register: opens a POS session (no idle limit; it ends at sign-out
 * or register close). Five wrong PINs in a row lock that user on this device for 5 minutes.
 */
export async function signInWithPin(
  deps: AuthDeps,
  input: { device: DeviceIdentity; userId: string; pin: string; ipAddress: string },
): Promise<ShopSignIn> {
  const now = deps.now();
  const { device } = input;
  const key = { tenantId: device.tenantId, userId: input.userId, deviceId: device.deviceId };

  const outcome = await withTenant<Outcome<ShopSignIn>>(deps.db, device.tenantId, async (trx) => {
    const users = await repo.listPinUsers(trx, device.branchId);
    const user = users.find((candidate) => candidate.id === input.userId);
    if (!user) return fail(pinUserUnavailable());

    const tries = await repo.lockPinTries(trx, key);
    if (isLocked(tries, now) && tries.lockedUntil)
      return fail(pinLocked(user.name, tries.lockedUntil));
    if (!(await verifySecret(user.pinHash, input.pin))) {
      return fail(await countWrongPin(trx, device, user, tries, now));
    }

    await repo.savePinTries(trx, key, UNLOCKED, now);
    await repo.touchUserActivity(trx, user.id, now);
    const session = await createShopSession(trx, {
      tenantId: device.tenantId,
      userId: user.id,
      surface: 'pos',
      deviceId: device.deviceId,
      ipAddress: input.ipAddress,
      now,
    });
    await writeAudit(
      trx,
      posEntry(device, user.id, 'auth.signed_in', `Signed in on ${device.name}`, now),
    );
    const access = await loadBranchAccess(trx, user.id);
    return succeed({
      token: session.token,
      identity: {
        kind: 'shop',
        sessionId: session.sessionId,
        surface: 'pos',
        userId: user.id,
        name: user.name,
        email: user.email,
        tenantId: device.tenantId,
        deviceId: device.deviceId,
        ...access,
      },
    });
  });
  return unwrap(outcome);
}

async function countWrongPin(
  trx: TenantTransaction,
  device: DeviceIdentity,
  user: repo.PinUser,
  tries: { failedCount: number; lockedUntil: Date | null },
  now: Date,
): Promise<AppError> {
  const failure = recordFailure(tries, PIN_LOCK, now);
  await repo.savePinTries(trx, { userId: user.id, deviceId: device.deviceId }, failure.state, now);
  if (!failure.justLocked || !failure.state.lockedUntil) return wrongPin(failure.triesLeft);

  await writeAudit(trx, {
    ...posEntry(device, user.id, 'auth.pin.locked', LOCK_SENTENCE(device.name), now),
    isSensitive: true,
  });
  return pinLocked(user.name, failure.state.lockedUntil);
}

function posEntry(
  device: DeviceIdentity,
  userId: string,
  actionCode: string,
  sentence: string,
  happenedAt: Date,
) {
  return {
    tenantId: device.tenantId,
    branchId: device.branchId,
    userId,
    actionCode,
    sentence,
    entityType: 'user',
    entityId: userId,
    isSensitive: false,
    happenedAt,
    deviceId: device.deviceId,
  };
}

/** Ends this POS session ("Signed out on T1"). An ended session does nothing. */
export async function signOutPos(deps: AuthDeps, token: string): Promise<void> {
  const now = deps.now();
  const check = await resolveShopSession(deps.db, token, 'pos', now);
  if (!check.ok) return;
  const { identity } = check;
  const { deviceId } = identity;
  if (!deviceId) return;

  await withTenant(deps.db, identity.tenantId, async (trx) => {
    await revokeShopSession(trx, identity.sessionId, 'signed_out', now);
    const name = await repo.deviceName(trx, deviceId);
    await writeAudit(trx, {
      tenantId: identity.tenantId,
      userId: identity.userId,
      actionCode: 'auth.signed_out',
      sentence: `Signed out on ${name}`,
      entityType: 'user',
      entityId: identity.userId,
      isSensitive: false,
      happenedAt: now,
      deviceId,
    });
  });
}

/** Something that happened on the register while it checked PINs by itself (often offline). */
export interface DeviceAuthEvent {
  /** Made on the device; the audit row's id, so a resend is recorded once. */
  id: string;
  type: DeviceAuthEventType;
  userId: string;
  happenedAt: Date;
}

const EVENT_ACTIONS: Record<DeviceAuthEventType, string> = {
  signed_in: 'auth.signed_in',
  signed_out: 'auth.signed_out',
  pin_locked: 'auth.pin.locked',
};

function eventSentence(type: DeviceAuthEventType, device: string): string {
  if (type === 'signed_in') return `Signed in on ${device}`;
  if (type === 'signed_out') return `Signed out on ${device}`;
  return LOCK_SENTENCE(device);
}

/**
 * Records the register's own sign-ins, sign-outs and PIN locks in the audit log, each once,
 * with when they happened on the device. A lock the device reports also locks that user on
 * this device on the server, so online PIN checks agree with it.
 */
export async function recordDeviceEvents(
  deps: AuthDeps,
  device: DeviceIdentity,
  events: DeviceAuthEvent[],
): Promise<{ recorded: number; skipped: string[] }> {
  const now = deps.now();
  return withTenant(deps.db, device.tenantId, async (trx) => {
    let recorded = 0;
    const skipped: string[] = [];
    for (const event of events) {
      if (!(await repo.userExists(trx, event.userId))) {
        skipped.push(event.id);
        continue;
      }
      const isNew = await writeAudit(trx, {
        ...posEntry(
          device,
          event.userId,
          EVENT_ACTIONS[event.type],
          eventSentence(event.type, device.name),
          event.happenedAt,
        ),
        id: event.id,
        isSensitive: event.type === 'pin_locked',
        clientCreatedAt: event.happenedAt,
        syncedAt: now,
      });
      if (isNew) recorded += 1;
      if (isNew && event.type === 'pin_locked') await applyDeviceLock(trx, device, event, now);
    }
    return { recorded, skipped };
  });
}

async function applyDeviceLock(
  trx: TenantTransaction,
  device: DeviceIdentity,
  event: DeviceAuthEvent,
  now: Date,
): Promise<void> {
  const key = { tenantId: device.tenantId, userId: event.userId, deviceId: device.deviceId };
  const lockedUntil = new Date(event.happenedAt.getTime() + PIN_LOCK.lockMinutes * 60_000);
  const tries = await repo.lockPinTries(trx, key);
  if (lockedUntil <= now || (tries.lockedUntil && tries.lockedUntil >= lockedUntil)) return;
  await repo.savePinTries(trx, key, { failedCount: PIN_LOCK.maxFailures, lockedUntil }, now);
}
