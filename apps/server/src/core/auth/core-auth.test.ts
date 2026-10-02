import { randomBytes } from 'node:crypto';
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
import { hashToken, isStaffToken, newShopToken, newStaffToken, shopTokenTenant } from './tokens';
import {
  decryptTotpSecret,
  encryptTotpSecret,
  newTotpSecret,
  totpCode,
  totpUri,
  verifyTotp,
} from './totp';

const NOW = new Date('2026-10-03T07:00:00Z'); // 3:00 PM in Manila
const TENANT = '0199a001-0000-7000-8000-000000000001';

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

describe('tokens', () => {
  it('puts the tenant in front of a shop token and hashes the whole token', () => {
    const { token, hash } = newShopToken(TENANT);

    expect(shopTokenTenant(token)).toBe(TENANT);
    expect(hash).toBe(hashToken(token));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(token).not.toContain(hash);
  });

  it('makes a different token every time', () => {
    expect(newShopToken(TENANT).token).not.toBe(newShopToken(TENANT).token);
  });

  it('reads no tenant from a staff token or from junk', () => {
    const staff = newStaffToken().token;

    expect(isStaffToken(staff)).toBe(true);
    expect(shopTokenTenant(staff)).toBeNull();
    expect(shopTokenTenant(`not-a-uuid.${staff}`)).toBeNull();
    expect(shopTokenTenant(`${TENANT}.short`)).toBeNull();
    expect(shopTokenTenant(`${TENANT}.${staff}.extra`)).toBeNull();
    expect(isStaffToken(newShopToken(TENANT).token)).toBe(false);
  });
});

describe('two-step codes', () => {
  const key = randomBytes(32);

  it('accepts the current code and one step either side, and nothing else', () => {
    const secret = newTotpSecret();

    expect(verifyTotp(secret, totpCode(secret, NOW), NOW)).toBe(true);
    expect(verifyTotp(secret, totpCode(secret, new Date(NOW.getTime() - 30_000)), NOW)).toBe(true);
    expect(verifyTotp(secret, totpCode(secret, new Date(NOW.getTime() + 90_000)), NOW)).toBe(false);
    expect(verifyTotp(secret, '12345', NOW)).toBe(false);
    expect(verifyTotp(secret, 'abcdef', NOW)).toBe(false);
  });

  it('names BrewPoint and the staff email in the authenticator address', () => {
    const uri = totpUri(newTotpSecret(), 'dev@brewpoint.test');

    expect(uri).toMatch(/^otpauth:\/\/totp\/BrewPoint:dev%40brewpoint\.test\?/);
    expect(uri).toContain('issuer=BrewPoint');
    expect(uri).toContain('digits=6');
  });

  it('encrypts the secret so only the same key reads it back', () => {
    const secret = newTotpSecret();
    const stored = encryptTotpSecret(secret, key);

    expect(stored).not.toContain(secret);
    expect(stored).toMatch(/^v1\./);
    expect(decryptTotpSecret(stored, key)).toBe(secret);
    expect(() => decryptTotpSecret(stored, randomBytes(32))).toThrow();
    expect(() => decryptTotpSecret('v1.broken', key)).toThrow('not in a format');
  });
});
