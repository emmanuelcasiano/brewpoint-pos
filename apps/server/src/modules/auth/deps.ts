import type { Database, PlatformDatabase } from '../../core/db/client';
import type { Mailer } from '../../core/mail/mailer';

export interface AuthConfig {
  appEnv: 'local' | 'staging' | 'production';
  /** Where links in emails point. */
  backofficeUrl: string;
  /** TOTP_ENCRYPTION_KEY, decoded: 32 bytes. */
  totpKey: Buffer;
  /** Until Module 06: the demo POS's key, used only locally. */
  demoDeviceKey?: string;
}

/** What the sign-in services need. Tests pass their own clock to move time forward. */
export interface AuthDeps {
  db: Database;
  platformDb: PlatformDatabase;
  mailer: Mailer;
  config: AuthConfig;
  now: () => Date;
}
