import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    -- One open alert per item, branch and type.
    CREATE TABLE alerts (
      id uuid PRIMARY KEY DEFAULT uuidv7(),
      tenant_id uuid NOT NULL,
      branch_id uuid NOT NULL,
      item_id uuid NOT NULL,
      batch_id uuid,
      type text NOT NULL,  -- out_of_stock, expired, expiring, low
      status text NOT NULL,  -- open, snoozed, resolved
      started_at timestamptz NOT NULL,  -- when it happened on the device
      synced_at timestamptz NOT NULL,
      snoozed_until timestamptz,
      resolved_at timestamptz,
      resolved_by_source text,  -- receipt, waste, adjustment, count
      resolved_ref uuid
    );
    CREATE INDEX ON alerts (branch_id);
    CREATE INDEX ON alerts (item_id);
    CREATE INDEX ON alerts (batch_id);
    CREATE INDEX ON alerts (tenant_id);

    -- Drives the unread count on the bell.
    CREATE TABLE alert_reads (
      tenant_id uuid NOT NULL,
      alert_id uuid NOT NULL,
      user_id uuid NOT NULL,
      read_at timestamptz NOT NULL,
      PRIMARY KEY (alert_id, user_id)
    );
    CREATE INDEX ON alert_reads (tenant_id);

    CREATE TABLE notification_settings (
      id uuid PRIMARY KEY DEFAULT uuidv7(),
      tenant_id uuid NOT NULL,
      event_type text NOT NULL,  -- low, expired, cash_variance
      channel text NOT NULL,  -- in_app, push, email
      enabled boolean NOT NULL,
      digest_time time NOT NULL,  -- 07:00
      quiet_start time,
      quiet_end time,
      recipients text NOT NULL  -- owner, owner_managers
    );
    CREATE INDEX ON notification_settings (tenant_id);

    CREATE TABLE notification_deliveries (
      id uuid PRIMARY KEY DEFAULT uuidv7(),
      tenant_id uuid NOT NULL,
      alert_id uuid,
      user_id uuid NOT NULL,
      channel text NOT NULL,
      status text NOT NULL,  -- sent, failed
      sent_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX ON notification_deliveries (alert_id);
    CREATE INDEX ON notification_deliveries (user_id);
    CREATE INDEX ON notification_deliveries (tenant_id);

    -- Append-only record of who did what.
    CREATE TABLE audit_log (
      id uuid PRIMARY KEY DEFAULT uuidv7(),
      tenant_id uuid NOT NULL,
      branch_id uuid,
      user_id uuid,  -- empty = System
      action_code text NOT NULL,  -- catalog.price.edit
      sentence text NOT NULL,
      entity_type text NOT NULL,
      entity_id uuid NOT NULL,
      before jsonb,
      after jsonb,
      is_sensitive boolean NOT NULL,
      happened_at timestamptz NOT NULL,
      device_id uuid,
      client_created_at timestamptz NOT NULL,
      synced_at timestamptz
    );
    CREATE INDEX ON audit_log (branch_id);
    CREATE INDEX ON audit_log (user_id);
    CREATE INDEX ON audit_log (device_id);
    CREATE INDEX ON audit_log (tenant_id);
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    DROP TABLE audit_log, notification_deliveries, notification_settings, alert_reads, alerts;
  `.execute(db);
}
