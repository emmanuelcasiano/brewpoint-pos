import { Button } from '@brewpoint/ui';
import { Navigate } from 'react-router';
import { api } from '../../lib/api-client';
import { AuthLayout, CheckingSession } from './AuthLayout';
import { CodeField } from './CodeField';
import { stagePath } from './stage-path';
import { useCodeStep } from './use-code-step';
import { useStaffSession } from './use-staff-session';

/** Staff sign-in, step two: the code from the authenticator app. */
export function TwoStepPage() {
  const { state, signOut } = useStaffSession();
  const step = useCodeStep((code) => api.verifyTwoStep({ code }));

  if (state.status === 'checking') return <CheckingSession />;
  if (state.status === 'signed-out') return <Navigate to="/sign-in" replace />;
  if (state.me.stage !== 'two_step') {
    return <Navigate to={stagePath(state.me, state.offerSetup)} replace />;
  }

  return (
    <AuthLayout title="Two-step sign-in" banner={step.banner}>
      <form className="bp-stack" noValidate onSubmit={(event) => void step.submit(event)}>
        <p>
          Open your authenticator app and enter the code it shows for BrewPoint (
          {state.me.staff.email}).
        </p>
        <CodeField value={step.code} onChange={step.setCode} error={step.error} />
        <Button type="submit" variant="primary" block loading={step.submitting}>
          Verify code
        </Button>
        <Button variant="quiet" onClick={() => void signOut()}>
          Use a different account
        </Button>
      </form>
    </AuthLayout>
  );
}
