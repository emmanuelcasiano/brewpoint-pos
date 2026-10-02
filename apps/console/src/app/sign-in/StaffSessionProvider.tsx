import { ApiRequestError, type StaffMe } from '@brewpoint/shared';
import { useTheme } from '@brewpoint/ui';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../../lib/api-client';
import {
  StaffSessionContext,
  type SignInNotice,
  type StaffSessionState,
  type StaffSessionValue,
} from './session-context';

function noticeFor(error: unknown): SignInNotice | undefined {
  if (!(error instanceof ApiRequestError)) return undefined;
  if (error.offline) return { tone: 'offline', title: error.message };
  if (error.code === 'signed_out') return undefined;
  return { tone: 'info', title: error.message };
}

/**
 * Who is signed in to the staff console, and at which stage. Checks the cookie on load, so a
 * reload in the middle of two-step comes back to the same step. The console keeps the default
 * accent: it belongs to no shop.
 */
export function StaffSessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StaffSessionState>({ status: 'checking' });
  useTheme(null);

  useEffect(() => {
    let current = true;
    api.me().then(
      (me) => current && setState({ status: 'staff', me, offerSetup: false }),
      (error: unknown) => current && setState({ status: 'signed-out', notice: noticeFor(error) }),
    );
    return () => {
      current = false;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { offerTwoStepSetup } = await api.signIn({ email, password });
    const me = await api.me();
    setState({ status: 'staff', me, offerSetup: offerTwoStepSetup });
    return me;
  }, []);

  const update = useCallback((me: StaffMe) => {
    setState({ status: 'staff', me, offerSetup: false });
  }, []);

  const end = useCallback((notice?: SignInNotice) => {
    setState({ status: 'signed-out', notice });
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api.signOut();
    } finally {
      setState({ status: 'signed-out' });
    }
  }, []);

  const value = useMemo<StaffSessionValue>(
    () => ({ state, signIn, update, end, signOut }),
    [state, signIn, update, end, signOut],
  );
  return <StaffSessionContext value={value}>{children}</StaffSessionContext>;
}
