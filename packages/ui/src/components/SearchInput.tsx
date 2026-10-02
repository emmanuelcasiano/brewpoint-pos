import type { InputHTMLAttributes } from 'react';
import { Icon } from '../icons/Icon';
import { cx } from './cx';

export interface SearchInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'aria-label'
> {
  /** The input's name for screen readers ("Search inventory"); the placeholder is not a label. */
  label: string;
}

/** A 44px search box with a leading search icon, for a Toolbar. */
export function SearchInput({ label, className, type = 'text', ...rest }: SearchInputProps) {
  return (
    <label className={cx('bp-search', className)}>
      <Icon name="search" />
      <input type={type} className="bp-input" aria-label={label} {...rest} />
    </label>
  );
}
