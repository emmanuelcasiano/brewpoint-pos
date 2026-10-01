import { afterEach, describe, expect, it, vi } from 'vitest';
import { uuidv7 } from './uuid-v7';

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function timestampOf(id: string): number {
  return Number.parseInt(id.replaceAll('-', '').slice(0, 12), 16);
}

describe('uuidv7', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('has the UUID format with version 7 and the RFC 9562 variant', () => {
    expect(uuidv7()).toMatch(UUID_V7);
  });

  it('starts with the current time in milliseconds', () => {
    const before = Date.now();
    const id = uuidv7();
    const after = Date.now();

    expect(timestampOf(id)).toBeGreaterThanOrEqual(before);
    expect(timestampOf(id)).toBeLessThanOrEqual(after);
  });

  it('sorts in creation order within the same millisecond', () => {
    vi.useFakeTimers({ now: new Date('2026-10-02T03:05:00Z') });
    const ids = Array.from({ length: 1000 }, () => uuidv7());

    expect([...ids].sort()).toEqual(ids);
  });

  it('keeps sorting in order when the device clock goes back', () => {
    vi.useFakeTimers({ now: new Date('2026-10-02T03:05:00Z') });
    const first = uuidv7();
    vi.setSystemTime(new Date('2026-10-02T03:04:00Z'));
    const second = uuidv7();

    expect(second > first).toBe(true);
  });

  it('makes 10,000 different IDs', () => {
    const ids = new Set(Array.from({ length: 10_000 }, () => uuidv7()));

    expect(ids.size).toBe(10_000);
  });
});
