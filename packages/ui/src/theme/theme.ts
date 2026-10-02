import { applyAccent, clearAccent } from '../accent/apply-accent';
import { DEFAULT_ACCENT, type ThemeName } from '../accent/derive-accent';

/** Where this device remembers its theme. */
export const THEME_STORAGE_KEY = 'brewpoint.theme';

export const DEFAULT_THEME: ThemeName = 'light';

function isThemeName(value: unknown): value is ThemeName {
  return value === 'light' || value === 'dark';
}

/** The theme this device last chose, or Daylight. Storage can be missing or blocked. */
export function readStoredTheme(): ThemeName {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeName(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function storeTheme(theme: ThemeName): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage blocked: the theme still applies for this visit.
  }
}

/**
 * Sets `data-theme` on <html> and the shop accent for that theme. With no shop accent (no shop yet,
 * or the default Crema), the accent values in tokens.css apply unchanged.
 */
export function applyTheme(theme: ThemeName, shopAccent?: string | null): void {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  // tokens.css holds hand-tuned Crema values; deriving Crema would shift them slightly.
  if (shopAccent && shopAccent.toUpperCase() !== DEFAULT_ACCENT) {
    applyAccent(root, shopAccent, theme);
  } else {
    clearAccent(root);
  }
}
