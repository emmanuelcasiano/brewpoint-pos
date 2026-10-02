import { formatPeso, formatPesoShort } from '@brewpoint/shared';

/** The fixed series colors, in order. Never the shop accent or a status color. */
export type ChartColor = 'chart-1' | 'chart-2' | 'chart-3' | 'chart-4';

/** "peso" values are integer centavos. */
export type ChartFormat = 'peso' | 'count' | 'pct';

export interface ChartSeries {
  name: string;
  values: readonly number[];
  /** Defaults to chart-1, chart-2… by position. */
  color?: ChartColor;
  /** The comparison period: drawn dashed in chart-compare. */
  compare?: boolean;
}

/** The color token a series draws with: its own, its position's, or chart-compare. */
export function seriesColor(series: ChartSeries, index: number): string {
  if (series.compare) return 'chart-compare';
  return series.color ?? `chart-${index + 1}`;
}

/** The axis top: the next round step (1, 1.2, 1.5, 2…) at or above v. */
export function niceMax(v: number): number {
  if (v <= 0) return 1;
  const power = Math.pow(10, Math.floor(Math.log(v) / Math.LN10));
  const f = v / power;
  const step = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((s) => f <= s) ?? 10;
  return step * power;
}

function oneDecimal(n: number): string {
  return (Math.round(n * 10) / 10).toString();
}

/** Full values, for tooltips, hbar row ends and the table view. */
export function formatValue(v: number, format: ChartFormat): string {
  if (format === 'peso') return formatPeso(v);
  if (format === 'pct') return `${oneDecimal(v)}%`;
  return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Compact values, for the y-axis only ("₱12k", "1.5k"). */
export function formatAxis(v: number, format: ChartFormat): string {
  if (format === 'peso') return formatPesoShort(v);
  if (format === 'pct') return `${oneDecimal(v)}%`;
  return v >= 1000 ? `${oneDecimal(v / 1000)}k` : String(v);
}

/** A vertical bar with 4px rounded ends: square at the baseline, round at the value end. */
export function barPath(x: number, y: number, w: number, h: number, radius: number): string {
  const r = Math.min(radius, w / 2, h);
  if (h <= 0) return '';
  return (
    `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}` +
    `H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`
  );
}

/** A horizontal bar, square at the left edge and round at the value end. */
export function hbarPath(x: number, y: number, w: number, h: number, radius: number): string {
  const r = Math.min(radius, h / 2, w);
  if (w <= 0) return '';
  return (
    `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}` +
    `V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`
  );
}

/** The largest value across every series; the scale starts from it. */
export function seriesMax(series: readonly ChartSeries[]): number {
  return series.reduce((max, s) => Math.max(max, ...s.values), 0);
}

/** Bar and line layout: margins, plot size and the value-to-pixel scales, as in bundle.js. */
export function plotLayout(
  type: 'bar' | 'line',
  width: number,
  height: number,
  max: number,
  n: number,
) {
  const ml = 56;
  const mr = type === 'line' ? 16 : 8;
  const mt = 12;
  const mb = 28;
  const pw = width - ml - mr;
  const ph = height - mt - mb;
  const ymax = niceMax(max * 1.05);
  const band = pw / n;
  return {
    ml,
    mr,
    mt,
    pw,
    ph,
    ymax,
    band,
    y: (v: number) => mt + ph - (ph * v) / ymax,
    x: (k: number) => ml + band * k + band / 2,
    /** Show every nth x label so labels keep about 44px each. */
    every: Math.max(1, Math.ceil(n / Math.floor(pw / 44))),
  };
}

export type PlotLayout = ReturnType<typeof plotLayout>;

/** A 96x28 trend line; the last point gets a dot. Needs two or more values. */
export function sparklineGeometry(values: readonly number[]) {
  const w = 96;
  const h = 28;
  const p = 3;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  let d = '';
  let x = 0;
  let y = 0;
  values.forEach((v, i) => {
    x = p + ((w - 2 * p) * i) / (values.length - 1);
    y = p + (h - 2 * p) * (1 - (v - min) / range);
    d += `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return { width: w, height: h, d, end: { x: x.toFixed(1), y: y.toFixed(1) } };
}
