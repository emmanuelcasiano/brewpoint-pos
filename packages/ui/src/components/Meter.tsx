import { cx } from './cx';
import { formatCount } from './format-count';

export interface MeterProps {
  /** What is counted ("Devices"). */
  label: string;
  value: number;
  /** The plan limit; null for unlimited, which draws an empty track. */
  limit: number | null;
}

/** At this share of the limit the meter turns warning. */
const WARNING_AT = 0.9;

/**
 * Usage against a plan limit: "2 of 3" and a bar. It turns warning at 90%; the screen names
 * what happens at the limit. The fill width is the one inline style: runtime geometry.
 */
export function Meter({ label, value, limit }: MeterProps) {
  const share = limit ? Math.min(1, value / limit) : 0;
  const text = `${formatCount(value)} of ${limit === null ? 'unlimited' : formatCount(limit)}`;
  const measured =
    limit === null
      ? {}
      : {
          role: 'meter',
          'aria-label': label,
          'aria-valuemin': 0,
          'aria-valuemax': limit,
          'aria-valuenow': Math.min(value, limit),
          'aria-valuetext': text,
        };
  return (
    <div className={cx('bp-meter', limit !== null && share >= WARNING_AT && 'bp-meter--warning')}>
      <div className="bp-meter__head">
        <span>{label}</span>
        <b>{text}</b>
      </div>
      <div className="bp-meter__track" {...measured}>
        <div className="bp-meter__fill" style={{ width: `${Math.round(share * 100)}%` }} />
      </div>
    </div>
  );
}
