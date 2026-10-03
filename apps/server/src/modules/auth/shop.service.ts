import {
  ACCOUNT_LOCK,
  isLocked,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  recordFailure,
  type ShopMe,
} from '@brewpoint/shared';
import { writeAudit } from '../../core/audit/audit';
import { loadBranchAccess, type ShopIdentity } from '../../core/auth/identity';
import { hashSecret, verifySecret } from '../../core/auth/password';
import {
  createShopSession,
  resolveShopSession,
  revokeShopSession,
  revokeUserSessions,
} from '../../core/auth/sessions';
import { hashToken, newShopToken, shopTokenTenant } from '../../core/auth/tokens';
import { withTenant, type TenantTransaction } from '../../core/db/tenant-transaction';
import type { AppError } from '../../core/errors';
import type { AuthDeps } from './deps';
import {
  accountDeactivated,
  accountLocked,
  equaliseTiming,
  linkInvalid,
  passwordTooShort,
  wrongCredentials,
} from './errors';
import { fail, succeed, unwrap, type Outcome } from './outcome';
import * as repo from './repository';

const RESET_LINK_MS = 60 * 60_000;

export interface ShopSignIn {
  token: string;
  identity: ShopIdentity;
}

/** Back-office sign-in with email and password. */
export async function signIn(
  deps: AuthDeps,
  input: { email: string; password: string; ipAddress: string },
): Promise<ShopSignIn> {
  const now = deps.now();
  const found = await repo.findUserByEmail(deps.db, input.email);
  if (!found) {
    await verifySecret(await equaliseTiming(), input.password);
    throw wrongCredentials();
  }

  const outcome = await withTenant<Outcome<ShopSignIn>>(deps.db, found.tenantId, async (trx) => {
    const user = await repo.lockUserForSignIn(trx, found.userId);
    if (!user) return fail(wrongCredentials());
    if (isLocked(user.lock, now) && user.lock.lockedUntil) {
      return fail(accountLocked(user.lock.lockedUntil));
    }
    if (!(await verifySecret(user.passwordHash, input.password))) {
      return fail(await countWrongPassword(trx, found.tenantId, user, now));
    }
    if (user.status !== 'active') return fail(accountDeactivated());

    await repo.markUserSignedIn(trx, user.id, now);
    return succeed(await openBackofficeSession(trx, found.tenantId, user, input.ipAddress, now));
  });
  return unwrap(outcome);
}

/** Counts a wrong password; the tenth in a row locks the account and is audited. */
async function countWrongPassword(
  trx: TenantTransaction,
  tenantId: string,
  user: repo.SignInUser,
  now: Date,
): Promise<AppError> {
  const failure = recordFailure(user.lock, ACCOUNT_LOCK, now);
  await repo.saveUserLock(trx, user.id, failure.state);
  if (!failure.justLocked || !failure.state.lockedUntil) return wrongCredentials();

  await writeAudit(trx, {
    tenantId,
    userId: user.id,
    actionCode: 'auth.password.locked',
    sentence: `Wrong password ${ACCOUNT_LOCK.maxFailures} times, locked for ${ACCOUNT_LOCK.lockMinutes} minutes`,
    entityType: 'user',
    entityId: user.id,
    isSensitive: true,
    happenedAt: now,
  });
  return accountLocked(failure.state.lockedUntil);
}

async function openBackofficeSession(
  trx: TenantTransaction,
  tenantId: string,
  user: repo.SignInUser,
  ipAddress: string,
  now: Date,
): Promise<ShopSignIn> {
  const session = await createShopSession(trx, {
    tenantId,
    userId: user.id,
    surface: 'backoffice',
    deviceId: null,
    ipAddress,
    now,
  });
  await writeAudit(trx, {
    tenantId,
    userId: user.id,
    actionCode: 'auth.signed_in',
    sentence: 'Signed in to the back-office',
    entityType: 'user',
    entityId: user.id,
    isSensitive: false,
    happenedAt: now,
  });
  const access = await loadBranchAccess(trx, user.id);
  return {
    token: session.token,
    identity: {
      kind: 'shop',
      sessionId: session.sessionId,
      surface: 'backoffice',
      userId: user.id,
      name: user.name,
      email: user.email,
      tenantId,
      deviceId: null,
      ...access,
    },
  };
}

/** What the signed-in screens show about the user, on the back-office or a register. */
export async function describeShopUser(deps: AuthDeps, identity: ShopIdentity): Promise<ShopMe> {
  const summary = await withTenant(deps.db, identity.tenantId, (trx) =>
    repo.shopSummary(trx, identity.tenantId, identity.branchIds, identity.deviceId),
  );
  return {
    user: { id: identity.userId, name: identity.name, email: identity.email },
    shop: summary.shop,
    branches: summary.branches,
    roles: identity.roles.map(({ branchId, roleName }) => ({ branchId, roleName })),
    surface: identity.surface,
    device: summary.device,
  };
}

/** Ends this back-office session. Signing out twice, or with an ended session, does nothing. */
export async function signOut(deps: AuthDeps, token: string): Promise<void> {
  const now = deps.now();
  const check = await resolveShopSession(deps.db, token, 'backoffice', now);
  if (!check.ok) return;
  const { identity } = check;
  await withTenant(deps.db, identity.tenantId, async (trx) => {
    await revokeShopSession(trx, identity.sessionId, 'signed_out', now);
    await writeAudit(trx, {
      tenantId: identity.tenantId,
      userId: identity.userId,
      actionCode: 'auth.signed_out',
      sentence: 'Signed out of the back-office',
      entityType: 'user',
      entityId: identity.userId,
      isSensitive: false,
      happenedAt: now,
    });
  });
}

/**
 * Emails a one-hour reset link to an active user. Answers the same way whether or not the
 * email has an account, so the form cannot be used to find out who has one.
 */
export async function requestPasswordReset(deps: AuthDeps, email: string): Promise<void> {
  const now = deps.now();
  const found = await repo.findUserByEmail(deps.db, email);
  if (!found) return;

  const link = await withTenant(deps.db, found.tenantId, async (trx) => {
    const user = await repo.lockUserForSignIn(trx, found.userId);
    if (!user || user.status !== 'active') return null;
    await repo.retireAuthTokens(trx, user.id, 'password_reset', now);
    const { token, hash } = newShopToken(found.tenantId);
    await repo.createAuthToken(trx, {
      tenantId: found.tenantId,
      userId: user.id,
      purpose: 'password_reset',
      hash,
      expiresAt: new Date(now.getTime() + RESET_LINK_MS),
      now,
    });
    return { to: user.email, name: user.name, token };
  });
  if (!link) return;

  const url = new URL('/set-password', deps.config.backofficeUrl);
  url.searchParams.set('token', link.token);
  await deps.mailer.send({
    to: link.to,
    subject: 'Reset your BrewPoint password',
    text: [
      `Hi ${link.name},`,
      '',
      'Someone asked to reset the password for this BrewPoint account. To choose a new one, open this link within an hour:',
      '',
      url.toString(),
      '',
      'If it was not you, ignore this email. Your password stays the same.',
    ].join('\n'),
  });
}

export interface LinkInfo {
  purpose: repo.LinkPurpose;
  name: string;
  email: string;
}

/** What the set-password screen shows before the person types: whose link and what kind. */
export async function checkLink(deps: AuthDeps, token: string): Promise<LinkInfo> {
  const now = deps.now();
  const tenantId = shopTokenTenant(token);
  if (!tenantId) throw linkInvalid();
  const link = await withTenant(deps.db, tenantId, (trx) =>
    repo.findAuthToken(trx, hashToken(token), false),
  );
  if (!link || !linkUsable(link, now)) throw linkInvalid();
  return { purpose: link.purpose, name: link.name, email: link.email };
}

function linkUsable(link: repo.LinkRow, now: Date): boolean {
  if (link.usedAt !== null || link.expiresAt <= now) return false;
  return link.purpose === 'invite' ? link.status === 'invited' : link.status === 'active';
}

/**
 * Sets a password from an invite or reset link, once. An invite activates the user; a reset
 * signs the user out everywhere else. The person then signs in with the new password.
 */
export async function setPassword(
  deps: AuthDeps,
  input: { token: string; password: string },
): Promise<void> {
  const now = deps.now();
  if (input.password.length < PASSWORD_MIN_LENGTH || input.password.length > PASSWORD_MAX_LENGTH) {
    throw passwordTooShort();
  }
  const tenantId = shopTokenTenant(input.token);
  if (!tenantId) throw linkInvalid();
  const passwordHash = await hashSecret(input.password);

  const outcome = await withTenant<Outcome<void>>(deps.db, tenantId, async (trx) => {
    const link = await repo.findAuthToken(trx, hashToken(input.token), true);
    if (!link || !linkUsable(link, now)) return fail(linkInvalid());

    const isInvite = link.purpose === 'invite';
    await repo.setUserPassword(trx, link.userId, passwordHash, isInvite);
    await repo.markAuthTokenUsed(trx, link.id, now);
    if (!isInvite) await revokeUserSessions(trx, link.userId, 'password_reset', now);
    await writeAudit(trx, {
      tenantId,
      userId: link.userId,
      actionCode: isInvite ? 'auth.password.set' : 'auth.password.reset',
      sentence: isInvite ? 'Set a password from an invite' : 'Set a new password from a reset link',
      entityType: 'user',
      entityId: link.userId,
      isSensitive: !isInvite,
      happenedAt: now,
    });
    return succeed(undefined);
  });
  unwrap(outcome);
}
