import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance } from 'fastify';
import pkg from '../package.json' with { type: 'json' };
import { registerRequestAuth } from './core/auth/request-auth';
import { registerErrorHandler, tooManyRequests } from './core/errors';
import type { AuthDeps } from './modules/auth/deps';
import { authRoutes } from './modules/auth/routes';

export interface AppOptions {
  logger?: boolean;
  /** The databases, mailer, settings and clock the modules use. Without them only /health runs. */
  deps?: AuthDeps;
}

export function buildApp({ logger = false, deps }: AppOptions = {}): FastifyInstance {
  const app = Fastify({ logger });

  registerErrorHandler(app);
  registerRequestAuth(app);
  void app.register(cookie);
  // Off by default; routes that take a password, PIN, code or link turn it on.
  void app.register(rateLimit, { global: false, errorResponseBuilder: () => tooManyRequests() });

  app.get('/health', () => ({ status: 'ok', version: pkg.version }));

  if (deps) {
    void app.register(authRoutes(deps), { prefix: '/api' });
  }

  return app;
}
