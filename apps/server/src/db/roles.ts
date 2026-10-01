import { createHash, createHmac, pbkdf2Sync, randomBytes } from 'node:crypto';
import { sql, type Kysely } from 'kysely';

export const MIGRATOR_ROLE = 'brewpoint_migrator';
export const APP_ROLE = 'brewpoint_app';
export const PLATFORM_ROLE = 'brewpoint_platform';

const SCRAM_ITERATIONS = 4096;

/**
 * Creates the three BrewPoint roles if they are missing and lets the owner login
 * switch to the migrator and platform roles (SET only, never inherited).
 * Roles belong to the whole PostgreSQL cluster, so this is not a migration.
 * Safe to run any number of times.
 */
export async function bootstrapRoles(db: Kysely<unknown>): Promise<void> {
  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'brewpoint_migrator') THEN
        CREATE ROLE brewpoint_migrator NOLOGIN NOBYPASSRLS;
      END IF;
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'brewpoint_app') THEN
        CREATE ROLE brewpoint_app NOLOGIN NOBYPASSRLS;
      END IF;
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'brewpoint_platform') THEN
        CREATE ROLE brewpoint_platform NOLOGIN NOBYPASSRLS;
      END IF;
    END
    $$;
    GRANT brewpoint_migrator TO CURRENT_USER WITH INHERIT FALSE, SET TRUE;
    GRANT brewpoint_platform TO CURRENT_USER WITH INHERIT FALSE, SET TRUE;
    GRANT USAGE, CREATE ON SCHEMA public TO brewpoint_migrator;
    GRANT USAGE ON SCHEMA public TO brewpoint_app, brewpoint_platform;
  `.execute(db);
}

export async function appRoleCanLogin(db: Kysely<unknown>): Promise<boolean> {
  const result = await sql<{ rolcanlogin: boolean }>`
    SELECT rolcanlogin FROM pg_roles WHERE rolname = ${APP_ROLE}
  `.execute(db);
  return result.rows[0]?.rolcanlogin ?? false;
}

/** Lets brewpoint_app log in with this password. Only a SCRAM verifier is sent, never the password. */
export async function setAppRolePassword(db: Kysely<unknown>, password: string): Promise<void> {
  await sql.raw(`ALTER ROLE ${APP_ROLE} LOGIN PASSWORD '${scramVerifier(password)}'`).execute(db);
}

export function newRolePassword(): string {
  return randomBytes(24).toString('hex');
}

function scramVerifier(password: string): string {
  const salt = randomBytes(16);
  const salted = pbkdf2Sync(password, salt, SCRAM_ITERATIONS, 32, 'sha256');
  const clientKey = createHmac('sha256', salted).update('Client Key').digest();
  const storedKey = createHash('sha256').update(clientKey).digest();
  const serverKey = createHmac('sha256', salted).update('Server Key').digest();
  return `SCRAM-SHA-256$${SCRAM_ITERATIONS}:${salt.toString('base64')}$${storedKey.toString('base64')}:${serverKey.toString('base64')}`;
}
