import { describe, expect, it } from 'vitest';
import { colorToken, loadReferenceBundle, readTokens } from '../test/design-system';
import { ACCENT_VARIABLES, applyAccent } from './apply-accent';
import { contrast, isAccentHex } from './contrast';
import {
  ACCENT_GROUND,
  ACCENT_HEX_ERROR,
  ACCENT_INK,
  DEFAULT_ACCENT,
  deriveAccent,
  type ThemeName,
} from './derive-accent';

const tokens = readTokens();
const token = (name: string, theme: ThemeName) => colorToken(tokens, name, theme);

const THEMES: ThemeName[] = ['light', 'dark'];

describe('deriveAccent', () => {
  // The design system's own bundle.js, so the port is checked against the reference itself.
  const reference = loadReferenceBundle();

  it.each([
    [DEFAULT_ACCENT, 'light'],
    [DEFAULT_ACCENT, 'dark'],
    ['#9C3D54', 'light'],
    ['#9C3D54', 'dark'],
    ['#222222', 'dark'],
    ['#1F8A8A', 'light'],
    ['#FFFFFF', 'dark'],
    ['#000000', 'light'],
  ] as [string, ThemeName][])('matches bundle.js for %s in %s', (hex, theme) => {
    expect(deriveAccent(hex, theme)).toEqual(reference.deriveAccent(hex, theme));
  });

  it.each(THEMES)('keeps every accent text pair at 4.5:1 or more for #9C3D54 in %s', (theme) => {
    const a = deriveAccent('#9C3D54', theme);

    expect(contrast(a.onAccent, a.accent)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(a.onAccent, a.accentHover)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(a.onAccent, a.accentPressed)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(a.accentStrong, ACCENT_GROUND[theme])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(a.accentStrong, a.accentSoft)).toBeGreaterThanOrEqual(4.5);
  });

  it('lifts accent #222222 to at least 3:1 against the Night shift ground', () => {
    const a = deriveAccent('#222222', 'dark');

    expect(contrast(a.accent, ACCENT_GROUND.dark)).toBeGreaterThanOrEqual(3);
    expect(contrast(a.onAccent, a.accent)).toBeGreaterThanOrEqual(4.5);
  });

  it('refuses anything but #RRGGBB with the field message', () => {
    expect(() => deriveAccent('#1F8A8', 'light')).toThrow(ACCENT_HEX_ERROR);
    expect(() => deriveAccent('teal', 'light')).toThrow(ACCENT_HEX_ERROR);
  });

  it('accepts lowercase hex', () => {
    expect(isAccentHex('#9c3d54')).toBe(true);
    expect(deriveAccent('#9c3d54', 'light')).toEqual(deriveAccent('#9C3D54', 'light'));
  });

  it('uses the ink and ground colors from tokens.json', () => {
    expect(ACCENT_INK).toBe(token('ink', 'light'));
    expect(ACCENT_GROUND.light).toBe(token('surface-raised', 'light'));
    expect(ACCENT_GROUND.dark).toBe(token('surface-raised', 'dark'));
  });
});

describe('applyAccent', () => {
  it('sets only the six accent variables', () => {
    const el = document.createElement('div');

    const a = applyAccent(el, '#9C3D54', 'light');

    const set = Array.from({ length: el.style.length }, (_, i) => el.style.item(i));
    expect(set.sort()).toEqual([...ACCENT_VARIABLES].sort());
    expect(el.style.getPropertyValue('--accent')).toBe(a.accent);
    expect(el.style.getPropertyValue('--accent-strong')).toBe(a.accentStrong);
  });
});
