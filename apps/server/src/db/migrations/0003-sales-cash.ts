import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    -- One shift on one register.
    CREATE TABLE register_sessions (
      id uuid PRIMARY KEY DEFAULT uuidv7(),
      tenant_id uuid NOT NULL,
      branch_id uuid NOT NULL,
      opened_by uuid NOT NULL,
      opened_at timestamptz NOT NULL DEFAULT now(),
      opening_float bigint NOT NULL,
      closed_by uuid,
      closed_at timestamptz,
      expected_cash bigint,
      counted_cash bigint,
      variance bigint,  -- counted - expected
      note text,
      approved_by uuid,
      status text NOT NULL,  -- open, closed, needs_review, approved
      device_id uuid,
      client_created_at timestamptz NOT NULL,
      synced_at timestamptz
    );
    CREATE INDEX ON register_sessions (branch_id);
    CREATE INDEX ON register_sessions (opened_by);
    CREATE INDEX ON register_sessions (closed_by);
    CREATE INDEX ON register_sessions (approved_by);
    CREATE INDEX ON register_sessions (device_id);
    CREATE INDEX ON register_sessions (tenant_id);

    -- Bills and coins counted at close.
    CREATE TABLE cash_counts (
      id uuid PRIMARY KEY DEFAULT uuidv7(),
      tenant_id uuid NOT NULL,
      session_id uuid NOT NULL,
      denomination bigint NOT NULL,  -- centavos, 100000 = ₱1,000
      count int NOT NULL
    );
    CREATE INDEX ON cash_counts (session_id);
    CREATE INDEX ON cash_counts (tenant_id);

    CREATE TABLE cash_movements (
      id uuid PRIMARY KEY DEFAULT uuidv7(),
      tenant_id uuid NOT NULL,
      session_id uuid NOT NULL,
      direction text NOT NULL,  -- in, out
      amount bigint NOT NULL,
      reason text NOT NULL,  -- milk delivery
      user_id uuid NOT NULL,
      approved_by uuid,
      device_id uuid,
      client_created_at timestamptz NOT NULL,
      synced_at timestamptz
    );
    CREATE INDEX ON cash_movements (session_id);
    CREATE INDEX ON cash_movements (user_id);
    CREATE INDEX ON cash_movements (approved_by);
    CREATE INDEX ON cash_movements (device_id);
    CREATE INDEX ON cash_movements (tenant_id);

    CREATE TABLE sales (
      id uuid PRIMARY KEY DEFAULT uuidv7(),
      tenant_id uuid NOT NULL,
      branch_id uuid NOT NULL,
      session_id uuid NOT NULL,
      receipt_no text NOT NULL,  -- ACK-T1-000123, unique per shop
      cashier_id uuid NOT NULL,
      status text NOT NULL,  -- paid, voided, refunded, partly_refunded
      subtotal bigint NOT NULL,
      discount_total bigint NOT NULL,
      vat_amount bigint NOT NULL,
      total bigint NOT NULL,
      voided_by uuid,
      void_reason text,
      device_id uuid,
      client_created_at timestamptz NOT NULL,
      synced_at timestamptz
    );
    CREATE INDEX ON sales (branch_id);
    CREATE INDEX ON sales (session_id);
    CREATE INDEX ON sales (cashier_id);
    CREATE INDEX ON sales (voided_by);
    CREATE INDEX ON sales (device_id);
    CREATE INDEX ON sales (tenant_id);

    CREATE TABLE sale_lines (
      id uuid PRIMARY KEY DEFAULT uuidv7(),
      tenant_id uuid NOT NULL,
      sale_id uuid NOT NULL,
      product_id uuid NOT NULL,
      name_snapshot text NOT NULL,  -- name at time of sale
      qty int NOT NULL,
      unit_price bigint NOT NULL,
      line_total bigint NOT NULL
    );
    CREATE INDEX ON sale_lines (sale_id);
    CREATE INDEX ON sale_lines (product_id);
    CREATE INDEX ON sale_lines (tenant_id);

    CREATE TABLE sale_line_modifiers (
      id uuid PRIMARY KEY DEFAULT uuidv7(),
      tenant_id uuid NOT NULL,
      sale_line_id uuid NOT NULL,
      modifier_id uuid NOT NULL,
      name_snapshot text NOT NULL,
      price_delta bigint NOT NULL
    );
    CREATE INDEX ON sale_line_modifiers (sale_line_id);
    CREATE INDEX ON sale_line_modifiers (modifier_id);
    CREATE INDEX ON sale_line_modifiers (tenant_id);

    CREATE TABLE sale_discounts (
      id uuid PRIMARY KEY DEFAULT uuidv7(),
      tenant_id uuid NOT NULL,
      sale_id uuid NOT NULL,
      type text NOT NULL,  -- senior, pwd, promo, manual
      percent numeric NOT NULL,
      amount bigint NOT NULL,
      id_number text,  -- senior or PWD ID
      approved_by uuid
    );
    CREATE INDEX ON sale_discounts (sale_id);
    CREATE INDEX ON sale_discounts (approved_by);
    CREATE INDEX ON sale_discounts (tenant_id);

    CREATE TABLE payments (
      id uuid PRIMARY KEY DEFAULT uuidv7(),
      tenant_id uuid NOT NULL,
      sale_id uuid NOT NULL,
      method text NOT NULL,  -- cash, gcash, card, maya
      amount bigint NOT NULL,
      tendered bigint,
      change_given bigint,
      reference text  -- GCash or card ref
    );
    CREATE INDEX ON payments (sale_id);
    CREATE INDEX ON payments (tenant_id);

    CREATE TABLE refunds (
      id uuid PRIMARY KEY DEFAULT uuidv7(),
      tenant_id uuid NOT NULL,
      sale_id uuid NOT NULL,
      reason text NOT NULL,
      amount bigint NOT NULL,
      requested_by uuid NOT NULL,
      approved_by uuid,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX ON refunds (sale_id);
    CREATE INDEX ON refunds (requested_by);
    CREATE INDEX ON refunds (approved_by);
    CREATE INDEX ON refunds (tenant_id);

    CREATE TABLE refund_lines (
      id uuid PRIMARY KEY DEFAULT uuidv7(),
      tenant_id uuid NOT NULL,
      refund_id uuid NOT NULL,
      sale_line_id uuid NOT NULL,
      qty int NOT NULL,
      amount bigint NOT NULL
    );
    CREATE INDEX ON refund_lines (refund_id);
    CREATE INDEX ON refund_lines (sale_line_id);
    CREATE INDEX ON refund_lines (tenant_id);

    -- Settings, Taxes and discounts.
    CREATE TABLE discount_rules (
      id uuid PRIMARY KEY DEFAULT uuidv7(),
      tenant_id uuid NOT NULL,
      type text NOT NULL,  -- senior, pwd, promo, manual
      percent numeric NOT NULL,  -- 20 for senior and PWD
      vat_exempt boolean NOT NULL,
      requires_id boolean NOT NULL,
      role_id uuid,  -- limit applies to this role
      max_percent numeric,  -- 10
      max_amount bigint  -- 10000 = ₱100
    );
    CREATE INDEX ON discount_rules (role_id);
    CREATE INDEX ON discount_rules (tenant_id);

    -- Which payment types a shop accepts.
    CREATE TABLE tenant_payment_methods (
      id uuid PRIMARY KEY DEFAULT uuidv7(),
      tenant_id uuid NOT NULL,
      method text NOT NULL,  -- cash, gcash, card, maya
      is_enabled boolean NOT NULL,
      requires_reference boolean NOT NULL,
      sort_order int NOT NULL
    );
    CREATE INDEX ON tenant_payment_methods (tenant_id);
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    DROP TABLE tenant_payment_methods, discount_rules, refund_lines, refunds, payments,
      sale_discounts, sale_line_modifiers, sale_lines, sales, cash_movements, cash_counts,
      register_sessions;
  `.execute(db);
}
