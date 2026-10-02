import { createContext, useContext } from 'react';

export interface FieldControl {
  id: string;
  /** The help and error ids, for aria-describedby. */
  describedBy?: string;
  invalid: boolean;
}

export const FieldContext = createContext<FieldControl | null>(null);

/**
 * The props that tie an input to its Field: the label's id, aria-invalid and aria-describedby.
 * Outside a Field it returns only what the input was given.
 */
export function useFieldControl(own: { id?: string; 'aria-describedby'?: string }) {
  const field = useContext(FieldContext);
  const describedBy =
    [field?.describedBy, own['aria-describedby']].filter(Boolean).join(' ') || undefined;
  return {
    id: own.id ?? field?.id,
    'aria-invalid': field?.invalid || undefined,
    'aria-describedby': describedBy,
  };
}
