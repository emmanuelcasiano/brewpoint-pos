import type { ReactNode } from 'react';
import { Icon } from '../icons/Icon';
import type { IconName } from '../icons/icon-paths';
import { cx } from './cx';

export type ChipTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export interface StatusChipProps {
  /** Neutral for offline and closed states; never invent a new status color. */
  tone?: ChipTone;
  /** check for good, alert for warning, x or lock for blocked, clock for time-limited, calendar-x for expired. */
  icon: IconName;
  /** The word, three words at most ("Low, 3 left"). */
  children: ReactNode;
  className?: string;
}

/** A static 28px pill that states one status in an icon and a word. It never carries an action. */
export function StatusChip({ tone = 'neutral', icon, children, className }: StatusChipProps) {
  return (
    <span className={cx('bp-chip', tone !== 'neutral' && `bp-chip--${tone}`, className)}>
      <Icon name={icon} size={16} />
      {children}
    </span>
  );
}
