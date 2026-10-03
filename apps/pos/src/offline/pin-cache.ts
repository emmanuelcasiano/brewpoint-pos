import { UNLOCKED, type LockState, type PinUsersResponse } from '@brewpoint/shared';
import { getItem, putItem } from './local-store';

/** The staff list as the server last sent it: who may sign in here, with their PIN hashes. */
export type PinCache = PinUsersResponse;

const CURRENT = 'current';

export function readPinCache(): Promise<PinCache | undefined> {
  return getItem<PinCache>('pin_cache', CURRENT);
}

/** Replaces the whole list, so anyone the server left out (deactivated, moved) is gone. */
export function writePinCache(cache: PinCache): Promise<void> {
  return putItem('pin_cache', CURRENT, cache);
}

interface StoredLock {
  failedCount: number;
  lockedUntil: string | null;
}

/** Wrong PIN tries of one person on this device. */
export async function readLockout(userId: string): Promise<LockState> {
  const stored = await getItem<StoredLock>('pin_lockouts', userId);
  if (!stored) return UNLOCKED;
  return {
    failedCount: stored.failedCount,
    lockedUntil: stored.lockedUntil ? new Date(stored.lockedUntil) : null,
  };
}

export function writeLockout(userId: string, lock: LockState): Promise<void> {
  const stored: StoredLock = {
    failedCount: lock.failedCount,
    lockedUntil: lock.lockedUntil?.toISOString() ?? null,
  };
  return putItem('pin_lockouts', userId, stored);
}
