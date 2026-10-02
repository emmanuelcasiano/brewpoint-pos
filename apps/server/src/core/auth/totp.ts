import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { Secret, TOTP } from 'otpauth';

const ISSUER = 'BrewPoint';
const ALGORITHM = 'aes-256-gcm';
const FORMAT = 'v1';

/** SHA-1, 6 digits, 30 seconds: what every authenticator app supports. */
function totpFor(secretBase32: string, label = ''): TOTP {
  return new TOTP({
    issuer: ISSUER,
    label,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secretBase32),
  });
}

/** A new 160-bit secret, base32 (what people type into an app if they cannot scan). */
export function newTotpSecret(): string {
  return new Secret({ size: 20 }).base32;
}

/** The otpauth:// address the setup screen shows as a QR code. */
export function totpUri(secretBase32: string, email: string): string {
  return totpFor(secretBase32, email).toString();
}

/** Accepts the code for now and one step either side, for clock drift. */
export function verifyTotp(secretBase32: string, code: string, now: Date): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  return (
    totpFor(secretBase32).validate({ token: code, timestamp: now.getTime(), window: 1 }) !== null
  );
}

/** For tests: the code an app would show at this moment. */
export function totpCode(secretBase32: string, at: Date): string {
  return totpFor(secretBase32).generate({ timestamp: at.getTime() });
}

/**
 * Encrypts a two-step secret for platform_users.totp_secret_enc with AES-256-GCM:
 * "v1.<iv>.<tag>.<ciphertext>", each base64url. The key is TOTP_ENCRYPTION_KEY (32 bytes).
 */
export function encryptTotpSecret(secretBase32: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(secretBase32, 'utf8'), cipher.final()]);
  return [FORMAT, iv, cipher.getAuthTag(), ciphertext]
    .map((part) => (typeof part === 'string' ? part : part.toString('base64url')))
    .join('.');
}

/** Throws when the value was changed or the key is not the one it was encrypted with. */
export function decryptTotpSecret(encrypted: string, key: Buffer): string {
  const [format, iv, tag, ciphertext] = encrypted.split('.');
  if (format !== FORMAT || !iv || !tag || !ciphertext) {
    throw new Error('The stored two-step secret is not in a format this server can read.');
  }
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}
