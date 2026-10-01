import { PERMISSIONS } from '@brewpoint/shared';
import { sql, type Kysely } from 'kysely';
import type { DB } from '../types';

// Fixed IDs, so running the seed again finds the same rows.
export const PLAN_IDS = {
  starter: '0199a000-0000-7000-8000-000000000001',
  growth: '0199a000-0000-7000-8000-000000000002',
  multiBranch: '0199a000-0000-7000-8000-000000000003',
} as const;

const PRICE_IDS = {
  starterV1: '0199a000-0000-7000-8000-000000000101',
  growthV1: '0199a000-0000-7000-8000-000000000201',
  growthV2: '0199a000-0000-7000-8000-000000000202',
  multiBranchV1: '0199a000-0000-7000-8000-000000000301',
} as const;

const STARTER_FEATURES = ['sales_reports', 'works_offline'];
const GROWTH_FEATURES = [
  ...STARTER_FEATURES,
  'stock_alerts',
  'expiry_tracking',
  'purchase_orders',
  'all_reports',
  'csv_pdf_export',
];
const MULTI_BRANCH_FEATURES = [...GROWTH_FEATURES, 'audit_log_export', 'priority_support'];

// Prices are centavos and include 12% VAT. Yearly is 10 months ("2 months free").
const PLANS = [
  {
    id: PLAN_IDS.starter,
    name: 'Starter',
    price_monthly: 69_900,
    price_yearly: 699_000,
    max_branches: 1,
    max_devices: 1,
    max_users: 3,
    features: JSON.stringify(STARTER_FEATURES),
  },
  {
    id: PLAN_IDS.growth,
    name: 'Growth',
    price_monthly: 149_900,
    price_yearly: 1_499_000,
    max_branches: 2,
    max_devices: 3,
    max_users: 10,
    features: JSON.stringify(GROWTH_FEATURES),
  },
  {
    id: PLAN_IDS.multiBranch,
    name: 'Multi-branch',
    price_monthly: 349_900,
    price_yearly: 3_499_000,
    max_branches: 10,
    max_devices: 15,
    max_users: null,
    features: JSON.stringify(MULTI_BRANCH_FEATURES),
  },
];

const PLAN_PRICES = [
  {
    id: PRICE_IDS.starterV1,
    plan_id: PLAN_IDS.starter,
    version: 1,
    price_monthly: 69_900,
    price_yearly: 699_000,
    valid_from: '2026-01-05',
    valid_until: null,
  },
  {
    id: PRICE_IDS.growthV1,
    plan_id: PLAN_IDS.growth,
    version: 1,
    price_monthly: 129_900,
    price_yearly: 1_299_000,
    valid_from: '2026-01-05',
    valid_until: '2026-07-31',
  },
  {
    id: PRICE_IDS.growthV2,
    plan_id: PLAN_IDS.growth,
    version: 2,
    price_monthly: 149_900,
    price_yearly: 1_499_000,
    valid_from: '2026-08-01',
    valid_until: null,
  },
  {
    id: PRICE_IDS.multiBranchV1,
    plan_id: PLAN_IDS.multiBranch,
    version: 1,
    price_monthly: 349_900,
    price_yearly: 3_499_000,
    valid_from: '2026-03-01',
    valid_until: null,
  },
];

/**
 * Data every environment needs: the permission list and the plans.
 * Permission labels follow packages/shared; plans and prices are only ever added,
 * never rewritten, because shops keep paying the price version they signed up on.
 */
export async function seedReference(db: Kysely<DB>): Promise<void> {
  await db
    .insertInto('permissions')
    .values(PERMISSIONS.map(({ code, group, label }) => ({ code, group_name: group, label })))
    .onConflict((oc) =>
      oc
        .column('code')
        .doUpdateSet((eb) => ({
          group_name: eb.ref('excluded.group_name'),
          label: eb.ref('excluded.label'),
        }))
        .where(
          sql<boolean>`(permissions.group_name, permissions.label) IS DISTINCT FROM (excluded.group_name, excluded.label)`,
        ),
    )
    .execute();

  await db
    .insertInto('plans')
    .values(PLANS)
    .onConflict((oc) => oc.column('id').doNothing())
    .execute();

  await db
    .insertInto('plan_prices')
    .values(PLAN_PRICES)
    .onConflict((oc) => oc.column('id').doNothing())
    .execute();
}
