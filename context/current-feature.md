# Current Feature: 02 Database and tenant isolation

## Status

In Progress

## Brief

docs/modules/02-database-and-tenancy.md

## Goals

- [ ] Migrations run from empty to current and back one step without errors.
- [ ] With tenant A set, selecting from any tenant table returns only tenant A's rows.
- [ ] With tenant A set, inserting a row with tenant B's id fails.
- [ ] With no tenant set, tenant tables return zero rows.
- [ ] Seed data loads and is idempotent (running it twice changes nothing).

## Build steps

- [x] Migration: role bootstrap script, 12 migrations, migrate scripts, generated DB types, schema.sql, diagram and doc updates
- [x] Server logic and tests: db client, tenant transaction, uuid v7, permission codes, seeds, test database harness, RLS and migration tests, CI database
- API: none (out of scope)
- Screens: none (out of scope)

## Plan

### Connections and roles

Three database roles, created by a bootstrap script (roles belong to the whole PostgreSQL cluster, not to one schema, so they are not in a migration):

| Role | Login | What it can do |
|---|---|---|
| `brewpoint_migrator` | No (`SET ROLE` from the owner login) | Owns every table. The migrate and seed scripts connect as the owner login (`neondb_owner` on Neon, `postgres` in CI) and `SET ROLE brewpoint_migrator`, so table ownership is the same in every environment. |
| `brewpoint_app` | Yes, password set by `pnpm db:roles` | The server at runtime. `NOBYPASSRLS`, not a table owner, so RLS always applies. Cannot `SET ROLE` to anything else. |
| `brewpoint_platform` | Not yet (login and URL come in Module 18) | Platform tables, plus cross-tenant read and write on the tables BrewPoint runs. |

Environment variables (`.env`, gitignored):

| Variable | Role and endpoint | Used by |
|---|---|---|
| `DATABASE_URL` | `brewpoint_app` on the dev branch, pooled | The server (required in `env.ts` from this module) |
| `MIGRATION_DATABASE_URL` | `neondb_owner` on the dev branch, direct (no `-pooler`) | `db:roles`, `db:migrate`, `db:migrate:down`, `db:seed`, `db:types` |
| `TEST_DATABASE_URL` | `brewpoint_app` on the test branch, pooled | Database tests: every isolation check runs through this real app login |
| `MIGRATION_TEST_DATABASE_URL` | `neondb_owner` on the test branch, direct (no `-pooler`) | Database tests: wipe, roles, migrate and seed before the run |

Each branch has the same pair: `MIGRATION_` = owner, direct; plain = app, pooled. Direct connections for migrations because they use session settings (`SET ROLE`), which a transaction-mode pooler does not keep. `pnpm db:roles` prints `DATABASE_URL`; `pnpm db:roles --test` (run against `MIGRATION_TEST_DATABASE_URL`) prints `TEST_DATABASE_URL`. `.env.example` documents all four; `.env.production` is not touched.

### Schema changes (recorded in schema.sql and the brief)

- `tenant_id uuid NOT NULL` + FK to tenants + index added to the 24 child tables: role_permissions, invoice_lines, payment_methods, cash_counts, cash_movements, sale_lines, sale_line_modifiers, sale_discounts, payments, refunds, refund_lines, modifiers, product_modifier_groups, recipe_lines, modifier_recipe_lines, item_branch_settings, stock_count_lines, supplier_items, purchase_order_lines, goods_receipt_lines, alert_reads, notification_deliveries, announcement_reads, support_ticket_messages. 157 → 181 foreign keys.
- Global `UNIQUE` removed from `sales.receipt_no` and `purchase_orders.number` (per-tenant unique indexes stay).
- Primary key defaults: `uuidv7()` (built into PostgreSQL 18) instead of `gen_random_uuid()`; `CREATE EXTENSION pgcrypto` removed. Clients still send their own IDs.
- No `ON DELETE CASCADE` anywhere (as today).
- Unchanged on purpose: per-base-unit costs (`item_branch_settings.avg_cost`, `last_cost`, `batches.unit_cost`) stay `numeric` because they can be fractions of a centavo; stock stays `numeric`. `numeric` comes back from the driver as a string; Module 08 decides how it is read.

Table classes (every one of the 70 tables is in exactly one, checked by a test):

- **Tenant tables (57)**: every table with `tenant_id` except `payment_events`. Policy `tenant_isolation` for `brewpoint_app`: `USING (tenant_id = app_current_tenant()) WITH CHECK (same)`. RLS enabled and forced.
- **`tenants`**: same policy on `id`. The app can insert a tenant only with `app.tenant_id` set to the new id (sign-up in Module 07), and can never see another.
- **Platform-run tenant tables** (also get policy `platform_all` for `brewpoint_platform`, `USING (true)`): tenants, subscriptions, invoices, invoice_lines, billing_customers, payment_methods, credit_notes, support_access_grants, tenant_events, data_requests, tenant_feature_overrides, device_error_reports, support_tickets, support_ticket_messages, and `payment_events` (nullable tenant_id: the app sees only its own rows; webhooks with no shop yet are platform-only).
- **Global, shop-readable** (no RLS; app `SELECT` only, platform full): plans, plan_prices, permissions, feature_flags, app_releases, announcements.
- **Platform-only** (no RLS; no app grant at all): platform_users, platform_roles, platform_permissions, platform_role_permissions, platform_audit_log.

`app_current_tenant()` returns `nullif(current_setting('app.tenant_id', true), '')::uuid`, so with no tenant set every policy compares to NULL and returns zero rows instead of an error.

Grants for `brewpoint_app` on tenant tables: `SELECT, INSERT, UPDATE`. `DELETE` only on tables where removing a row is normal editing: role_permissions, user_assignments, product_modifier_groups, recipe_lines, modifier_recipe_lines, supplier_items, pairing_codes, purchase_order_lines. Append-only: `audit_log` and `stock_movements` get `SELECT, INSERT` only (and `platform_audit_log` the same for the platform role). Later modules add a grant by migration if they need one.

### Migrations (`apps/server/src/db/migrations/`, Kysely, each with `up` and `down`, raw SQL)

1. `0001-shops-people-access.ts`: tenants, branches, users, roles, permissions, role_permissions, user_assignments, devices, pairing_codes
2. `0002-billing.ts`: plans, plan_prices, subscriptions, invoices, invoice_lines, billing_customers, payment_methods, payment_events, credit_notes
3. `0003-sales-cash.ts`: register_sessions, cash_counts, cash_movements, sales, sale_lines, sale_line_modifiers, sale_discounts, payments, refunds, refund_lines, discount_rules, tenant_payment_methods
4. `0004-menu.ts`: categories, products, modifier_groups, modifiers, product_modifier_groups, recipe_lines, modifier_recipe_lines
5. `0005-inventory.ts`: inventory_items, item_branch_settings, batches, stock_movements, stock_counts, stock_count_lines
6. `0006-purchasing.ts`: suppliers, supplier_items, purchase_orders, purchase_order_lines, goods_receipts, goods_receipt_lines
7. `0007-alerts-audit.ts`: alerts, alert_reads, notification_settings, notification_deliveries, audit_log
8. `0008-platform.ts`: the 16 staff console tables
9. `0009-foreign-keys.ts`: all 181 foreign keys (down drops them by their default names)
10. `0010-rule-indexes.ts`: one_open_alert, one_receipt_no_per_tenant, one_po_number_per_tenant, one_billing_customer_per_provider, one_price_version, active_support_grants, batches_fefo
11. `0011-row-level-security.ts`: `app_current_tenant()`, enable + force RLS, the policies above
12. `0012-role-grants.ts`: schema usage and table grants above

### Files

Server (`apps/server/`):
- `scripts/db-roles.ts` (`pnpm db:roles`, `pnpm db:roles --test`): idempotent. Creates the three roles if missing, grants `brewpoint_migrator` to the owner login (`SET` only) and `CREATE` on schema public to it. Sets a new random password on `brewpoint_app` when it has none or `--new-password` is passed, and prints the pooled app URL to paste into `.env` (`DATABASE_URL`, or `TEST_DATABASE_URL` with `--test`, which connects with `MIGRATION_TEST_DATABASE_URL`).
- `scripts/db-migrate.ts` (`pnpm db:migrate`, `pnpm db:migrate:down` for one step back): Kysely `Migrator` with `FileMigrationProvider`, as `brewpoint_migrator`, plain-language output per migration.
- `scripts/db-seed.ts` (`pnpm db:seed`): reference seed always; demo seed only when `APP_ENV=local` or `--demo`.
- `src/core/db/client.ts`: `createDb(url)` returns `Kysely<Database>` on a `pg` Pool. The int8 type parser returns `number` and throws if the value is outside `Number.MAX_SAFE_INTEGER`.
- `src/core/db/tenant-transaction.ts`: `withTenant(db, tenantId, fn)` opens a transaction, runs `select set_config('app.tenant_id', $1, true)` (the parameterised form of `SET LOCAL`), then `fn(trx)`. Rejects a tenantId that is not a UUID before touching the database.
- `src/db/types.ts`: generated by `pnpm db:types` (kysely-codegen against the migrated database, `int8 → number`); committed, not edited by hand.
- `src/db/seed/reference.ts`: permissions from `@brewpoint/shared` (upsert label and group); plans and plan_prices with fixed UUIDs (`ON CONFLICT DO NOTHING`, so a price a shop pays is never rewritten). Plans from the ConsolePlansScreen preview: Starter v1 ₱699 (1 branch, 1 device, 3 users), Growth v1 ₱1,299 (Jan 5 to Jul 31, 2026) and v2 ₱1,499 (from Aug 1, 2026) (2 branches, 3 devices, 10 users), Multi-branch v1 ₱3,499 (10 branches, 15 devices, unlimited users). Yearly = 10 × monthly ("2 months free").
- `src/db/seed/demo.ts`: Kape Davao and Brew Bros Cebu, each with one branch, one owner user (`status active`, no password, PIN or role yet; those come in Modules 03 and 04) and one device T1. Fixed UUIDs, written through `withTenant`, `ON CONFLICT DO NOTHING`.
- `src/db/test-database.ts`: test helpers. Refuses to run when either test URL is empty, or when either points at the same Neon endpoint (ignoring `-pooler`) and database as `DATABASE_URL` or `MIGRATION_DATABASE_URL`. With `MIGRATION_TEST_DATABASE_URL` it resets the schema, runs the role bootstrap and migrations, and sets `brewpoint_app`'s password to the one in `TEST_DATABASE_URL`; tests then connect as the app through `TEST_DATABASE_URL`, and as the platform role via `SET ROLE` on the owner connection.
- `src/db/fixtures.ts` (test only): builds one valid row per table per tenant from the live catalog (`information_schema` + foreign keys, topologically ordered), so the RLS test covers every table without a hand-written fixture each.
- `vitest.config.ts`: loads `.env` for tests (not `.env.production`), runs database test files one at a time.
- `env.ts`: `DATABASE_URL` required; `env.test.ts` updated.
- `package.json`: add `kysely`, `kysely-codegen` (dev); new scripts above.

Shared (`packages/shared/src/`):
- `ids/uuid-v7.ts`: `uuidv7()` per RFC 9562 using `crypto.getRandomValues` (works in Node and browsers), monotonic within the same millisecond. Exported from `index.ts`.
- `permissions/codes.ts`: every permission code from the PermissionMatrix preview (`sale.create` … `user.manage`) with group and label, plus `inventory.alerts.view` and `inventory.alerts.settings`, as constants. Module 04 builds roles on this list.

Root and CI:
- `package.json`: `db:roles`, `db:migrate`, `db:migrate:down`, `db:seed`, `db:types` proxy to the server.
- `turbo.json`: `test` task gets `env: ["TEST_DATABASE_URL", "MIGRATION_TEST_DATABASE_URL", "CI"]`.
- `.github/workflows/ci.yml`: `postgres:18` service; `MIGRATION_TEST_DATABASE_URL` as the `postgres` superuser, `TEST_DATABASE_URL` and `DATABASE_URL` as `brewpoint_app` with a CI-only password (the harness sets it). In CI (`CI=true`) a missing test URL fails the run; locally the database tests skip with a message.
- `.env.example`: the four variables with instructions.

Docs:
- `docs/database/schema.sql`: header to PostgreSQL 18, the schema changes, RLS function, policies, grants and roles as a commented section.
- `docs/database/schema-diagram.html`: add `tenant_id uuid fk:tenants` to the 24 tables.
- `CLAUDE.md` docs table: "70 tables, 181 foreign keys, row-level security (PostgreSQL 18)". `README.md`: the new db scripts and variables.
- Brief: "Decisions already made" for the choices above.

### Endpoints, audit, screens

None (out of scope). No audit writes (Module 04).

### Tests

| Test | File | Covers |
|---|---|---|
| Migrate from empty to latest, down one step, up again; then all the way down to empty and up (every `down` works) | `src/db/migrations.test.ts` | AC 1 |
| Every table is in exactly one class; every table with `tenant_id` has RLS enabled and forced and a `tenant_isolation` policy | `src/db/rls.test.ts` | Guards new tables |
| For every tenant table (generated from the table list): with tenant A set, rows exist and all have tenant A; none of B's appear | `src/db/rls.test.ts` | AC 2, test case 1 |
| For every tenant table: with tenant A set, inserting a row with tenant B's id fails with the RLS error; updating a row's tenant_id to B fails | `src/db/rls.test.ts` | AC 3 |
| For every tenant table: with no tenant set, zero rows | `src/db/rls.test.ts` | AC 4 |
| App role: `SET row_security = off` then a query on sales is refused; it cannot `ALTER TABLE ... DISABLE ROW LEVEL SECURITY`, cannot `SET ROLE brewpoint_migrator`, has no `BYPASSRLS` | `src/db/rls.test.ts` | Test case 2 |
| App role: no access to platform_users; can read plans; cannot update or delete audit_log or stock_movements | `src/db/rls.test.ts` | Grants |
| Platform role: sees both shops' subscriptions and invoices; permission denied on sales | `src/db/rls.test.ts` | Role design |
| Seed twice: row counts and row contents identical | `src/db/seed/seed.test.ts` | AC 5 |
| `withTenant` sets the tenant only inside the transaction (gone after commit and after rollback); rejects a non-UUID | `src/core/db/tenant-transaction.test.ts` | Helper |
| int8 parser returns numbers and throws past the safe range | `src/core/db/client.test.ts` | Money as number |
| uuidv7: format, version 7 and variant bits, timestamp, sort order within the same millisecond, 10,000 unique | `packages/shared/src/ids/uuid-v7.test.ts` | Client IDs |
| Test guard refuses when either test URL is empty or points at the dev branch (pooled or direct) | `src/db/test-database.test.ts` | Protects dev data |

### Risks to check during the build

- On Neon, granting `brewpoint_migrator` to `neondb_owner` and `SET ROLE` to it. Fallback: migrations run as the owner login directly (tables owned by it); the app role is unaffected.
- That a SQL-created role logs in through Neon's pooler. Fallback: the app uses the direct URL until hosting is decided.
- Neon round trips from the Philippines make the migration test slow; it runs once per test run, in one transaction.

### Noted for later, not built here

- Foreign keys ignore RLS, so a row could reference another shop's row by id. Composite `(tenant_id, id)` keys would stop this: Module 20 hardening.
- `users.email` is unique across shops and sign-in looks it up before a tenant is known: Module 03 needs a lookup path (for example a `SECURITY DEFINER` function).

## Notes

Out of scope (do not build):
- API endpoints and screens (later modules). Sign-in (Module 03).

Open questions from the brief:
- None from Module 01: the migration tool is Kysely (see Decisions already made).

Answered at load (recorded in the brief's Decisions already made):
- Child tables without tenant_id get tenant_id NOT NULL + FK + index and the same tenant policy.
- receipt_no and PO number unique per shop only (drop the global UNIQUE).
- Three roles: brewpoint_migrator, brewpoint_app (RLS), brewpoint_platform (platform tables plus cross-tenant policies on BrewPoint-run tables only).
- Dev uses the Neon dev branch (.env DATABASE_URL); DB tests use a separate Neon test branch (MIGRATION_TEST_DATABASE_URL owner/direct + TEST_DATABASE_URL app/pooled, wiped each run, guarded against pointing at dev); .env.production (main branch) is never read by tests. CI points TEST_DATABASE_URL at a postgres:18 service.
- Test branch checked 2026-10-02: reachable, PostgreSQL 18.6, empty, different endpoint from dev.

## History

2026-10-02 - 01 Project skeleton - pnpm and Turborepo monorepo: Fastify server with /health, .env check and `pnpm db:check`; Vite, React and Tailwind v4 placeholders for back-office, POS and console; `formatPeso` in packages/shared with tests; Playwright smoke test; GitHub Actions CI with a gitleaks scan. Decisions: Kysely, TypeScript 6.0, Neon PostgreSQL 18 for development, POS as a web app for now, hosting deferred.

---
