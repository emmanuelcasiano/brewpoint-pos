import { contrast, isAccentHex } from './contrast';
import { hexToHsl, hslToHex, shade } from './hsl';

export type ThemeName = 'light' | 'dark';

/** Every accent token, derived from one shop hex. Each text pair is at least 4.5:1. */
export interface Accent {
  /** Fill of the primary button and the selected category. */
  accent: string;
  accentHover: string;
  accentPressed: string;
  /** Dark ink or white, whichever reads better on `accent`. */
  onAccent: string;
  accentSoft: string;
  /** Accent-colored text and borders; at least 4.5:1 on surface-raised and accentSoft. */
  accentStrong: string;
}

/** Shown under the accent field for anything that is not `#RRGGBB`. */
export const ACCENT_HEX_ERROR = 'Enter a color like #1F8A8A';

/** The default accent, Crema. */
export const DEFAULT_ACCENT = '#E2A13B';

// The contrast maths needs real colors, not CSS variables. These match tokens.json
// (ink and surface-raised in each theme); accent.test.ts fails if they drift.
export const ACCENT_INK = '#2B1D14';
export const ACCENT_WHITE = '#FFFFFF';
export const ACCENT_GROUND: Record<ThemeName, string> = { light: '#FFFCF8', dark: '#251B15' };

const TEXT_RATIO = 4.5;
const DARK_GROUND_RATIO = 3;

function bestOn(hex: string): string {
  return contrast(ACCENT_INK, hex) >= contrast(ACCENT_WHITE, hex) ? ACCENT_INK : ACCENT_WHITE;
}

// Moves an accent's lightness away from its text color until the pair reaches 4.5:1.
function fixOn(hex: string): string {
  const on = bestOn(hex);
  const step = on === ACCENT_INK ? 0.01 : -0.01;
  let out = hex;
  for (let i = 0; i < 60 && contrast(on, out) < TEXT_RATIO; i++) out = shade(out, step);
  return out;
}

// One step away from the accent, backing off while the text pair would drop under 4.5:1.
function keepOn(base: string, delta: number, on: string): string {
  for (let k = 1; k >= 0; k -= 0.25) {
    const candidate = shade(base, delta * k);
    if (contrast(on, candidate) >= TEXT_RATIO) return candidate;
  }
  return base;
}

function liftOnDarkGround(hex: string): string {
  let out = hex;
  for (let i = 0; i < 60 && contrast(out, ACCENT_GROUND.dark) < DARK_GROUND_RATIO; i++) {
    out = shade(out, 0.01);
  }
  return fixOn(out);
}

function strongFor(accent: string, soft: string, theme: ThemeName): string {
  const step = theme === 'dark' ? 0.01 : -0.01;
  let strong = accent;
  for (let i = 0; i < 90; i++) {
    if (
      contrast(strong, ACCENT_GROUND[theme]) >= TEXT_RATIO &&
      contrast(strong, soft) >= TEXT_RATIO
    ) {
      break;
    }
    strong = shade(strong, step);
  }
  return strong;
}

/**
 * Derives every accent token from one shop hex for a theme (guidelines/30-per-shop-accent.md).
 * Throws on anything but `#RRGGBB`; validate with isAccentHex and show ACCENT_HEX_ERROR first.
 */
export function deriveAccent(hex: string, theme: ThemeName): Accent {
  if (!isAccentHex(hex)) {
    throw new Error(`${ACCENT_HEX_ERROR}. Got "${hex}".`);
  }
  let accent = fixOn(hex.toUpperCase());
  if (theme === 'dark') accent = liftOnDarkGround(accent);

  const on = bestOn(accent);
  const delta = theme === 'dark' ? 0.06 : -0.06;
  const [h, s] = hexToHsl(accent);
  const soft = hslToHex(h, Math.min(s, 0.7), theme === 'dark' ? 0.16 : 0.87);

  return {
    accent,
    accentHover: keepOn(accent, delta, on),
    accentPressed: keepOn(accent, delta * 2, on),
    onAccent: on,
    accentSoft: soft,
    accentStrong: strongFor(accent, soft, theme),
  };
}
