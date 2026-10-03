import { Banner, Button, Card } from '@brewpoint/ui';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useStaffSession } from './sign-in/use-staff-session';

/** Signed in. A placeholder until the console shell and Overview (Module 18). */
export function HomePage() {
  const { state, signOut } = useStaffSession();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  if (state.status !== 'staff') return null;
  const { me } = state;

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-surface p-4 font-sans text-body text-ink">
      <div className="bp-stack w-full max-w-[440px]">
        <h1 className="font-display text-display-lg">Staff console</h1>
        {!me.twoStepOn && (
          <Banner
            tone="warning"
            title="Two-step sign-in is off."
            action={{ label: 'Set it up', onClick: () => void navigate('/two-step/setup') }}
          >
            You must set it up before your next sign-in.
          </Banner>
        )}
        <Card title={`Signed in as ${me.staff.name}`} as="h2" meta={me.role.name}>
          <div className="bp-stack">
            <p className="bp-note">The console overview is not built yet.</p>
            <Button loading={signingOut} onClick={() => void handleSignOut()}>
              Sign out
            </Button>
          </div>
        </Card>
      </div>
    </main>
  );
}
