import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { CheckingSession } from './AuthLayout';
import { useSession } from './use-session';

/** Shows its children only to a signed-in user; anyone else goes to the sign-in page. */
export function RequireSignIn({ children }: { children: ReactNode }) {
  const { state } = useSession();
  if (state.status === 'checking') return <CheckingSession />;
  if (state.status === 'signed-out') return <Navigate to="/sign-in" replace />;
  return children;
}
