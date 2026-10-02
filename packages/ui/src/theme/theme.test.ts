import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { applyTheme, readStoredTheme, THEME_STORAGE_KEY } from './theme';
import { useTheme } from './use-theme';

const root = () => document.documentElement;

describe('readStoredTheme', () => {
  it('defaults to Daylight', () => {
    expect(readStoredTheme()).toBe('light');
  });

  it('returns the theme this device stored', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');

    expect(readStoredTheme()).toBe('dark');
  });

  it('ignores a stored value that is not a theme', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'sepia');

    expect(readStoredTheme()).toBe('light');
  });

  it('falls back to Daylight when storage is blocked', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(readStoredTheme()).toBe('light');
    spy.mockRestore();
  });
});

describe('applyTheme', () => {
  it('sets data-theme on <html>', () => {
    applyTheme('dark');

    expect(root()).toHaveAttribute('data-theme', 'dark');
  });

  it('applies a shop accent for the theme', () => {
    applyTheme('dark', '#9C3D54');

    expect(root().style.getPropertyValue('--accent')).not.toBe('');
  });

  it('leaves the tokens.css accent alone for Crema or no shop accent', () => {
    applyTheme('light', '#9C3D54');
    applyTheme('light', '#e2a13b');

    expect(root().style.getPropertyValue('--accent')).toBe('');

    applyTheme('light', '#9C3D54');
    applyTheme('light', null);

    expect(root().style.getPropertyValue('--accent')).toBe('');
  });
});

describe('useTheme', () => {
  it('applies the stored theme and remembers a change on this device', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('dark');
    expect(root()).toHaveAttribute('data-theme', 'dark');

    act(() => result.current.setTheme('light'));

    expect(root()).toHaveAttribute('data-theme', 'light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('re-derives the shop accent when the theme changes', () => {
    const { result } = renderHook(() => useTheme('#9C3D54'));
    const daylight = root().style.getPropertyValue('--accent');

    act(() => result.current.setTheme('dark'));

    expect(root().style.getPropertyValue('--accent')).not.toBe(daylight);
  });
});
