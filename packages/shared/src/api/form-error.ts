import { ApiRequestError } from './client';

const PAGE_FAILED = 'This page could not finish that. Reload the page and try again.';

export interface FormError<F extends string> {
  /** Messages to show under these fields. */
  fields: Partial<Record<F, string>>;
  /** A page-level message for a Banner: offline (neutral) or a state problem (warning). */
  banner: { tone: 'offline' | 'warning'; message: string } | null;
}

/**
 * Where a failed submit's message goes: under the field it is about, or in a banner when it
 * is about the whole page (a lock, no connection). `fieldFor` sends some codes to a field,
 * such as a wrong password to the password field.
 */
export function formErrorOf<F extends string>(
  error: unknown,
  fields: readonly F[],
  fieldFor: Partial<Record<string, F>> = {},
): FormError<F> {
  if (!(error instanceof ApiRequestError)) {
    return { fields: {}, banner: { tone: 'warning', message: PAGE_FAILED } };
  }
  if (error.offline) return { fields: {}, banner: { tone: 'offline', message: error.message } };

  const field = (fields as readonly string[]).includes(error.field ?? '')
    ? (error.field as F)
    : fieldFor[error.code];
  if (field)
    return { fields: { [field]: error.message } as Partial<Record<F, string>>, banner: null };
  return { fields: {}, banner: { tone: 'warning', message: error.message } };
}
