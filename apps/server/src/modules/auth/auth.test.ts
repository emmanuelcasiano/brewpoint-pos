import {
  DEVICE_ID_HEADER,
  DEVICE_KEY_HEADER,
  uuidv7,
  type ApiError,
  type PinSignInResponse,
  type PinUsersResponse,
  type ShopMe,
  type StaffMe,
  type StaffSignInResponse,
  type TwoStepSetupResponse,
} from '@brewpoint/shared';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app';
import { requireStaff, SHOP_COOKIE, STAFF_COOKIE } from '../../core/auth/request-auth';
import { newTotpSecret, totpCode } from '../../core/auth/totp';
import { createMigrationDb } from '../../db/migrator';
import { DEMO_SHOPS, seedDemo } from '../../db/seed/demo';
import { seedReference } from '../../db/seed/reference';
import { requireTestDatabaseUrls, testDatabaseUrls } from '../../db/test-database';
import {
  createTestShop,
  createTestStaff,
  DEMO_DEVICE_KEY,
  PASSWORD,
  testClock,
  testDeps,
  type TestDeps,
  type TestShop,
} from './test-support';

// The sign-in endpoints over HTTP: cookies and bearer tokens, the hooks that keep shop users
// and staff apart, input checks, the rate limit and the error shape.

const KAPE_DAVAO = DEMO_SHOPS[0]!;
const ANA = KAPE_DAVAO.cashiers[0]!;
const DEVICE_HEADERS = {
  [DEVICE_ID_HEADER]: KAPE_DAVAO.device.id,
  [DEVICE_KEY_HEADER]: DEMO_DEVICE_KEY,
};

interface RequestParts {
  cookies?: Record<string, string>;
  headers?: Record<string, string>;
}

function cookieOf(response: LightMyRequestResponse, name: string) {
  return response.cookies.find((cookie) => cookie.name === name);
}

function errorBody(response: LightMyRequestResponse) {
  return response.json<ApiError>().error;
}

describe.skipIf(!testDatabaseUrls())('sign-in endpoints', () => {
  const clock = testClock();
  let deps: TestDeps;
  let app: FastifyInstance;
  let shop: TestShop;

  beforeAll(async () => {
    const urls = requireTestDatabaseUrls();
    deps = testDeps(urls, clock);
    const migrator = createMigrationDb(urls.owner);
    try {
      await seedReference(migrator);
      await seedDemo(migrator);
    } finally {
      await migrator.destroy();
    }
    shop = await createTestShop(deps);

    app = buildApp({ deps });
    // A console route only an active staff session may use, as Module 18's routes will be.
    app.get('/api/test/console-only', { preHandler: requireStaff(deps) }, () => ({ ok: true }));
    app.get('/api/test/fails', () => {
      throw new Error('database password is hunter2');
    });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await deps.close();
  });

  async function shopSignIn(email = shop.owner.email) {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in',
      payload: { email, password: PASSWORD },
    });
    expect(response.statusCode).toBe(200);
    return cookieOf(response, SHOP_COOKIE)?.value ?? '';
  }

  async function staffSignIn(email: string) {
    const response = await app.inject({
      method: 'POST',
      url: '/api/console/auth/sign-in',
      payload: { email, password: PASSWORD },
    });
    expect(response.statusCode).toBe(200);
    return {
      body: response.json<StaffSignInResponse>(),
      token: cookieOf(response, STAFF_COOKIE)?.value ?? '',
    };
  }

  async function posSignIn() {
    const response = await app.inject({
      method: 'POST',
      url: '/api/pos/auth/sessions',
      headers: DEVICE_HEADERS,
      payload: { userId: ANA.id, pin: '1234' },
    });
    expect(response.statusCode).toBe(200);
    return response.json<PinSignInResponse>().token;
  }

  describe('back-office', () => {
    it('signs in with a httpOnly, SameSite=Strict cookie for /api and answers /me', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/sign-in',
        payload: { email: `  ${shop.owner.email.toUpperCase()} `, password: PASSWORD },
      });
      const cookie = cookieOf(response, SHOP_COOKIE);

      expect(response.statusCode).toBe(200);
      expect(cookie).toMatchObject({ httpOnly: true, sameSite: 'Strict', path: '/api' });
      expect(cookie?.secure).toBeFalsy();
      expect(cookie?.maxAge).toBeUndefined();
      const me = response.json<ShopMe>();
      expect(me).toMatchObject({
        user: { id: shop.owner.id, email: shop.owner.email },
        shop: { id: shop.tenantId, name: 'Test Kape', accentHex: '#E2A13B' },
        surface: 'backoffice',
        device: null,
        roles: [{ branchId: null, roleName: 'Owner' }],
      });
      expect(me.branches.map((b) => b.name)).toEqual(['Main branch', 'Second branch']);

      const again = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        cookies: { [SHOP_COOKIE]: cookie?.value ?? '' },
      });
      expect(again.json()).toEqual(me);
    });

    it('signs out: clears the cookie and the token stops working', async () => {
      const token = await shopSignIn();

      const out = await app.inject({
        method: 'POST',
        url: '/api/auth/sign-out',
        cookies: { [SHOP_COOKIE]: token },
      });
      const me = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        cookies: { [SHOP_COOKIE]: token },
      });

      expect(out.statusCode).toBe(204);
      expect(cookieOf(out, SHOP_COOKIE)?.value).toBe('');
      expect(me.statusCode).toBe(401);
      expect(errorBody(me)).toEqual({ code: 'signed_out', message: 'Sign in to continue.' });
    });

    it('answers a wrong password with the plain message and no cookie', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/sign-in',
        payload: { email: shop.owner.email, password: 'not it' },
      });

      expect(response.statusCode).toBe(401);
      expect(errorBody(response)).toEqual({
        code: 'wrong_credentials',
        message: 'Wrong email or password. Check both and try again.',
      });
      expect(cookieOf(response, SHOP_COOKIE)).toBeUndefined();
    });

    it('checks input and names the field', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/sign-in',
        payload: { email: 'carlo at kape', password: PASSWORD },
      });

      expect(response.statusCode).toBe(400);
      expect(errorBody(response)).toEqual({
        code: 'invalid_input',
        message: 'Enter an email like name@shop.com.',
        details: { field: 'email' },
      });
    });

    it('answers forgot password the same way for any email', async () => {
      for (const email of [shop.owner.email, 'nobody@test.brewpoint']) {
        const response = await app.inject({
          method: 'POST',
          url: '/api/auth/password/forgot',
          payload: { email },
        });
        expect(response.statusCode).toBe(204);
      }
    });

    it('marks the cookie Secure outside local', async () => {
      const staging = buildApp({
        deps: { ...deps, config: { ...deps.config, appEnv: 'staging' } },
      });
      const response = await staging.inject({
        method: 'POST',
        url: '/api/auth/sign-in',
        payload: { email: shop.owner.email, password: PASSWORD },
      });
      await staging.close();

      expect(cookieOf(response, SHOP_COOKIE)?.secure).toBe(true);
    });
  });

  describe('keeping shop users and staff apart', () => {
    it("refuses a shop user's cookie or POS token on a console endpoint", async () => {
      const shopToken = await shopSignIn();
      const posToken = await posSignIn();

      const requests: RequestParts[] = [
        { cookies: { [SHOP_COOKIE]: shopToken } },
        { cookies: { [STAFF_COOKIE]: shopToken } },
        { cookies: { [STAFF_COOKIE]: posToken } },
        { headers: { authorization: `Bearer ${posToken}` } },
      ];
      for (const request of requests) {
        for (const url of ['/api/console/auth/me', '/api/test/console-only']) {
          const response = await app.inject({ method: 'GET', url, ...request });
          expect({ url, status: response.statusCode }).toEqual({ url, status: 401 });
        }
      }
    });

    it("refuses a staff member's cookie on shop and POS endpoints", async () => {
      const staff = await createTestStaff(deps);
      const { token } = await staffSignIn(staff.email);
      expect(
        (
          await app.inject({
            method: 'GET',
            url: '/api/test/console-only',
            cookies: { [STAFF_COOKIE]: token },
          })
        ).statusCode,
      ).toBe(200);

      const requests: (RequestParts & { url: string })[] = [
        { url: '/api/auth/me', cookies: { [STAFF_COOKIE]: token } },
        { url: '/api/auth/me', cookies: { [SHOP_COOKIE]: token } },
        { url: '/api/pos/auth/me', headers: { authorization: `Bearer ${token}` } },
      ];
      for (const request of requests) {
        const response = await app.inject({ method: 'GET', ...request });
        expect({ url: request.url, status: response.statusCode }).toEqual({
          url: request.url,
          status: 401,
        });
      }
    });

    it('does not take a back-office cookie on the POS, or a POS token on the back-office', async () => {
      const shopToken = await shopSignIn();
      const posToken = await posSignIn();

      const pos = await app.inject({
        method: 'GET',
        url: '/api/pos/auth/me',
        headers: { authorization: `Bearer ${shopToken}` },
      });
      const backoffice = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        cookies: { [SHOP_COOKIE]: posToken },
      });

      expect(pos.statusCode).toBe(401);
      expect(backoffice.statusCode).toBe(401);
    });
  });

  describe('POS', () => {
    it('refuses the PIN list without the demo device key', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/pos/auth/users',
        headers: {
          [DEVICE_ID_HEADER]: KAPE_DAVAO.device.id,
          [DEVICE_KEY_HEADER]: 'wrong key, wrong key',
        },
      });

      expect(response.statusCode).toBe(401);
      expect(errorBody(response)).toEqual({
        code: 'device_unknown',
        message: 'This register is not set up to use BrewPoint yet. Ask the owner to pair it.',
      });
    });

    it('gives the demo register its PIN list, then signs Ana in with a bearer token', async () => {
      const list = await app.inject({
        method: 'GET',
        url: '/api/pos/auth/users',
        headers: DEVICE_HEADERS,
      });
      expect(list.statusCode).toBe(200);
      const { users, fetchedAt } = list.json<PinUsersResponse>();
      expect(users.map((u) => u.name)).toEqual(['Ana Cruz', 'Carlo Reyes']);
      expect(users.every((u) => u.pinHash.startsWith('$argon2id$'))).toBe(true);
      expect(fetchedAt).toBe(clock.now().toISOString());

      const token = await posSignIn();
      const me = await app.inject({
        method: 'GET',
        url: '/api/pos/auth/me',
        headers: { authorization: `Bearer ${token}` },
      });
      expect(me.json()).toMatchObject({
        user: { id: ANA.id },
        shop: { name: 'Kape Davao' },
        surface: 'pos',
        device: { id: KAPE_DAVAO.device.id, name: 'T1' },
        roles: [{ branchId: KAPE_DAVAO.branch.id, roleName: 'Cashier' }],
      });

      const out = await app.inject({
        method: 'DELETE',
        url: '/api/pos/auth/sessions/current',
        headers: { authorization: `Bearer ${token}` },
      });
      expect(out.statusCode).toBe(204);
      const after = await app.inject({
        method: 'GET',
        url: '/api/pos/auth/me',
        headers: { authorization: `Bearer ${token}` },
      });
      expect(after.statusCode).toBe(401);
    });

    it('answers a wrong PIN with the tries left, and checks the PIN shape', async () => {
      const wrong = await app.inject({
        method: 'POST',
        url: '/api/pos/auth/sessions',
        headers: DEVICE_HEADERS,
        payload: { userId: ANA.id, pin: '0000' },
      });
      const tooLong = await app.inject({
        method: 'POST',
        url: '/api/pos/auth/sessions',
        headers: DEVICE_HEADERS,
        payload: { userId: ANA.id, pin: '1234567' },
      });
      await posSignIn();

      expect(wrong.statusCode).toBe(401);
      expect(errorBody(wrong)).toEqual({
        code: 'wrong_pin',
        message: 'Wrong PIN. 4 tries left on this device.',
        details: { triesLeft: 4 },
      });
      expect(tooLong.statusCode).toBe(400);
      expect(errorBody(tooLong)).toMatchObject({
        message: 'Enter your PIN: 4 to 6 digits.',
        details: { field: 'pin' },
      });
    });

    it('checks device events before recording them', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/pos/auth/events',
        headers: DEVICE_HEADERS,
        payload: {
          events: [
            {
              id: uuidv7(),
              type: 'logged_in',
              userId: ANA.id,
              happenedAt: clock.now().toISOString(),
            },
          ],
        },
      });

      expect(response.statusCode).toBe(400);
      expect(errorBody(response)).toMatchObject({
        message: 'Each event must be signed_in, signed_out or pin_locked.',
        details: { field: 'events.0.type' },
      });
    });
  });

  describe('staff console', () => {
    it('signs in with two-step over HTTP, and shows the stage on /me throughout', async () => {
      const secret = newTotpSecret();
      const staff = await createTestStaff(deps, { totpSecret: secret });

      const { body, token } = await staffSignIn(staff.email);
      expect(body).toEqual({ stage: 'two_step', offerTwoStepSetup: false });
      const pending = await app.inject({
        method: 'GET',
        url: '/api/console/auth/me',
        cookies: { [STAFF_COOKIE]: token },
      });
      expect(pending.json<StaffMe>().stage).toBe('two_step');
      const blocked = await app.inject({
        method: 'GET',
        url: '/api/test/console-only',
        cookies: { [STAFF_COOKIE]: token },
      });
      expect(blocked.statusCode).toBe(403);
      expect(errorBody(blocked)).toEqual({
        code: 'two_step_required',
        message: 'Finish two-step sign-in first.',
        details: { stage: 'two_step' },
      });

      const badCode = await app.inject({
        method: 'POST',
        url: '/api/console/auth/two-step',
        cookies: { [STAFF_COOKIE]: token },
        payload: { code: '12345' },
      });
      expect(errorBody(badCode)).toMatchObject({
        code: 'invalid_input',
        details: { field: 'code' },
      });

      const verified = await app.inject({
        method: 'POST',
        url: '/api/console/auth/two-step',
        cookies: { [STAFF_COOKIE]: token },
        payload: { code: totpCode(secret, clock.now()) },
      });
      expect(verified.statusCode).toBe(200);
      expect(verified.json()).toMatchObject({
        stage: 'active',
        staff: { id: staff.id },
        twoStepOn: true,
      });
      const open = await app.inject({
        method: 'GET',
        url: '/api/test/console-only',
        cookies: { [STAFF_COOKIE]: token },
      });
      expect(open.statusCode).toBe(200);
    });

    it('sets up two-step over HTTP and signs out', async () => {
      const staff = await createTestStaff(deps);
      const { token } = await staffSignIn(staff.email);

      const setup = await app.inject({
        method: 'POST',
        url: '/api/console/auth/two-step/setup',
        cookies: { [STAFF_COOKIE]: token },
      });
      const { secret, otpauthUri } = setup.json<TwoStepSetupResponse>();
      expect(otpauthUri).toMatch(/^otpauth:\/\/totp\/BrewPoint:/);
      const confirmed = await app.inject({
        method: 'POST',
        url: '/api/console/auth/two-step/setup/confirm',
        cookies: { [STAFF_COOKIE]: token },
        payload: { code: totpCode(secret, clock.now()) },
      });
      expect(confirmed.json()).toMatchObject({ stage: 'active', twoStepOn: true });

      const out = await app.inject({
        method: 'POST',
        url: '/api/console/auth/sign-out',
        cookies: { [STAFF_COOKIE]: token },
      });
      expect(out.statusCode).toBe(204);
      expect(cookieOf(out, STAFF_COOKIE)?.value).toBe('');
      const me = await app.inject({
        method: 'GET',
        url: '/api/console/auth/me',
        cookies: { [STAFF_COOKIE]: token },
      });
      expect(me.statusCode).toBe(401);
    });
  });

  describe('errors', () => {
    it('answers an unknown address with a plain 404', async () => {
      const response = await app.inject({ method: 'GET', url: '/api/nothing-here' });

      expect(response.statusCode).toBe(404);
      expect(errorBody(response)).toEqual({
        code: 'not_found',
        message: 'This address does not exist on the server.',
      });
    });

    it('hides the details of a server failure', async () => {
      const response = await app.inject({ method: 'GET', url: '/api/test/fails' });

      expect(response.statusCode).toBe(500);
      expect(response.body).not.toContain('hunter2');
      expect(errorBody(response).code).toBe('server_error');
    });

    it('answers unreadable JSON with a plain 400', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/sign-in',
        headers: { 'content-type': 'application/json' },
        payload: '{"email":',
      });

      expect(response.statusCode).toBe(400);
      expect(errorBody(response).code).toBe('bad_request');
    });
  });
});

describe.skipIf(!testDatabaseUrls())('rate limit', () => {
  let deps: TestDeps;
  let app: FastifyInstance;

  beforeAll(async () => {
    deps = testDeps(requireTestDatabaseUrls(), testClock());
    app = buildApp({ deps });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await deps.close();
  });

  it('allows 20 tries a minute from one network on a sign-in route, then answers 429', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 21; i++) {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/password/link?token=junk',
      });
      statuses.push(response.statusCode);
    }
    const last = await app.inject({ method: 'GET', url: '/api/auth/password/link?token=junk' });

    expect(statuses.slice(0, 20).every((status) => status === 400)).toBe(true);
    expect(statuses[20]).toBe(429);
    expect(errorBody(last)).toEqual({
      code: 'rate_limited',
      message: 'Too many tries from this network. Wait a minute and try again.',
    });
  });
});
