import { ACCOUNT_LOCK, isLocked, recordFailure, type StaffMe } from '@brewpoint/shared';
import type { Transaction } from 'kysely';
import { writePlatformAudit } from '../../core/audit/platform-audit';
import type { StaffIdentity, StaffStage } from '../../core/auth/identity';
import { verifySecret } from '../../core/auth/password';
import {
  createStaffSession,
  resolveStaffSession,
  revokeStaffSession,
} from '../../core/auth/sessions';
import {
  decryptTotpSecret,
  encryptTotpSecret,
  newTotpSecret,
  totpUri,
  verifyTotp,
} from '../../core/auth/totp';
import type { AppError } from '../../core/errors';
import type { DB } from '../../db/types';
import type { AuthDeps } from './deps';
import {
  accountLocked,
  equaliseTiming,
  signInAgain,
  staffDeactivated,
  twoStepNotPending,
  wrongCode,
  wrongCredentials,
} from './errors';
import { fail, succeed, unwrap, type Outcome } from './outcome';
import * as repo from './repository';

type PlatformTrx = Transaction<DB>;

export interface StaffSignIn {
  token: string;
  /** active: in. two_step: enter the code. two_step_setup: set up two-step before anything else. */
  stage: StaffStage;
  /** First sign-in without two-step: offer setup now, with "Set up later". */
  offerTwoStepSetup: boolean;
}

/**
 * Staff console sign-in, step one. Two-step is required from the second sign-in: someone
 * who signed in before without setting it up must set it up before anything else.
 * A correct password does not clear the wrong-try count until the sign-in is complete, so
 * wrong codes keep counting towards the lock.
 */
export async function staffSignIn(
  deps: AuthDeps,
  input: { email: string; password: string; ipAddress: string },
): Promise<StaffSignIn> {
  const now = deps.now();
  const email = input.email.trim().toLowerCase();
  const outcome = await deps.platformDb.transaction().execute<Outcome<StaffSignIn>>(async (trx) => {
    const staff = await repo.lockStaffByEmail(trx, email);
    if (!staff) {
      await verifySecret(await equaliseTiming(), input.password);
      return fail(wrongCredentials());
    }
    if (isLocked(staff.lock, now) && staff.lock.lockedUntil) {
      return fail(accountLocked(staff.lock.lockedUntil));
    }
    if (!(await verifySecret(staff.passwordHash, input.password))) {
      return fail(await countWrongTry(trx, staff, 'password', null, input.ipAddress, now));
    }
    if (staff.status !== 'active') return fail(staffDeactivated());

    const stage: StaffStage = staff.totpSecretEnc
      ? 'two_step'
      : (await repo.staffHasSignedInBefore(trx, staff.id))
        ? 'two_step_setup'
        : 'active';
    const session = await createStaffSession(trx, {
      staffId: staff.id,
      stage,
      ipAddress: input.ipAddress,
      now,
    });
    if (stage === 'active') await completeSignIn(trx, staff.id, input.ipAddress, now);
    return succeed({ token: session.token, stage, offerTwoStepSetup: stage === 'active' });
  });
  return unwrap(outcome);
}

/** Step two for staff with two-step on: the six-digit code. */
export async function verifyTwoStep(
  deps: AuthDeps,
  input: { token: string; code: string; ipAddress: string },
): Promise<void> {
  const now = deps.now();
  const identity = await pendingIdentity(deps, input.token, now, (id) => id.stage === 'two_step');

  const outcome = await deps.platformDb.transaction().execute<Outcome<void>>(async (trx) => {
    const staff = await repo.lockStaffById(trx, identity.staffId);
    if (!staff?.totpSecretEnc) return fail(twoStepNotPending());
    if (isLocked(staff.lock, now) && staff.lock.lockedUntil) {
      await revokeStaffSession(trx, identity.sessionId, 'locked', now);
      return fail(accountLocked(staff.lock.lockedUntil));
    }
    const secret = decryptTotpSecret(staff.totpSecretEnc, deps.config.totpKey);
    if (!verifyTotp(secret, input.code, now)) {
      return fail(
        await countWrongTry(trx, staff, 'code', identity.sessionId, input.ipAddress, now),
      );
    }
    await repo.updateStaffSession(trx, identity.sessionId, { stage: 'active', lastSeenAt: now });
    await completeSignIn(trx, staff.id, input.ipAddress, now);
    return succeed(undefined);
  });
  unwrap(outcome);
}

/** Two-step setup may start while it is required, or after a first sign-in without it. */
function canSetUpTwoStep(identity: StaffIdentity): boolean {
  return (
    identity.stage === 'two_step_setup' || (identity.stage === 'active' && !identity.twoStepOn)
  );
}

/**
 * Starts two-step setup: a secret kept encrypted on the session until the first code confirms
 * it. Starting again on the same sign-in (a reload, a second tab) gets the same secret, so
 * the QR code already scanned keeps working. Returns what the setup screen shows (a QR code of
 * the address, and the secret for typing in by hand).
 */
export async function beginTwoStepSetup(
  deps: AuthDeps,
  token: string,
): Promise<{ secret: string; otpauthUri: string }> {
  const now = deps.now();
  const identity = await pendingIdentity(deps, token, now, canSetUpTwoStep);
  const stored = await repo.keepPendingTotpSecret(
    deps.platformDb,
    identity.sessionId,
    encryptTotpSecret(newTotpSecret(), deps.config.totpKey),
  );
  const secret = decryptTotpSecret(stored, deps.config.totpKey);
  return { secret, otpauthUri: totpUri(secret, identity.email) };
}

/** Finishes setup with the first code from the app; two-step is on from then on. */
export async function confirmTwoStepSetup(
  deps: AuthDeps,
  input: { token: string; code: string; ipAddress: string },
): Promise<void> {
  const now = deps.now();
  const identity = await pendingIdentity(deps, input.token, now, canSetUpTwoStep);
  const pending = await repo.pendingTotpSecret(deps.platformDb, identity.sessionId);
  if (!pending) throw twoStepNotPending();

  const outcome = await deps.platformDb.transaction().execute<Outcome<void>>(async (trx) => {
    const staff = await repo.lockStaffById(trx, identity.staffId);
    if (!staff) return fail(signInAgain());
    if (isLocked(staff.lock, now) && staff.lock.lockedUntil) {
      await revokeStaffSession(trx, identity.sessionId, 'locked', now);
      return fail(accountLocked(staff.lock.lockedUntil));
    }
    if (!verifyTotp(decryptTotpSecret(pending, deps.config.totpKey), input.code, now)) {
      return fail(
        await countWrongTry(trx, staff, 'code', identity.sessionId, input.ipAddress, now),
      );
    }

    await repo.setStaffTotp(trx, staff.id, pending);
    await repo.updateStaffSession(trx, identity.sessionId, {
      stage: 'active',
      pendingTotpSecretEnc: null,
      lastSeenAt: now,
    });
    await writePlatformAudit(trx, {
      ...staffEntry(staff.id, input.ipAddress, now),
      actionCode: 'auth.two_step.enabled',
      sentence: 'Turned on two-step sign-in',
      isSensitive: true,
    });
    if (identity.stage === 'two_step_setup') {
      await completeSignIn(trx, staff.id, input.ipAddress, now);
    }
    return succeed(undefined);
  });
  unwrap(outcome);
}

export function describeStaff(identity: StaffIdentity): StaffMe {
  return {
    stage: identity.stage,
    staff: { id: identity.staffId, name: identity.name, email: identity.email },
    role: { id: identity.roleId, name: identity.roleName },
    twoStepOn: identity.twoStepOn,
  };
}

/** Ends the staff session at any stage. */
export async function staffSignOut(
  deps: AuthDeps,
  input: { token: string; ipAddress: string },
): Promise<void> {
  const now = deps.now();
  const check = await resolveStaffSession(deps.platformDb, input.token, now);
  if (!check.ok) return;
  await deps.platformDb.transaction().execute(async (trx) => {
    await revokeStaffSession(trx, check.identity.sessionId, 'signed_out', now);
    await writePlatformAudit(trx, {
      ...staffEntry(check.identity.staffId, input.ipAddress, now),
      actionCode: 'auth.signed_out',
      sentence: 'Signed out of the staff console',
      isSensitive: false,
    });
  });
}

async function pendingIdentity(
  deps: AuthDeps,
  token: string,
  now: Date,
  allowed: (identity: StaffIdentity) => boolean,
): Promise<StaffIdentity> {
  const check = await resolveStaffSession(deps.platformDb, token, now);
  if (!check.ok) throw signInAgain();
  if (!allowed(check.identity)) throw twoStepNotPending();
  return check.identity;
}

async function completeSignIn(
  trx: PlatformTrx,
  staffId: string,
  ipAddress: string,
  now: Date,
): Promise<void> {
  await repo.markStaffSignedIn(trx, staffId, now);
  await writePlatformAudit(trx, {
    ...staffEntry(staffId, ipAddress, now),
    actionCode: 'auth.signed_in',
    sentence: 'Signed in to the staff console',
    isSensitive: false,
  });
}

/**
 * A wrong password or code. They share one count: the tenth in a row locks the account for
 * 15 minutes, ends this sign-in and is audited.
 */
async function countWrongTry(
  trx: PlatformTrx,
  staff: repo.SignInStaff,
  kind: 'password' | 'code',
  sessionId: string | null,
  ipAddress: string,
  now: Date,
): Promise<AppError> {
  const failure = recordFailure(staff.lock, ACCOUNT_LOCK, now);
  await repo.saveStaffLock(trx, staff.id, failure.state);
  if (!failure.justLocked || !failure.state.lockedUntil) {
    return kind === 'password' ? wrongCredentials() : wrongCode();
  }

  if (sessionId) await revokeStaffSession(trx, sessionId, 'locked', now);
  await writePlatformAudit(trx, {
    ...staffEntry(staff.id, ipAddress, now),
    actionCode: 'auth.locked',
    sentence: `Wrong password or code ${ACCOUNT_LOCK.maxFailures} times, locked for ${ACCOUNT_LOCK.lockMinutes} minutes`,
    isSensitive: true,
  });
  return accountLocked(failure.state.lockedUntil);
}

function staffEntry(staffId: string, ipAddress: string, now: Date) {
  return {
    staffId,
    entityType: 'platform_user',
    entityId: staffId,
    ipAddress,
    happenedAt: now,
  };
}
