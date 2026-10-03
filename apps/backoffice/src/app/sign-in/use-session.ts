import { use } from 'react';
import { SessionContext, type SessionValue } from './session-context';

export function useSession(): SessionValue {
  const value = use(SessionContext);
  if (!value) throw new Error('useSession needs a SessionProvider above it.');
  return value;
}
