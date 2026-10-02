import type { DeviceAuthEventInput } from '@brewpoint/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ANA, HASH_1234, pinList } from '../test/fixtures';
import { flushAuthEvents, pendingAuthEvents, queueAuthEvent } from './auth-events';
import { resetLocalStore } from './local-store';
import { readLockout, readPinCache, writeLockout, writePinCache } from './pin-cache';
import { verifyPin } from './pin-verifier';

beforeEach(async () => {
  await resetLocalStore();
});

describe('verifyPin', () => {
  it('accepts the right PIN against a hash the server made, and refuses others', async () => {
    expect(await verifyPin(HASH_1234, '1234')).toBe(true);
    expect(await verifyPin(HASH_1234, '1235')).toBe(false);
    expect(await verifyPin('not a hash', '1234')).toBe(false);
  });
});

describe('the PIN cache', () => {
  it('keeps the staff list and replaces it whole', async () => {
    await writePinCache(pinList([ANA]));
    await writePinCache(pinList([]));

    expect(await readPinCache()).toEqual(pinList([]));
  });

  it("keeps each person's wrong tries, with the lock time", async () => {
    const lockedUntil = new Date('2026-10-03T07:05:00Z');
    await writeLockout(ANA.id, { failedCount: 5, lockedUntil });

    expect(await readLockout(ANA.id)).toEqual({ failedCount: 5, lockedUntil });
    expect(await readLockout('someone-else')).toEqual({ failedCount: 0, lockedUntil: null });
  });
});

describe('auth events', () => {
  it('sends waiting events oldest first, once, and keeps them if sending fails', async () => {
    await queueAuthEvent('signed_in', ANA.id, new Date('2026-10-03T07:00:00Z'));
    await queueAuthEvent('signed_out', ANA.id, new Date('2026-10-03T07:10:00Z'));

    await expect(flushAuthEvents(() => Promise.reject(new Error('offline')))).rejects.toThrow();
    expect(await pendingAuthEvents()).toHaveLength(2);

    const send = vi.fn<(events: DeviceAuthEventInput[]) => Promise<void>>(() => Promise.resolve());
    expect(await flushAuthEvents(send)).toBe(2);
    expect(await flushAuthEvents(send)).toBe(0);
    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0]?.[0]).toMatchObject([
      { type: 'signed_in', userId: ANA.id, happenedAt: '2026-10-03T07:00:00.000Z' },
      { type: 'signed_out', userId: ANA.id, happenedAt: '2026-10-03T07:10:00.000Z' },
    ]);
  });
});
