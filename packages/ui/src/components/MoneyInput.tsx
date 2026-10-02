import { useState, type InputHTMLAttributes } from 'react';
import { cx } from './cx';
import { useFieldControl } from './field-context';
import { formatMoneyText, isMoneyText, parseMoneyText } from './money-input-text';

export interface MoneyInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'defaultValue' | 'onChange' | 'type' | 'inputMode'
> {
  /** Integer centavos, or null when empty. */
  value: number | null;
  /** Called with integer centavos (null when cleared) on every accepted keystroke. */
  onChange: (centavos: number | null) => void;
}

/**
 * A peso amount: the ₱ prefix sits outside the editable text, the value is right-aligned in
 * tabular figures, and it goes in and out as integer centavos. Text is parsed and formatted only
 * here, at the edge.
 */
export function MoneyInput({
  value,
  onChange,
  className,
  onFocus,
  onBlur,
  ...rest
}: MoneyInputProps) {
  const control = useFieldControl(rest);
  // The text being typed; null when not editing, so the formatted value shows.
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <div className="bp-money">
      <span className="bp-money__prefix" aria-hidden="true">
        ₱
      </span>
      <input
        {...rest}
        {...control}
        type="text"
        inputMode="decimal"
        className={cx('bp-input', className)}
        value={draft ?? formatMoneyText(value)}
        onFocus={(event) => {
          setDraft(formatMoneyText(value));
          onFocus?.(event);
        }}
        onChange={(event) => {
          const text = event.target.value;
          if (!isMoneyText(text)) return;
          setDraft(text);
          onChange(parseMoneyText(text));
        }}
        onBlur={(event) => {
          setDraft(null);
          onBlur?.(event);
        }}
      />
    </div>
  );
}
