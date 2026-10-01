# Module 02: Database and tenant isolation

## Goal
The full schema exists as migrations, and the database itself guarantees that one shop can never read or write another shop's rows, even if application code has a bug.

## Depends on (already built)
- Module 01 project skeleton.

## Read before planning
- CLAUDE.md (section "Data")
- docs/database/schema.sql (all 70 tables)
- docs/database/schema-diagram.html (open in a browser)

## Data
- Owns: every table in schema.sql, created here as migrations.
- Reads only: none
- Schema changes: split schema.sql into ordered migrations; add row-level security (RLS) policies. Record any column change in schema.sql and here.

## In scope
- Migrations for all tables, foreign keys and indexes in schema.sql.
- RLS on every table with `tenant_id`: rows are visible and writable only when `tenant_id` equals the current request's tenant (set per transaction, for example `SET LOCAL app.tenant_id`).
- Platform-wide tables (plans, plan_prices, permissions, platform_*, feature_flags, app_releases, announcements) have no tenant policy; only the server's platform role reads them.
- A database role for the app that cannot bypass RLS, and a separate migration role.
- A server helper that opens a transaction with the tenant set, used by every tenant query.
- Seed data: two shops (Kape Davao and Brew Bros Cebu) with a branch, an owner and a device each; the permission list; the three plans.
- A UUID v7 generator in packages/shared (IDs are created by clients too).

## Out of scope (do not build)
- API endpoints and screens (later modules). Sign-in (Module 03).

## Business rules
- Every tenant query goes through the tenant transaction helper. A query without a tenant set returns no tenant rows.
- Money columns are bigint centavos; stock columns are numeric in base units.
- Nothing important is deleted: no ON DELETE CASCADE from tenants to business data.

## Permissions
- None at this layer beyond database roles.

## Audit
- None yet (Module 04).

## Offline behaviour
- IDs are UUIDs so devices can create rows offline; the database must accept client-supplied IDs.

## Screens
- None.

## Acceptance criteria
- [ ] Migrations run from empty to current and back one step without errors.
- [ ] With tenant A set, selecting from any tenant table returns only tenant A's rows.
- [ ] With tenant A set, inserting a row with tenant B's id fails.
- [ ] With no tenant set, tenant tables return zero rows.
- [ ] Seed data loads and is idempotent (running it twice changes nothing).

## Test cases
- Given seeded shops A and B, when a query for sales runs with tenant A, then no B rows appear, for every tenant table (generate this test from the table list).
- Given the app database role, when it tries `SET row_security = off`, then it is refused.

## Decisions already made
- PostgreSQL 18 (changed from 16 in Module 01). schema.sql was tested on 16: confirm it migrates cleanly on 18, and run CI's database service on 18. Isolation by row-level security on `tenant_id`, not separate databases per shop.
- From Module 01: the database library is Kysely. Migrations are Kysely migrator files in `apps/server/src/db/migrations/`, each with `up` and `down`; RLS policies and roles are raw SQL. Return `bigint` as a TypeScript `number` with the pg type parser in `core/db/client.ts`.
- From Module 01: development runs on Neon, which gives a pooled and a direct connection string. Migrations use the direct one with the migration role; the app role can use the pooled one (`SET LOCAL` works inside a transaction). Make `DATABASE_URL` required in `apps/server/src/env.ts`.
- From Module 01: CI has no database yet. Add a PostgreSQL 18 service to `.github/workflows/ci.yml` for the isolation tests.
- Child tables get `tenant_id`: every table that belongs to a shop but had no `tenant_id` (for example sale_lines, payments, cash_counts, cash_movements, modifiers, recipe_lines, item_branch_settings, supplier_items, purchase_order_lines, goods_receipt_lines, invoice_lines, payment_methods, role_permissions, alert_reads, notification_deliveries) gains `tenant_id uuid NOT NULL` with a foreign key to tenants and an index, and the same tenant policy as every other tenant table. Recorded in schema.sql.
- Receipt and PO numbers are unique per shop only: drop the global `UNIQUE` on `sales.receipt_no` and `purchase_orders.number`; keep `one_receipt_no_per_tenant` and `one_po_number_per_tenant`. Invoice, credit note and ticket numbers stay globally unique (BrewPoint issues them).
- Three database roles: `brewpoint_migrator` owns the tables and runs migrations; `brewpoint_app` is subject to RLS, can only read the shop-visible global tables (plans, plan_prices, permissions, feature_flags, app_releases, announcements) and has no access to `platform_*` tables; `brewpoint_platform` uses the platform tables and gets cross-tenant policies only on the tables BrewPoint runs (tenants, subscriptions, invoices, support tickets, grants and similar). It has no access to shop business data (sales, stock, customers); staff reach that through the tenant transaction after the server checks a grant (Module 18).
- Databases: local development uses the Neon dev child branch (`.env` `DATABASE_URL`). Database tests use a separate Neon `test` branch, which they wipe, migrate and seed on every run. Each branch has the same pair of variables: `MIGRATION_DATABASE_URL` / `MIGRATION_TEST_DATABASE_URL` (owner, direct connection) and `DATABASE_URL` / `TEST_DATABASE_URL` (the `brewpoint_app` login, pooled). The test setup refuses to run if a test URL is empty or points at the dev branch. `.env.production` (gitignored) holds the main branch for the live app later and is never read by tests. Locally, database tests skip with a message when `TEST_DATABASE_URL` is unset; in CI it points at a `postgres:18` service and a missing value fails the build.
- Roles are created by `pnpm db:roles` (`src/db/roles.ts`), not by a migration, because roles belong to the cluster. The owner login gets `brewpoint_migrator` and `brewpoint_platform` with `SET` only (no inheritance). `brewpoint_app`'s password is sent as a SCRAM verifier, never in plain text. Checked on Neon: roles created this way have no `BYPASSRLS`.
- The `tenant_isolation` policy applies to every role, not only `brewpoint_app`, and RLS is forced. So `brewpoint_migrator` (the table owner) is also limited to the tenant set on the transaction: seeds write shop rows through the tenant transaction like the app does. `platform_all` adds cross-shop access for `brewpoint_platform` only.
- Append-only by grant: `audit_log`, `stock_movements` and `tenant_events` (app), `platform_audit_log` and `tenant_events` (platform) get `SELECT, INSERT` only. The platform role can delete only from `platform_role_permissions`.
- Migrations are numbered `0001-…` to `0012-…`; foreign keys, row-level security and grants are each written as a list in their migration so `up` and `down` cannot drift apart. Kysely 0.29 imports the migrator from `kysely/migration`.
- Database types are generated by kysely-codegen into `src/db/types.ts` (interface `DB`, `int8` as `number`, `numeric` as `string`) with `pnpm db:types`; never edited by hand.

## Open questions
- None from Module 01: the migration tool is Kysely (see Decisions already made).

## How to work
1. Read the files above. Ask about anything unclear before planning.
2. Write a plan: files to add or change, migrations, endpoints, components, tests. Wait for approval.
3. Build in this order, stopping after each step for review: migration → server logic and tests → API → screens.
4. Finish with the Definition of Done checklist from CLAUDE.md, ticked.
