import {
  ApiRequestError,
  formErrorOf,
  PASSWORD_MIN_LENGTH,
  type PasswordLinkInfo,
} from '@brewpoint/shared';
import { Banner, Button, Field, TextInput } from '@brewpoint/ui';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { api } from '../../lib/api-client';
import { AuthLayout, type PageBanner } from './AuthLayout';
import { useSession } from './use-session';

const TOO_SHORT = `Use at least ${PASSWORD_MIN_LENGTH} characters. A short sentence is easy to remember.`;
const MISMATCH = 'The two passwords do not match. Type the same password twice.';
const NO_TOKEN =
  'This link is incomplete. Open it again from the email, or request a new reset link.';

type LinkState =
  | { status: 'checking' }
  | { status: 'invalid'; message: string; offline: boolean }
  | { status: 'ready'; link: PasswordLinkInfo };

/** Sets a password from an invite or reset link, then sends the person to sign in. */
export function SetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [link, setLink] = useState<LinkState>(
    token ? { status: 'checking' } : { status: 'invalid', message: NO_TOKEN, offline: false },
  );

  useEffect(() => {
    if (!token) return;
    let current = true;
    api.passwordLink(token).then(
      (info) => current && setLink({ status: 'ready', link: info }),
      (error: unknown) =>
        current &&
        setLink({
          status: 'invalid',
          message: error instanceof Error ? error.message : NO_TOKEN,
          offline: error instanceof ApiRequestError && error.offline,
        }),
    );
    return () => {
      current = false;
    };
  }, [token]);

  if (link.status === 'checking') {
    return (
      <AuthLayout title="Set your password">
        <p role="status" aria-busy="true" className="text-ink-muted">
          Checking your link…
        </p>
      </AuthLayout>
    );
  }
  if (link.status === 'invalid')
    return <InvalidLink message={link.message} offline={link.offline} />;
  return (
    <PasswordForm
      token={token}
      link={link.link}
      onInvalid={(message) => setLink({ status: 'invalid', message, offline: false })}
    />
  );
}

function InvalidLink({ message, offline }: { message: string; offline: boolean }) {
  const navigate = useNavigate();
  return (
    <AuthLayout title="This link cannot be used">
      <div className="bp-stack">
        <Banner
          tone={offline ? 'offline' : 'warning'}
          title={message}
          action={
            offline
              ? undefined
              : { label: 'Request a new link', onClick: () => void navigate('/forgot-password') }
          }
        />
        <Link to="/sign-in" className="text-label text-accent-strong underline">
          Back to sign in
        </Link>
      </div>
    </AuthLayout>
  );
}

function PasswordForm({
  token,
  link,
  onInvalid,
}: {
  token: string;
  link: PasswordLinkInfo;
  onInvalid: (message: string) => void;
}) {
  const navigate = useNavigate();
  const { showNotice } = useSession();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [banner, setBanner] = useState<PageBanner | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isInvite = link.purpose === 'invite';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBanner(null);
    const problems = {
      ...(password.length < PASSWORD_MIN_LENGTH ? { password: TOO_SHORT } : {}),
      ...(password !== confirm ? { confirm: MISMATCH } : {}),
    };
    setErrors(problems);
    if (Object.keys(problems).length > 0) return;

    setSubmitting(true);
    try {
      await api.setPassword({ token, password });
      showNotice({ tone: 'info', title: 'Password set. Sign in with your new password.' });
      void navigate('/sign-in', { replace: true });
    } catch (error) {
      if (error instanceof ApiRequestError && error.code === 'link_invalid') {
        onInvalid(error.message);
        return;
      }
      const result = formErrorOf(error, ['password'], { password_too_short: 'password' });
      setErrors(result.fields);
      setBanner(result.banner && { tone: result.banner.tone, title: result.banner.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title={isInvite ? 'Set your password' : 'Choose a new password'} banner={banner}>
      <form className="bp-stack" noValidate onSubmit={(event) => void handleSubmit(event)}>
        <p>
          {isInvite ? `Welcome, ${link.name}. ` : ''}This password is for{' '}
          <strong>{link.email}</strong>.
        </p>
        <Field
          label="New password"
          help={`At least ${PASSWORD_MIN_LENGTH} characters.`}
          error={errors.password}
        >
          <TextInput
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        <Field label="Type it again" error={errors.confirm}>
          <TextInput
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
          />
        </Field>
        <Button type="submit" variant="primary" block loading={submitting}>
          Set password
        </Button>
      </form>
    </AuthLayout>
  );
}
