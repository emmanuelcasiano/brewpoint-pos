import { describe, expect, it } from 'vitest';
import { formatPeso } from './format-peso';

describe('formatPeso', () => {
  it('formats the cases in the Module 01 brief', () => {
    expect(formatPeso(124500)).toBe('₱1,245.00');
    expect(formatPeso(-4150)).toBe('-₱41.50');
    expect(formatPeso(0)).toBe('₱0.00');
  });

  it('pads centavos below ten', () => {
    expect(formatPeso(5)).toBe('₱0.05');
    expect(formatPeso(-5)).toBe('-₱0.05');
  });

  it('groups thousands in large amounts', () => {
    expect(formatPeso(100000000)).toBe('₱1,000,000.00');
  });
});
