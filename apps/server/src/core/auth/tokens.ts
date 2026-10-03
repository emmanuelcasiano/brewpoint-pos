import { createHash, randomBytes } from 'node:crypto';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SECRET = /^[A-Za-z0-9_-]{43}$/;

export interface NewToken {
  /** Given to the person once (cookie, bearer or link); never stored. */
  token: string;
  /** What the database keeps. */
  hash: string;
}

/** 32 random bytes, base64url. */
function newSecret(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * sha256 hex. Tokens are long random values, so a fast hash is enough: there is nothing to
 * guess, and a stolen table of hashes gives no usable token.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** A staff session token: random only, since staff tables have no tenant. */
export function newStaffToken(): NewToken {
  const token = newSecret();
  return { token, hash: hashToken(token) };
}

/**
 * A shop token (session or email link): "<tenant id>.<secret>". The prefix says which shop to
 * look in before row-level security can show anything; the hash covers the whole token, so a
 * changed prefix matches nothing.
 */
export function newShopToken(tenantId: string): NewToken {
  const token = `${tenantId}.${newSecret()}`;
  return { token, hash: hashToken(token) };
}

/** The tenant id at the front of a shop token, or null when it is not one. */
export function shopTokenTenant(token: string): string | null {
  const [tenantId, secret, ...rest] = token.split('.');
  if (rest.length > 0 || !tenantId || !secret) return null;
  return UUID.test(tenantId) && SECRET.test(secret) ? tenantId.toLowerCase() : null;
}

export function isStaffToken(token: string): boolean {
  return SECRET.test(token);
}
