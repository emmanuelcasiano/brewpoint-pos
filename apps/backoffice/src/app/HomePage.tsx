import { Button, Card } from '@brewpoint/ui';
import { useState } from 'react';
import { useSession } from './sign-in/use-session';

/** Signed in. A placeholder until the dashboard (Module 12) and the side navigation arrive. */
export function HomePage() {
  const { state, signOut } = useSession();
  const [signingOut, setSigningOut] = useState(false);
  if (state.status !== 'signed-in') return null;
  const { me } = state;
  const role = me.roles[0]?.roleName ?? 'No role yet';

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
        <h1 className="font-display text-display-lg">{me.shop.name}</h1>
        <Card title={`Signed in as ${me.user.name}`} as="h2" meta={role}>
          <div className="bp-stack">
            <p className="bp-note">
              {me.branches.map((branch) => branch.name).join(', ') || 'No branch yet'}. The
              dashboard is not built yet.
            </p>
            <Button loading={signingOut} onClick={() => void handleSignOut()}>
              Sign out
            </Button>
          </div>
        </Card>
      </div>
    </main>
  );
}
