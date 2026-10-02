import type { ButtonHTMLAttributes } from 'react';
import { Icon } from '../icons/Icon';
import { cx } from './cx';
import { formatBadge } from './format-count';

export interface BellProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label' | 'aria-expanded' | 'children'
> {
  /** Unread alerts. Shown capped at "99+"; the label keeps the real number. */
  count: number;
  /** Whether the alerts panel is open. */
  expanded: boolean;
}

/** The 44px alerts button at the far right of a back-office page head. It opens the alerts panel. */
export function Bell({ count, expanded, type = 'button', className, ...rest }: BellProps) {
  return (
    <button
      type={type}
      className={cx('bp-bell', className)}
      aria-label={count > 0 ? `Alerts, ${count} unread` : 'Alerts, none unread'}
      aria-expanded={expanded}
      {...rest}
    >
      <Icon name="bell" />
      {count > 0 && <span className="bp-bell__count">{formatBadge(count)}</span>}
    </button>
  );
}
