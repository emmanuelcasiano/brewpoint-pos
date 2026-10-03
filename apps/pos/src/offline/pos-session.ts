import { deleteItem, getItem, putItem } from './local-store';

/** Who is signed in on this register. Kept on the device so a reload keeps them signed in. */
export interface PosSession {
  userId: string;
  name: string;
  roleName: string;
  /** The server session (bearer token); null when the sign-in happened offline. */
  token: string | null;
  signedInAt: string;
}

const CURRENT = 'current';

export function readPosSession(): Promise<PosSession | undefined> {
  return getItem<PosSession>('session', CURRENT);
}

export function writePosSession(session: PosSession): Promise<void> {
  return putItem('session', CURRENT, session);
}

export function clearPosSession(): Promise<void> {
  return deleteItem('session', CURRENT);
}
