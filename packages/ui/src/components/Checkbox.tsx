import type { InputHTMLAttributes, ReactNode } from 'react';
import { cx } from './cx';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** The text beside the box. Box and text share one label, so the tap area is 44px tall. */
  label: ReactNode;
}

/** A 28px checkbox inside a 44px label. */
export function Checkbox({ label, className, ...rest }: CheckboxProps) {
  return (
    <label className={cx('flex min-h-target-min items-center gap-3', className)}>
      <input type="checkbox" className="bp-check" {...rest} />
      <span>{label}</span>
    </label>
  );
}
