export interface PermissionDefinition {
  code: string;
  group: string;
  label: string;
}

/**
 * Every shop permission, grouped as the PermissionMatrix shows them, plus the two alert
 * permissions from the stock alerts guideline. Seeded into the permissions table; the
 * server checks these codes and the apps use them to hide actions.
 */
export const PERMISSIONS = [
  { code: 'sale.create', group: 'Sales', label: 'Ring up sales' },
  { code: 'sale.discount.apply', group: 'Sales', label: 'Apply discounts within own limit' },
  { code: 'sale.discount.approve', group: 'Sales', label: 'Approve larger discounts' },
  { code: 'sale.void.request', group: 'Sales', label: 'Request a void' },
  { code: 'sale.void.approve', group: 'Sales', label: 'Approve voids' },
  { code: 'sale.refund.request', group: 'Sales', label: 'Request a refund' },
  { code: 'sale.refund.approve', group: 'Sales', label: 'Approve refunds' },
  { code: 'receipt.reprint', group: 'Sales', label: 'Reprint receipts' },
  { code: 'register.open', group: 'Register and cash', label: 'Open the register' },
  { code: 'register.close', group: 'Register and cash', label: 'Close the register' },
  { code: 'register.view_all', group: 'Register and cash', label: 'See every cashier’s register' },
  {
    code: 'register.variance.approve',
    group: 'Register and cash',
    label: 'Approve cash variance up to ₱500',
  },
  {
    code: 'register.variance.approve_large',
    group: 'Register and cash',
    label: 'Approve cash variance over ₱500',
  },
  { code: 'cash.move', group: 'Register and cash', label: 'Cash in and cash out' },
  { code: 'cash.move.approve', group: 'Register and cash', label: 'Approve cash movements' },
  { code: 'catalog.view', group: 'Catalog', label: 'View menu and prices' },
  { code: 'catalog.manage', group: 'Catalog', label: 'Edit menu, recipes and modifiers' },
  { code: 'catalog.price.edit', group: 'Catalog', label: 'Change prices' },
  { code: 'inventory.view', group: 'Inventory', label: 'View stock' },
  { code: 'inventory.adjust', group: 'Inventory', label: 'Adjust stock counts' },
  { code: 'inventory.adjust.approve', group: 'Inventory', label: 'Approve stock adjustments' },
  { code: 'inventory.waste', group: 'Inventory', label: 'Record waste' },
  { code: 'inventory.alerts.view', group: 'Inventory', label: 'See stock alerts' },
  { code: 'inventory.alerts.resolve', group: 'Inventory', label: 'Resolve stock alerts' },
  { code: 'inventory.alerts.settings', group: 'Inventory', label: 'Change stock alert settings' },
  { code: 'inventory.costs.view', group: 'Inventory', label: 'See ingredient costs' },
  { code: 'purchase.view', group: 'Purchasing', label: 'View purchase orders' },
  { code: 'purchase.create', group: 'Purchasing', label: 'Create and send purchase orders' },
  { code: 'purchase.approve', group: 'Purchasing', label: 'Approve orders over ₱10,000' },
  { code: 'inventory.receive', group: 'Purchasing', label: 'Receive deliveries' },
  { code: 'supplier.manage', group: 'Purchasing', label: 'Add and edit suppliers' },
  { code: 'report.sales.view', group: 'Reports and audit', label: 'View sales reports' },
  { code: 'report.inventory.view', group: 'Reports and audit', label: 'View inventory reports' },
  { code: 'report.margin.view', group: 'Reports and audit', label: 'See profit margins' },
  { code: 'audit.view', group: 'Reports and audit', label: 'View the audit log' },
  { code: 'user.view', group: 'Users and access', label: 'View users' },
  { code: 'user.manage', group: 'Users and access', label: 'Create, invite and deactivate users' },
  { code: 'role.manage', group: 'Users and access', label: 'Edit roles and permissions' },
  { code: 'pin.reset', group: 'Users and access', label: 'Reset other people’s PINs' },
  {
    code: 'device.manage',
    group: 'Devices, settings and billing',
    label: 'Register and revoke devices',
  },
  {
    code: 'settings.manage',
    group: 'Devices, settings and billing',
    label: 'Change shop settings',
  },
  {
    code: 'billing.manage',
    group: 'Devices, settings and billing',
    label: 'Manage subscription and billing',
  },
] as const satisfies readonly PermissionDefinition[];

export type PermissionCode = (typeof PERMISSIONS)[number]['code'];
