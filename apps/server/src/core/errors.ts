/**
 * A failure the person can act on. The message is shown as written, so it says what happened
 * and what to do next ("Wrong PIN. 3 tries left on this device."), never "Something went wrong".
 * `code` is stable for the apps to branch on; `details` carries values the screen needs
 * (tries left, when a lock ends).
 */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
