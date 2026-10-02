import { PIN_LOCK_MINUTES, PIN_MAX_TRIES } from '../contracts/auth';
import { formatTime } from '../time/format-time';

// Wrong-try rules and their messages, shared so the server and the POS (checking PINs offline)
// count and speak the same way.

export interface LockRule {
  maxFailures: number;
  lockMinutes: number;
}

/** Back-office and staff accounts: wrong passwords (and staff two-step codes) in a row. */
export const ACCOUNT_LOCK: LockRule = { maxFailures: 10, lockMinutes: 15 };

/** One user on one POS device. */
export const PIN_LOCK: LockRule = { maxFailures: PIN_MAX_TRIES, lockMinutes: PIN_LOCK_MINUTES };

export interface LockState {
  failedCount: number;
  lockedUntil: Date | null;
}

export const UNLOCKED: LockState = { failedCount: 0, lockedUntil: null };

export function isLocked(state: LockState, now: Date): boolean {
  return state.lockedUntil !== null && state.lockedUntil > now;
}

export interface FailureResult {
  state: LockState;
  /** This failure reached the limit. */
  justLocked: boolean;
  /** Tries before the lock; 0 once locked. */
  triesLeft: number;
}

/**
 * One more wrong try. A lock that has ended starts the count again, so after waiting out a
 * lock the person gets the full number of tries.
 */
export function recordFailure(state: LockState, rule: LockRule, now: Date): FailureResult {
  const lockEnded = state.lockedUntil !== null && state.lockedUntil <= now;
  const failedCount = (lockEnded ? 0 : state.failedCount) + 1;
  if (failedCount >= rule.maxFailures) {
    const lockedUntil = new Date(now.getTime() + rule.lockMinutes * 60_000);
    return { state: { failedCount, lockedUntil }, justLocked: true, triesLeft: 0 };
  }
  return {
    state: { failedCount, lockedUntil: null },
    justLocked: false,
    triesLeft: rule.maxFailures - failedCount,
  };
}

export function wrongPinMessage(triesLeft: number): string {
  const tries = triesLeft === 1 ? '1 try' : `${triesLeft} tries`;
  return `Wrong PIN. ${tries} left on this device.`;
}

export function pinLockedMessage(name: string, until: Date): string {
  return `Wrong PIN ${PIN_LOCK.maxFailures} times. ${name} is locked on this device until ${formatTime(until)}.`;
}

export function accountLockedMessage(until: Date): string {
  return `Too many wrong tries. This account is locked until ${formatTime(until)}. Try again then, or reset your password.`;
}
