import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon } from '../icons/Icon';
import type { IconName } from '../icons/icon-paths';
import { cx } from './cx';
import { formatCount } from './format-count';

export interface FilterChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Whether this filter is on. Sets aria-pressed. */
  pressed: boolean;
  icon?: IconName;
  /** How many rows the filter shows, after the label. */
  count?: number;
  children: ReactNode;
}

/** A 44px toggle chip in a Toolbar ("Needs attention 5"). */
export function FilterChip({
  pressed,
  icon,
  count,
  type = 'button',
  className,
  children,
  ...rest
}: FilterChipProps) {
  return (
    <button
      type={type}
      className={cx('bp-chip bp-chip--action', className)}
      aria-pressed={pressed}
      {...rest}
    >
      {icon && <Icon name={icon} size={16} />}
      {children}
      {count !== undefined && (
        <>
          {' '}
          <span className="bp-chip__count">{formatCount(count)}</span>
        </>
      )}
    </button>
  );
}
