import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
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
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    DROP TABLE stock_count_lines, stock_counts, stock_movements, batches, item_branch_settings,
      inventory_items;
  `.execute(db);
}
