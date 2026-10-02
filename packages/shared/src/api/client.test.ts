import { describe, expect, it, vi } from 'vitest';
import { ApiRequestError, createApiRequest, OFFLINE_MESSAGE, type FetchLike } from './client';

function answer(status: number, body: unknown): FetchLike {
  return vi.fn(() =>
    Promise.resolve({
      status,
      ok: status >= 200 && status < 300,
      json: () =>
        body === undefined ? Promise.reject(new Error('no body')) : Promise.resolve(body),
    }),
  );
}

describe('createApiRequest', () => {
  it('sends JSON to /api with the cookies of this address, and reads the answer', async () => {
    const fetchImpl = answer(200, { ok: true });
    const request = createApiRequest(fetchImpl);

    const result = await request<{ ok: boolean }>('/auth/sign-in', {
      method: 'POST',
      body: { email: 'carlo@kapedavao.test' },
      headers: { 'x-extra': '1' },
    });

    expect(result).toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledWith('/api/auth/sign-in', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-extra': '1' },
      body: '{"email":"carlo@kapedavao.test"}',
      credentials: 'same-origin',
    });
  });

  it('returns nothing for 204', async () => {
    await expect(
      createApiRequest(answer(204, undefined))('/auth/sign-out'),
    ).resolves.toBeUndefined();
  });

  it("fails with the server's own message, code and field", async () => {
    const request = createApiRequest(
      answer(400, {
        error: { code: 'invalid_input', message: 'Enter your PIN.', details: { field: 'pin' } },
      }),
    );

    const error = await request('/pos/auth/sessions').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error).toMatchObject({ status: 400, code: 'invalid_input', message: 'Enter your PIN.' });
    expect((error as ApiRequestError).field).toBe('pin');
    expect((error as ApiRequestError).offline).toBe(false);
  });

  it('counts a network failure, or a 5xx not from BrewPoint, as offline', async () => {
    const failed = createApiRequest(() => Promise.reject(new TypeError('Failed to fetch')));
    const proxy = createApiRequest(answer(502, undefined));

    for (const request of [failed, proxy]) {
      const error = (await request('/auth/me').catch((e: unknown) => e)) as ApiRequestError;
      expect(error.offline).toBe(true);
      expect(error.message).toBe(OFFLINE_MESSAGE);
    }
  });

  it('keeps a real server error from BrewPoint as it is', async () => {
    const request = createApiRequest(
      answer(500, {
        error: { code: 'server_error', message: 'The server could not finish this.' },
      }),
    );

    const error = (await request('/auth/me').catch((e: unknown) => e)) as ApiRequestError;

    expect(error).toMatchObject({ status: 500, code: 'server_error', offline: false });
  });
});
