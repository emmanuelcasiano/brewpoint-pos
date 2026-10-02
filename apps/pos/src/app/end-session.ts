import { ApiRequestError } from '@brewpoint/shared';
import { api } from '../lib/api-client';
import { queueAuthEvent } from '../offline/auth-events';
import { clearPosSession, type PosSession } from '../offline/pos-session';

/**
 * Signs the person out of this register. With a server session it ends it there (the server
 * writes "Signed out on T1"); offline, or after an offline sign-in, the sign-out is queued for
 * the audit log. Either way the register is signed out at once.
 * Returns whether the server was reached, when it was tried.
 */
export async function endSession(session: PosSession, now: Date): Promise<boolean | undefined> {
  await clearPosSession();
  if (session.token) {
    try {
      await api.signOut(session.token);
      return true;
    } catch (error) {
      if (error instanceof ApiRequestError && !error.offline) return true;
      await queueAuthEvent('signed_out', session.userId, now);
      return false;
    }
  }
  await queueAuthEvent('signed_out', session.userId, now);
  return undefined;
}
