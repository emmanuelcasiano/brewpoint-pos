import type { CSSProperties } from 'react';

/**
 * The series swatch in the legend and tooltip. bundle.css colors it through `--key`, so the
 * style carries a token reference only, never a color value.
 */
export function ChartKey({ color, dashed }: { color: string; dashed?: boolean }) {
  const style = { '--key': `var(--${color})` } as CSSProperties;
  return <span className={dashed ? 'bp-legend__key is-dashed' : 'bp-legend__key'} style={style} />;
}
