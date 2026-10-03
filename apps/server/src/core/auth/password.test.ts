import { describe, expect, it } from 'vitest';
import { hashSecret, verifySecret } from './password';

describe('hashSecret and verifySecret', () => {
  it('hashes with Argon2id at the agreed cost, never storing the secret', async () => {
    const stored = await hashSecret('1234');

    expect(stored).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(stored).not.toContain('1234');
  });

  it('gives the same secret a different hash each time', async () => {
    expect(await hashSecret('1234')).not.toBe(await hashSecret('1234'));
  });

  it('accepts the right secret and refuses a wrong one', async () => {
    const stored = await hashSecret('kape-davao-2026');

    expect(await verifySecret(stored, 'kape-davao-2026')).toBe(true);
    expect(await verifySecret(stored, 'kape-davao-2025')).toBe(false);
  });

  it('refuses when there is no hash or the hash is unreadable', async () => {
    expect(await verifySecret(null, '1234')).toBe(false);
    expect(await verifySecret('not a hash', '1234')).toBe(false);
  });
});
