import { describe, expect, it } from 'vitest';
import pkg from '../package.json' with { type: 'json' };
import { buildApp } from './app';

describe('GET /health', () => {
  it('answers 200 with the server version', async () => {
    const app = buildApp();
    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok', version: pkg.version });
    await app.close();
  });
});
