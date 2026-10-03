import { formErrorOf, type FormError } from '@brewpoint/shared';
import { Button, Field, TextInput } from '@brewpoint/ui';
import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router';
import { AuthLayout, CheckingSession, type PageBanner } from './AuthLayout';
import { useSession } from './use-session';

const FIELDS = ['email', 'password'] as const;
type SignInField = (typeof FIELDS)[number];

/** Back-office sign-in: email and password. */
export function SignInPage() {
  const { state, signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FormError<SignInField>['fields']>({});
  const [banner, setBanner] = useState<PageBanner | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (state.status === 'checking') return <CheckingSession />;
  if (state.status === 'signed-in') return <Navigate to="/" replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const missing: FormError<SignInField>['fields'] = {
      ...(email.trim() ? {} : { email: 'Enter your email.' }),
      ...(password ? {} : { password: 'Enter your password.' }),
    };
    setErrors(missing);
    setBanner(null);
    if (Object.keys(missing).length > 0) return;

    setSubmitting(true);
    try {
      await signIn(email, password);
    } catch (error) {
      const result = formErrorOf(error, FIELDS, { wrong_credentials: 'password' });
      setErrors(result.fields);
      setBanner(result.banner && { tone: result.banner.tone, title: result.banner.message });
      setPassword('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Sign in" banner={banner ?? state.notice}>
      <form className="bp-stack" noValidate onSubmit={(event) => void handleSubmit(event)}>
        <Field label="Email" error={errors.email}>
          <TextInput
            type="email"
            inputMode="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Field label="Password" error={errors.password}>
          <TextInput
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        <Button type="submit" variant="primary" block loading={submitting}>
          Sign in
        </Button>
        <Link to="/forgot-password" className="text-label text-accent-strong underline">
          Forgot your password?
        </Link>
      </form>
    </AuthLayout>
  );
}
