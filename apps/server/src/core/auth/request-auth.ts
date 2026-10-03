import { DEVICE_ID_HEADER, DEVICE_KEY_HEADER } from '@brewpoint/shared';
import type { FastifyInstance, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';
import type { Database, PlatformDatabase } from '../db/client';
import { AppError } from '../errors';
import { resolveDemoDevice, type DemoDeviceConfig, type DeviceIdentity } from './device';
import type { ShopIdentity, StaffIdentity, StaffStage, Surface } from './identity';
import { resolveShopSession, resolveStaffSession, type SessionCheck } from './sessions';

// Who is asking, for every route. Each route says which of these hooks it needs; the hook
// checks the token on the server and puts the identity on the request. Shop and staff tokens
// travel in different places, so neither can be used on the other side:
//   back-office  httpOnly cookie bp_session
//   POS          Authorization: Bearer <token>, on /api/pos only
//   console      httpOnly cookie bp_staff_session

export const SHOP_COOKIE = 'bp_session';
export const STAFF_COOKIE = 'bp_staff_session';

declare module 'fastify' {
  interface FastifyRequest {
    shopIdentity: ShopIdentity | null;
    staffIdentity: StaffIdentity | null;
    device: DeviceIdentity | null;
  }
}

export interface RequestAuthDeps {
  db: Database;
  platformDb: PlatformDatabase;
  config: DemoDeviceConfig;
  now: () => Date;
}

export function registerRequestAuth(app: FastifyInstance): void {
  app.decorateRequest('shopIdentity', null);
  app.decorateRequest('staffIdentity', null);
  app.decorateRequest('device', null);
}

function signedOut(): AppError {
  return new AppError(401, 'signed_out', 'Sign in to continue.');
}

function refused(check: Exclude<SessionCheck<unknown>, { ok: true }>, side: 'shop' | 'staff') {
  if (check.reason === 'deactivated') {
    return new AppError(
      403,
      'account_deactivated',
      side === 'shop'
        ? 'This account is turned off. Ask the shop owner to turn it back on.'
        : 'This staff account is turned off. Ask a Superadmin to turn it back on.',
    );
  }
  if (check.reason === 'expired') {
    return new AppError(
      401,
      'session_expired',
      side === 'shop'
        ? 'You were signed out after 12 hours without activity. Sign in again.'
        : 'Your sign-in has ended. Sign in again.',
    );
  }
  return signedOut();
}

export function bearerToken(request: FastifyRequest): string | undefined {
  const header = request.headers.authorization;
  const match = header ? /^Bearer (\S+)$/.exec(header) : null;
  return match?.[1];
}

/** A shop user signed in on this surface: the back-office by cookie, the POS by bearer token. */
export function requireShopUser(
  deps: RequestAuthDeps,
  surface: Surface,
): preHandlerAsyncHookHandler {
  return async (request) => {
    const token = surface === 'backoffice' ? request.cookies[SHOP_COOKIE] : bearerToken(request);
    if (!token) throw signedOut();
    const check = await resolveShopSession(deps.db, token, surface, deps.now());
    if (!check.ok) throw refused(check, 'shop');
    request.shopIdentity = check.identity;
  };
}

/** A staff member signed in to the console, at one of these stages (normally only `active`). */
export function requireStaff(
  deps: RequestAuthDeps,
  stages: readonly StaffStage[] = ['active'],
): preHandlerAsyncHookHandler {
  return async (request) => {
    const token = request.cookies[STAFF_COOKIE];
    if (!token) throw signedOut();
    const check = await resolveStaffSession(deps.platformDb, token, deps.now());
    if (!check.ok) throw refused(check, 'staff');
    if (!stages.includes(check.identity.stage)) {
      throw new AppError(403, 'two_step_required', 'Finish two-step sign-in first.', {
        stage: check.identity.stage,
      });
    }
    request.staffIdentity = check.identity;
  };
}

/** A request from a POS register. Until Module 06: the seeded demo device with DEMO_DEVICE_KEY. */
export function requireDemoDevice(deps: RequestAuthDeps): preHandlerAsyncHookHandler {
  return async (request) => {
    const deviceId = request.headers[DEVICE_ID_HEADER];
    const key = request.headers[DEVICE_KEY_HEADER];
    const device =
      typeof deviceId === 'string' && typeof key === 'string'
        ? await resolveDemoDevice(deps.db, deps.config, deviceId, key)
        : null;
    if (!device) {
      throw new AppError(
        401,
        'device_unknown',
        'This register is not set up to use BrewPoint yet. Ask the owner to pair it.',
      );
    }
    request.device = device;
  };
}

/** The identity a hook put on the request; a route without that hook is a programming error. */
export function shopIdentityOf(request: FastifyRequest): ShopIdentity {
  if (!request.shopIdentity) throw new Error('This route has no requireShopUser hook.');
  return request.shopIdentity;
}

export function staffIdentityOf(request: FastifyRequest): StaffIdentity {
  if (!request.staffIdentity) throw new Error('This route has no requireStaff hook.');
  return request.staffIdentity;
}

export function deviceOf(request: FastifyRequest): DeviceIdentity {
  if (!request.device) throw new Error('This route has no requireDemoDevice hook.');
  return request.device;
}
