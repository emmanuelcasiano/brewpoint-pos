import { useLayoutEffect, useRef, useState } from 'react';
import { ChartKey } from './ChartKey';
import {
  barPath,
  formatAxis,
  formatValue,
  plotLayout,
  seriesColor,
  seriesMax,
  type ChartFormat,
  type ChartSeries,
  type PlotLayout,
} from './chart-geometry';
import { cx } from './cx';

interface PlotProps {
  type: 'bar' | 'line';
  title: string;
  labels: readonly string[];
  series: readonly ChartSeries[];
  format: ChartFormat;
  width: number;
  height: number;
}

interface MarkProps {
  layout: PlotLayout;
  series: readonly ChartSeries[];
  count: number;
  active: number | null;
}

function Legend({ series }: { series: readonly ChartSeries[] }) {
  return (
    <div className="bp-legend">
      {series.map((s, j) => (
        <span key={s.name} className="bp-legend__item">
          <ChartKey color={seriesColor(s, j)} dashed={s.compare} />
          {s.name}
        </span>
      ))}
    </div>
  );
}

/** Four dashed gridlines over a solid baseline, compact values on the left, x labels below. */
function Grid({
  layout,
  labels,
  format,
  width,
  height,
}: Omit<PlotProps, 'type' | 'title' | 'series'> & { layout: PlotLayout }) {
  const lines = [0, 1, 2, 3, 4].map((i) => ({ i, value: (layout.ymax * i) / 4 }));
  return (
    <>
      {lines.map(({ i, value }) => (
        <g key={i}>
          <line
            x1={layout.ml}
            x2={width - layout.mr}
            y1={layout.y(value)}
            y2={layout.y(value)}
            stroke="var(--chart-grid)"
            strokeWidth={1}
            strokeDasharray={i === 0 ? undefined : '2 4'}
          />
          <text
            className="bp-chart__axis"
            x={layout.ml - 8}
            y={layout.y(value) + 4}
            textAnchor="end"
          >
            {formatAxis(value, format)}
          </text>
        </g>
      ))}
      {labels.map((label, i) =>
        i % layout.every === 0 ? (
          <text
            key={i}
            className="bp-chart__axis"
            x={layout.x(i)}
            y={height - 8}
            textAnchor="middle"
          >
            {label}
          </text>
        ) : null,
      )}
    </>
  );
}

/** Grouped bars per bucket; the comparison bar is an outline. Hovering dims the other buckets. */
function Bars({ layout, series, count, active }: MarkProps) {
  const inner = Math.min(40, layout.band * 0.72);
  const bw = (inner - 2 * (series.length - 1)) / series.length;
  const base = layout.mt + layout.ph;
  return series.map((s, j) =>
    Array.from({ length: count }, (_, i) => {
      const bx = layout.x(i) - inner / 2 + j * (bw + 2);
      const by = layout.y(s.values[i] ?? 0);
      const o = s.compare ? 1 : 0;
      return (
        <path
          key={`${j}-${i}`}
          className={cx('bp-chart__mark', active !== null && active !== i && 'is-dim')}
          data-i={i}
          d={barPath(bx + o, by + o, bw - 2 * o, base - by - o, 4)}
          fill={s.compare ? 'var(--surface-raised)' : `var(--${seriesColor(s, j)})`}
          stroke={s.compare ? 'var(--chart-compare)' : undefined}
          strokeWidth={s.compare ? 2 : undefined}
        />
      );
    }),
  );
}

/** One line per series, the comparison dashed; the hovered bucket shows a crosshair and dots. */
function Lines({ layout, series, count, active }: MarkProps) {
  const indexes = Array.from({ length: count }, (_, i) => i);
  const point = (s: ChartSeries, i: number) => layout.y(s.values[i] ?? 0);
  return (
    <>
      {series
        .map((s, j) => (
          <path
            key={s.name}
            d={indexes
              .map((i) => `${i ? 'L' : 'M'}${layout.x(i).toFixed(1)},${point(s, i).toFixed(1)}`)
              .join('')}
            fill="none"
            stroke={`var(--${seriesColor(s, j)})`}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray={s.compare ? '6 5' : undefined}
          />
        ))
        .reverse()}
      <line
        className={cx('bp-chart__cross', active !== null && 'is-on')}
        x1={active === null ? 0 : layout.x(active)}
        x2={active === null ? 0 : layout.x(active)}
        y1={layout.mt}
        y2={layout.mt + layout.ph}
        stroke="var(--ink-muted)"
        strokeWidth={1}
      />
      {series.map((s, j) =>
        indexes.map((i) => (
          <circle
            key={`${j}-${i}`}
            className={cx('bp-chart__dot', active === i && 'is-on')}
            data-i={i}
            cx={layout.x(i)}
            cy={point(s, i)}
            r={4}
            strokeWidth={2}
            fill={`var(--${seriesColor(s, j)})`}
            stroke="var(--surface-raised)"
          />
        )),
      )}
    </>
  );
}

/**
 * Places the tooltip beside the hovered bucket, flipping left near the right edge. Its size is
 * known only once rendered, so the position is written to the element after layout, as in
 * bundle.js: runtime geometry, not a style choice.
 */
function useTipPosition(
  /** The bucket's x and the plot top, in viewBox units; x is null while nothing is hovered. */
  x: number | null,
  top: number,
  viewWidth: number,
) {
  const svg = useRef<SVGSVGElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = svg.current?.parentElement;
    if (x === null || !svg.current || !tip.current || !el) return;
    const box = svg.current.getBoundingClientRect();
    const scale = box.width / viewWidth;
    const width = tip.current.offsetWidth;
    const room = el.clientWidth - width;
    const left = x * scale + 12 > room ? x * scale - width - 12 : x * scale + 12;
    tip.current.style.left = `${Math.max(0, Math.min(room, left))}px`;
    // bundle.js reads svg.offsetTop, which SVG elements lack; this is the offset it meant.
    tip.current.style.top = `${box.top - el.getBoundingClientRect().top + top * scale}px`;
  }, [x, top, viewWidth]);
  return { svg, tip };
}

/** Bar and line charts: legend for two or more series, gridlines, marks and the hover tooltip. */
export function BarLinePlot({ type, title, labels, series, format, width, height }: PlotProps) {
  const [active, setActive] = useState<number | null>(null);
  const layout = plotLayout(type, width, height, seriesMax(series), labels.length);
  const { svg, tip } = useTipPosition(active === null ? null : layout.x(active), layout.mt, width);
  const marks = { layout, series, count: labels.length, active };

  return (
    <>
      {series.length > 1 && <Legend series={series} />}
      <svg
        ref={svg}
        className="bp-chart__svg"
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        role="img"
        aria-label={title}
        onPointerLeave={() => setActive(null)}
      >
        <Grid layout={layout} labels={labels} format={format} width={width} height={height} />
        {type === 'bar' ? <Bars {...marks} /> : <Lines {...marks} />}
        {labels.map((_, i) => (
          <rect
            key={i}
            className="bp-chart__hit"
            data-i={i}
            x={layout.ml + layout.band * i}
            y={layout.mt}
            width={layout.band}
            height={layout.ph}
            fill="transparent"
            onPointerEnter={() => setActive(i)}
          />
        ))}
      </svg>
      <div ref={tip} className="bp-tip" role="tooltip" hidden={active === null}>
        {active !== null && (
          <>
            <div className="bp-tip__title">{labels[active]}</div>
            {series.map((s, j) => (
              <div key={s.name} className="bp-tip__row">
                <ChartKey color={seriesColor(s, j)} dashed={s.compare} />
                <span>{s.name}</span>
                <b>{formatValue(s.values[active] ?? 0, format)}</b>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  );
}
