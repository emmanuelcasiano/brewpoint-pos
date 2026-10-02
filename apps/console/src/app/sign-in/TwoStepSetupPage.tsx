import { ApiRequestError, type TwoStepSetupResponse } from '@brewpoint/shared';
import { Banner, Button } from '@brewpoint/ui';
import { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { api } from '../../lib/api-client';
import { AuthLayout, CheckingSession, type PageBanner } from './AuthLayout';
import { CodeField } from './CodeField';
import { QrCode } from './QrCode';
import { stagePath } from './stage-path';
import { useCodeStep } from './use-code-step';
import { useStaffSession } from './use-staff-session';

type SetupState =
  | { status: 'loading' }
  | { status: 'failed'; banner: PageBanner }
  | { status: 'ready'; setup: TwoStepSetupResponse };

/**
 * Turns on two-step sign-in: scan the QR code (or type the key), then confirm with the first
 * code. Required from the second sign-in; offered, with "Set up later", on the first.
 */
export function TwoStepSetupPage() {
  const { state } = useStaffSession();
  if (state.status === 'checking') return <CheckingSession />;
  if (state.status === 'signed-out') return <Navigate to="/sign-in" replace />;
  const { me } = state;
  const allowed = me.stage === 'two_step_setup' || (me.stage === 'active' && !me.twoStepOn);
  if (!allowed) return <Navigate to={stagePath(me, false)} replace />;
  return <SetupSteps required={me.stage === 'two_step_setup'} email={me.staff.email} />;
}

function SetupSteps({ required, email }: { required: boolean; email: string }) {
  const { state, update, end } = useStaffSession();
  const navigate = useNavigate();
  const [setup, setSetup] = useState<SetupState>({ status: 'loading' });
  const step = useCodeStep((code) => api.confirmTwoStepSetup({ code }));

  // The server gives the same secret if setup starts twice (a reload, React's double effect).
  const load = useCallback(() => {
    api.beginTwoStepSetup().then(
      (response) => setSetup({ status: 'ready', setup: response }),
      (error: unknown) => {
        if (error instanceof ApiRequestError && error.status === 401) {
          end({ tone: 'warning', title: error.message });
          return;
        }
        const offline = error instanceof ApiRequestError && error.offline;
        setSetup({
          status: 'failed',
          banner: {
            tone: offline ? 'offline' : 'warning',
            title: error instanceof Error ? error.message : 'Two-step setup could not start.',
          },
        });
      },
    );
  }, [end]);

  useEffect(() => {
    load();
  }, [load]);

  function retry() {
    setSetup({ status: 'loading' });
    load();
  }

  function later() {
    if (state.status === 'staff') update(state.me);
    void navigate('/', { replace: true });
  }

  return (
    <AuthLayout title="Turn on two-step sign-in" banner={step.banner}>
      <div className="bp-stack">
        <p>
          {required
            ? 'Two-step sign-in is required for every staff account. Set it up now to continue.'
            : 'Two-step sign-in is required for every staff account. Set it up now, or later while you are signed in. Your next sign-in will ask for it.'}
        </p>
        {setup.status === 'loading' && (
          <p role="status" aria-busy="true" className="text-ink-muted">
            Making your setup code…
          </p>
        )}
        {setup.status === 'failed' && (
          <Banner
            tone={setup.banner.tone}
            title={setup.banner.title}
            action={{ label: 'Try again', onClick: retry }}
          />
        )}
        {setup.status === 'ready' && (
          <form className="bp-stack" noValidate onSubmit={(event) => void step.submit(event)}>
            <ol className="bp-stack list-decimal pl-6">
              <li>Open an authenticator app, such as Google Authenticator, Authy or 1Password.</li>
              <li>Scan this code, or type the key below it.</li>
              <li>Enter the six-digit code the app shows.</li>
            </ol>
            <QrCode value={setup.setup.otpauthUri} label={`Two-step setup code for ${email}`} />
            <p className="bp-note">
              Key: <code className="font-mono break-all text-ink">{setup.setup.secret}</code>
            </p>
            <CodeField value={step.code} onChange={step.setCode} error={step.error} />
            <Button type="submit" variant="primary" block loading={step.submitting}>
              Turn on two-step sign-in
            </Button>
          </form>
        )}
        {!required && (
          <Button variant="quiet" onClick={later}>
            Set up later
          </Button>
        )}
      </div>
    </AuthLayout>
  );
}
