import type { AppError } from '../../core/errors';

/**
 * A transaction's result. Wrong tries must be counted and audited even though the request
 * fails, so the transaction returns the failure instead of throwing (which would roll the
 * count back), and the service throws it after the commit.
 */
export type Outcome<T> = { ok: true; value: T } | { ok: false; error: AppError };

export function fail(error: AppError): { ok: false; error: AppError } {
  return { ok: false, error };
}

export function succeed<T>(value: T): { ok: true; value: T } {
  return { ok: true, value };
}

export function unwrap<T>(outcome: Outcome<T>): T {
  if (!outcome.ok) throw outcome.error;
  return outcome.value;
}
