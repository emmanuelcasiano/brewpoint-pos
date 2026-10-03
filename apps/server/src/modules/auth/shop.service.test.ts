import { uuidv7 } from '@brewpoint/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resolveShopSession } from '../../core/auth/sessions';
import { newShopToken } from '../../core/auth/tokens';
import { withTenant } from '../../core/db/tenant-transaction';
import { requireTestDatabaseUrls, testDatabaseUrls } from '../../db/test-database';
import { createAuthToken } from './repository';
import { checkLink, requestPasswordReset, setPassword, signIn, signOut } from './shop.service';
import {
  auditSentences,
  createTestShop,
  errorOf,
  PASSWORD,
  setUserStatus,
  testClock,
  testDeps,
  type TestDeps,
  type TestShop,
} from './test-support';

const HOUR = 60 * 60_000;
const IP = '203.0.113.7';

describe.skipIf(!testDatabaseUrls())('back-office sign-in', () => {
  const clock = testClock();
  let deps: TestDeps;
  let shop: TestShop;

  beforeAll(() => {
    deps = testDeps(requireTestDatabaseUrls(), clock);
  });

  beforeEach(async () => {
    clock.set(new Date('2026-10-03T07:00:00Z'));
    shop = await createTestShop(deps);
  });

  afterAll(async () => {
    await deps.close();
  });

  const signInAs = (email: string, password = PASSWORD) =>
    signIn(deps, { email, password, ipAddress: IP });

  it('signs in with email and password, knowing the shop, branches and role', async () => {
    const result = await signInAs(shop.owner.email.toUpperCase());

    expect(result.identity).toMatchObject({
      kind: 'shop',
      surface: 'backoffice',
      userId: shop.owner.id,
      tenantId: shop.tenantId,
      deviceId: null,
      roles: [{ branchId: null, roleName: 'Owner' }],
    });
    expect(result.identity.branchIds.sort()).toEqual(
      [shop.mainBranchId, shop.otherBranchId].sort(),
    );
    expect(result.token.startsWith(`${shop.tenantId}.`)).toBe(true);
    expect(await auditSentences(deps, shop.tenantId, shop.owner.id)).toEqual([
      { sentence: 'Signed in to the back-office', is_sensitive: false, device_id: null },
    ]);
  });

  it('says the same thing for a wrong password and an unknown email', async () => {
    const wrong = await errorOf(signInAs(shop.owner.email, 'not the password'));
    const unknown = await errorOf(signInAs('nobody@test.brewpoint'));

    expect(wrong).toMatchObject({
      code: 'wrong_credentials',
      status: 401,
      message: 'Wrong email or password. Check both and try again.',
    });
    expect(unknown).toEqual(wrong);
  });

  it('locks the account for 15 minutes after 10 wrong passwords, and audits it', async () => {
    for (let i = 0; i < 9; i++) {
      expect((await errorOf(signInAs(shop.owner.email, 'wrong'))).code).toBe('wrong_credentials');
    }
    const tenth = await errorOf(signInAs(shop.owner.email, 'wrong'));
    const rightButLocked = await errorOf(signInAs(shop.owner.email));

    expect(tenth.code).toBe('account_locked');
    expect(tenth.message).toBe(
      'Too many wrong tries. This account is locked until 3:15 PM. Try again then, or reset your password.',
    );
    expect(rightButLocked.code).toBe('account_locked');
    expect(await auditSentences(deps, shop.tenantId, shop.owner.id)).toEqual([
      {
        sentence: 'Wrong password 10 times, locked for 15 minutes',
        is_sensitive: true,
        device_id: null,
      },
    ]);

    clock.advance(15 * 60_000);
    await expect(signInAs(shop.owner.email)).resolves.toMatchObject({
      identity: { userId: shop.owner.id },
    });
  });

  it('refuses a deactivated user, telling them only after a correct password', async () => {
    expect((await errorOf(signInAs(shop.former.email, 'wrong'))).code).toBe('wrong_credentials');
    expect(await errorOf(signInAs(shop.former.email))).toMatchObject({
      code: 'account_deactivated',
      status: 403,
      message: 'This account is turned off. Ask the shop owner to turn it back on.',
    });
  });

  it('refuses a deactivated user on their very next request, and ends the session', async () => {
    const { token } = await signInAs(shop.owner.email);
    expect((await resolveShopSession(deps.db, token, 'backoffice', clock.now())).ok).toBe(true);

    await setUserStatus(deps, shop, shop.owner.id, 'deactivated');

    expect(await resolveShopSession(deps.db, token, 'backoffice', clock.now())).toEqual({
      ok: false,
      reason: 'deactivated',
    });
    await setUserStatus(deps, shop, shop.owner.id, 'active');
    expect((await resolveShopSession(deps.db, token, 'backoffice', clock.now())).ok).toBe(false);
  });

  it('keeps a session through activity and ends it after 12 hours without any', async () => {
    const { token } = await signInAs(shop.owner.email);

    clock.advance(11 * HOUR + 59 * 60_000);
    expect((await resolveShopSession(deps.db, token, 'backoffice', clock.now())).ok).toBe(true);
    clock.advance(11 * HOUR + 59 * 60_000);
    expect((await resolveShopSession(deps.db, token, 'backoffice', clock.now())).ok).toBe(true);
    clock.advance(12 * HOUR);
    expect(await resolveShopSession(deps.db, token, 'backoffice', clock.now())).toEqual({
      ok: false,
      reason: 'expired',
    });
  });

  it('does not accept a back-office token on the POS, or a changed token', async () => {
    const { token } = await signInAs(shop.owner.email);

    expect((await resolveShopSession(deps.db, token, 'pos', clock.now())).ok).toBe(false);
    expect((await resolveShopSession(deps.db, `${token}x`, 'backoffice', clock.now())).ok).toBe(
      false,
    );
  });

  it('signs out once, and the token stops working', async () => {
    const { token } = await signInAs(shop.owner.email);

    await signOut(deps, token);
    await signOut(deps, token);

    expect((await resolveShopSession(deps.db, token, 'backoffice', clock.now())).ok).toBe(false);
    const sentences = await auditSentences(deps, shop.tenantId, shop.owner.id);
    expect(sentences.map((row) => row.sentence)).toEqual([
      'Signed in to the back-office',
      'Signed out of the back-office',
    ]);
  });
});

describe.skipIf(!testDatabaseUrls())('forgot and set password', () => {
  const clock = testClock();
  let deps: TestDeps;
  let shop: TestShop;

  beforeAll(() => {
    deps = testDeps(requireTestDatabaseUrls(), clock);
  });

  beforeEach(async () => {
    clock.set(new Date('2026-10-03T07:00:00Z'));
    deps.mailer.sent.length = 0;
    shop = await createTestShop(deps);
  });

  afterAll(async () => {
    await deps.close();
  });

  function linkToken(): string {
    const text = deps.mailer.sent.at(-1)?.text ?? '';
    const match = /http:\/\/127\.0\.0\.1:5173\/set-password\?token=(\S+)/.exec(text);
    if (!match?.[1]) throw new Error(`No reset link in: ${text}`);
    return decodeURIComponent(match[1]);
  }

  it('mails a reset link to an active user, and nothing for an unknown or deactivated one', async () => {
    await requestPasswordReset(deps, 'nobody@test.brewpoint');
    await requestPasswordReset(deps, shop.former.email);
    expect(deps.mailer.sent).toEqual([]);

    await requestPasswordReset(deps, shop.owner.email);

    expect(deps.mailer.sent).toHaveLength(1);
    expect(deps.mailer.sent[0]).toMatchObject({
      to: shop.owner.email,
      subject: 'Reset your BrewPoint password',
    });
    expect(await checkLink(deps, linkToken())).toEqual({
      purpose: 'password_reset',
      name: shop.owner.name,
      email: shop.owner.email,
    });
  });

  it('sets a new password once, signs the user out elsewhere, and audits it', async () => {
    const before = await signIn(deps, {
      email: shop.owner.email,
      password: PASSWORD,
      ipAddress: IP,
    });
    await requestPasswordReset(deps, shop.owner.email);
    const token = linkToken();

    await setPassword(deps, { token, password: 'a brand new password' });

    expect((await resolveShopSession(deps.db, before.token, 'backoffice', clock.now())).ok).toBe(
      false,
    );
    expect(
      (await errorOf(setPassword(deps, { token, password: 'another new password' }))).code,
    ).toBe('link_invalid');
    expect(
      (await errorOf(signIn(deps, { email: shop.owner.email, password: PASSWORD, ipAddress: IP })))
        .code,
    ).toBe('wrong_credentials');
    await expect(
      signIn(deps, { email: shop.owner.email, password: 'a brand new password', ipAddress: IP }),
    ).resolves.toMatchObject({ identity: { userId: shop.owner.id } });
    const sentences = (await auditSentences(deps, shop.tenantId, shop.owner.id)).map(
      (r) => r.sentence,
    );
    expect(sentences).toContain('Set a new password from a reset link');
  });

  it('refuses a link after an hour, an older link once a newer one is sent, and a short password', async () => {
    await requestPasswordReset(deps, shop.owner.email);
    const first = linkToken();
    await requestPasswordReset(deps, shop.owner.email);
    const second = linkToken();

    expect((await errorOf(checkLink(deps, first))).code).toBe('link_invalid');
    expect((await errorOf(setPassword(deps, { token: second, password: 'short' }))).code).toBe(
      'password_too_short',
    );
    clock.advance(60 * 60_000);
    expect(await errorOf(checkLink(deps, second))).toMatchObject({
      code: 'link_invalid',
      status: 400,
      message:
        'This link has expired or was already used. Request a new reset link, or ask the shop owner for a new invite.',
    });
  });

  it('accepts an invite link once: sets the password and turns the account on', async () => {
    const invitedId = uuidv7();
    const email = `iris-${invitedId}@test.brewpoint`;
    const { token, hash } = newShopToken(shop.tenantId);
    await withTenant(deps.db, shop.tenantId, async (trx) => {
      await trx
        .insertInto('users')
        .values({
          id: invitedId,
          tenant_id: shop.tenantId,
          name: 'Iris Invited',
          email,
          status: 'invited',
        })
        .execute();
      await createAuthToken(trx, {
        tenantId: shop.tenantId,
        userId: invitedId,
        purpose: 'invite',
        hash,
        expiresAt: new Date(clock.now().getTime() + 7 * 24 * HOUR),
        now: clock.now(),
      });
    });
    expect((await errorOf(signIn(deps, { email, password: PASSWORD, ipAddress: IP }))).code).toBe(
      'wrong_credentials',
    );

    expect(await checkLink(deps, token)).toEqual({
      purpose: 'invite',
      name: 'Iris Invited',
      email,
    });
    await setPassword(deps, { token, password: 'my first password' });

    await expect(
      signIn(deps, { email, password: 'my first password', ipAddress: IP }),
    ).resolves.toMatchObject({ identity: { userId: invitedId } });
    expect((await errorOf(checkLink(deps, token))).code).toBe('link_invalid');
    const sentences = (await auditSentences(deps, shop.tenantId, invitedId)).map((r) => r.sentence);
    expect(sentences).toEqual(['Set a password from an invite', 'Signed in to the back-office']);
  });

  it('refuses links that are not links', async () => {
    expect((await errorOf(checkLink(deps, 'junk'))).code).toBe('link_invalid');
    expect((await errorOf(checkLink(deps, `${shop.tenantId}.${'a'.repeat(43)}`))).code).toBe(
      'link_invalid',
    );
  });
});
