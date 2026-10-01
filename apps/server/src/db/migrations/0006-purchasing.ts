import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
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
      number text NOT NULL,  -- PO-0043, unique per shop
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
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    DROP TABLE goods_receipt_lines, goods_receipts, purchase_order_lines, purchase_orders,
      supplier_items, suppliers;
  `.execute(db);
}
