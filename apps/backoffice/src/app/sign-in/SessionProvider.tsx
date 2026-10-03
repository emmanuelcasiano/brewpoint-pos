import { ApiRequestError } from '@brewpoint/shared';
import { useTheme } from '@brewpoint/ui';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../../lib/api-client';
import {
  SessionContext,
  type SessionState,
  type SessionValue,
  type SignInNotice,
} from './session-context';

/** What the sign-in page says when the first check finds no session. */
function noticeFor(error: unknown): SignInNotice | undefined {
  if (!(error instanceof ApiRequestError)) return undefined;
  if (error.offline) return { tone: 'offline', title: error.message };
  if (error.code === 'signed_out') return undefined;
  return { tone: 'info', title: error.message };
}

/**
 * Who is signed in to the back-office. Checks the session cookie on load, and applies the
 * shop's accent once a shop is known (sign-in screens keep the default Crema).
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: 'checking' });
  useTheme(state.status === 'signed-in' ? state.me.shop.accentHex : null);

  useEffect(() => {
    let current = true;
    api.me().then(
      (me) => current && setState({ status: 'signed-in', me }),
      (error: unknown) => current && setState({ status: 'signed-out', notice: noticeFor(error) }),
    );
    return () => {
      current = false;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const me = await api.signIn({ email, password });
    setState({ status: 'signed-in', me });
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api.signOut();
    } finally {
      setState({ status: 'signed-out' });
    }
  }, []);

  const showNotice = useCallback((notice: SignInNotice) => {
    setState({ status: 'signed-out', notice });
  }, []);

  const value = useMemo<SessionValue>(
    () => ({ state, signIn, signOut, showNotice }),
    [state, signIn, signOut, showNotice],
  );
  return <SessionContext value={value}>{children}</SessionContext>;
}
