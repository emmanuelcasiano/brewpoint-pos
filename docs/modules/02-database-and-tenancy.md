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
- PostgreSQL 16. Isolation by row-level security on `tenant_id`, not separate databases per shop.

## Open questions
- Migration tool (follows the Module 01 choice).

## How to work
1. Read the files above. Ask about anything unclear before planning.
2. Write a plan: files to add or change, migrations, endpoints, components, tests. Wait for approval.
3. Build in this order, stopping after each step for review: migration → server logic and tests → API → screens.
4. Finish with the Definition of Done checklist from CLAUDE.md, ticked.
