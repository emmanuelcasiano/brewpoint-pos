import type { ShopMe } from '@brewpoint/shared';
import type { BannerTone } from '@brewpoint/ui';
import { createContext } from 'react';

/** A message the sign-in page shows once: an ended session, a new password, no connection. */
export interface SignInNotice {
  tone: BannerTone;
  title: string;
}

export type SessionState =
  | { status: 'checking' }
  | { status: 'signed-out'; notice?: SignInNotice }
  | { status: 'signed-in'; me: ShopMe };

export interface SessionValue {
  state: SessionState;
  /** Fails with ApiRequestError; the page shows its message. */
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Leaves the person on the sign-in page with this message (after setting a password). */
  showNotice: (notice: SignInNotice) => void;
}

export const SessionContext = createContext<SessionValue | null>(null);
