import { Icon } from '../icons/Icon';
import { cx } from './cx';
import { NUMPAD_KEYS, type NumpadKey } from './numpad-keys';

export interface NumpadProps {
  /** Called with the key pressed; pair it with applyNumpadKey. */
  onKey: (key: NumpadKey) => void;
  /** Disables every key, for example while a user is locked out. */
  disabled?: boolean;
  /** Adds a full-width confirm key under the pad, for entries whose length varies. */
  confirmLabel?: string;
  /** Disables only the confirm key, until the entry is complete. */
  confirmDisabled?: boolean;
  /** Names the keypad for assistive technology ("PIN keypad"). */
  label?: string;
  className?: string;
}

/** A 3-by-4 keypad with 72px keys, for PINs and cash. Use it instead of the on-screen keyboard. */
export function Numpad({
  onKey,
  disabled = false,
  confirmLabel,
  confirmDisabled = false,
  label,
  className,
}: NumpadProps) {
  return (
    <div className={cx('bp-numpad', className)} role="group" aria-label={label}>
      {NUMPAD_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          className={key === 'clear' ? 'bp-key bp-key--action' : 'bp-key'}
          aria-label={key === 'delete' ? 'Delete' : undefined}
          disabled={disabled}
          onClick={() => onKey(key)}
        >
          {key === 'clear' && 'Clear'}
          {key === 'delete' && <Icon name="backspace" size={26} />}
          {key !== 'clear' && key !== 'delete' && key}
        </button>
      ))}
      {confirmLabel && (
        <button
          type="button"
          className="bp-key bp-key--action bp-key--confirm col-span-full"
          disabled={disabled || confirmDisabled}
          onClick={() => onKey('confirm')}
        >
          {confirmLabel}
        </button>
      )}
    </div>
  );
}
