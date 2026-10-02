import type { SelectHTMLAttributes } from 'react';
import { cx } from './cx';
import { useFieldControl } from './field-context';

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

/** A native select styled as an input, with `option` children. Put it inside a Field. */
export function Select({ className, children, ...rest }: SelectProps) {
  const control = useFieldControl(rest);
  return (
    <select {...rest} {...control} className={cx('bp-input bp-select', className)}>
      {children}
    </select>
  );
}
