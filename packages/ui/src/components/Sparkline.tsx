import { sparklineGeometry, type ChartColor } from './chart-geometry';

export interface SparklineProps {
  /** Up to 14 points, oldest first. Fewer than two draws nothing. */
  values: readonly number[];
  /** Defaults to chart-1. */
  color?: ChartColor;
}

/**
 * A 96x28 trend line for a stat tile, with a dot on the last point. Decoration for a trend the
 * tile already states in words: no axis, no tooltip, hidden from screen readers.
 */
export function Sparkline({ values, color = 'chart-1' }: SparklineProps) {
  if (values.length < 2) return null;
  const { width, height, d, end } = sparklineGeometry(values);
  const stroke = `var(--${color})`;
  return (
    <span data-spark="">
      <svg
        className="bp-spark"
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d={d}
          fill="none"
          stroke={stroke}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle cx={end.x} cy={end.y} r={3} fill={stroke} />
      </svg>
    </span>
  );
}
