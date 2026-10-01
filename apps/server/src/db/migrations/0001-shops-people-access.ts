import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    -- One coffee business (a customer of BrewPoint).
    CREATE TABLE tenants (
      id uuid PRIMARY KEY DEFAULT uuidv7(),
      name text NOT NULL,
      tin text,  -- BIR tax ID
      timezone text NOT NULL,  -- default Asia/Manila
      accent_hex text NOT NULL,  -- shop accent, #RRGGBB
      status text NOT NULL,  -- trial, active, past_due, suspended, closed
      signup_source text,  -- facebook_ad, referral
      suspended_reason text,
      closed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE branches (
      id uuid PRIMARY KEY DEFAULT uuidv7(),
      tenant_id uuid NOT NULL,
      name text NOT NULL,
      address text NOT NULL,
      is_active boolean NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX ON branches (tenant_id);

    CREATE TABLE users (
      id uuid PRIMARY KEY DEFAULT uuidv7(),
      tenant_id uuid NOT NULL,
      name text NOT NULL,
      email text NOT NULL UNIQUE,
      password_hash text,  -- back-office sign-in
      pin_hash text,  -- POS PIN
      status text NOT NULL,  -- invited, active, deactivated
      last_active_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX ON users (tenant_id);

    CREATE TABLE roles (
      id uuid PRIMARY KEY DEFAULT uuidv7(),
      tenant_id uuid NOT NULL,
      name text NOT NULL,
      summary text NOT NULL,
      is_locked boolean NOT NULL  -- Owner
    );
    CREATE INDEX ON roles (tenant_id);

    -- Global list, the same for every shop.
    CREATE TABLE permissions (
      code text PRIMARY KEY,  -- sale.void.approve
      group_name text NOT NULL,
      label text NOT NULL
    );

    CREATE TABLE role_permissions (
      tenant_id uuid NOT NULL,
      role_id uuid NOT NULL,
      permission_code text NOT NULL,
      PRIMARY KEY (role_id, permission_code)
    );
    CREATE INDEX ON role_permissions (tenant_id);

    -- A user's role in a branch.
    CREATE TABLE user_assignments (
      id uuid PRIMARY KEY DEFAULT uuidv7(),
      tenant_id uuid NOT NULL,
      user_id uuid NOT NULL,
      branch_id uuid,  -- empty = all branches
      role_id uuid NOT NULL
    );
    CREATE INDEX ON user_assignments (user_id);
    CREATE INDEX ON user_assignments (branch_id);
    CREATE INDEX ON user_assignments (role_id);
    CREATE INDEX ON user_assignments (tenant_id);

    -- A paired register (T1, T2).
    CREATE TABLE devices (
      id uuid PRIMARY KEY DEFAULT uuidv7(),
      tenant_id uuid NOT NULL,
      branch_id uuid NOT NULL,
      name text NOT NULL,  -- T1
      model text NOT NULL,
      app_version text NOT NULL,
      printer text,
      license_expires_at timestamptz NOT NULL,
      last_sync_at timestamptz,
      paired_at timestamptz NOT NULL DEFAULT now(),
      revoked_at timestamptz,
      revoked_by uuid,
      revoke_reason text
    );
    CREATE INDEX ON devices (branch_id);
    CREATE INDEX ON devices (revoked_by);
    CREATE INDEX ON devices (tenant_id);

    CREATE TABLE pairing_codes (
      code text PRIMARY KEY,  -- 6 digits
      tenant_id uuid NOT NULL,
      branch_id uuid NOT NULL,
      created_by uuid NOT NULL,
      expires_at timestamptz NOT NULL
    );
    CREATE INDEX ON pairing_codes (branch_id);
    CREATE INDEX ON pairing_codes (created_by);
    CREATE INDEX ON pairing_codes (tenant_id);
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    DROP TABLE pairing_codes, devices, user_assignments, role_permissions, permissions,
      roles, users, branches, tenants;
  `.execute(db);
}
