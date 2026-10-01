import { z } from 'zod';

const PORT_ERROR = 'must be a port number from 1 to 65535, like 3000';

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
  // Required from Module 02, when the server starts using the database.
  DATABASE_URL: z
    .url({ error: 'must be the full connection string from Neon, starting with postgresql://' })
    .optional(),
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
