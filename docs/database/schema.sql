-- BrewPoint database schema (PostgreSQL 18)
-- The source of truth. The migrations in apps/server/src/db/migrations/ build exactly this, in order
-- (tables, then foreign keys, then rule indexes, then row-level security, then grants; later modules
-- add their own migration, starting with 0013-auth).
--
-- Conventions
--   * Every table that belongs to a shop has tenant_id, child tables included. Row-level security limits
--     every query to the tenant set on the transaction (see the end of this file).
--   * Primary keys are UUIDs generated on the device (uuid v7) so registers can create rows offline.
--     Rows created on the server default to uuidv7(), built into PostgreSQL 18.
--   * Device-written rows carry device_id, client_created_at (when it happened) and synced_at (when the server got it).
--   * Money is integer centavos (bigint). Stock is numeric in the item base unit (ml, g, pc).
--   * Nothing important is deleted: use status columns. audit_log, platform_audit_log and stock_movements are append-only.
--   * Staff (platform_users) are separate from shop users. They see inside a shop only through an active support_access_grants row.
--   * Billing is provider-neutral: provider + provider_*_id columns. Webhooks land in payment_events (unique provider_event_id) before they touch invoices.


-- ======================================================================
-- Shops, people and access
-- ======================================================================

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
  created_at timestamptz NOT NULL DEFAULT now(),
  failed_sign_in_count int NOT NULL DEFAULT 0,  -- wrong passwords in a row; 10 lock for 15 minutes
  locked_until timestamptz,
  CONSTRAINT users_email_lower CHECK (email = lower(email))
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

-- A user’s role in a branch.
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

-- A signed-in shop user on the back-office or a POS device. The token is stored only as a hash.
-- Back-office sessions end after 12 hours without activity; POS sessions at sign-out or register close.
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

-- Wrong PINs per user per device. Five in a row lock that user on that device for 5 minutes.
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

-- ======================================================================
-- Billing
-- ======================================================================

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

-- ======================================================================
-- Sales and cash
-- ======================================================================

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
  receipt_no text NOT NULL,  -- ACK-T1-000123, unique per shop (one_receipt_no_per_tenant)
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

-- ======================================================================
-- Menu
-- ======================================================================

CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  sort_order int NOT NULL,
  expiry_warn_days int  -- pastries 1
);
CREATE INDEX ON categories (tenant_id);

-- What the POS sells.
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  tenant_id uuid NOT NULL,
  category_id uuid NOT NULL,
  name text NOT NULL,
  price bigint NOT NULL,
  is_visible_on_pos boolean NOT NULL,
  sort_order int NOT NULL,
  updated_by uuid NOT NULL,
  updated_at timestamptz NOT NULL
);
CREATE INDEX ON products (category_id);
CREATE INDEX ON products (updated_by);
CREATE INDEX ON products (tenant_id);

CREATE TABLE modifier_groups (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,  -- Milk
  min_select int NOT NULL,
  max_select int NOT NULL
);
CREATE INDEX ON modifier_groups (tenant_id);

CREATE TABLE modifiers (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  tenant_id uuid NOT NULL,
  group_id uuid NOT NULL,
  name text NOT NULL,  -- Oat milk
  price_delta bigint NOT NULL,
  sort_order int NOT NULL
);
CREATE INDEX ON modifiers (group_id);
CREATE INDEX ON modifiers (tenant_id);

CREATE TABLE product_modifier_groups (
  tenant_id uuid NOT NULL,
  product_id uuid NOT NULL,
  modifier_group_id uuid NOT NULL,
  PRIMARY KEY (product_id, modifier_group_id)
);
CREATE INDEX ON product_modifier_groups (tenant_id);

-- Connects the menu to stock.
CREATE TABLE recipe_lines (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  tenant_id uuid NOT NULL,
  product_id uuid NOT NULL,
  inventory_item_id uuid NOT NULL,
  qty_base numeric NOT NULL  -- 18 (g), 180 (ml)
);
CREATE INDEX ON recipe_lines (product_id);
CREATE INDEX ON recipe_lines (inventory_item_id);
CREATE INDEX ON recipe_lines (tenant_id);

CREATE TABLE modifier_recipe_lines (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  tenant_id uuid NOT NULL,
  modifier_id uuid NOT NULL,
  inventory_item_id uuid NOT NULL,
  qty_base_delta numeric NOT NULL  -- -180 fresh milk, +180 oat milk
);
CREATE INDEX ON modifier_recipe_lines (modifier_id);
CREATE INDEX ON modifier_recipe_lines (inventory_item_id);
CREATE INDEX ON modifier_recipe_lines (tenant_id);

-- ======================================================================
-- Inventory
-- ======================================================================

CREATE TABLE inventory_items (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  kind text NOT NULL,  -- ingredient, packaging, retail
  base_unit text NOT NULL,  -- ml, g, pc
  pack_unit text NOT NULL,  -- box
  pack_size numeric NOT NULL,  -- 1000
  is_perishable boolean NOT NULL,
  default_shelf_days int,
  barcode text
);
CREATE INDEX ON inventory_items (tenant_id);

-- One row per item per branch.
CREATE TABLE item_branch_settings (
  tenant_id uuid NOT NULL,
  item_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  on_hand numeric NOT NULL,  -- cached sum of movements
  reorder_point numeric,
  order_up_to numeric,
  avg_cost numeric NOT NULL,  -- centavos per base unit
  last_cost numeric NOT NULL,
  default_supplier_id uuid,
  PRIMARY KEY (item_id, branch_id)
);
CREATE INDEX ON item_branch_settings (default_supplier_id);
CREATE INDEX ON item_branch_settings (tenant_id);

-- Stock with an expiry date.
CREATE TABLE batches (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  tenant_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  item_id uuid NOT NULL,
  batch_code text NOT NULL,  -- B-0921
  expiry_date date,
  qty_received numeric NOT NULL,
  qty_remaining numeric NOT NULL,
  unit_cost numeric NOT NULL,
  receipt_line_id uuid,
  received_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON batches (branch_id);
CREATE INDEX ON batches (item_id);
CREATE INDEX ON batches (receipt_line_id);
CREATE INDEX ON batches (tenant_id);

-- Every stock change, never edited.
CREATE TABLE stock_movements (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  tenant_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  item_id uuid NOT NULL,
  batch_id uuid,
  qty_delta numeric NOT NULL,  -- + in, - out
  reason text NOT NULL,  -- sale, receipt, adjustment, waste, count, refund, void
  source_type text NOT NULL,  -- sale_line, receipt_line, count_line
  source_id uuid,
  note text,  -- spilled
  user_id uuid,
  approved_by uuid,
  device_id uuid,
  client_created_at timestamptz NOT NULL,
  synced_at timestamptz
);
CREATE INDEX ON stock_movements (branch_id);
CREATE INDEX ON stock_movements (item_id);
CREATE INDEX ON stock_movements (batch_id);
CREATE INDEX ON stock_movements (user_id);
CREATE INDEX ON stock_movements (approved_by);
CREATE INDEX ON stock_movements (device_id);
CREATE INDEX ON stock_movements (tenant_id);

CREATE TABLE stock_counts (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  tenant_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  counted_by uuid NOT NULL,
  status text NOT NULL,  -- in_progress, finished
  started_at timestamptz NOT NULL,
  finished_at timestamptz
);
CREATE INDEX ON stock_counts (branch_id);
CREATE INDEX ON stock_counts (counted_by);
CREATE INDEX ON stock_counts (tenant_id);

CREATE TABLE stock_count_lines (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  tenant_id uuid NOT NULL,
  count_id uuid NOT NULL,
  item_id uuid NOT NULL,
  expected_qty numeric NOT NULL,
  counted_qty numeric NOT NULL
);
CREATE INDEX ON stock_count_lines (count_id);
CREATE INDEX ON stock_count_lines (item_id);
CREATE INDEX ON stock_count_lines (tenant_id);

-- ======================================================================
-- Purchasing
-- ======================================================================

CREATE TABLE suppliers (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  contact_name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,  -- where orders are sent
  order_days text[] NOT NULL,  -- mon, wed, fri
  lead_time_days int NOT NULL,
  min_order bigint NOT NULL,
  terms text NOT NULL,  -- COD, 7 days
  is_active boolean NOT NULL
);
CREATE INDEX ON suppliers (tenant_id);

-- Who sells what, at what price.
CREATE TABLE supplier_items (
  tenant_id uuid NOT NULL,
  supplier_id uuid NOT NULL,
  item_id uuid NOT NULL,
  supplier_sku text,
  pack_unit text NOT NULL,
  pack_size numeric NOT NULL,
  last_cost bigint NOT NULL,  -- per pack
  last_cost_at timestamptz,
  is_default boolean NOT NULL,
  PRIMARY KEY (supplier_id, item_id)
);
CREATE INDEX ON supplier_items (tenant_id);

CREATE TABLE purchase_orders (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  tenant_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  supplier_id uuid NOT NULL,
  number text NOT NULL,  -- PO-0043, unique per shop (one_po_number_per_tenant)
  status text NOT NULL,  -- draft, sent, partly_received, received, cancelled
  expected_date date,
  note text,
  subtotal bigint NOT NULL,
  delivery_fee bigint NOT NULL,
  total bigint NOT NULL,
  created_by uuid NOT NULL,
  approved_by uuid,
  sent_at timestamptz,
  cancelled_at timestamptz
);
CREATE INDEX ON purchase_orders (branch_id);
CREATE INDEX ON purchase_orders (supplier_id);
CREATE INDEX ON purchase_orders (created_by);
CREATE INDEX ON purchase_orders (approved_by);
CREATE INDEX ON purchase_orders (tenant_id);

CREATE TABLE purchase_order_lines (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  tenant_id uuid NOT NULL,
  po_id uuid NOT NULL,
  item_id uuid NOT NULL,
  qty_ordered numeric NOT NULL,  -- in packs
  unit_cost bigint NOT NULL,  -- per pack
  qty_received numeric NOT NULL  -- cached
);
CREATE INDEX ON purchase_order_lines (po_id);
CREATE INDEX ON purchase_order_lines (item_id);
CREATE INDEX ON purchase_order_lines (tenant_id);

-- One delivery.
CREATE TABLE goods_receipts (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  tenant_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  supplier_id uuid NOT NULL,
  po_id uuid,  -- empty = walk-in delivery
  dr_number text,  -- DR 11873
  received_by uuid NOT NULL,
  closed_short boolean NOT NULL,
  total bigint NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON goods_receipts (branch_id);
CREATE INDEX ON goods_receipts (supplier_id);
CREATE INDEX ON goods_receipts (po_id);
CREATE INDEX ON goods_receipts (received_by);
CREATE INDEX ON goods_receipts (tenant_id);

-- Each line creates one batch.
CREATE TABLE goods_receipt_lines (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  tenant_id uuid NOT NULL,
  receipt_id uuid NOT NULL,
  po_line_id uuid,
  item_id uuid NOT NULL,
  qty_received numeric NOT NULL,  -- in packs
  unit_cost bigint NOT NULL,  -- per pack
  batch_code text,
  expiry_date date
);
CREATE INDEX ON goods_receipt_lines (receipt_id);
CREATE INDEX ON goods_receipt_lines (po_line_id);
CREATE INDEX ON goods_receipt_lines (item_id);
CREATE INDEX ON goods_receipt_lines (tenant_id);

-- ======================================================================
-- Alerts, notifications and audit
-- ======================================================================

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

-- ======================================================================
-- Staff console (platform): staff, support access, lifecycle, flags, releases, announcements, tickets
-- ======================================================================

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
  created_at timestamptz NOT NULL DEFAULT now(),
  failed_sign_in_count int NOT NULL DEFAULT 0,  -- wrong passwords or two-step codes in a row; 10 lock for 15 minutes
  locked_until timestamptz,
  CONSTRAINT platform_users_email_lower CHECK (email = lower(email))
);
CREATE INDEX ON platform_users (role_id);

-- A signed-in staff member on the console. Ends after 12 hours without activity; an unfinished
-- two-step stage ends after 10 minutes.
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

-- A shop’s account history.
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

-- ======================================================================
-- Foreign keys (added last so table order does not matter)
-- ======================================================================
ALTER TABLE branches ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE users ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE roles ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE role_permissions ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE role_permissions ADD FOREIGN KEY (role_id) REFERENCES roles;
ALTER TABLE role_permissions ADD FOREIGN KEY (permission_code) REFERENCES permissions;
ALTER TABLE user_assignments ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE user_assignments ADD FOREIGN KEY (user_id) REFERENCES users;
ALTER TABLE user_assignments ADD FOREIGN KEY (branch_id) REFERENCES branches;
ALTER TABLE user_assignments ADD FOREIGN KEY (role_id) REFERENCES roles;
ALTER TABLE devices ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE devices ADD FOREIGN KEY (branch_id) REFERENCES branches;
ALTER TABLE devices ADD FOREIGN KEY (revoked_by) REFERENCES users;
ALTER TABLE pairing_codes ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE pairing_codes ADD FOREIGN KEY (branch_id) REFERENCES branches;
ALTER TABLE pairing_codes ADD FOREIGN KEY (created_by) REFERENCES users;
ALTER TABLE sessions ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE sessions ADD FOREIGN KEY (user_id) REFERENCES users;
ALTER TABLE sessions ADD FOREIGN KEY (device_id) REFERENCES devices;
ALTER TABLE auth_tokens ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE auth_tokens ADD FOREIGN KEY (user_id) REFERENCES users;
ALTER TABLE pin_lockouts ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE pin_lockouts ADD FOREIGN KEY (user_id) REFERENCES users;
ALTER TABLE pin_lockouts ADD FOREIGN KEY (device_id) REFERENCES devices;
ALTER TABLE subscriptions ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE subscriptions ADD FOREIGN KEY (plan_id) REFERENCES plans;
ALTER TABLE subscriptions ADD FOREIGN KEY (plan_price_id) REFERENCES plan_prices;
ALTER TABLE invoices ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE invoices ADD FOREIGN KEY (subscription_id) REFERENCES subscriptions;
ALTER TABLE invoices ADD FOREIGN KEY (paid_manually_by) REFERENCES platform_users;
ALTER TABLE invoice_lines ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE invoice_lines ADD FOREIGN KEY (invoice_id) REFERENCES invoices;
ALTER TABLE plan_prices ADD FOREIGN KEY (plan_id) REFERENCES plans;
ALTER TABLE billing_customers ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE payment_methods ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE payment_methods ADD FOREIGN KEY (billing_customer_id) REFERENCES billing_customers;
ALTER TABLE payment_events ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE payment_events ADD FOREIGN KEY (invoice_id) REFERENCES invoices;
ALTER TABLE credit_notes ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE credit_notes ADD FOREIGN KEY (invoice_id) REFERENCES invoices;
ALTER TABLE credit_notes ADD FOREIGN KEY (issued_by) REFERENCES platform_users;
ALTER TABLE register_sessions ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE register_sessions ADD FOREIGN KEY (branch_id) REFERENCES branches;
ALTER TABLE register_sessions ADD FOREIGN KEY (opened_by) REFERENCES users;
ALTER TABLE register_sessions ADD FOREIGN KEY (closed_by) REFERENCES users;
ALTER TABLE register_sessions ADD FOREIGN KEY (approved_by) REFERENCES users;
ALTER TABLE register_sessions ADD FOREIGN KEY (device_id) REFERENCES devices;
ALTER TABLE cash_counts ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE cash_counts ADD FOREIGN KEY (session_id) REFERENCES register_sessions;
ALTER TABLE cash_movements ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE cash_movements ADD FOREIGN KEY (session_id) REFERENCES register_sessions;
ALTER TABLE cash_movements ADD FOREIGN KEY (user_id) REFERENCES users;
ALTER TABLE cash_movements ADD FOREIGN KEY (approved_by) REFERENCES users;
ALTER TABLE cash_movements ADD FOREIGN KEY (device_id) REFERENCES devices;
ALTER TABLE sales ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE sales ADD FOREIGN KEY (branch_id) REFERENCES branches;
ALTER TABLE sales ADD FOREIGN KEY (session_id) REFERENCES register_sessions;
ALTER TABLE sales ADD FOREIGN KEY (cashier_id) REFERENCES users;
ALTER TABLE sales ADD FOREIGN KEY (voided_by) REFERENCES users;
ALTER TABLE sales ADD FOREIGN KEY (device_id) REFERENCES devices;
ALTER TABLE sale_lines ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE sale_lines ADD FOREIGN KEY (sale_id) REFERENCES sales;
ALTER TABLE sale_lines ADD FOREIGN KEY (product_id) REFERENCES products;
ALTER TABLE sale_line_modifiers ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE sale_line_modifiers ADD FOREIGN KEY (sale_line_id) REFERENCES sale_lines;
ALTER TABLE sale_line_modifiers ADD FOREIGN KEY (modifier_id) REFERENCES modifiers;
ALTER TABLE sale_discounts ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE sale_discounts ADD FOREIGN KEY (sale_id) REFERENCES sales;
ALTER TABLE sale_discounts ADD FOREIGN KEY (approved_by) REFERENCES users;
ALTER TABLE payments ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE payments ADD FOREIGN KEY (sale_id) REFERENCES sales;
ALTER TABLE refunds ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE refunds ADD FOREIGN KEY (sale_id) REFERENCES sales;
ALTER TABLE refunds ADD FOREIGN KEY (requested_by) REFERENCES users;
ALTER TABLE refunds ADD FOREIGN KEY (approved_by) REFERENCES users;
ALTER TABLE refund_lines ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE refund_lines ADD FOREIGN KEY (refund_id) REFERENCES refunds;
ALTER TABLE refund_lines ADD FOREIGN KEY (sale_line_id) REFERENCES sale_lines;
ALTER TABLE discount_rules ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE discount_rules ADD FOREIGN KEY (role_id) REFERENCES roles;
ALTER TABLE tenant_payment_methods ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE categories ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE products ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE products ADD FOREIGN KEY (category_id) REFERENCES categories;
ALTER TABLE products ADD FOREIGN KEY (updated_by) REFERENCES users;
ALTER TABLE modifier_groups ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE modifiers ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE modifiers ADD FOREIGN KEY (group_id) REFERENCES modifier_groups;
ALTER TABLE product_modifier_groups ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE product_modifier_groups ADD FOREIGN KEY (product_id) REFERENCES products;
ALTER TABLE product_modifier_groups ADD FOREIGN KEY (modifier_group_id) REFERENCES modifier_groups;
ALTER TABLE recipe_lines ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE recipe_lines ADD FOREIGN KEY (product_id) REFERENCES products;
ALTER TABLE recipe_lines ADD FOREIGN KEY (inventory_item_id) REFERENCES inventory_items;
ALTER TABLE modifier_recipe_lines ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE modifier_recipe_lines ADD FOREIGN KEY (modifier_id) REFERENCES modifiers;
ALTER TABLE modifier_recipe_lines ADD FOREIGN KEY (inventory_item_id) REFERENCES inventory_items;
ALTER TABLE inventory_items ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE item_branch_settings ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE item_branch_settings ADD FOREIGN KEY (item_id) REFERENCES inventory_items;
ALTER TABLE item_branch_settings ADD FOREIGN KEY (branch_id) REFERENCES branches;
ALTER TABLE item_branch_settings ADD FOREIGN KEY (default_supplier_id) REFERENCES suppliers;
ALTER TABLE batches ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE batches ADD FOREIGN KEY (branch_id) REFERENCES branches;
ALTER TABLE batches ADD FOREIGN KEY (item_id) REFERENCES inventory_items;
ALTER TABLE batches ADD FOREIGN KEY (receipt_line_id) REFERENCES goods_receipt_lines;
ALTER TABLE stock_movements ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE stock_movements ADD FOREIGN KEY (branch_id) REFERENCES branches;
ALTER TABLE stock_movements ADD FOREIGN KEY (item_id) REFERENCES inventory_items;
ALTER TABLE stock_movements ADD FOREIGN KEY (batch_id) REFERENCES batches;
ALTER TABLE stock_movements ADD FOREIGN KEY (user_id) REFERENCES users;
ALTER TABLE stock_movements ADD FOREIGN KEY (approved_by) REFERENCES users;
ALTER TABLE stock_movements ADD FOREIGN KEY (device_id) REFERENCES devices;
ALTER TABLE stock_counts ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE stock_counts ADD FOREIGN KEY (branch_id) REFERENCES branches;
ALTER TABLE stock_counts ADD FOREIGN KEY (counted_by) REFERENCES users;
ALTER TABLE stock_count_lines ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE stock_count_lines ADD FOREIGN KEY (count_id) REFERENCES stock_counts;
ALTER TABLE stock_count_lines ADD FOREIGN KEY (item_id) REFERENCES inventory_items;
ALTER TABLE suppliers ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE supplier_items ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE supplier_items ADD FOREIGN KEY (supplier_id) REFERENCES suppliers;
ALTER TABLE supplier_items ADD FOREIGN KEY (item_id) REFERENCES inventory_items;
ALTER TABLE purchase_orders ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE purchase_orders ADD FOREIGN KEY (branch_id) REFERENCES branches;
ALTER TABLE purchase_orders ADD FOREIGN KEY (supplier_id) REFERENCES suppliers;
ALTER TABLE purchase_orders ADD FOREIGN KEY (created_by) REFERENCES users;
ALTER TABLE purchase_orders ADD FOREIGN KEY (approved_by) REFERENCES users;
ALTER TABLE purchase_order_lines ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE purchase_order_lines ADD FOREIGN KEY (po_id) REFERENCES purchase_orders;
ALTER TABLE purchase_order_lines ADD FOREIGN KEY (item_id) REFERENCES inventory_items;
ALTER TABLE goods_receipts ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE goods_receipts ADD FOREIGN KEY (branch_id) REFERENCES branches;
ALTER TABLE goods_receipts ADD FOREIGN KEY (supplier_id) REFERENCES suppliers;
ALTER TABLE goods_receipts ADD FOREIGN KEY (po_id) REFERENCES purchase_orders;
ALTER TABLE goods_receipts ADD FOREIGN KEY (received_by) REFERENCES users;
ALTER TABLE goods_receipt_lines ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE goods_receipt_lines ADD FOREIGN KEY (receipt_id) REFERENCES goods_receipts;
ALTER TABLE goods_receipt_lines ADD FOREIGN KEY (po_line_id) REFERENCES purchase_order_lines;
ALTER TABLE goods_receipt_lines ADD FOREIGN KEY (item_id) REFERENCES inventory_items;
ALTER TABLE alerts ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE alerts ADD FOREIGN KEY (branch_id) REFERENCES branches;
ALTER TABLE alerts ADD FOREIGN KEY (item_id) REFERENCES inventory_items;
ALTER TABLE alerts ADD FOREIGN KEY (batch_id) REFERENCES batches;
ALTER TABLE alert_reads ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE alert_reads ADD FOREIGN KEY (alert_id) REFERENCES alerts;
ALTER TABLE alert_reads ADD FOREIGN KEY (user_id) REFERENCES users;
ALTER TABLE notification_settings ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE notification_deliveries ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE notification_deliveries ADD FOREIGN KEY (alert_id) REFERENCES alerts;
ALTER TABLE notification_deliveries ADD FOREIGN KEY (user_id) REFERENCES users;
ALTER TABLE audit_log ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE audit_log ADD FOREIGN KEY (branch_id) REFERENCES branches;
ALTER TABLE audit_log ADD FOREIGN KEY (user_id) REFERENCES users;
ALTER TABLE audit_log ADD FOREIGN KEY (device_id) REFERENCES devices;
ALTER TABLE platform_users ADD FOREIGN KEY (role_id) REFERENCES platform_roles;
ALTER TABLE platform_sessions ADD FOREIGN KEY (staff_id) REFERENCES platform_users;
ALTER TABLE platform_role_permissions ADD FOREIGN KEY (role_id) REFERENCES platform_roles;
ALTER TABLE platform_role_permissions ADD FOREIGN KEY (permission_code) REFERENCES platform_permissions;
ALTER TABLE support_access_grants ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE support_access_grants ADD FOREIGN KEY (staff_id) REFERENCES platform_users;
ALTER TABLE support_access_grants ADD FOREIGN KEY (ticket_id) REFERENCES support_tickets;
ALTER TABLE support_access_grants ADD FOREIGN KEY (approved_by) REFERENCES users;
ALTER TABLE platform_audit_log ADD FOREIGN KEY (staff_id) REFERENCES platform_users;
ALTER TABLE platform_audit_log ADD FOREIGN KEY (target_tenant_id) REFERENCES tenants;
ALTER TABLE platform_audit_log ADD FOREIGN KEY (grant_id) REFERENCES support_access_grants;
ALTER TABLE tenant_events ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE tenant_events ADD FOREIGN KEY (staff_id) REFERENCES platform_users;
ALTER TABLE data_requests ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE data_requests ADD FOREIGN KEY (requested_by) REFERENCES users;
ALTER TABLE data_requests ADD FOREIGN KEY (identity_checked_by) REFERENCES platform_users;
ALTER TABLE data_requests ADD FOREIGN KEY (completed_by) REFERENCES platform_users;
ALTER TABLE tenant_feature_overrides ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE tenant_feature_overrides ADD FOREIGN KEY (flag_key) REFERENCES feature_flags;
ALTER TABLE tenant_feature_overrides ADD FOREIGN KEY (set_by) REFERENCES platform_users;
ALTER TABLE app_releases ADD FOREIGN KEY (released_by) REFERENCES platform_users;
ALTER TABLE device_error_reports ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE device_error_reports ADD FOREIGN KEY (device_id) REFERENCES devices;
ALTER TABLE announcements ADD FOREIGN KEY (created_by) REFERENCES platform_users;
ALTER TABLE announcement_reads ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE announcement_reads ADD FOREIGN KEY (announcement_id) REFERENCES announcements;
ALTER TABLE announcement_reads ADD FOREIGN KEY (user_id) REFERENCES users;
ALTER TABLE support_tickets ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE support_tickets ADD FOREIGN KEY (requester_id) REFERENCES users;
ALTER TABLE support_tickets ADD FOREIGN KEY (assignee_id) REFERENCES platform_users;
ALTER TABLE support_tickets ADD FOREIGN KEY (device_id) REFERENCES devices;
ALTER TABLE support_ticket_messages ADD FOREIGN KEY (tenant_id) REFERENCES tenants;
ALTER TABLE support_ticket_messages ADD FOREIGN KEY (ticket_id) REFERENCES support_tickets;
ALTER TABLE support_ticket_messages ADD FOREIGN KEY (author_user_id) REFERENCES users;
ALTER TABLE support_ticket_messages ADD FOREIGN KEY (author_staff_id) REFERENCES platform_users;

-- Rules enforced here
CREATE UNIQUE INDEX one_open_alert ON alerts (branch_id, item_id, type) WHERE status <> 'resolved';
CREATE UNIQUE INDEX one_receipt_no_per_tenant ON sales (tenant_id, receipt_no);
CREATE UNIQUE INDEX one_po_number_per_tenant ON purchase_orders (tenant_id, number);
CREATE UNIQUE INDEX one_billing_customer_per_provider ON billing_customers (tenant_id, provider);
CREATE UNIQUE INDEX one_price_version ON plan_prices (plan_id, version);
CREATE INDEX active_support_grants ON support_access_grants (tenant_id) WHERE status = 'active';
CREATE INDEX batches_fefo ON batches (branch_id, item_id, expiry_date) WHERE qty_remaining > 0;

-- ======================================================================
-- Roles (created once per database by `pnpm db:roles`, not by a migration: roles belong to the cluster)
-- ======================================================================
-- brewpoint_migrator  NOLOGIN. Owns every table. Migrations and seeds connect as the owner login and SET ROLE to it.
-- brewpoint_app       LOGIN. The server at runtime. NOBYPASSRLS and not an owner, so row-level security always applies.
-- brewpoint_platform  LOGIN (from Module 03). The staff console. Platform tables, plus the tables BrewPoint runs for each shop.

-- ======================================================================
-- Row-level security
-- ======================================================================

-- The tenant set by the server's tenant transaction (SET LOCAL app.tenant_id), or NULL when none is set.
CREATE FUNCTION app_current_tenant() RETURNS uuid
  LANGUAGE sql STABLE
  AS $$ SELECT nullif(current_setting('app.tenant_id', true), '')::uuid $$;

-- tenants: a shop sees and changes only itself.
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON tenants
  USING (id = (SELECT app_current_tenant())) WITH CHECK (id = (SELECT app_current_tenant()));

-- The same three statements for each of the 61 tables with tenant_id:
--   branches, users, roles, role_permissions, user_assignments, devices, pairing_codes,
--   subscriptions, invoices, invoice_lines, billing_customers, payment_methods, payment_events, credit_notes,
--   register_sessions, cash_counts, cash_movements, sales, sale_lines, sale_line_modifiers, sale_discounts,
--   payments, refunds, refund_lines, discount_rules, tenant_payment_methods,
--   categories, products, modifier_groups, modifiers, product_modifier_groups, recipe_lines, modifier_recipe_lines,
--   inventory_items, item_branch_settings, batches, stock_movements, stock_counts, stock_count_lines,
--   suppliers, supplier_items, purchase_orders, purchase_order_lines, goods_receipts, goods_receipt_lines,
--   alerts, alert_reads, notification_settings, notification_deliveries, audit_log,
--   support_access_grants, tenant_events, data_requests, tenant_feature_overrides, device_error_reports,
--   announcement_reads, support_tickets, support_ticket_messages,
--   sessions, auth_tokens, pin_lockouts
-- payment_events.tenant_id may be empty (a webhook before the shop is known); those rows are platform-only.
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON sales
  USING (tenant_id = (SELECT app_current_tenant())) WITH CHECK (tenant_id = (SELECT app_current_tenant()));

-- The staff console sees these across shops:
--   tenants, subscriptions, invoices, invoice_lines, billing_customers, payment_methods, payment_events,
--   credit_notes, support_access_grants, tenant_events, data_requests, tenant_feature_overrides,
--   device_error_reports, support_tickets, support_ticket_messages
CREATE POLICY platform_all ON invoices TO brewpoint_platform USING (true) WITH CHECK (true);

-- No row-level security (global): plans, plan_prices, permissions, feature_flags, app_releases, announcements
-- (shops read them) and platform_users, platform_roles, platform_permissions, platform_role_permissions,
-- platform_audit_log, platform_sessions (staff only).

-- Sign-in knows only an email, so no tenant is set and row-level security hides every user. This
-- returns the user and shop ids for one exact email, nothing else; the server then reads the hashes
-- and status inside the tenant transaction. It runs as its owner, the migrator, which may read users
-- across shops only while no tenant is set. The app role may only call it.
CREATE POLICY auth_lookup ON users FOR SELECT TO brewpoint_migrator
  USING ((SELECT app_current_tenant()) IS NULL);

CREATE FUNCTION auth_find_user(lookup_email text)
  RETURNS TABLE (user_id uuid, tenant_id uuid)
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = public, pg_temp
  AS $$ SELECT u.id, u.tenant_id FROM users u WHERE u.email = lower(trim(lookup_email)) $$;
REVOKE ALL ON FUNCTION auth_find_user(text) FROM PUBLIC;

-- ======================================================================
-- Grants
-- ======================================================================
-- brewpoint_app
--   SELECT, INSERT, UPDATE  every shop table above, except the append-only ones
--   SELECT, INSERT          audit_log, stock_movements, tenant_events (append-only)
--   DELETE                  role_permissions, user_assignments, product_modifier_groups, recipe_lines,
--                           modifier_recipe_lines, supplier_items, pairing_codes, purchase_order_lines
--   SELECT                  payment_events, plans, plan_prices, permissions, feature_flags, app_releases, announcements
--   EXECUTE                 auth_find_user(text)
--   nothing                 platform_users, platform_roles, platform_permissions, platform_role_permissions, platform_audit_log,
--                           platform_sessions
-- brewpoint_platform
--   SELECT, INSERT, UPDATE  the global and platform tables, and the cross-shop tables listed for platform_all
--   SELECT, INSERT          platform_audit_log, tenant_events (append-only)
--   DELETE                  platform_role_permissions
--   nothing                 shop business data (sales, stock, menu, people); staff reach it through the tenant
--                           transaction after the server checks an active support_access_grants row (Module 18)
