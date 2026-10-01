interface RandomSource {
  getRandomValues(array: Uint8Array): Uint8Array;
}

// Web Crypto exists in Node 22 and every browser; this package has no DOM or Node types.
const randomSource = (globalThis as unknown as { crypto: RandomSource }).crypto;

const MAX_COUNTER = 0xfff;

let lastTimestamp = -1;
let counter = 0;

/**
 * A UUID version 7 (RFC 9562): 48 bits of Unix milliseconds, then randomness.
 * IDs sort by creation time, and IDs made in the same millisecond on this device
 * still sort in order (a 12-bit counter in rand_a), so devices can create rows offline.
 */
export function uuidv7(): string {
  const bytes = randomSource.getRandomValues(new Uint8Array(16));
  let timestamp = Date.now();

  if (timestamp > lastTimestamp) {
    // Start the counter in the lower half so it rarely overflows within one millisecond.
    counter = (((bytes[6] ?? 0) << 8) | (bytes[7] ?? 0)) & 0x7ff;
  } else {
    // Same millisecond, or the clock went back: stay on the last timestamp and count up.
    timestamp = lastTimestamp;
    counter += 1;
    if (counter > MAX_COUNTER) {
      timestamp += 1;
      counter = 0;
    }
  }
  lastTimestamp = timestamp;

  for (let i = 5; i >= 0; i -= 1) {
    bytes[i] = timestamp % 256;
    timestamp = Math.floor(timestamp / 256);
  }
  bytes[6] = 0x70 | (counter >> 8);
  bytes[7] = counter & 0xff;
  bytes[8] = 0x80 | ((bytes[8] ?? 0) & 0x3f);

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
