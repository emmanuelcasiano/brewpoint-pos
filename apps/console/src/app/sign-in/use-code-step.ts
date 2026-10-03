import {
  ApiRequestError,
  formErrorOf,
  TWO_STEP_CODE_LENGTH,
  type StaffMe,
} from '@brewpoint/shared';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import type { PageBanner } from './AuthLayout';
import { useStaffSession } from './use-staff-session';

const ENTER_CODE = 'Enter the six-digit code from your authenticator app.';

/** Errors after which this sign-in is over: back to the sign-in page with the server's words. */
const ENDS_SIGN_IN = new Set([
  'sign_in_again',
  'account_locked',
  'account_deactivated',
  'session_expired',
  'signed_out',
]);

/** A form that sends a six-digit code: the two-step step and the setup confirmation. */
export function useCodeStep(send: (code: string) => Promise<StaffMe>) {
  const { update, end } = useStaffSession();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [banner, setBanner] = useState<PageBanner | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBanner(null);
    if (code.length !== TWO_STEP_CODE_LENGTH) {
      setError(ENTER_CODE);
      return;
    }
    setError(undefined);
    setSubmitting(true);
    try {
      update(await send(code));
      void navigate('/', { replace: true });
    } catch (caught) {
      if (caught instanceof ApiRequestError && ENDS_SIGN_IN.has(caught.code)) {
        end({ tone: 'warning', title: caught.message });
        return;
      }
      const result = formErrorOf(caught, ['code'], { wrong_code: 'code' });
      setError(result.fields.code);
      setBanner(result.banner && { tone: result.banner.tone, title: result.banner.message });
      setCode('');
    } finally {
      setSubmitting(false);
    }
  }

  return { code, setCode, error, banner, submitting, submit };
}
