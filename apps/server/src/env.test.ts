import { describe, expect, it } from 'vitest';
import { parseEnv } from './env';

describe('parseEnv', () => {
  it('uses local defaults when .env sets nothing', () => {
    const result = parseEnv({});

    expect(result).toEqual({
      ok: true,
      env: { APP_ENV: 'local', SERVER_HOST: '127.0.0.1', SERVER_PORT: 3000 },
    });
  });

  it('reads the port as a number', () => {
    const result = parseEnv({ SERVER_PORT: '4000' });

    expect(result.ok && result.env.SERVER_PORT).toBe(4000);
  });

  it('names the variable that is wrong', () => {
    const result = parseEnv({ SERVER_PORT: 'three thousand', APP_ENV: 'prod' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain('SERVER_PORT: must be a port number from 1 to 65535');
      expect(result.message).toContain('APP_ENV: must be local, staging or production');
      expect(result.message).toContain('copy .env.example to .env');
    }
  });

  it('rejects a database URL that is not a URL', () => {
    const result = parseEnv({ DATABASE_URL: 'my neon database' });

    expect(result.ok).toBe(false);
  });
});
