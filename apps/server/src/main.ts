import { buildApp } from './app';
import { parseEnv } from './env';
import { describeListenError } from './listen-error';

const parsed = parseEnv(process.env);
if (!parsed.ok) {
  console.error(parsed.message);
  process.exit(1);
}

const { env } = parsed;
const app = buildApp({ logger: true });

try {
  await app.listen({ host: env.SERVER_HOST, port: env.SERVER_PORT });
} catch (error) {
  console.error(describeListenError(error, env.SERVER_HOST, env.SERVER_PORT));
  process.exit(1);
}
