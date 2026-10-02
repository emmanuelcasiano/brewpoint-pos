import { useCallback, useEffect, useState } from 'react';
import type { ThemeName } from '../accent/derive-accent';
import { applyTheme, readStoredTheme, storeTheme } from './theme';

/**
 * The device's theme, applied to <html> together with the shop accent (re-derived on every theme
 * change). Pass the shop's stored accent hex, or nothing before a shop is known.
 */
export function useTheme(shopAccent?: string | null): {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
} {
  const [theme, setThemeState] = useState<ThemeName>(readStoredTheme);

  useEffect(() => {
    applyTheme(theme, shopAccent);
  }, [theme, shopAccent]);

  const setTheme = useCallback((next: ThemeName) => {
    storeTheme(next);
    setThemeState(next);
  }, []);

  return { theme, setTheme };
}
