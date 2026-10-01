# BrewPoint file structure

How the BrewPoint repository is organized, and the rules that keep it that way as modules are added. Module 01 creates this skeleton; every later module adds to it without changing the pattern.

## The whole repository

```
brewpoint/
├── CLAUDE.md                     rules for every session (read first)
├── docs/
│   ├── design-system/            brand book, tokens, component READMEs and previews
│   ├── database/                 schema.sql, schema-diagram.html
│   ├── modules/                  the 20 module briefs and the template
│   └── architecture/
│       └── file-structure.md     this file
├── apps/
│   ├── server/                   the API: every rule is enforced here
│   ├── backoffice/               shop back-office (owners, managers)
│   ├── pos/                      iPad POS (cashiers), works offline
│   └── console/                  BrewPoint staff console
├── packages/
│   ├── shared/                   code the server and all apps use
│   ├── ui/                       design-system components
│   └── config/                   shared TypeScript, lint and Tailwind settings
├── infra/                        deploy files (development uses a Neon database, see Module 01)
├── tests/
│   └── e2e/                      Playwright smoke tests across the server and apps
├── .github/workflows/            CI: lint, typecheck, unit tests, build, smoke test, secret scan
├── package.json                  workspace root and its scripts
├── pnpm-workspace.yaml           workspace packages and shared tool versions (catalog)
└── turbo.json                    task graph for dev, build, lint, typecheck and test
```

## Server

```
apps/server/src/
├── core/                         shared by every module, built in Modules 02 to 06
│   ├── db/
│   │   ├── tenant-transaction.ts     opens a transaction with app.tenant_id set
│   │   └── client.ts
│   ├── auth/                         sessions, PIN check, staff two-step
│   ├── permissions/
│   │   ├── can.ts                    can(user, code, branchId)
│   │   └── approval.ts               manager-PIN approval helper
│   ├── audit/
│   │   ├── audit.ts                  shop audit_log writer
│   │   └── platform-audit.ts         staff platform_audit_log writer
│   ├── sync/                         push/pull contract, idempotent apply
│   ├── stock/
│   │   └── record-movement.ts        the only way stock changes (FEFO inside)
│   ├── money/                        VAT and discount maths on centavos
│   └── errors.ts                     plain-language error responses
├── modules/                      one folder per module brief
│   ├── shops/                        07 shop setup, branches, settings
│   ├── inventory/                    08 items and ledger, 13 counts, waste, expiry
│   ├── catalog/                      09 categories, products, modifiers, recipes
│   ├── register-sessions/            10
│   ├── sales/                        11 sales, payments, discounts, voids, refunds
│   ├── reports/                      12 dashboard, transactions, reports (read only)
│   ├── purchasing/                   14 suppliers, orders, receiving
│   ├── alerts/                       15 engine, notifications, digest
│   ├── people/                       16 users, roles, devices, audit log screen API
│   ├── billing/                      17 subscriptions, invoices, webhooks
│   │   └── providers/
│   │       ├── provider.ts               the interface
│   │       ├── stripe.ts
│   │       └── manual.ts                 GCash payment link, bank transfer
│   └── platform/                     18 and 19, staff console only
│       ├── shops/
│       ├── support-access/
│       ├── plans/
│       ├── flags/
│       ├── releases/
│       ├── announcements/
│       ├── data-requests/
│       └── tickets/
├── jobs/                         scheduled work: hourly expiry check, daily digest, billing retries
├── db/
│   ├── migrations/               one ordered file per change
│   └── seed/                     two demo shops, permissions, plans
├── app.ts                        builds the Fastify app and mounts each module's routes
├── env.ts                        reads and checks .env at start-up
└── main.ts                       starts the server
```

Outside `src/`, `apps/server/scripts/` holds developer scripts such as `db-check.ts` (`pnpm db:check`), and `tsup.config.ts` bundles the server for production.

Inside every module folder, the same five files:

```
modules/register-sessions/
├── routes.ts                     endpoints; each declares its permission code
├── service.ts                    business rules (expected cash, variance, approval)
├── repository.ts                 database queries, always through tenant-transaction
├── schemas.ts                    input validation for the endpoints
└── register-sessions.test.ts     tests for the rules and the acceptance criteria
```

A module that grows splits `service.ts` by topic (for example `purchasing/orders.service.ts` and `purchasing/receiving.service.ts`), but keeps the same roles.

## Apps

Each app is organized the same way: an `app/` folder for the shell, and a `features/` folder with one folder per module it shows.

```
apps/backoffice/src/
├── app/                          routing, layout, side navigation, sign-in, theme and accent
├── features/
│   ├── dashboard/
│   ├── alerts/
│   ├── transactions/
│   ├── reports/
│   ├── register-sessions/
│   ├── products/
│   ├── inventory/
│   ├── expiry/
│   ├── purchasing/
│   ├── suppliers/
│   ├── people/                   users, roles, devices, audit log
│   ├── subscription/
│   └── settings/
└── lib/api-client.ts             typed calls to the server
```

```
apps/pos/src/
├── app/                          shell, top bar, PIN sign-in, license lock
├── features/
│   ├── selling/                  product grid, cart, modifiers, discounts
│   ├── checkout/                 payment, change, receipt
│   ├── register/                 open, cash in and out, close
│   └── needs-attention/          changes the server rejected
├── offline/
│   ├── local-store.ts            SQLite or IndexedDB
│   ├── outbox.ts                 unsent changes, in order
│   └── sync-client.ts            push and pull
└── printing/                     58 and 80 mm receipt printing
```

```
apps/console/src/
├── app/                          console shell, staff sign-in with two-step
└── features/
    ├── overview/
    ├── shops/
    ├── support-access/
    ├── tickets/
    ├── billing/
    ├── plans/
    ├── flags/
    ├── releases/
    ├── announcements/
    ├── data-requests/
    ├── audit/
    └── staff/
```

Inside a feature folder:

```
features/register-sessions/
├── RegisterSessionsPage.tsx      the screen from the design system
├── CloseOutDrawer.tsx            parts used only by this screen
├── use-register-sessions.ts      data fetching for this feature
└── register-sessions.test.tsx
```

## Packages

```
packages/shared/src/
├── money/format-peso.ts          formatPeso, formatPesoShort
├── units/                        base and pack units, two-unit display
├── ids/uuid-v7.ts
├── contracts/                    request and response types per module, used by server and apps
└── permissions/codes.ts          the permission code list as constants

packages/ui/src/
├── tokens.css                    from the design system
├── components/                   Button, Field, DataTable, Drawer, SideNav, Numpad, Chart…
├── accent/                       deriveAccent, applyAccent
└── icons/

packages/config/
├── tsconfig/                     base, node and react settings every package extends
├── eslint/                       shared lint rules (base, and react for the apps)
└── vite/                         shared Vite settings for the three apps
```

## Rules

1. **New code goes in its module's folder.** Server code for register sessions lives in `modules/register-sessions/`, and its screens in `features/register-sessions/` of each app that shows them.
2. **Shared code moves to `core/` or `packages/` only when two or more modules need it.** Until then it stays in the module.
3. **A module never imports another module's `repository.ts`.** To use another module's data, call its service. This keeps each module's tables owned by that module.
4. **Every tenant query goes through `core/db/tenant-transaction.ts`.** No direct database calls elsewhere.
5. **Stock changes only through `core/stock/record-movement.ts`.**
6. **`packages/ui` has no data fetching and no business rules.** It only renders what it is given.
7. **`packages/shared` has no framework code**, so the server and all apps can use it.
8. **Tests sit next to the code they test**, except the smoke tests that cross apps, which live in `tests/e2e/`. File and folder names are kebab-case; React components are PascalCase.
9. **The staff console's server code lives only under `modules/platform/`**, and its routes use platform permissions and the platform audit writer.

## Why this structure

**It matches how you build.** You work one module brief at a time, and each brief maps to one server folder and one feature folder per app. When you review a session, the changes should sit in those folders plus, at most, a migration. If Claude Code edits another module's folder, that stands out right away.

**The rules that must never be broken live in one place.** Tenant isolation, permission checks, audit logging and the stock ledger each exist once in `core/`. Every module uses them instead of writing its own version. In a POS, one module forgetting to filter by shop or bypassing the stock ledger is a serious bug. Keeping these in one shared place, with rules 4 and 5, makes that hard to do by accident.

**Ownership stays clear as the app grows.** Rule 3 (no reaching into another module's queries) is what keeps "Owns" and "Reads only" in each brief true in the code. Without it, after a few months every module touches every table, and changing one breaks others.

**Organizing by feature beats organizing by file type here.** The common alternative puts all routes in one `routes/` folder, all services in `services/`, and so on. That works for small apps, but a single change then touches five folders far apart. With 20 modules, grouping by feature keeps related code together and makes each session's work easy to find and review.

**Separate apps for separate people.** Cashiers, owners and BrewPoint staff have different screens, sign-ins and security needs. Separate apps keep staff console code out of the shop apps entirely, and let the POS carry its offline and printing code without the web apps paying for it. They still share components through `packages/ui` and rules through `packages/shared`, so the look and the money maths stay identical everywhere.

**It is easy for Claude Code to follow.** A predictable pattern, written down, is the most reliable way to keep many sessions consistent. Each new module only has to copy the shape of the one before it.

## When to change it

The folder names can change in Module 01 if the chosen framework has strong conventions (for example a framework that expects a specific routes folder). Keep the pattern: `core/` for shared rules, one folder per module, one feature folder per screen area. If you change it, update this file and CLAUDE.md in the same session.
