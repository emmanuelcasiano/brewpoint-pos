import { use } from 'react';
import { StaffSessionContext, type StaffSessionValue } from './session-context';

export function useStaffSession(): StaffSessionValue {
  const value = use(StaffSessionContext);
  if (!value) throw new Error('useStaffSession needs a StaffSessionProvider above it.');
  return value;
}
