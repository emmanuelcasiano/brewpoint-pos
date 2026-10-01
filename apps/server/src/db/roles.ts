import { randomBytes } from 'node:crypto';
import { sql, type Kysely } from 'kysely';

export const MIGRATOR_ROLE = 'brewpoint_migrator';
export const APP_ROLE = 'brewpoint_app';
export const PLATFORM_ROLE = 'brewpoint_platform';

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

/**
 * Lets brewpoint_app log in with this password. Neon accepts only the plain password and
 * stores it as a SCRAM hash. ALTER ROLE takes no parameters, so the literal is quoted here.
 */
export async function setAppRolePassword(db: Kysely<unknown>, password: string): Promise<void> {
  const literal = `'${password.replaceAll("'", "''")}'`;
  await sql.raw(`ALTER ROLE ${APP_ROLE} LOGIN PASSWORD ${literal}`).execute(db);
}

export function newRolePassword(): string {
  return randomBytes(24).toString('hex');
}
