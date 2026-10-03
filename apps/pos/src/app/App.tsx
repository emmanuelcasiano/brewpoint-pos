import { useTheme } from '@brewpoint/ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { readPosSession, writePosSession, type PosSession } from '../offline/pos-session';
import { endSession } from './end-session';
import { PosShell } from './PosShell';
import { PinSignIn } from './sign-in/PinSignIn';
import { usePinUsers } from './sign-in/use-pin-users';

/**
 * The register: PIN sign-in, then the signed-in shell. Who is signed in is kept on the device,
 * so a reload or a lost connection never signs anyone out.
 */
export function App() {
  const pinUsers = usePinUsers();
  const { cache, setConnection, refresh } = pinUsers;
  const [session, setSession] = useState<PosSession | null | undefined>(undefined);
  const [notice, setNotice] = useState<string | null>(null);
  useTheme(cache?.device.accentHex ?? null);

  useEffect(() => {
    void readPosSession().then((stored) => setSession(stored ?? null));
  }, []);

  const signOut = useCallback(
    async (current: PosSession, reason: string | null) => {
      const reached = await endSession(current, new Date());
      if (reached !== undefined) setConnection(reached ? 'online' : 'offline');
      setNotice(reason);
      setSession(null);
    },
    [setConnection],
  );

  // After a refresh, someone no longer on this register's list (deactivated, moved) is signed
  // out. The ref keeps React's double effect in development from signing them out twice.
  const removing = useRef<string | null>(null);
  useEffect(() => {
    if (!session || !cache || cache.users.some((user) => user.id === session.userId)) return;
    if (removing.current === session.userId) return;
    removing.current = session.userId;
    const reason = `${session.name} can no longer use this register, so they were signed out.`;
    void endSession(session, new Date()).then((reached) => {
      if (reached !== undefined) setConnection(reached ? 'online' : 'offline');
      setNotice(reason);
      setSession(null);
      removing.current = null;
    });
  }, [session, cache, setConnection]);

  async function signedIn(next: PosSession) {
    await writePosSession(next);
    setNotice(null);
    setSession(next);
  }

  if (session === undefined) {
    return (
      <main
        className="grid min-h-screen place-items-center bg-surface font-sans text-body text-ink-muted"
        aria-busy="true"
      >
        <p role="status">Starting the register…</p>
      </main>
    );
  }
  if (session) {
    return (
      <PosShell
        session={session}
        device={cache?.device ?? null}
        connection={pinUsers.connection}
        onSignOut={() => signOut(session, null)}
      />
    );
  }
  return (
    <PinSignIn
      pinUsers={pinUsers}
      notice={notice}
      onSignedIn={(next) => void signedIn(next)}
      onServerAnswer={(reached) => setConnection(reached ? 'online' : 'offline')}
      onRefused={() => void refresh()}
    />
  );
}
