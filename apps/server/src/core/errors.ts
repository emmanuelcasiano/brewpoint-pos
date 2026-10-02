import type { FastifyError, FastifyInstance } from 'fastify';
import { z } from 'zod';

/**
 * A failure the person can act on. The message is shown as written, so it says what happened
 * and what to do next ("Wrong PIN. 3 tries left on this device."), never "Something went wrong".
 * `code` is stable for the apps to branch on; `details` carries values the screen needs
 * (tries left, when a lock ends, which field).
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

/**
 * Checks a request part against a module's schema. The first problem becomes a 400 with the
 * schema's plain-language message and the field it is about, for the screen to show under it.
 */
export function parseInput<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const issue = result.error.issues[0];
  const field = issue?.path.map(String).join('.') || undefined;
  throw new AppError(400, 'invalid_input', issue?.message ?? 'Check the form and try again.', {
    ...(field ? { field } : {}),
  });
}

/** What @fastify/rate-limit throws when an IP goes over a route's limit. */
export function tooManyRequests(): AppError {
  return new AppError(
    429,
    'rate_limited',
    'Too many tries from this network. Wait a minute and try again.',
  );
}

const SERVER_FAILED =
  'The server could not finish this. Try again in a moment; if it keeps happening, contact BrewPoint support.';
const UNREADABLE = 'The server could not read this request. Reload the page and try again.';

function send(status: number, code: string, message: string, details?: Record<string, unknown>) {
  return {
    status,
    body: {
      error: { code, message, ...(details && Object.keys(details).length ? { details } : {}) },
    },
  };
}

/** Every error leaves the server as `{ error: { code, message, details? } }` (ApiError). */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError | AppError, request, reply) => {
    let response;
    if (isAppError(error)) {
      response = send(error.status, error.code, error.message, error.details);
    } else if (typeof error.statusCode === 'number' && error.statusCode < 500) {
      response = send(error.statusCode, 'bad_request', UNREADABLE);
    } else {
      request.log.error(error);
      response = send(500, 'server_error', SERVER_FAILED);
    }
    return reply.status(response.status).send(response.body);
  });

  app.setNotFoundHandler((_request, reply) => {
    const { status, body } = send(404, 'not_found', 'This address does not exist on the server.');
    return reply.status(status).send(body);
  });
}
