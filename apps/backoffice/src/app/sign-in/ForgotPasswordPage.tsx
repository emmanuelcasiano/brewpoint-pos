import { formErrorOf } from '@brewpoint/shared';
import { Banner, Button, Field, TextInput } from '@brewpoint/ui';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { api } from '../../lib/api-client';
import { AuthLayout, type PageBanner } from './AuthLayout';

/** Asks for a password reset link by email. Says the same thing whether or not the email has an account. */
export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [banner, setBanner] = useState<PageBanner | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBanner(null);
    if (!email.trim()) {
      setError('Enter the email you sign in with.');
      return;
    }
    setError(undefined);
    setSubmitting(true);
    try {
      await api.forgotPassword({ email });
      setSentTo(email.trim());
    } catch (caught) {
      const result = formErrorOf(caught, ['email']);
      setError(result.fields.email);
      setBanner(result.banner && { tone: result.banner.tone, title: result.banner.message });
    } finally {
      setSubmitting(false);
    }
  }

  if (sentTo) {
    return (
      <AuthLayout title="Check your email">
        <div className="bp-stack">
          <Banner tone="info" icon="check" title="Check your email.">
            If {sentTo} has a BrewPoint account, a reset link is on its way. It works for 1 hour.
          </Banner>
          <Link to="/sign-in" className="text-label text-accent-strong underline">
            Back to sign in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset your password" banner={banner}>
      <form className="bp-stack" noValidate onSubmit={(event) => void handleSubmit(event)}>
        <p>Enter the email you sign in with. We will send a link to choose a new password.</p>
        <Field label="Email" error={error}>
          <TextInput
            type="email"
            inputMode="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Button type="submit" variant="primary" block loading={submitting}>
          Send reset link
        </Button>
        <Link to="/sign-in" className="text-label text-accent-strong underline">
          Back to sign in
        </Link>
      </form>
    </AuthLayout>
  );
}
