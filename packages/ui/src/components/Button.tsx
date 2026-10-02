import type { ButtonHTMLAttributes, MouseEvent } from 'react';
import { Icon } from '../icons/Icon';
import type { IconName } from '../icons/icon-paths';
import { cx } from './cx';

export type ButtonVariant = 'default' | 'primary' | 'quiet' | 'danger';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Default is the outlined secondary button. One primary per region; danger only for destructive steps. */
  variant?: ButtonVariant;
  /** `lg` is 72px (Pay only), `sm` is 44px (back-office only, never on a tablet POS screen). */
  size?: 'sm' | 'md' | 'lg';
  block?: boolean;
  /** A leading icon. While loading it is replaced by the spinning refresh icon. */
  icon?: IconName;
  /** While a save runs: keeps the label, spins the refresh icon, sets aria-busy and ignores clicks. */
  loading?: boolean;
}

/** The action control. Its label names the result ("Void sale", "Pay ₱373.50"), never "OK". */
export function Button({
  variant = 'default',
  size = 'md',
  block = false,
  icon,
  loading = false,
  type = 'button',
  className,
  onClick,
  children,
  ...rest
}: ButtonProps) {
  const leading = loading ? 'refresh' : icon;

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (loading) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  }

  return (
    <button
      type={type}
      className={cx(
        'bp-btn',
        variant !== 'default' && `bp-btn--${variant}`,
        size !== 'md' && `bp-btn--${size}`,
        block && 'bp-btn--block',
        loading && 'is-loading',
        className,
      )}
      aria-busy={loading || undefined}
      onClick={handleClick}
      {...rest}
    >
      {leading && <Icon name={leading} />}
      {children}
    </button>
  );
}
