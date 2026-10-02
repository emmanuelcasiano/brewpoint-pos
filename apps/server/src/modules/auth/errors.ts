import {
  accountLockedMessage,
  PASSWORD_MIN_LENGTH,
  pinLockedMessage,
  wrongPinMessage,
} from '@brewpoint/shared';
import { hashSecret } from '../../core/auth/password';
import { AppError } from '../../core/errors';

// The sign-in errors, in one place so the three surfaces say the same thing.

export function wrongCredentials(): AppError {
  return new AppError(
    401,
    'wrong_credentials',
    'Wrong email or password. Check both and try again.',
  );
}

export function accountLocked(until: Date): AppError {
  return new AppError(423, 'account_locked', accountLockedMessage(until), {
    lockedUntil: until.toISOString(),
  });
}

export function accountDeactivated(): AppError {
  return new AppError(
    403,
    'account_deactivated',
    'This account is turned off. Ask the shop owner to turn it back on.',
  );
}

export function staffDeactivated(): AppError {
  return new AppError(
    403,
    'account_deactivated',
    'This staff account is turned off. Ask a Superadmin to turn it back on.',
  );
}

export function linkInvalid(): AppError {
  return new AppError(
    400,
    'link_invalid',
    'This link has expired or was already used. Request a new reset link, or ask the shop owner for a new invite.',
  );
}

export function passwordTooShort(): AppError {
  return new AppError(
    400,
    'password_too_short',
    `Use at least ${PASSWORD_MIN_LENGTH} characters. A short sentence is easy to remember.`,
    { field: 'password' },
  );
}

export function wrongPin(triesLeft: number): AppError {
  return new AppError(401, 'wrong_pin', wrongPinMessage(triesLeft), { triesLeft });
}

export function pinLocked(name: string, until: Date): AppError {
  return new AppError(423, 'pin_locked', pinLockedMessage(name, until), {
    lockedUntil: until.toISOString(),
  });
}

export function pinUserUnavailable(): AppError {
  return new AppError(
    403,
    'pin_user_unavailable',
    'This person cannot sign in on this register. Ask the owner to check their account and branch.',
  );
}

export function wrongCode(): AppError {
  return new AppError(
    401,
    'wrong_code',
    'Wrong code. Enter the newest six-digit code from your authenticator app.',
    { field: 'code' },
  );
}

export function signInAgain(): AppError {
  return new AppError(
    401,
    'sign_in_again',
    'Your sign-in took too long or has ended. Sign in again.',
  );
}

export function twoStepNotPending(): AppError {
  return new AppError(
    409,
    'two_step_not_pending',
    'There is no two-step setup to finish. Start it again from the setup screen.',
  );
}

let dummyHash: Promise<string> | undefined;

/**
 * Checks a password against a throwaway hash when no account matches, so an unknown email
 * takes as long as a wrong password and response times do not reveal which emails exist.
 */
export function equaliseTiming(): Promise<string> {
  dummyHash ??= hashSecret('no account has this password');
  return dummyHash;
}
