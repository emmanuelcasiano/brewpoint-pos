import { buildApp } from './app';
import { createDb, createPlatformDb } from './core/db/client';
import { LogMailer } from './core/mail/mailer';
import { parseEnv } from './env';
import { describeListenError } from './listen-error';

const parsed = parseEnv(process.env);
if (!parsed.ok) {
  console.error(parsed.message);
  process.exit(1);
}

const { env } = parsed;
const db = createDb(env.DATABASE_URL);
const platformDb = createPlatformDb(env.PLATFORM_DATABASE_URL);
const app = buildApp({
  logger: true,
  deps: {
    db,
    platformDb,
    // Until a mail provider is chosen (before staging), emails are written to the log.
    mailer: new LogMailer((line) => app.log.info(line)),
    config: {
      appEnv: env.APP_ENV,
      backofficeUrl: env.BACKOFFICE_URL,
      totpKey: Buffer.from(env.TOTP_ENCRYPTION_KEY, 'base64'),
      demoDeviceKey: env.DEMO_DEVICE_KEY,
    },
    now: () => new Date(),
  },
});
app.addHook('onClose', async () => {
  await Promise.all([db.destroy(), platformDb.destroy()]);
});

try {
  await app.listen({ host: env.SERVER_HOST, port: env.SERVER_PORT });
} catch (error) {
  console.error(describeListenError(error, env.SERVER_HOST, env.SERVER_PORT));
  process.exit(1);
}
