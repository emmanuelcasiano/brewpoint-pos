import type { ReactNode } from 'react';
import { Icon } from '../icons/Icon';
import type { IconName } from '../icons/icon-paths';
import { cx } from './cx';

export interface SegmentedOption<K extends string> {
  key: K;
  label: ReactNode;
  icon?: IconName;
}

export interface SegmentedProps<K extends string> {
  /** What the options choose ("Period"). */
  label: string;
  options: readonly SegmentedOption<K>[];
  value: K;
  onChange: (key: K) => void;
  className?: string;
}

/** A compact one-of-few switch in a page head, such as the dashboard period. */
export function Segmented<K extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: SegmentedProps<K>) {
  return (
    <div className={cx('bp-segmented', className)} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          aria-pressed={option.key === value}
          onClick={() => onChange(option.key)}
        >
          {option.icon && (
            <>
              <Icon name={option.icon} size={16} />{' '}
            </>
          )}
          {option.label}
        </button>
      ))}
    </div>
  );
}
