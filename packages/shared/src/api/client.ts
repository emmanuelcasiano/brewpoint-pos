import type { ApiError } from '../contracts/auth';

/** A failed call to the server, with the message to show as written. */
export class ApiRequestError extends Error {
  constructor(
    /** 0 when the server could not be reached. */
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }

  /** No answer: the device is offline or the server is down. On the POS this is normal. */
  get offline(): boolean {
    return this.status === 0;
  }

  /** The form field an input error is about, to show the message under it. */
  get field(): string | undefined {
    return typeof this.details.field === 'string' ? this.details.field : undefined;
  }
}

export const OFFLINE_MESSAGE =
  'No connection to BrewPoint. Check the internet connection and try again.';

function isApiError(body: unknown): body is ApiError {
  if (typeof body !== 'object' || body === null || !('error' in body)) return false;
  const { error } = body;
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    typeof error.code === 'string' &&
    typeof error.message === 'string'
  );
}

/**
 * The error for a response that was not ok. A body that is not BrewPoint's error shape with a
 * 5xx status came from something in between (the dev proxy, a load balancer) because the
 * server is not answering, so it counts as offline.
 */
export function errorFromResponse(status: number, body: unknown): ApiRequestError {
  if (isApiError(body)) {
    const { code, message, details } = body.error;
    return new ApiRequestError(status, code, message, details ?? {});
  }
  if (status >= 500) return new ApiRequestError(0, 'offline', OFFLINE_MESSAGE);
  return new ApiRequestError(
    status,
    'unexpected_response',
    'The server answered in a way this app does not understand. Reload the page and try again.',
  );
}

/** The part of fetch the client uses, so it needs no browser types and tests can pass a fake. */
export type FetchLike = (
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body?: string;
    credentials: 'same-origin';
  },
) => Promise<{ status: number; ok: boolean; json(): Promise<unknown> }>;

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE';
  /** Sent as JSON. */
  body?: unknown;
  headers?: Record<string, string>;
}

export type ApiRequest = <T>(path: string, options?: RequestOptions) => Promise<T>;

/**
 * Calls the server at `/api` on the app's own address (the dev server proxies it), with the
 * app's cookies. Fails with ApiRequestError: the server's own message, or offline.
 */
export function createApiRequest(fetchImpl: FetchLike, base = '/api'): ApiRequest {
  return async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
    const hasBody = options.body !== undefined;
    let response;
    try {
      response = await fetchImpl(`${base}${path}`, {
        method: options.method ?? 'GET',
        headers: {
          ...(hasBody ? { 'content-type': 'application/json' } : {}),
          ...options.headers,
        },
        ...(hasBody ? { body: JSON.stringify(options.body) } : {}),
        credentials: 'same-origin',
      });
    } catch {
      throw new ApiRequestError(0, 'offline', OFFLINE_MESSAGE);
    }
    const body: unknown =
      response.status === 204 ? undefined : await response.json().catch(() => null);
    if (!response.ok) throw errorFromResponse(response.status, body);
    return body as T;
  };
}
