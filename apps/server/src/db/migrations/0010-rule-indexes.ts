import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE UNIQUE INDEX one_open_alert ON alerts (branch_id, item_id, type) WHERE status <> 'resolved';
    CREATE UNIQUE INDEX one_receipt_no_per_tenant ON sales (tenant_id, receipt_no);
    CREATE UNIQUE INDEX one_po_number_per_tenant ON purchase_orders (tenant_id, number);
    CREATE UNIQUE INDEX one_billing_customer_per_provider ON billing_customers (tenant_id, provider);
    CREATE UNIQUE INDEX one_price_version ON plan_prices (plan_id, version);
    CREATE INDEX active_support_grants ON support_access_grants (tenant_id) WHERE status = 'active';
    CREATE INDEX batches_fefo ON batches (branch_id, item_id, expiry_date) WHERE qty_remaining > 0;
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    DROP INDEX one_open_alert, one_receipt_no_per_tenant, one_po_number_per_tenant,
      one_billing_customer_per_provider, one_price_version, active_support_grants, batches_fefo;
  `.execute(db);
}
