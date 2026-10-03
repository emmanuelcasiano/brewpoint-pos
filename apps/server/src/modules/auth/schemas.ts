import {
  PASSWORD_MAX_LENGTH,
  PIN_MAX_LENGTH,
  PIN_MIN_LENGTH,
  TWO_STEP_CODE_LENGTH,
} from '@brewpoint/shared';
import { z } from 'zod';

// Input checks for the sign-in endpoints. Messages are shown under the field as written.
// The minimum password length is a rule of setting a password (the service checks it), not
// of signing in, so an old shorter password still gets a plain "wrong" rather than a hint.

const EMAIL = z
  .string({ error: 'Enter your email.' })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: 'Enter an email like name@shop.com.' }));

const PASSWORD = z
  .string({ error: 'Enter your password.' })
  .min(1, { error: 'Enter your password.' })
  .max(PASSWORD_MAX_LENGTH, { error: `Use at most ${PASSWORD_MAX_LENGTH} characters.` });

const TOKEN = z
  .string({ error: 'This link is incomplete. Open it again from the email.' })
  .min(1, { error: 'This link is incomplete. Open it again from the email.' })
  .max(200, { error: 'This link is incomplete. Open it again from the email.' });

const CODE = z
  .string({ error: 'Enter the six-digit code from your authenticator app.' })
  .trim()
  .regex(new RegExp(`^\\d{${TWO_STEP_CODE_LENGTH}}$`), {
    error: 'Enter the six-digit code from your authenticator app.',
  });

export const signInBody = z.object({ email: EMAIL, password: PASSWORD });

export const forgotPasswordBody = z.object({ email: EMAIL });

export const linkQuery = z.object({ token: TOKEN });

export const setPasswordBody = z.object({ token: TOKEN, password: PASSWORD });

export const pinSignInBody = z.object({
  userId: z.uuid({ error: 'Choose who is signing in.' }),
  pin: z
    .string({ error: 'Enter your PIN.' })
    .regex(new RegExp(`^\\d{${PIN_MIN_LENGTH},${PIN_MAX_LENGTH}}$`), {
      error: `Enter your PIN: ${PIN_MIN_LENGTH} to ${PIN_MAX_LENGTH} digits.`,
    }),
});

export const deviceEventsBody = z.object({
  events: z
    .array(
      z.object({
        id: z.uuid({ error: 'Each event needs the id the register gave it.' }),
        type: z.enum(['signed_in', 'signed_out', 'pin_locked'], {
          error: 'Each event must be signed_in, signed_out or pin_locked.',
        }),
        userId: z.uuid({ error: 'Each event needs the id of the person.' }),
        happenedAt: z.iso
          .datetime({ offset: true, error: 'Each event needs the time it happened.' })
          .transform((value) => new Date(value)),
      }),
    )
    .max(200, { error: 'Send at most 200 events at a time.' }),
});

export const twoStepCodeBody = z.object({ code: CODE });
