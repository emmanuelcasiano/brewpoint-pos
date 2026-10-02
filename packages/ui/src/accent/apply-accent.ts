import { deriveAccent, type Accent, type ThemeName } from './derive-accent';

/** The only CSS variables a shop accent may change. */
export const ACCENT_VARIABLES = [
  '--accent',
  '--accent-hover',
  '--accent-pressed',
  '--on-accent',
  '--accent-soft',
  '--accent-strong',
] as const;

export type AccentVariable = (typeof ACCENT_VARIABLES)[number];

export function accentVariables(a: Accent): Record<AccentVariable, string> {
  return {
    '--accent': a.accent,
    '--accent-hover': a.accentHover,
    '--accent-pressed': a.accentPressed,
    '--on-accent': a.onAccent,
    '--accent-soft': a.accentSoft,
    '--accent-strong': a.accentStrong,
  };
}

/** Removes a shop accent from `el`, so the Crema values in tokens.css apply again. */
export function clearAccent(el: HTMLElement): void {
  for (const name of ACCENT_VARIABLES) el.style.removeProperty(name);
}

/**
 * Derives the accent for a theme and sets the six accent variables on `el` (usually <html>).
 * This is the one place BrewPoint sets inline styles. Call it on load and on every theme change.
 */
export function applyAccent(el: HTMLElement, hex: string, theme: ThemeName): Accent {
  const accent = deriveAccent(hex, theme);
  for (const [name, value] of Object.entries(accentVariables(accent))) {
    el.style.setProperty(name, value);
  }
  return accent;
}
