import { sql, type Kysely } from 'kysely';

// Sign-in (Module 03): sessions, one-time links, per-device PIN lockouts, staff sessions,
// lockout columns on users and platform_users, and the narrow email lookup used before the
// shop is known.

// Shop tables: row-level security like every other table with tenant_id.
const TENANT_TABLES = ['sessions', 'auth_tokens', 'pin_lockouts'];

// [table, column, referenced table], as in 0009. No ON DELETE CASCADE.
const FOREIGN_KEYS: readonly (readonly [string, string, string])[] = [
  ['sessions', 'tenant_id', 'tenants'],
  ['sessions', 'user_id', 'users'],
  ['sessions', 'device_id', 'devices'],
  ['auth_tokens', 'tenant_id', 'tenants'],
  ['auth_tokens', 'user_id', 'users'],
  ['pin_lockouts', 'tenant_id', 'tenants'],
  ['pin_lockouts', 'user_id', 'users'],
  ['pin_lockouts', 'device_id', 'devices'],
  ['platform_sessions', 'staff_id', 'platform_users'],
];

const CURRENT_TENANT = '(SELECT app_current_tenant())';

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    -- A signed-in shop user on the back-office or a POS device. The token is stored only as a hash.
    CREATE TABLE sessions (
      id uuid PRIMARY KEY DEFAULT uuidv7(),
      tenant_id uuid NOT NULL,
      user_id uuid NOT NULL,
      surface text NOT NULL,  -- backoffice, pos
      device_id uuid,  -- POS only
      token_hash text NOT NULL UNIQUE,  -- sha256 of the token, hex
      ip_address inet NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      last_seen_at timestamptz NOT NULL DEFAULT now(),
      revoked_at timestamptz,
      revoke_reason text  -- signed_out, password_reset, deactivated
    );
    CREATE INDEX ON sessions (tenant_id);
    CREATE INDEX ON sessions (user_id);
    CREATE INDEX ON sessions (device_id);

    -- One-time links sent by email: invites and password resets.
    CREATE TABLE auth_tokens (
      id uuid PRIMARY KEY DEFAULT uuidv7(),
      tenant_id uuid NOT NULL,
      user_id uuid NOT NULL,
      purpose text NOT NULL,  -- invite, password_reset
      token_hash text NOT NULL UNIQUE,  -- sha256 of the token, hex
      expires_at timestamptz NOT NULL,
      used_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX ON auth_tokens (tenant_id);
    CREATE INDEX ON auth_tokens (user_id);

    -- Wrong PINs per user per device. Five in a row lock that user on that device.
    CREATE TABLE pin_lockouts (
      tenant_id uuid NOT NULL,
      user_id uuid NOT NULL,
      device_id uuid NOT NULL,
      failed_count int NOT NULL DEFAULT 0,
      locked_until timestamptz,
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, device_id)
    );
    CREATE INDEX ON pin_lockouts (tenant_id);
    CREATE INDEX ON pin_lockouts (device_id);

    -- A signed-in BrewPoint staff member on the console. Staff only; the app role has no access.
    CREATE TABLE platform_sessions (
      id uuid PRIMARY KEY DEFAULT uuidv7(),
      staff_id uuid NOT NULL,
      stage text NOT NULL,  -- two_step, two_step_setup, active
      pending_totp_secret_enc text,  -- during two-step setup, until the first code is confirmed
      token_hash text NOT NULL UNIQUE,  -- sha256 of the token, hex
      ip_address inet NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      last_seen_at timestamptz NOT NULL DEFAULT now(),
      revoked_at timestamptz,
      revoke_reason text  -- signed_out, two_step_expired, deactivated
    );
    CREATE INDEX ON platform_sessions (staff_id);

    -- Wrong passwords (and, for staff, two-step codes) in a row; ten lock the account for 15 minutes.
    ALTER TABLE users
      ADD COLUMN failed_sign_in_count int NOT NULL DEFAULT 0,
      ADD COLUMN locked_until timestamptz,
      ADD CONSTRAINT users_email_lower CHECK (email = lower(email));
    ALTER TABLE platform_users
      ADD COLUMN failed_sign_in_count int NOT NULL DEFAULT 0,
      ADD COLUMN locked_until timestamptz,
      ADD CONSTRAINT platform_users_email_lower CHECK (email = lower(email));
  `.execute(db);

  const statements = [
    ...FOREIGN_KEYS.map(
      ([table, column, refTable]) =>
        `ALTER TABLE ${table} ADD FOREIGN KEY (${column}) REFERENCES ${refTable};`,
    ),
    ...TENANT_TABLES.flatMap((table) => [
      `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`,
      `ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;`,
      `CREATE POLICY tenant_isolation ON ${table} USING (tenant_id = ${CURRENT_TENANT}) WITH CHECK (tenant_id = ${CURRENT_TENANT});`,
    ]),
    `GRANT SELECT, INSERT, UPDATE ON ${TENANT_TABLES.join(', ')} TO brewpoint_app;`,
    'GRANT SELECT, INSERT, UPDATE ON platform_sessions TO brewpoint_platform;',
  ];
  await sql.raw(statements.join('\n')).execute(db);

  await sql`
    -- Sign-in knows only an email, so no tenant is set yet and row-level security hides every user.
    -- This returns the user and shop ids for one exact email, nothing else; the server then reads
    -- the hashes and status inside the tenant transaction. It runs as its owner, the migrator,
    -- which may read users across shops through the auth_lookup policy, only while no tenant is
    -- set (the owner could switch row-level security off anyway). The app role may only call it.
    CREATE POLICY auth_lookup ON users FOR SELECT TO brewpoint_migrator
      USING (${sql.raw(CURRENT_TENANT)} IS NULL);

    CREATE FUNCTION auth_find_user(lookup_email text)
      RETURNS TABLE (user_id uuid, tenant_id uuid)
      LANGUAGE sql STABLE SECURITY DEFINER
      SET search_path = public, pg_temp
      AS $$ SELECT u.id, u.tenant_id FROM users u WHERE u.email = lower(trim(lookup_email)) $$;
    REVOKE ALL ON FUNCTION auth_find_user(text) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION auth_find_user(text) TO brewpoint_app;
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    DROP FUNCTION auth_find_user(text);
    DROP POLICY auth_lookup ON users;
    ALTER TABLE platform_users
      DROP CONSTRAINT platform_users_email_lower,
      DROP COLUMN locked_until,
      DROP COLUMN failed_sign_in_count;
    ALTER TABLE users
      DROP CONSTRAINT users_email_lower,
      DROP COLUMN locked_until,
      DROP COLUMN failed_sign_in_count;
    DROP TABLE platform_sessions, pin_lockouts, auth_tokens, sessions;
  `.execute(db);
}
