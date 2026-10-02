import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon } from '../icons/Icon';
import type { IconName } from '../icons/icon-paths';
import { cx } from './cx';
import type { ChipTone } from './StatusChip';

export interface ChipButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  tone?: ChipTone;
  icon: IconName;
  /** Spins the icon, for a running state such as "Syncing 3 sales". */
  spin?: boolean;
  /** For a chip that toggles, such as a filter. Sets aria-pressed. */
  pressed?: boolean;
  children: ReactNode;
}

/** A 44px status chip that does something when tapped (the sync chip opens the queue). */
export function ChipButton({
  tone = 'neutral',
  icon,
  spin = false,
  pressed,
  type = 'button',
  className,
  children,
  ...rest
}: ChipButtonProps) {
  return (
    <button
      type={type}
      className={cx('bp-chip bp-chip--action', tone !== 'neutral' && `bp-chip--${tone}`, className)}
      aria-pressed={pressed}
      {...rest}
    >
      <Icon name={icon} size={18} className={spin ? 'is-spin' : undefined} />
      {children}
    </button>
  );
}
