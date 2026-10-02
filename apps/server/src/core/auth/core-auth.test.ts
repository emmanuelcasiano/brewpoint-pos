import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
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
