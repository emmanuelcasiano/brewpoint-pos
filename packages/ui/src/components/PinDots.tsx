import { cx } from './cx';

export interface PinDotsProps {
  /** How many digits are entered. */
  filled: number;
  /** The PIN length, 4 to 6. */
  length: number;
  /** After a wrong PIN: the dots turn danger. */
  error?: boolean;
}

/** The PIN as dots, never digits. */
export function PinDots({ filled, length, error = false }: PinDotsProps) {
  return (
    <div
      className={cx('bp-pin', error && 'bp-pin--error')}
      role="img"
      aria-label={`${filled} of ${length} digits entered`}
    >
      {Array.from({ length }, (_, i) => (
        <span key={i} className={cx('bp-pin__dot', i < filled && 'is-filled')} />
      ))}
    </div>
  );
}
