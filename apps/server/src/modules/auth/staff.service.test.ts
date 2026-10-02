import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resolveShopSession, resolveStaffSession } from '../../core/auth/sessions';
import { newTotpSecret, totpCode } from '../../core/auth/totp';
import { requireTestDatabaseUrls, testDatabaseUrls } from '../../db/test-database';
import { signIn } from './shop.service';
import {
  beginTwoStepSetup,
  confirmTwoStepSetup,
  staffSignIn,
  staffSignOut,
  verifyTwoStep,
} from './staff.service';
import {
  createTestShop,
  createTestStaff,
  errorOf,
  PASSWORD,
  staffAuditSentences,
  testClock,
  testDeps,
  type TestDeps,
} from './test-support';

const IP = '198.51.100.4';
const HOUR = 60 * 60_000;

describe.skipIf(!testDatabaseUrls())('staff console sign-in', () => {
  const clock = testClock();
  let deps: TestDeps;

  beforeAll(() => {
    deps = testDeps(requireTestDatabaseUrls(), clock);
  });

  beforeEach(() => {
    clock.set(new Date('2026-10-03T07:00:00Z'));
  });

  afterAll(async () => {
    await deps.close();
  });

  const signInStaff = (email: string, password = PASSWORD) =>
    staffSignIn(deps, { email, password, ipAddress: IP });

  async function stageOf(token: string) {
    const check = await resolveStaffSession(deps.platformDb, token, clock.now());
    return check.ok ? check.identity.stage : check.reason;
  }

  it('lets a first sign-in in without two-step, offering setup', async () => {
    const staff = await createTestStaff(deps);

    const result = await signInStaff(staff.email);

    expect(result).toMatchObject({ stage: 'active', offerTwoStepSetup: true });
    expect(await stageOf(result.token)).toBe('active');
    expect(await staffAuditSentences(deps, staff.id)).toEqual(['Signed in to the staff console']);
  });

  it('requires two-step setup on the second sign-in before anything else', async () => {
    const staff = await createTestStaff(deps);
    const first = await signInStaff(staff.email);
    await staffSignOut(deps, { token: first.token, ipAddress: IP });

    const second = await signInStaff(staff.email);

    expect(second).toMatchObject({ stage: 'two_step_setup', offerTwoStepSetup: false });
    expect(await stageOf(second.token)).toBe('two_step_setup');

    const setup = await beginTwoStepSetup(deps, second.token);
    expect(setup.otpauthUri).toContain(encodeURIComponent(staff.email));
    expect(
      (
        await errorOf(
          confirmTwoStepSetup(deps, { token: second.token, code: '000000', ipAddress: IP }),
        )
      ).code,
    ).toBe('wrong_code');
    await confirmTwoStepSetup(deps, {
      token: second.token,
      code: totpCode(setup.secret, clock.now()),
      ipAddress: IP,
    });

    expect(await stageOf(second.token)).toBe('active');
    expect(await staffAuditSentences(deps, staff.id)).toEqual([
      'Signed in to the staff console',
      'Signed out of the staff console',
      'Turned on two-step sign-in',
      'Signed in to the staff console',
    ]);
    const third = await signInStaff(staff.email);
    expect(third.stage).toBe('two_step');
  });

  it('lets a first sign-in set up two-step right away, without signing in twice', async () => {
    const staff = await createTestStaff(deps);
    const { token } = await signInStaff(staff.email);

    const setup = await beginTwoStepSetup(deps, token);
    await confirmTwoStepSetup(deps, {
      token,
      code: totpCode(setup.secret, clock.now()),
      ipAddress: IP,
    });

    expect(await stageOf(token)).toBe('active');
    expect(await staffAuditSentences(deps, staff.id)).toEqual([
      'Signed in to the staff console',
      'Turned on two-step sign-in',
    ]);
    expect((await errorOf(beginTwoStepSetup(deps, token))).code).toBe('two_step_not_pending');
  });

  it('asks for the code when two-step is on, and lets the session in only with it', async () => {
    const secret = newTotpSecret();
    const staff = await createTestStaff(deps, { totpSecret: secret });

    const { token, stage } = await signInStaff(staff.email);
    expect(stage).toBe('two_step');
    expect(await staffAuditSentences(deps, staff.id)).toEqual([]);

    expect(
      await errorOf(verifyTwoStep(deps, { token, code: '123456', ipAddress: IP })),
    ).toMatchObject({
      code: 'wrong_code',
      message: 'Wrong code. Enter the newest six-digit code from your authenticator app.',
    });
    await verifyTwoStep(deps, { token, code: totpCode(secret, clock.now()), ipAddress: IP });

    expect(await stageOf(token)).toBe('active');
    expect(await staffAuditSentences(deps, staff.id)).toEqual(['Signed in to the staff console']);
  });

  it('ends a sign-in still waiting for its code after 10 minutes', async () => {
    const secret = newTotpSecret();
    const staff = await createTestStaff(deps, { totpSecret: secret });
    const { token } = await signInStaff(staff.email);

    clock.advance(10 * 60_000);

    expect(
      (
        await errorOf(
          verifyTwoStep(deps, { token, code: totpCode(secret, clock.now()), ipAddress: IP }),
        )
      ).code,
    ).toBe('sign_in_again');
  });

  it('ends an active staff session after 12 hours without activity', async () => {
    const staff = await createTestStaff(deps);
    const { token } = await signInStaff(staff.email);

    clock.advance(12 * HOUR - 60_000);
    expect(await stageOf(token)).toBe('active');
    clock.advance(12 * HOUR);
    expect(await stageOf(token)).toBe('expired');
  });

  it('counts wrong passwords and codes together and locks after 10, ending the sign-in', async () => {
    const secret = newTotpSecret();
    const staff = await createTestStaff(deps, { totpSecret: secret });
    for (let i = 0; i < 5; i++) await errorOf(signInStaff(staff.email, 'wrong'));
    const { token } = await signInStaff(staff.email);
    for (let i = 0; i < 4; i++)
      await errorOf(verifyTwoStep(deps, { token, code: '000000', ipAddress: IP }));

    const tenth = await errorOf(verifyTwoStep(deps, { token, code: '000000', ipAddress: IP }));

    expect(tenth).toMatchObject({ code: 'account_locked', status: 423 });
    expect(await stageOf(token)).toBe('missing');
    expect((await errorOf(signInStaff(staff.email))).code).toBe('account_locked');
    expect(await staffAuditSentences(deps, staff.id)).toEqual([
      'Wrong password or code 10 times, locked for 15 minutes',
    ]);
  });

  it('refuses a deactivated staff account after a correct password', async () => {
    const staff = await createTestStaff(deps, { status: 'deactivated' });

    expect((await errorOf(signInStaff(staff.email, 'wrong'))).code).toBe('wrong_credentials');
    expect(await errorOf(signInStaff(staff.email))).toMatchObject({
      code: 'account_deactivated',
      message: 'This staff account is turned off. Ask a Superadmin to turn it back on.',
    });
  });

  it('keeps shop users and staff apart: neither signs in, nor uses a token, on the other side', async () => {
    const shop = await createTestShop(deps);
    const staff = await createTestStaff(deps);

    expect((await errorOf(signInStaff(shop.owner.email))).code).toBe('wrong_credentials');
    expect(
      (await errorOf(signIn(deps, { email: staff.email, password: PASSWORD, ipAddress: IP }))).code,
    ).toBe('wrong_credentials');

    const shopToken = (
      await signIn(deps, { email: shop.owner.email, password: PASSWORD, ipAddress: IP })
    ).token;
    const staffToken = (await signInStaff(staff.email)).token;
    expect(await resolveStaffSession(deps.platformDb, shopToken, clock.now())).toEqual({
      ok: false,
      reason: 'missing',
    });
    for (const surface of ['backoffice', 'pos'] as const) {
      expect(await resolveShopSession(deps.db, staffToken, surface, clock.now())).toEqual({
        ok: false,
        reason: 'missing',
      });
    }
  });
});
