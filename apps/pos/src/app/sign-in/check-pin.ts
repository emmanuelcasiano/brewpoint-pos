import {
  ApiRequestError,
  isLocked,
  PIN_LOCK,
  pinLockedMessage,
  recordFailure,
  UNLOCKED,
  wrongPinMessage,
  type PinUserEntry,
} from '@brewpoint/shared';
import { api } from '../../lib/api-client';
import { queueAuthEvent } from '../../offline/auth-events';
import { readLockout, writeLockout } from '../../offline/pin-cache';
import { verifyPin } from '../../offline/pin-verifier';
import type { PosSession } from '../../offline/pos-session';

export type PinOutcome =
  | { kind: 'signed-in'; session: PosSession }
  | { kind: 'wrong'; message: string }
  | { kind: 'locked'; message: string; until: Date }
  /** The server knows better than the device's list (deactivated, PIN changed): not signed in. */
  | { kind: 'refused'; message: string };

export interface PinCheck {
  outcome: PinOutcome;
  /** What the server attempt showed about the connection; undefined when none was made. */
  reachedServer?: boolean;
}

/** The lock this person has on this device right now, if any. */
export async function currentLock(user: PinUserEntry, now: Date): Promise<PinOutcome | null> {
  const lock = await readLockout(user.id);
  if (!isLocked(lock, now) || !lock.lockedUntil) return null;
  return {
    kind: 'locked',
    message: pinLockedMessage(user.name, lock.lockedUntil),
    until: lock.lockedUntil,
  };
}

/**
 * Signs a person in with their PIN. The PIN is always checked on the device, against the
 * cached hash and this device's wrong tries, so it works the same with or without internet.
 * Five wrong PINs lock the person here for 5 minutes. When the server can be reached it also
 * opens a server session; otherwise the sign-in is queued for the audit log.
 */
export async function checkPin(
  user: PinUserEntry,
  pin: string,
  now: Date,
  tryServer: boolean,
): Promise<PinCheck> {
  const locked = await currentLock(user, now);
  if (locked) return { outcome: locked };

  if (!(await verifyPin(user.pinHash, pin))) {
    const failure = recordFailure(await readLockout(user.id), PIN_LOCK, now);
    await writeLockout(user.id, failure.state);
    if (!failure.justLocked || !failure.state.lockedUntil) {
      return { outcome: { kind: 'wrong', message: wrongPinMessage(failure.triesLeft) } };
    }
    await queueAuthEvent('pin_locked', user.id, now);
    const until = failure.state.lockedUntil;
    return { outcome: { kind: 'locked', message: pinLockedMessage(user.name, until), until } };
  }

  await writeLockout(user.id, UNLOCKED);
  const session = (token: string | null): PinOutcome => ({
    kind: 'signed-in',
    session: {
      userId: user.id,
      name: user.name,
      roleName: user.roleName,
      token,
      signedInAt: now.toISOString(),
    },
  });

  if (tryServer) {
    try {
      const { token } = await api.signIn({ userId: user.id, pin });
      return { outcome: session(token), reachedServer: true };
    } catch (error) {
      if (error instanceof ApiRequestError && !error.offline) {
        return { outcome: { kind: 'refused', message: error.message }, reachedServer: true };
      }
    }
  }
  await queueAuthEvent('signed_in', user.id, now);
  return { outcome: session(null), reachedServer: tryServer ? false : undefined };
}
