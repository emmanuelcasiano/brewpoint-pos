import { useId, type ReactNode } from 'react';
import { Icon } from '../icons/Icon';
import { cx } from './cx';
import { FieldContext } from './field-context';

export interface FieldProps {
  /** Always visible above the input; a placeholder never replaces it. */
  label: ReactNode;
  help?: ReactNode;
  /** Says how to fix it: "Enter an email like name@shop.com". Sets the error state. */
  error?: ReactNode;
  /** The input's id; one is generated when left out. */
  id?: string;
  className?: string;
  /** One TextInput, Select or MoneyInput. It picks up the id and the aria attributes. */
  children: ReactNode;
}

/** A label, one input, and its help or error text. */
export function Field({ label, help, error, id, className, children }: FieldProps) {
  const generated = useId();
  const inputId = id ?? generated;
  const helpId = `${inputId}-help`;
  const errorId = `${inputId}-error`;
  const invalid = Boolean(error);
  const describedBy = [help && helpId, invalid && errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cx('bp-field', invalid && 'bp-field--error', className)}>
      <label className="bp-field__label" htmlFor={inputId}>
        {label}
      </label>
      <FieldContext value={{ id: inputId, describedBy, invalid }}>{children}</FieldContext>
      {help && (
        <span className="bp-field__help" id={helpId}>
          {help}
        </span>
      )}
      {invalid && (
        <span className="bp-field__error" id={errorId}>
          <Icon name="alert" size={16} />
          {error}
        </span>
      )}
    </div>
  );
}
