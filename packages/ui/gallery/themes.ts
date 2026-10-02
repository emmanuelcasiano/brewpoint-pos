import type { ThemeName } from '../src';

export const THEME_LABEL: Record<ThemeName, string> = { light: 'Daylight', dark: 'Night shift' };

/** The two themes as Segmented options. */
export const THEME_OPTIONS = (['light', 'dark'] as const).map((key) => ({
  key,
  label: THEME_LABEL[key],
}));
