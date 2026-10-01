import { sql, type Kysely } from 'kysely';

// Every table with a NOT NULL tenant_id. Rows are visible and writable only for the tenant
// set on the transaction (app.tenant_id), for every role that is not a superuser.
const TENANT_TABLES = [
  'branches',
  'users',
  'roles',
  'role_permissions',
  'user_assignments',
  'devices',
  'pairing_codes',
  'subscriptions',
  'invoices',
  'invoice_lines',
  'billing_customers',
  'payment_methods',
  'credit_notes',
  'register_sessions',
  'cash_counts',
  'cash_movements',
  'sales',
  'sale_lines',
  'sale_line_modifiers',
  'sale_discounts',
  'payments',
  'refunds',
  'refund_lines',
  'discount_rules',
  'tenant_payment_methods',
  'categories',
  'products',
  'modifier_groups',
  'modifiers',
  'product_modifier_groups',
  'recipe_lines',
  'modifier_recipe_lines',
  'inventory_items',
  'item_branch_settings',
  'batches',
  'stock_movements',
  'stock_counts',
  'stock_count_lines',
  'suppliers',
  'supplier_items',
  'purchase_orders',
  'purchase_order_lines',
  'goods_receipts',
  'goods_receipt_lines',
  'alerts',
  'alert_reads',
  'notification_settings',
  'notification_deliveries',
  'audit_log',
  'support_access_grants',
  'tenant_events',
  'data_requests',
  'tenant_feature_overrides',
  'device_error_reports',
  'announcement_reads',
  'support_tickets',
  'support_ticket_messages',
  // tenant_id may be empty here (a webhook before the shop is known); such rows are platform-only.
  'payment_events',
];

// Tables BrewPoint runs for every shop: the staff console sees them across shops.
const PLATFORM_RUN_TABLES = [
  'tenants',
  'subscriptions',
  'invoices',
  'invoice_lines',
  'billing_customers',
  'payment_methods',
  'payment_events',
  'credit_notes',
  'support_access_grants',
  'tenant_events',
  'data_requests',
  'tenant_feature_overrides',
  'device_error_reports',
  'support_tickets',
  'support_ticket_messages',
];

const CURRENT_TENANT = '(SELECT app_current_tenant())';

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    -- The tenant set by the tenant transaction, or NULL when none is set (then no rows match).
    CREATE FUNCTION app_current_tenant() RETURNS uuid
      LANGUAGE sql STABLE
      AS $$ SELECT nullif(current_setting('app.tenant_id', true), '')::uuid $$;
  `.execute(db);

  const statements = [
    'ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE tenants FORCE ROW LEVEL SECURITY;',
    `CREATE POLICY tenant_isolation ON tenants USING (id = ${CURRENT_TENANT}) WITH CHECK (id = ${CURRENT_TENANT});`,
    ...TENANT_TABLES.flatMap((table) => [
      `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`,
      `ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;`,
      `CREATE POLICY tenant_isolation ON ${table} USING (tenant_id = ${CURRENT_TENANT}) WITH CHECK (tenant_id = ${CURRENT_TENANT});`,
    ]),
    ...PLATFORM_RUN_TABLES.map(
      (table) =>
        `CREATE POLICY platform_all ON ${table} TO brewpoint_platform USING (true) WITH CHECK (true);`,
    ),
  ];
  await sql.raw(statements.join('\n')).execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  const statements = [
    ...PLATFORM_RUN_TABLES.map((table) => `DROP POLICY platform_all ON ${table};`),
    ...['tenants', ...TENANT_TABLES].flatMap((table) => [
      `DROP POLICY tenant_isolation ON ${table};`,
      `ALTER TABLE ${table} NO FORCE ROW LEVEL SECURITY;`,
      `ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;`,
    ]),
    'DROP FUNCTION app_current_tenant();',
  ];
  await sql.raw(statements.join('\n')).execute(db);
}
