import { buildApp } from './app';
import { parseEnv } from './env';

const parsed = parseEnv(process.env);
if (!parsed.ok) {
  console.error(parsed.message);
  process.exit(1);
}

const { env } = parsed;
const app = buildApp({ logger: true });

await app.listen({ host: env.SERVER_HOST, port: env.SERVER_PORT });
