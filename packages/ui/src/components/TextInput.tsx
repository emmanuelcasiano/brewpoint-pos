import type { InputHTMLAttributes } from 'react';
import { cx } from './cx';
import { useFieldControl } from './field-context';

export type TextInputProps = InputHTMLAttributes<HTMLInputElement>;

/** A 56px text input. Put it inside a Field for its label, help and error. */
export function TextInput({ className, type = 'text', ...rest }: TextInputProps) {
  const control = useFieldControl(rest);
  return <input type={type} {...rest} {...control} className={cx('bp-input', className)} />;
}
