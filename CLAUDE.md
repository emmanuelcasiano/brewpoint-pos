# BrewPoint

Multi-tenant, offline-first point of sale for small coffee shops in the Philippines. Three surfaces:

- **POS**: a landscape iPad at the counter. Cashier-facing, big touch targets, keeps selling with no internet.
- **Back-office**: a desktop web app for owners and managers. Dashboard, reports, inventory, purchasing, people, settings.
- **Staff console**: BrewPoint's own admin app for the team that runs the product (superadmin, support, billing, engineering). A separate app with its own sign-in (`platform_users`).

Stack: React, TypeScript and Tailwind on the web; PostgreSQL on the server. Subscription billing: Stripe for now, behind a provider-neutral layer so PayMongo or Xendit can be added later.

## What is in `docs/`

| Path | What it is | Read it when |
|---|---|---|
| `docs/design-system/README.md` | The brand book: writing rules, color, type, spacing, layout, icons | Before building any UI |
| `docs/design-system/tokens.json` | Every design token (both themes: Daylight and Night shift) | Setting up Tailwind or CSS variables |
| `docs/design-system/tokens.css` | The same tokens as CSS variables, generated from tokens.json | Import it once at the app root |
| `docs/design-system/components/bundle.css` | Reference styles for every `bp-` class | Porting a component |
| `docs/design-system/components/bundle.js` | Reference helpers: `formatPeso`, `deriveAccent`, `chart`, `icon`, `sidenav` | Porting helpers to TypeScript |
| `docs/design-system/components/index.d.ts` | Types for those helpers | Porting helpers |
| `docs/design-system/components/<Name>/README.md` | Rules for one component or screen | Building that component or screen |
| `docs/design-system/components/<Name>/preview.html` | The reference markup for it | Building that component or screen |
| `docs/design-system/previews/<Name>.html` | The same preview as a standalone page (open it in a browser) | Checking what it should look like |
| `docs/design-system/guidelines/*.md` | Layout and touch, offline and license states, per-shop accent, stock alerts, purchasing, staff console | Building those features |
| `docs/database/schema.sql` | PostgreSQL 18 schema: 70 tables, 181 foreign keys, key indexes, row-level security, roles and grants (built by the migrations in `apps/server/src/db/migrations/`) | Writing migrations or queries |
| `docs/database/schema-diagram.html` | Interactive diagram of every table, column and relation | Understanding how tables connect |
| `docs/architecture/file-structure.md` | Where code goes, and the rules that keep modules separate | Before creating any file |
| `docs/modules/README.md` | The build order: 20 modules, each with a brief | Before starting any work |
| `docs/modules/<nn>-<name>.md` | The brief for one module: scope, data, rules, acceptance criteria | When building that module |

The screens in the design system (all under `components/`): Dashboard, AlertsScreen, TransactionsScreen, ReportView, RegisterSessionsScreen, ProductsScreen, InventoryScreen, ExpiryScreen, PurchaseOrdersScreen, PurchaseOrderEditScreen, ReceiveDeliveryScreen, SuppliersScreen, UsersScreen, DevicesScreen, AuditLogScreen, SubscriptionScreen, SettingsScreen. POS components: ProductTile, CartLine, Numpad, PinPrompt, Receipt, Navigation (top bar). Staff console screens (prefix `Console`): Overview, Shops, ShopDetail, SupportAccess, Tickets, Billing, Plans, Flags, Releases, Announcements, DataRequests, Audit, Staff.

## Context Files

Read the following to get the additional context of the project. When one of them disagrees with this file, a module brief or docs/architecture/file-structure.md, those win:

- @context/coding-standards.md
- @context/ai-interaction.md
- @context/current-feature.md

## Rules that apply everywhere

### Money, time, units
- Money is **integer centavos** everywhere (DB `bigint`, TS `number`). Turn it into text only with `formatPeso` (`124500` → `₱1,245.00`). Never use floats for money.
- Times are 12-hour Asia/Manila ("3:05 PM"). Dates are "Sep 27, 2026" in the UI and `2026-09-27` on receipts.
- Stock is stored in the item's base unit (ml, g, pc) and always shown in both units: "4.75 boxes (4,750 ml)".

### Data
- Every business table has `tenant_id`. Every query filters on it. Never return another tenant's rows.
- IDs are UUIDs created on the device (uuid v7 preferred), so a register can create sales offline.
- Device-written rows carry `device_id`, `client_created_at` (when it happened) and `synced_at` (when the server got it).
- Stock never changes directly. Every change (sale, receipt, adjustment, waste, count) inserts a `stock_movements` row; `item_branch_settings.on_hand` is the cached total, updated in the same transaction.
- Sales take stock from the batch that expires first (FEFO).
- Nothing important is deleted: void, cancel, deactivate, revoke. `audit_log` is append-only and written for every sensitive action.
- Staff are `platform_users`, never shop `users`. Staff see inside a shop (sales, stock, customers) only while an approved, active `support_access_grants` row exists; enforce this on the server. Every staff action writes `platform_audit_log`; actions that change a shop also write `tenant_events`.
- Billing: webhooks land in `payment_events` first (unique `provider_event_id`, so each is processed once), then update `invoices`. Prices are versions in `plan_prices`; never edit a price a shop already pays. Shops paying with GCash get a monthly invoice with `payment_link_url`.
- Permission codes live in the `permissions` table (for example `sale.void.approve`, `purchase.approve`, `inventory.receive`). Check them on the server, not only in the UI.

### UI
- Use the tokens, never hex values, in components. Themes switch with `data-theme` on `<html>`; the per-shop accent is set at runtime with `deriveAccent`/`applyAccent` (see `guidelines/30-per-shop-accent.md`).
- Map Tailwind colors, spacing and radii to the CSS variables (`colors: { surface: 'var(--surface)', ... }`) so themes and accents switch without a rebuild.
- Port each `bp-` class to a React component that keeps the class names, states and rules in its README.
- Sentence case, no exclamation marks, no emoji. Buttons name their result ("Receive 66 items", "Void sale"), never "OK" or "Submit".
- Status is always an icon and a word, never color alone. Offline is neutral, never red.
- POS controls are at least 56px tall (numpad and Pay 72px); back-office controls at least 44px.
- Charts: bar for time buckets, line for trends with a dashed comparison, ranked bars for top-N. Never pie, donut or two y-axes. Every chart has a table view.

## How work is done here

BrewPoint is built one module at a time, in the order in `docs/modules/README.md`. Each session works on one module brief only.

1. Read this file and the module brief. Ask about anything unclear before planning.
2. Write a plan (files, migrations, endpoints, components, tests) and wait for approval. Do not write code before the plan is approved.
3. Build in this order, stopping after each step for review: migration, server logic with tests, API, screens.
4. Put code where `docs/architecture/file-structure.md` says: one server folder per module, one feature folder per app, shared rules only in `core/` and `packages/`.
5. Do not build anything listed under "Out of scope" in the brief, and do not change tables owned by another module without asking.
6. When a decision is made during the session, add it to the brief's "Decisions already made".

The `/feature` skill runs these steps: `load` (step 1), `plan` (step 2), `start` once per build step with a commit after each approved step (step 3), then `test`, `review` (Definition of Done) and `complete`.

## Definition of Done (every module)

- [ ] Every acceptance criterion in the brief passes, with automated tests where possible.
- [ ] Every write endpoint declares and checks its permission code on the server.
- [ ] Sensitive actions write audit_log (shop) or platform_audit_log (staff) with a real-value sentence.
- [ ] Tenant isolation holds: the module's tables are covered by the row-level security test.
- [ ] Screens match their preview.html in both themes, with empty, loading, error and (on the POS) offline states.
- [ ] Money is centavos and shown with formatPeso; stock shows both units.
- [ ] Type-check, lint and tests pass in CI.
- [ ] schema.sql and the module brief are updated if anything changed.

When a screen's README and this file disagree, the README wins for that screen; ask before changing a rule here.
