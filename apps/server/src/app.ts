import Fastify, { type FastifyInstance } from 'fastify';
import pkg from '../package.json' with { type: 'json' };

export interface AppOptions {
  logger?: boolean;
}

export function buildApp({ logger = false }: AppOptions = {}): FastifyInstance {
  const app = Fastify({ logger });

  app.get('/health', () => ({ status: 'ok', version: pkg.version }));

  return app;
}
