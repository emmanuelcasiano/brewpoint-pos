import { TWO_STEP_CODE_LENGTH } from '@brewpoint/shared';
import { Field, TextInput } from '@brewpoint/ui';

/** The six-digit code from an authenticator app. Keeps digits only. */
export function CodeField({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (code: string) => void;
  error?: string;
}) {
  return (
    <Field label="Six-digit code" error={error}>
      <TextInput
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={TWO_STEP_CODE_LENGTH}
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, ''))}
      />
    </Field>
  );
}
