# Module 01: Project skeleton

## Goal
One repository that holds every BrewPoint app, builds and tests on every change, and runs locally with one command. Nothing user-facing yet beyond a placeholder page per app.

## Depends on (already built)
- Nothing.

## Read before planning
- CLAUDE.md
- docs/design-system/README.md (section "Building in the codebase")
- docs/design-system/guidelines/20-offline-and-license-states.md (to understand why the POS app is special)
- docs/architecture/file-structure.md (create exactly this skeleton, with empty core/ and modules/ folders)

## Data
- Owns: none
- Reads only: none
- Schema changes: none

## In scope
- Repository layout with these packages:
  - `apps/server`: the API (TypeScript)
  - `apps/backoffice`: shop back-office web app (React, TypeScript, Tailwind)
  - `apps/pos`: the iPad POS app (React, TypeScript, Tailwind)
  - `apps/console`: the staff console web app (React, TypeScript, Tailwind)
  - `packages/shared`: types, `formatPeso`, validation schemas shared by server and apps
  - `packages/ui`: the design-system components (filled in Module 05)
- Local PostgreSQL 16 via Docker Compose.
- Lint, format, type-check and unit test commands that run for every package.
- CI that runs those on every push and pull request.
- Environment configuration (`.env.example`, no secrets committed) for local, staging and production.
- One end-to-end smoke test: the server's health endpoint answers and each app renders its placeholder.

## Out of scope (do not build)
- Database tables (Module 02), sign-in (Module 03), components (Module 05).

## Business rules
- TypeScript strict mode everywhere.
- `formatPeso` lives in `packages/shared` with tests: 124500 → "₱1,245.00", -4150 → "-₱41.50", 0 → "₱0.00".

## Permissions
- None yet.

## Audit
- None yet.

## Offline behaviour
- None yet. The POS app choice below must support offline storage and Bluetooth receipt printers.

## Screens
- A placeholder page per app showing the app name and build version.

## Acceptance criteria
- [ ] A fresh clone runs every app and the database with documented commands.
- [ ] CI fails on a type error, a lint error or a failing test.
- [ ] `formatPeso` tests pass and the function is imported by at least one app.
- [ ] No secret values are committed.

## Test cases
- Given a clean checkout, when running the documented setup, then all apps start and the health check returns 200.

## Decisions already made
- Web apps: React, TypeScript, Tailwind. Database: PostgreSQL. Billing provider later: Stripe.

## Open questions (decide before planning)
- **POS app shell.** A plain web app (PWA) in Safari cannot talk to Bluetooth receipt printers on iPad. Options: Capacitor (web app inside a native shell, keeps React code, has printer plugins) or React Native. Recommendation: Capacitor, so the POS shares components with the web apps.
- **Server framework.** For example Fastify or NestJS with a query builder or ORM that supports PostgreSQL row-level security (Drizzle, Kysely or Prisma with RLS). It must return `bigint` money as a TypeScript `number` and support running migrations back one step (Module 02). Pick one and record it here.
- **Monorepo tool.** pnpm workspaces alone, or with Turborepo.
- **Tooling.** Preferred: Vitest (tests), Zod (validation), Tailwind v4 (CSS-based config, `@theme inline` over tokens.css), pnpm (workspaces). Confirm in planning and move to "Decisions already made".
- **Hosting.** Where the server and database run (for example a managed PostgreSQL in Singapore for latency to the Philippines).

## How to work
1. Read the files above. Ask about anything unclear before planning.
2. Write a plan: files to add or change, migrations, endpoints, components, tests. Wait for approval.
3. Build in this order, stopping after each step for review: migration → server logic and tests → API → screens.
4. Finish with the Definition of Done checklist from CLAUDE.md, ticked.
