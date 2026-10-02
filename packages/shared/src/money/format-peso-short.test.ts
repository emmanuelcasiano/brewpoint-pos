import { describe, expect, it } from 'vitest';
import { formatPesoShort } from './format-peso-short';

describe('formatPesoShort', () => {
  it('shortens thousands with one decimal, as in the Chart README', () => {
    expect(formatPesoShort(1250000)).toBe('₱12.5k');
    expect(formatPesoShort(1200000)).toBe('₱12k');
  });

  it('shortens millions', () => {
    expect(formatPesoShort(250000000)).toBe('₱2.5M');
  });

  it('rounds amounts under a thousand pesos to whole pesos', () => {
    expect(formatPesoShort(0)).toBe('₱0');
    expect(formatPesoShort(37350)).toBe('₱374');
  });

  it('keeps the sign on negative amounts', () => {
    expect(formatPesoShort(-1250000)).toBe('-₱12.5k');
  });
});
