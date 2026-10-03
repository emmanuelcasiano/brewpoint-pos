import { z } from 'zod';

const PORT_ERROR = 'must be a port number from 1 to 65535, like 3000';
const TOTP_KEY_ERROR =
  'must be 32 random bytes in base64. Make one with: node -e "console.log(crypto.randomBytes(32).toString(\'base64\'))"';

function isBase64Key(value: string): boolean {
  return /^[A-Za-z0-9+/]+={0,2}$/.test(value) && Buffer.from(value, 'base64').length === 32;
}

const envSchema = z.object({
  APP_ENV: z
    .enum(['local', 'staging', 'production'], { error: 'must be local, staging or production' })
    .default('local'),
  SERVER_HOST: z.string().min(1, { error: 'must not be empty' }).default('127.0.0.1'),
  SERVER_PORT: z.coerce
    .number({ error: PORT_ERROR })
    .int({ error: PORT_ERROR })
    .min(1, { error: PORT_ERROR })
    .max(65535, { error: PORT_ERROR })
    .default(3000),
  // The brewpoint_app login, printed by pnpm db:roles. Never the owner: it skips row-level security.
  DATABASE_URL: z.url({
    error:
      'must be the brewpoint_app connection string printed by pnpm db:roles, starting with postgresql://',
  }),
  // The staff console's login, also printed by pnpm db:roles.
  PLATFORM_DATABASE_URL: z.url({
    error:
      'must be the brewpoint_platform connection string printed by pnpm db:roles, starting with postgresql://',
  }),
  // Encrypts staff two-step secrets at rest. Changing it turns off every staff member's two-step.
  TOTP_ENCRYPTION_KEY: z.string({ error: TOTP_KEY_ERROR }).refine(isBase64Key, TOTP_KEY_ERROR),
  // Where links in sign-in emails point.
  BACKOFFICE_URL: z
    .url({ error: 'must be the back-office address, like https://app.brewpoint.ph' })
    .default('http://127.0.0.1:5173'),
  // Until device pairing (Module 06): the key the demo POS sends. Used only when APP_ENV is local.
  DEMO_DEVICE_KEY: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().min(16, { error: 'must be at least 16 characters, or left empty' }).optional(),
  ),
});

export type Env = z.infer<typeof envSchema>;

export type EnvResult = { ok: true; env: Env } | { ok: false; message: string };

export function parseEnv(source: Record<string, string | undefined>): EnvResult {
  const result = envSchema.safeParse(source);
  if (result.success) {
    return { ok: true, env: result.data };
  }
  const problems = result.error.issues.map(
    (issue) => `- ${issue.path.join('.')}: ${issue.message}`,
  );
  return {
    ok: false,
    message: [
      'The server cannot start because .env has a problem:',
      ...problems,
      'Fix these in .env (copy .env.example to .env if it does not exist yet).',
    ].join('\n'),
  };
}
