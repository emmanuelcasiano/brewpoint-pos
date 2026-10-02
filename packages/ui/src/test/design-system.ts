import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';

const DESIGN_SYSTEM = join(import.meta.dirname, '../../../../docs/design-system');
const STYLES = join(import.meta.dirname, '../styles');

/** Test-only: reads a file under docs/design-system, the source the package is ported from. */
export function readDesignSystem(path: string): string {
  return readFileSync(join(DESIGN_SYSTEM, path), 'utf8');
}

/** Test-only: reads a file under packages/ui/src/styles. */
export function readStyles(path: string): string {
  return readFileSync(join(STYLES, path), 'utf8');
}

export type TokenTheme = 'light' | 'dark';

/** The parts of bundle.js's window.BrewPoint the tests compare against. */
export interface ReferenceBundle {
  deriveAccent(hex: string, theme: TokenTheme): unknown;
  icon(name: string, size?: number): string;
  icons: string[];
}

/** Test-only: runs the design system's bundle.js and returns its BrewPoint helpers. */
export function loadReferenceBundle(): ReferenceBundle {
  const host: { BrewPoint?: ReferenceBundle } = {};
  runInNewContext(readDesignSystem('components/bundle.js'), { window: host });
  if (!host.BrewPoint) throw new Error('bundle.js did not define window.BrewPoint');
  return host.BrewPoint;
}

interface ColorToken {
  name: string;
  value: Record<TokenTheme, string>;
}

interface TypeStyle {
  name: string;
  fontSize: string;
  lineHeight: string;
  fontWeight: number;
  letterSpacing?: string;
}

export interface Tokens {
  color: { tokens: ColorToken[] };
  type: { groups: { styles: TypeStyle[] }[] };
}

export function readTokens(): Tokens {
  return JSON.parse(readDesignSystem('tokens.json')) as Tokens;
}

export function colorToken(tokens: Tokens, name: string, theme: TokenTheme): string {
  const found = tokens.color.tokens.find((t) => t.name === name);
  if (!found) throw new Error(`tokens.json has no color ${name}`);
  return found.value[theme];
}
