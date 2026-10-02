import { describe, expect, it } from 'vitest';
import { parseEnv } from './env';

const DATABASE_URL = 'postgresql://brewpoint_app:secret@localhost:5432/brewpoint';
const PLATFORM_DATABASE_URL = 'postgresql://brewpoint_platform:secret@localhost:5432/brewpoint';
const TOTP_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
const REQUIRED = { DATABASE_URL, PLATFORM_DATABASE_URL, TOTP_ENCRYPTION_KEY };

describe('parseEnv', () => {
  it('uses local defaults when .env sets only the required values', () => {
    const result = parseEnv(REQUIRED);

    expect(result).toEqual({
      ok: true,
      env: {
        APP_ENV: 'local',
        SERVER_HOST: '127.0.0.1',
        SERVER_PORT: 3000,
        BACKOFFICE_URL: 'http://127.0.0.1:5173',
        ...REQUIRED,
      },
    });
  });

  it('reads the port as a number', () => {
    const result = parseEnv({ ...REQUIRED, SERVER_PORT: '4000' });

    expect(result.ok && result.env.SERVER_PORT).toBe(4000);
  });

  it('names the variable that is wrong', () => {
    const result = parseEnv({ ...REQUIRED, SERVER_PORT: 'three thousand', APP_ENV: 'prod' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain('SERVER_PORT: must be a port number from 1 to 65535');
      expect(result.message).toContain('APP_ENV: must be local, staging or production');
      expect(result.message).toContain('copy .env.example to .env');
    }
  });

  it('requires both database URLs and the two-step key', () => {
    const result = parseEnv({});

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain('DATABASE_URL: must be the brewpoint_app connection string');
      expect(result.message).toContain(
        'PLATFORM_DATABASE_URL: must be the brewpoint_platform connection string',
      );
      expect(result.message).toContain('TOTP_ENCRYPTION_KEY: must be 32 random bytes in base64');
    }
  });

  it('rejects a database URL that is not a URL', () => {
    const result = parseEnv({ ...REQUIRED, DATABASE_URL: 'my neon database' });

    expect(result.ok).toBe(false);
  });

  it('rejects a two-step key of the wrong length', () => {
    const result = parseEnv({
      ...REQUIRED,
      TOTP_ENCRYPTION_KEY: Buffer.alloc(16).toString('base64'),
    });

    expect(result.ok).toBe(false);
  });

  it('treats an empty demo device key as not set, and refuses a short one', () => {
    const empty = parseEnv({ ...REQUIRED, DEMO_DEVICE_KEY: '' });
    const short = parseEnv({ ...REQUIRED, DEMO_DEVICE_KEY: 'abc' });

    expect(empty.ok && empty.env.DEMO_DEVICE_KEY).toBeUndefined();
    expect(short.ok).toBe(false);
  });
});
