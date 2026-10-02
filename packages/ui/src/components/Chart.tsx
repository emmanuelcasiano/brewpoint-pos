import { useLayoutEffect, useRef, useState } from 'react';
import { BarLinePlot } from './ChartPlot';
import {
  formatValue,
  hbarPath,
  niceMax,
  seriesMax,
  type ChartFormat,
  type ChartSeries,
} from './chart-geometry';
import { DataTable, type DataTableColumn } from './DataTable';

export interface ChartProps {
  /**
   * Pick by the question: `bar` for a measure per time bucket, `line` for a trend across days
   * (with the last period as `compare`), `hbar` for a ranked list. Never a pie or donut.
   */
  type: 'bar' | 'line' | 'hbar';
  /** The chart's accessible name and the table view's caption ("Sales by hour"). */
  title: string;
  labels: readonly string[];
  /** Four at most, the current period first; fold a fifth into "Other". */
  series: readonly ChartSeries[];
  /** "peso" values are integer centavos. Defaults to "count". */
  format?: ChartFormat;
  /** Bar and line height in px. Defaults to 220. */
  height?: number;
  /** The hbar label column in px. Defaults to 140. */
  labelWidth?: number;
  /** The table view's first column header ("Hour", "Day", "Product"). */
  labelHeading: string;
  /** Shown instead of an empty axis ("No sales yet today. Sales appear here as they sync."). */
  emptyText: string;
}

const DEFAULT_WIDTH = 560;
const MIN_WIDTH = 280;

/** The chart's drawn width: its box, re-measured when the box resizes. */
function useChartWidth(empty: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth || DEFAULT_WIDTH);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [empty]);
  return { ref, width: Math.max(MIN_WIDTH, Math.round(width)) };
}

interface HBarProps {
  title: string;
  labels: readonly string[];
  series: ChartSeries;
  format: ChartFormat;
  width: number;
  labelWidth: number;
}

/** A ranked list: label, bar on a sunken track, and the value printed at the row's end. */
function HBarPlot({ title, labels, series, format, width, labelWidth }: HBarProps) {
  const rowH = 36;
  const barH = 14;
  const pw = width - labelWidth - 96;
  const max = niceMax(seriesMax([series]));
  const color = `var(--${series.color ?? 'chart-1'})`;
  return (
    <svg
      className="bp-chart__svg"
      viewBox={`0 0 ${width} ${labels.length * rowH}`}
      width="100%"
      height={labels.length * rowH}
      role="img"
      aria-label={title}
    >
      {labels.map((label, i) => {
        const y = i * rowH;
        const value = series.values[i] ?? 0;
        const bw = Math.max(value > 0 ? 3 : 0, (pw * value) / max);
        const barY = y + (rowH - barH) / 2;
        return (
          <g key={i} className="bp-chart__hit" data-i={i}>
            <rect x={0} y={y} width={width} height={rowH} fill="transparent" />
            <text className="bp-chart__label" x={0} y={y + rowH / 2 + 5}>
              {label}
            </text>
            <rect
              x={labelWidth}
              y={barY}
              width={pw}
              height={barH}
              rx={4}
              fill="var(--surface-sunken)"
            />
            <path d={hbarPath(labelWidth, barY, bw, barH, 4)} fill={color} />
            <text className="bp-chart__value" x={width} y={y + rowH / 2 + 5} textAnchor="end">
              {formatValue(value, format)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

interface TableRow {
  label: string;
  index: number;
}

/** The same numbers as a table, behind "Show as table". Every chart has one. */
function TableView({
  title,
  labels,
  series,
  format,
  labelHeading,
}: ChartProps & { format: ChartFormat }) {
  const columns: DataTableColumn<TableRow>[] = [
    { key: 'label', header: labelHeading, cell: (row) => row.label },
    ...series.map((s, j) => ({
      key: `series-${j}`,
      header: s.name,
      numeric: true,
      cell: (row: TableRow) => formatValue(s.values[row.index] ?? 0, format),
    })),
  ];
  return (
    <details className="bp-tableview">
      <summary>Show as table</summary>
      <DataTable
        caption={title}
        columns={columns}
        rows={labels.map((label, index) => ({ label, index }))}
        rowKey={(row) => String(row.index)}
      />
    </details>
  );
}

/** No buckets, or nothing above zero in any of them: an empty period. */
function isEmpty(labels: readonly string[], series: readonly ChartSeries[]): boolean {
  return labels.length === 0 || series.every((s) => s.values.every((v) => v === 0));
}

/**
 * A bar, line or ranked-bar chart drawn as SVG, with a hover tooltip on bar and line charts and
 * a table view. Series colors are chart-1 to chart-4 and chart-compare, never the shop accent.
 * Place it in a Card, whose meta leads with the period in words.
 */
export function Chart(props: ChartProps) {
  const { type, title, labels, series, format = 'count', height = 220, labelWidth = 140 } = props;
  const first = series[0];
  const empty = !first || isEmpty(labels, series);
  const { ref, width } = useChartWidth(empty);

  if (!first || empty) return <p className="bp-note">{props.emptyText}</p>;
  return (
    <>
      <div ref={ref} className="bp-chart">
        {type === 'hbar' ? (
          <HBarPlot
            title={title}
            labels={labels}
            series={first}
            format={format}
            width={width}
            labelWidth={labelWidth}
          />
        ) : (
          <BarLinePlot
            type={type}
            title={title}
            labels={labels}
            series={series}
            format={format}
            width={width}
            height={height}
          />
        )}
      </div>
      <TableView {...props} format={format} />
    </>
  );
}
