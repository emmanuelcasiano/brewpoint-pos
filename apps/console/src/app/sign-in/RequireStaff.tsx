import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { CheckingSession } from './AuthLayout';
import { stagePath } from './stage-path';
import { useStaffSession } from './use-staff-session';

/** Shows its children only to staff who have finished signing in; others go to their step. */
export function RequireStaff({ children }: { children: ReactNode }) {
  const { state } = useStaffSession();
  if (state.status === 'checking') return <CheckingSession />;
  if (state.status === 'signed-out') return <Navigate to="/sign-in" replace />;
  const path = stagePath(state.me, state.offerSetup);
  if (path !== '/') return <Navigate to={path} replace />;
  return children;
}
