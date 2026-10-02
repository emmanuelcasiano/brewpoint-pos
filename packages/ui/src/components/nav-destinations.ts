import type { IconName } from '../icons/icon-paths';

export interface NavDestination<K extends string> {
  key: K;
  icon: IconName;
  label: string;
}

export interface NavGroup<K extends string> {
  /** No heading for the first group. */
  heading: string | null;
  items: readonly NavDestination<K>[];
}

/** The back-office destinations in the fixed order from the Navigation README and bundle.js. */
export const BACK_OFFICE_NAV = [
  {
    heading: null,
    items: [
      { key: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
      { key: 'alerts', icon: 'bell', label: 'Alerts' },
    ],
  },
  {
    heading: 'Sales',
    items: [
      { key: 'transactions', icon: 'receipt', label: 'Transactions' },
      { key: 'reports', icon: 'chart', label: 'Reports' },
      { key: 'sessions', icon: 'clock', label: 'Register sessions' },
    ],
  },
  {
    heading: 'Menu and stock',
    items: [
      { key: 'products', icon: 'tag', label: 'Products' },
      { key: 'inventory', icon: 'box', label: 'Inventory' },
      { key: 'expiry', icon: 'calendar-x', label: 'Expiry tracking' },
    ],
  },
  {
    heading: 'Purchasing',
    items: [
      { key: 'purchases', icon: 'truck', label: 'Purchase orders' },
      { key: 'suppliers', icon: 'store', label: 'Suppliers' },
    ],
  },
  {
    heading: 'People',
    items: [
      { key: 'users', icon: 'users', label: 'Users and roles' },
      { key: 'devices', icon: 'tablet', label: 'Devices' },
    ],
  },
  {
    heading: 'Business',
    items: [
      { key: 'audit', icon: 'shield', label: 'Audit log' },
      { key: 'subscription', icon: 'card', label: 'Subscription' },
      { key: 'settings', icon: 'settings', label: 'Settings' },
    ],
  },
] as const satisfies readonly NavGroup<string>[];

/** The staff console destinations, in the order from bundle.js. */
export const CONSOLE_NAV = [
  {
    heading: null,
    items: [
      { key: 'overview', icon: 'dashboard', label: 'Overview' },
      { key: 'shops', icon: 'store', label: 'Shops' },
    ],
  },
  {
    heading: 'Support',
    items: [
      { key: 'support', icon: 'key', label: 'Support access' },
      { key: 'tickets', icon: 'mail', label: 'Tickets' },
    ],
  },
  {
    heading: 'Money',
    items: [
      { key: 'billing', icon: 'card', label: 'Billing' },
      { key: 'plans', icon: 'tag', label: 'Plans and prices' },
    ],
  },
  {
    heading: 'Product',
    items: [
      { key: 'flags', icon: 'filter', label: 'Feature flags' },
      { key: 'releases', icon: 'tablet', label: 'App releases' },
      { key: 'announcements', icon: 'bell', label: 'Announcements' },
    ],
  },
  {
    heading: 'Compliance',
    items: [
      { key: 'datarequests', icon: 'download', label: 'Data requests' },
      { key: 'audit', icon: 'shield', label: 'Staff audit log' },
    ],
  },
  {
    heading: 'Team',
    items: [{ key: 'staff', icon: 'users', label: 'Staff' }],
  },
] as const satisfies readonly NavGroup<string>[];

export type BackOfficeDestination = (typeof BACK_OFFICE_NAV)[number]['items'][number]['key'];
export type ConsoleDestination = (typeof CONSOLE_NAV)[number]['items'][number]['key'];
