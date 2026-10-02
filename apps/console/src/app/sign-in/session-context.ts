import type { StaffMe } from '@brewpoint/shared';
import type { BannerTone } from '@brewpoint/ui';
import { createContext } from 'react';

/** A message the sign-in page shows once: an ended sign-in, a lock, no connection. */
export interface SignInNotice {
  tone: BannerTone;
  title: string;
}

/**
 * signed-out: show the sign-in page. staff: signed in at some stage; only `active` may use
 * the console, the other stages may only finish two-step.
 */
export type StaffSessionState =
  | { status: 'checking' }
  | { status: 'signed-out'; notice?: SignInNotice }
  | { status: 'staff'; me: StaffMe; offerSetup: boolean };

export interface StaffSessionValue {
  state: StaffSessionState;
  /** Fails with ApiRequestError; the page shows its message. */
  signIn: (email: string, password: string) => Promise<StaffMe>;
  /** After a two-step step: the session as the server now has it. */
  update: (me: StaffMe) => void;
  /** The server ended the sign-in (too slow, locked): back to sign-in with its message. */
  end: (notice?: SignInNotice) => void;
  signOut: () => Promise<void>;
}

export const StaffSessionContext = createContext<StaffSessionValue | null>(null);
