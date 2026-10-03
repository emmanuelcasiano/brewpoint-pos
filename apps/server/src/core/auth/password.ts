import { hash, verify } from '@node-rs/argon2';

// Argon2id with OWASP's minimum settings: 19 MiB, 2 passes, 1 lane. The library's default
// algorithm is Argon2id. The POS verifies PIN hashes with the same PHC string offline.
const OPTIONS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 };

/** Hashes a password or a PIN as an Argon2id PHC string ($argon2id$v=19$m=19456,t=2,p=1$…). */
export function hashSecret(secret: string): Promise<string> {
  return hash(secret, OPTIONS);
}

/** False for a wrong secret and for a missing or unreadable hash; never throws on bad input. */
export async function verifySecret(storedHash: string | null, secret: string): Promise<boolean> {
  if (!storedHash) return false;
  try {
    return await verify(storedHash, secret);
  } catch {
    return false;
  }
}
