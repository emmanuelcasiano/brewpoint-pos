import { argon2Verify } from 'hash-wasm';

/**
 * Checks a PIN against its Argon2id hash on the device, with no internet. The server makes the
 * hashes (@node-rs/argon2) in the standard PHC format, which hash-wasm reads.
 * False for a wrong PIN and for a hash it cannot read.
 */
export async function verifyPin(pinHash: string, pin: string): Promise<boolean> {
  try {
    return await argon2Verify({ password: pin, hash: pinHash });
  } catch {
    return false;
  }
}
