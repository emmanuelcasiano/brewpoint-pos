import type { ReactNode } from 'react';
import { Icon } from '../icons/Icon';
import type { ChartColor } from './chart-geometry';
import { cx } from './cx';
import { Sparkline } from './Sparkline';

export interface StatDelta {
  direction: 'up' | 'down';
  /** How much it moved: "7.0%", "2 voids". */
  amount: string;
  /** The comparison in words: "vs last Monday". */
  comparison: string;
  /** Only when everyone agrees on the direction: sales up is good, voids up is bad. */
  tone?: 'good' | 'bad';
}

export interface StatTileProps {
  /** The measure and scope in sentence case ("Net sales today"). */
  label: string;
  /** The formatted number; money through formatPeso. */
  value: ReactNode;
  /** Left out when there is nothing to compare with, such as a new shop's first day. */
  delta?: StatDelta;
  /** Up to 14 points for the sparkline. */
  spark?: readonly number[];
  sparkColor?: ChartColor;
  /** While the number is being fetched: placeholder blocks, no sparkline. */
  loading?: boolean;
}

const DIRECTION_WORD = { up: 'Up', down: 'Down' } as const;

function Delta({ delta }: { delta: StatDelta }) {
  return (
    <span className={cx('bp-stat__delta', delta.tone && `bp-stat__delta--${delta.tone}`)}>
      <Icon name={`arrow-${delta.direction}`} size={16} />
      {DIRECTION_WORD[delta.direction]} {delta.amount} <span>{delta.comparison}</span>
    </span>
  );
}

/** A KPI tile: one label, one number, how it moved in words, and an optional trend line. */
export function StatTile({
  label,
  value,
  delta,
  spark,
  sparkColor,
  loading = false,
}: StatTileProps) {
  return (
    <div className={cx('bp-stat', loading && 'is-loading')} aria-busy={loading || undefined}>
      <span className="bp-stat__label">{label}</span>
      <div className="bp-stat__row">
        {loading ? (
          <span className="bp-stat__value" aria-hidden="true">
            ₱00,000.00
          </span>
        ) : (
          <span className="bp-stat__value">{value}</span>
        )}
        {!loading && spark && <Sparkline values={spark} color={sparkColor} />}
      </div>
      {loading ? (
        <span className="bp-stat__delta">Loading comparison</span>
      ) : (
        delta && <Delta delta={delta} />
      )}
    </div>
  );
}
