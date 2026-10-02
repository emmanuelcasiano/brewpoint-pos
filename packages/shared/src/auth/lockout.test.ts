import { describe, expect, it } from 'vitest';
import {
  ACCOUNT_LOCK,
  accountLockedMessage,
  isLocked,
  PIN_LOCK,
  pinLockedMessage,
  recordFailure,
  UNLOCKED,
  wrongPinMessage,
  type LockState,
} from './lockout';

const NOW = new Date('2026-10-03T07:00:00Z'); // 3:00 PM in Manila

function failTimes(times: number, rule = PIN_LOCK) {
  let result = recordFailure(UNLOCKED, rule, NOW);
  for (let i = 1; i < times; i++) result = recordFailure(result.state, rule, NOW);
  return result;
}

describe('lockout rules', () => {
  it('counts down the PIN tries and locks on the fifth for 5 minutes', () => {
    expect(failTimes(1).triesLeft).toBe(4);
    expect(failTimes(2).triesLeft).toBe(3);
    expect(failTimes(4).triesLeft).toBe(1);

    const fifth = failTimes(5);
    expect(fifth.justLocked).toBe(true);
    expect(fifth.state.lockedUntil).toEqual(new Date('2026-10-03T07:05:00Z'));
    expect(isLocked(fifth.state, new Date('2026-10-03T07:04:59Z'))).toBe(true);
    expect(isLocked(fifth.state, new Date('2026-10-03T07:05:00Z'))).toBe(false);
  });

  it('locks an account after 10 wrong passwords for 15 minutes', () => {
    expect(failTimes(9, ACCOUNT_LOCK).justLocked).toBe(false);
    const tenth = failTimes(10, ACCOUNT_LOCK);
    expect(tenth.justLocked).toBe(true);
    expect(tenth.state.lockedUntil).toEqual(new Date('2026-10-03T07:15:00Z'));
  });

  it('gives the full number of tries again once a lock has ended', () => {
    const ended: LockState = { failedCount: 5, lockedUntil: new Date('2026-10-03T06:59:00Z') };

    const next = recordFailure(ended, PIN_LOCK, NOW);

    expect(next).toEqual({
      state: { failedCount: 1, lockedUntil: null },
      justLocked: false,
      triesLeft: 4,
    });
  });

  it('writes the messages the brief asks for', () => {
    expect(wrongPinMessage(3)).toBe('Wrong PIN. 3 tries left on this device.');
    expect(wrongPinMessage(1)).toBe('Wrong PIN. 1 try left on this device.');
    expect(pinLockedMessage('Ana Cruz', new Date('2026-10-03T07:05:00Z'))).toBe(
      'Wrong PIN 5 times. Ana Cruz is locked on this device until 3:05 PM.',
    );
    expect(accountLockedMessage(new Date('2026-10-03T07:15:00Z'))).toContain(
      'locked until 3:15 PM',
    );
  });
});
