import { sql, type Kysely } from 'kysely';

// Shop tables the app reads and writes (RLS limits it to the current tenant).
const APP_READ_WRITE = [
  'tenants',
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
  'support_access_grants',
  'data_requests',
  'tenant_feature_overrides',
  'device_error_reports',
  'announcement_reads',
  'support_tickets',
  'support_ticket_messages',
];

// Append-only for the app: rows are added, never changed or removed.
const APP_APPEND_ONLY = ['audit_log', 'stock_movements', 'tenant_events'];

// Removing a row is normal editing here (a recipe line, a role's permission, an expired code).
const APP_DELETE = [
  'role_permissions',
  'user_assignments',
  'product_modifier_groups',
  'recipe_lines',
  'modifier_recipe_lines',
  'supplier_items',
  'pairing_codes',
  'purchase_order_lines',
];

// Global tables every shop can read.
const SHOP_READABLE_GLOBAL = [
  'plans',
  'plan_prices',
  'permissions',
  'feature_flags',
  'app_releases',
  'announcements',
];

// The staff console: platform tables, global tables and the tables BrewPoint runs for each shop.
const PLATFORM_READ_WRITE = [
  ...SHOP_READABLE_GLOBAL,
  'platform_users',
  'platform_roles',
  'platform_permissions',
  'platform_role_permissions',
  'tenants',
  'subscriptions',
  'invoices',
  'invoice_lines',
  'billing_customers',
  'payment_methods',
  'payment_events',
  'credit_notes',
  'support_access_grants',
  'data_requests',
  'tenant_feature_overrides',
  'device_error_reports',
  'support_tickets',
  'support_ticket_messages',
];

const PLATFORM_APPEND_ONLY = ['platform_audit_log', 'tenant_events'];

const PLATFORM_DELETE = ['platform_role_permissions'];

function grant(privileges: string, tables: readonly string[], role: string): string {
  return `GRANT ${privileges} ON ${tables.join(', ')} TO ${role};`;
}

export async function up(db: Kysely<unknown>): Promise<void> {
  const statements = [
    grant('SELECT, INSERT, UPDATE', APP_READ_WRITE, 'brewpoint_app'),
    grant('SELECT, INSERT', APP_APPEND_ONLY, 'brewpoint_app'),
    grant('DELETE', APP_DELETE, 'brewpoint_app'),
    grant('SELECT', ['payment_events', ...SHOP_READABLE_GLOBAL], 'brewpoint_app'),
    grant('SELECT, INSERT, UPDATE', PLATFORM_READ_WRITE, 'brewpoint_platform'),
    grant('SELECT, INSERT', PLATFORM_APPEND_ONLY, 'brewpoint_platform'),
    grant('DELETE', PLATFORM_DELETE, 'brewpoint_platform'),
  ];
  await sql.raw(statements.join('\n')).execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM brewpoint_app, brewpoint_platform;
  `.execute(db);
}
