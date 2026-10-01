import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE plans (
      id uuid PRIMARY KEY DEFAULT uuidv7(),
      name text NOT NULL,
      price_monthly bigint NOT NULL,
      price_yearly bigint NOT NULL,
      max_branches int NOT NULL,
      max_devices int NOT NULL,
      max_users int,
      features jsonb NOT NULL
    );

    -- A new price is a new version; shops keep theirs.
    CREATE TABLE plan_prices (
      id uuid PRIMARY KEY DEFAULT uuidv7(),
      plan_id uuid NOT NULL,
      version int NOT NULL,  -- 2
      price_monthly bigint NOT NULL,  -- includes 12% VAT
      price_yearly bigint NOT NULL,
      valid_from date NOT NULL,
      valid_until date,
      provider_price_id text  -- Stripe price ID
    );
    CREATE INDEX ON plan_prices (plan_id);

    CREATE TABLE subscriptions (
      id uuid PRIMARY KEY DEFAULT uuidv7(),
      tenant_id uuid NOT NULL,
      plan_id uuid NOT NULL,
      plan_price_id uuid NOT NULL,  -- the price version this shop pays
      status text NOT NULL,  -- trial, active, past_due, suspended, cancelled
      billing_cycle text NOT NULL,  -- monthly, yearly
      trial_ends_at timestamptz,
      current_period_end timestamptz NOT NULL,
      grace_until timestamptz,  -- selling pauses after this
      provider text NOT NULL,  -- stripe, paymongo, xendit, manual
      provider_subscription_id text,
      cancel_at timestamptz
    );
    CREATE INDEX ON subscriptions (plan_id);
    CREATE INDEX ON subscriptions (plan_price_id);
    CREATE INDEX ON subscriptions (tenant_id);

    CREATE TABLE invoices (
      id uuid PRIMARY KEY DEFAULT uuidv7(),
      tenant_id uuid NOT NULL,
      subscription_id uuid NOT NULL,
      number text NOT NULL UNIQUE,  -- INV-2026-0931
      period_start date NOT NULL,
      period_end date NOT NULL,
      subtotal bigint NOT NULL,
      vat_amount bigint NOT NULL,  -- 12%
      total bigint NOT NULL,
      status text NOT NULL,  -- draft, open, paid, failed, void, credited
      provider text NOT NULL,  -- stripe, manual
      provider_invoice_id text,
      payment_link_url text,  -- GCash payment link
      due_at timestamptz NOT NULL,
      issued_at timestamptz NOT NULL DEFAULT now(),
      paid_at timestamptz,
      paid_manually_by uuid,
      pdf_url text NOT NULL
    );
    CREATE INDEX ON invoices (subscription_id);
    CREATE INDEX ON invoices (paid_manually_by);
    CREATE INDEX ON invoices (tenant_id);

    CREATE TABLE invoice_lines (
      id uuid PRIMARY KEY DEFAULT uuidv7(),
      tenant_id uuid NOT NULL,
      invoice_id uuid NOT NULL,
      description text NOT NULL,  -- Growth plan, monthly
      qty int NOT NULL,
      unit_amount bigint NOT NULL,
      amount bigint NOT NULL
    );
    CREATE INDEX ON invoice_lines (invoice_id);
    CREATE INDEX ON invoice_lines (tenant_id);

    -- The shop as the payment provider knows it.
    CREATE TABLE billing_customers (
      id uuid PRIMARY KEY DEFAULT uuidv7(),
      tenant_id uuid NOT NULL,
      provider text NOT NULL,  -- stripe, paymongo, xendit
      provider_customer_id text NOT NULL,
      email text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX ON billing_customers (tenant_id);

    CREATE TABLE payment_methods (
      id uuid PRIMARY KEY DEFAULT uuidv7(),
      tenant_id uuid NOT NULL,
      billing_customer_id uuid NOT NULL,
      type text NOT NULL,  -- card, gcash_link, maya, bank_debit
      brand text,  -- visa
      last4 text,
      expires text,  -- 12/28
      provider_method_id text,
      is_default boolean NOT NULL
    );
    CREATE INDEX ON payment_methods (billing_customer_id);
    CREATE INDEX ON payment_methods (tenant_id);

    -- Webhook inbox. Processed once per event.
    CREATE TABLE payment_events (
      id uuid PRIMARY KEY DEFAULT uuidv7(),
      provider text NOT NULL,
      provider_event_id text NOT NULL UNIQUE,  -- idempotency key
      type text NOT NULL,  -- invoice.payment_failed
      tenant_id uuid,
      invoice_id uuid,
      payload jsonb NOT NULL,
      received_at timestamptz NOT NULL DEFAULT now(),
      processed_at timestamptz,
      error text
    );
    CREATE INDEX ON payment_events (invoice_id);
    CREATE INDEX ON payment_events (tenant_id);

    CREATE TABLE credit_notes (
      id uuid PRIMARY KEY DEFAULT uuidv7(),
      tenant_id uuid NOT NULL,
      invoice_id uuid NOT NULL,
      number text NOT NULL UNIQUE,
      amount bigint NOT NULL,
      reason text NOT NULL,  -- duplicate charge
      issued_by uuid NOT NULL,
      issued_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX ON credit_notes (invoice_id);
    CREATE INDEX ON credit_notes (issued_by);
    CREATE INDEX ON credit_notes (tenant_id);
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    DROP TABLE credit_notes, payment_events, payment_methods, billing_customers, invoice_lines,
      invoices, subscriptions, plan_prices, plans;
  `.execute(db);
}
