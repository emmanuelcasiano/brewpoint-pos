import type { InputHTMLAttributes } from 'react';
import { cx } from './cx';

export interface SwitchProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'role' | 'aria-label'
> {
  /** The setting it turns on or off ("Out of stock, push"). */
  label: string;
}

/**
 * An on or off setting that takes effect at once. A locked switch is disabled, with its reason
 * in the section note.
 */
export function Switch({ label, className, ...rest }: SwitchProps) {
  return (
    <input
      type="checkbox"
      role="switch"
      aria-label={label}
      className={cx('bp-switch', className)}
      {...rest}
    />
  );
}
