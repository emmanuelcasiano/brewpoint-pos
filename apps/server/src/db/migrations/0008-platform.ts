import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    -- BrewPoint staff. Separate from shop users.
    CREATE TABLE platform_users (
      id uuid PRIMARY KEY DEFAULT uuidv7(),
      name text NOT NULL,
      email text NOT NULL UNIQUE,
      password_hash text NOT NULL,
      totp_secret_enc text,  -- two-step sign-in
      role_id uuid NOT NULL,
      status text NOT NULL,  -- invited, active, deactivated
      last_active_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX ON platform_users (role_id);

    CREATE TABLE platform_roles (
      id uuid PRIMARY KEY DEFAULT uuidv7(),
      name text NOT NULL UNIQUE,  -- Superadmin, Support, Billing, Engineer
      summary text NOT NULL
    );

    CREATE TABLE platform_permissions (
      code text PRIMARY KEY,  -- tenant.suspend
      label text NOT NULL
    );

    CREATE TABLE platform_role_permissions (
      role_id uuid NOT NULL,
      permission_code text NOT NULL,
      PRIMARY KEY (role_id, permission_code)
    );

    -- Staff see inside a shop only with an approved grant.
    CREATE TABLE support_access_grants (
      id uuid PRIMARY KEY DEFAULT uuidv7(),
      tenant_id uuid NOT NULL,
      staff_id uuid NOT NULL,
      ticket_id uuid,
      reason text NOT NULL,
      scope text NOT NULL,  -- read, read_settings, read_billing
      duration_minutes int NOT NULL,
      status text NOT NULL,  -- waiting, active, ended, declined, expired
      approved_by uuid,  -- the shop owner
      requested_at timestamptz NOT NULL,
      starts_at timestamptz,
      ends_at timestamptz,
      ended_by text  -- owner, staff, timeout
    );
    CREATE INDEX ON support_access_grants (staff_id);
    CREATE INDEX ON support_access_grants (ticket_id);
    CREATE INDEX ON support_access_grants (approved_by);
    CREATE INDEX ON support_access_grants (tenant_id);

    -- Every staff action. Append-only.
    CREATE TABLE platform_audit_log (
      id uuid PRIMARY KEY DEFAULT uuidv7(),
      staff_id uuid,  -- empty = system
      target_tenant_id uuid,
      grant_id uuid,
      action_code text NOT NULL,  -- tenant.trial.extend
      sentence text NOT NULL,
      entity_type text,
      entity_id uuid,
      before jsonb,
      after jsonb,
      reason text,
      is_sensitive boolean NOT NULL,
      ip_address inet NOT NULL,
      happened_at timestamptz NOT NULL
    );
    CREATE INDEX ON platform_audit_log (staff_id);
    CREATE INDEX ON platform_audit_log (target_tenant_id);
    CREATE INDEX ON platform_audit_log (grant_id);

    -- A shop's account history.
    CREATE TABLE tenant_events (
      id uuid PRIMARY KEY DEFAULT uuidv7(),
      tenant_id uuid NOT NULL,
      type text NOT NULL,  -- signed_up, trial_extended, plan_changed, suspended, reactivated, price_moved, closed
      detail jsonb NOT NULL,
      reason text,
      staff_id uuid,
      happened_at timestamptz NOT NULL
    );
    CREATE INDEX ON tenant_events (staff_id);
    CREATE INDEX ON tenant_events (tenant_id);

    CREATE TABLE data_requests (
      id uuid PRIMARY KEY DEFAULT uuidv7(),
      tenant_id uuid NOT NULL,
      type text NOT NULL,  -- export, delete
      requested_by uuid NOT NULL,
      received_at timestamptz NOT NULL DEFAULT now(),
      due_at timestamptz NOT NULL,
      status text NOT NULL,  -- received, verifying, exporting, ready, deleting, completed
      identity_checked_by uuid,
      export_url text,
      completed_by uuid,
      completed_at timestamptz
    );
    CREATE INDEX ON data_requests (requested_by);
    CREATE INDEX ON data_requests (identity_checked_by);
    CREATE INDEX ON data_requests (completed_by);
    CREATE INDEX ON data_requests (tenant_id);

    CREATE TABLE feature_flags (
      key text PRIMARY KEY,  -- kitchen_display
      description text NOT NULL,
      rollout text NOT NULL,  -- off, chosen, plans, everyone
      plan_ids uuid[],
      created_at timestamptz NOT NULL DEFAULT now()
    );

    -- A flag or a plan limit, per shop.
    CREATE TABLE tenant_feature_overrides (
      id uuid PRIMARY KEY DEFAULT uuidv7(),
      tenant_id uuid NOT NULL,
      flag_key text,
      limit_name text,  -- devices, branches, users
      value jsonb NOT NULL,  -- true, 4
      until date,
      set_by uuid NOT NULL,
      reason text NOT NULL
    );
    CREATE INDEX ON tenant_feature_overrides (flag_key);
    CREATE INDEX ON tenant_feature_overrides (set_by);
    CREATE INDEX ON tenant_feature_overrides (tenant_id);

    CREATE TABLE app_releases (
      version text PRIMARY KEY,  -- 2.4.1
      released_at timestamptz NOT NULL,
      notes text NOT NULL,
      warn_from date,
      min_required_from date,
      released_by uuid NOT NULL
    );
    CREATE INDEX ON app_releases (released_by);

    CREATE TABLE device_error_reports (
      id uuid PRIMARY KEY DEFAULT uuidv7(),
      tenant_id uuid NOT NULL,
      app_version text NOT NULL,
      error_code text NOT NULL,
      message text NOT NULL,
      context jsonb NOT NULL,
      device_id uuid,
      client_created_at timestamptz NOT NULL,
      synced_at timestamptz
    );
    CREATE INDEX ON device_error_reports (device_id);
    CREATE INDEX ON device_error_reports (tenant_id);

    CREATE TABLE announcements (
      id uuid PRIMARY KEY DEFAULT uuidv7(),
      title text NOT NULL,
      body text NOT NULL,
      audience text NOT NULL,  -- all, plans, tenants
      plan_ids uuid[],
      tenant_ids uuid[],
      show_banner boolean NOT NULL,
      send_email boolean NOT NULL,
      send_at timestamptz NOT NULL,
      ends_at timestamptz,
      status text NOT NULL,  -- draft, scheduled, sent
      created_by uuid NOT NULL
    );
    CREATE INDEX ON announcements (created_by);

    CREATE TABLE announcement_reads (
      tenant_id uuid NOT NULL,
      announcement_id uuid NOT NULL,
      user_id uuid NOT NULL,
      dismissed_at timestamptz NOT NULL,
      PRIMARY KEY (announcement_id, user_id)
    );
    CREATE INDEX ON announcement_reads (tenant_id);

    -- Optional: skip if you use an outside help desk.
    CREATE TABLE support_tickets (
      id uuid PRIMARY KEY DEFAULT uuidv7(),
      tenant_id uuid NOT NULL,
      number text NOT NULL UNIQUE,  -- T-1043
      subject text NOT NULL,
      requester_id uuid NOT NULL,
      assignee_id uuid,
      status text NOT NULL,  -- waiting_on_us, waiting_on_shop, urgent, solved
      device_id uuid,
      app_version text,
      created_at timestamptz NOT NULL DEFAULT now(),
      solved_at timestamptz
    );
    CREATE INDEX ON support_tickets (requester_id);
    CREATE INDEX ON support_tickets (assignee_id);
    CREATE INDEX ON support_tickets (device_id);
    CREATE INDEX ON support_tickets (tenant_id);

    CREATE TABLE support_ticket_messages (
      id uuid PRIMARY KEY DEFAULT uuidv7(),
      tenant_id uuid NOT NULL,
      ticket_id uuid NOT NULL,
      author_user_id uuid,
      author_staff_id uuid,
      body text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX ON support_ticket_messages (ticket_id);
    CREATE INDEX ON support_ticket_messages (author_user_id);
    CREATE INDEX ON support_ticket_messages (author_staff_id);
    CREATE INDEX ON support_ticket_messages (tenant_id);
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    DROP TABLE support_ticket_messages, support_tickets, announcement_reads, announcements,
      device_error_reports, app_releases, tenant_feature_overrides, feature_flags, data_requests,
      tenant_events, platform_audit_log, support_access_grants, platform_role_permissions,
      platform_permissions, platform_roles, platform_users;
  `.execute(db);
}
