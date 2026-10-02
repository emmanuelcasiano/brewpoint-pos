import type {
  DeviceAuthEventsResponse,
  PasswordLinkInfo,
  PinSignInResponse,
  PinUsersResponse,
  ShopMe,
  StaffMe,
  StaffSignInResponse,
  TwoStepSetupResponse,
} from '@brewpoint/shared';
import type { CookieSerializeOptions } from '@fastify/cookie';
import type { FastifyInstance, FastifyPluginCallback, FastifyReply, FastifyRequest } from 'fastify';
import {
  bearerToken,
  deviceOf,
  requireDemoDevice,
  requireShopUser,
  requireStaff,
  SHOP_COOKIE,
  shopIdentityOf,
  STAFF_COOKIE,
  staffIdentityOf,
} from '../../core/auth/request-auth';
import { resolveStaffSession } from '../../core/auth/sessions';
import { parseInput } from '../../core/errors';
import type { AuthDeps } from './deps';
import { signInAgain } from './errors';
import { listPinUsers, recordDeviceEvents, signInWithPin, signOutPos } from './pos.service';
import * as schemas from './schemas';
import {
  checkLink,
  describeShopUser,
  requestPasswordReset,
  setPassword,
  signIn,
  signOut,
} from './shop.service';
import {
  beginTwoStepSetup,
  confirmTwoStepSetup,
  describeStaff,
  staffSignIn,
  staffSignOut,
  verifyTwoStep,
} from './staff.service';

// Sign-in endpoints, mounted under /api. No permission codes here: Module 04 adds them.
// Each route says who may call it: public (rate limited), a shop user on a surface, a staff
// member at a stage, or a POS device.

/** Per IP, on every route that takes a password, PIN, code or link. */
const RATE_LIMITED = {
  config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
};

function cookieOptions(deps: AuthDeps): CookieSerializeOptions {
  // No Max-Age: the cookie lasts until the browser closes; the server ends idle sessions.
  return {
    httpOnly: true,
    sameSite: 'strict',
    path: '/api',
    secure: deps.config.appEnv !== 'local',
  };
}

function noContent(reply: FastifyReply): FastifyReply {
  return reply.status(204).send();
}

/** The module's routes as a Fastify plugin; app.ts mounts it under /api. */
export function authRoutes(deps: AuthDeps): FastifyPluginCallback {
  return (app, _options, done) => {
    shopRoutes(app, deps);
    posRoutes(app, deps);
    consoleRoutes(app, deps);
    done();
  };
}

function shopRoutes(app: FastifyInstance, deps: AuthDeps): void {
  const signedIn = { preHandler: requireShopUser(deps, 'backoffice') };

  app.post('/auth/sign-in', RATE_LIMITED, async (request, reply): Promise<ShopMe> => {
    const body = parseInput(schemas.signInBody, request.body);
    const result = await signIn(deps, { ...body, ipAddress: request.ip });
    reply.setCookie(SHOP_COOKIE, result.token, cookieOptions(deps));
    return describeShopUser(deps, result.identity);
  });

  app.post('/auth/sign-out', async (request, reply) => {
    const token = request.cookies[SHOP_COOKIE];
    if (token) await signOut(deps, token);
    reply.clearCookie(SHOP_COOKIE, cookieOptions(deps));
    return noContent(reply);
  });

  app.get('/auth/me', signedIn, (request): Promise<ShopMe> =>
    describeShopUser(deps, shopIdentityOf(request)),
  );

  app.post('/auth/password/forgot', RATE_LIMITED, async (request, reply) => {
    const { email } = parseInput(schemas.forgotPasswordBody, request.body);
    await requestPasswordReset(deps, email);
    return noContent(reply);
  });

  app.get('/auth/password/link', RATE_LIMITED, (request): Promise<PasswordLinkInfo> => {
    const { token } = parseInput(schemas.linkQuery, request.query);
    return checkLink(deps, token);
  });

  app.post('/auth/password/set', RATE_LIMITED, async (request, reply) => {
    const body = parseInput(schemas.setPasswordBody, request.body);
    await setPassword(deps, body);
    return noContent(reply);
  });
}

function posRoutes(app: FastifyInstance, deps: AuthDeps): void {
  const fromDevice = { preHandler: requireDemoDevice(deps) };
  const signedIn = { preHandler: requireShopUser(deps, 'pos') };

  app.get('/pos/auth/users', fromDevice, async (request): Promise<PinUsersResponse> => {
    const users = await listPinUsers(deps, deviceOf(request));
    return {
      users: users.map(({ id, name, roleName, pinHash }) => ({ id, name, roleName, pinHash })),
      fetchedAt: deps.now().toISOString(),
    };
  });

  app.post(
    '/pos/auth/sessions',
    { ...RATE_LIMITED, ...fromDevice },
    async (request): Promise<PinSignInResponse> => {
      const body = parseInput(schemas.pinSignInBody, request.body);
      const result = await signInWithPin(deps, {
        device: deviceOf(request),
        ...body,
        ipAddress: request.ip,
      });
      return { token: result.token, me: await describeShopUser(deps, result.identity) };
    },
  );

  app.delete('/pos/auth/sessions/current', signedIn, async (request, reply) => {
    const token = bearerToken(request);
    if (token) await signOutPos(deps, token);
    return noContent(reply);
  });

  app.get('/pos/auth/me', signedIn, (request): Promise<ShopMe> =>
    describeShopUser(deps, shopIdentityOf(request)),
  );

  app.post(
    '/pos/auth/events',
    { ...RATE_LIMITED, ...fromDevice },
    (request): Promise<DeviceAuthEventsResponse> => {
      const { events } = parseInput(schemas.deviceEventsBody, request.body);
      return recordDeviceEvents(deps, deviceOf(request), events);
    },
  );
}

function consoleRoutes(app: FastifyInstance, deps: AuthDeps): void {
  const anyStage = requireStaff(deps, ['two_step', 'two_step_setup', 'active']);
  const staffToken = (request: FastifyRequest): string => request.cookies[STAFF_COOKIE] ?? '';

  /** The session again after a step changed it. */
  async function currentStaff(request: FastifyRequest): Promise<StaffMe> {
    const check = await resolveStaffSession(deps.platformDb, staffToken(request), deps.now());
    if (!check.ok) throw signInAgain();
    return describeStaff(check.identity);
  }

  app.post(
    '/console/auth/sign-in',
    RATE_LIMITED,
    async (request, reply): Promise<StaffSignInResponse> => {
      const body = parseInput(schemas.signInBody, request.body);
      const result = await staffSignIn(deps, { ...body, ipAddress: request.ip });
      reply.setCookie(STAFF_COOKIE, result.token, cookieOptions(deps));
      return { stage: result.stage, offerTwoStepSetup: result.offerTwoStepSetup };
    },
  );

  app.post(
    '/console/auth/two-step',
    { ...RATE_LIMITED, preHandler: requireStaff(deps, ['two_step']) },
    async (request): Promise<StaffMe> => {
      const { code } = parseInput(schemas.twoStepCodeBody, request.body);
      await verifyTwoStep(deps, { token: staffToken(request), code, ipAddress: request.ip });
      return currentStaff(request);
    },
  );

  app.post(
    '/console/auth/two-step/setup',
    { ...RATE_LIMITED, preHandler: requireStaff(deps, ['two_step_setup', 'active']) },
    (request): Promise<TwoStepSetupResponse> => beginTwoStepSetup(deps, staffToken(request)),
  );

  app.post(
    '/console/auth/two-step/setup/confirm',
    { ...RATE_LIMITED, preHandler: requireStaff(deps, ['two_step_setup', 'active']) },
    async (request): Promise<StaffMe> => {
      const { code } = parseInput(schemas.twoStepCodeBody, request.body);
      await confirmTwoStepSetup(deps, {
        token: staffToken(request),
        code,
        ipAddress: request.ip,
      });
      return currentStaff(request);
    },
  );

  app.post('/console/auth/sign-out', async (request, reply) => {
    const token = request.cookies[STAFF_COOKIE];
    if (token) await staffSignOut(deps, { token, ipAddress: request.ip });
    reply.clearCookie(STAFF_COOKIE, cookieOptions(deps));
    return noContent(reply);
  });

  app.get('/console/auth/me', { preHandler: anyStage }, (request): StaffMe =>
    describeStaff(staffIdentityOf(request)),
  );
}
