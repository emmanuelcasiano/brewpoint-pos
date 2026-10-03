import { describe, expect, it } from 'vitest';
import { formatTime } from './format-time';

describe('formatTime', () => {
  it('shows 12-hour Manila time with a plain space', () => {
    expect(formatTime(new Date('2026-09-27T07:05:00Z'))).toBe('3:05 PM');
  });

  it('shows the morning and midnight', () => {
    expect(formatTime(new Date('2026-09-27T01:30:00Z'))).toBe('9:30 AM');
    expect(formatTime(new Date('2026-09-26T16:00:00Z'))).toBe('12:00 AM');
  });
});
