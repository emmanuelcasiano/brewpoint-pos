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
- PostgreSQL 16 for development on Neon (free tier, Singapore region); the connection string lives in `.env`, never in the repository.
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
- POS app shell: the POS starts as a web app (runs in the browser at iPad size). The native shell (Capacitor or React Native) is decided later, before Module 06 picks the local store and Module 11 needs Bluetooth printing. Build the POS so a native shell can wrap it without a rewrite. (A plain web app in Safari cannot talk to Bluetooth receipt printers on iPad; Capacitor is the recommendation when this is decided.)
- Server framework: Fastify, with each module's `routes.ts` as a Fastify plugin and Zod schemas for route validation.
- Database library: Kysely. Its migrator runs migrations up and down (Module 02's "back one step"); raw SQL is used for RLS policies; `bigint` is returned as a TypeScript `number` via the pg type parser.
- Monorepo: pnpm workspaces with Turborepo.
- Web apps: Vite with React and TypeScript, one app per folder in `apps/`.
- Development database: Neon free tier, PostgreSQL 16, Singapore region, instead of Docker Compose (the development laptop has 8 GB of RAM). CI runs its own PostgreSQL 16 service. This does not decide production hosting.
- Tooling: Vitest (unit tests), Zod (validation), Tailwind v4 (CSS-based config, `@theme inline` over tokens.css), ESLint and Prettier (lint and format), Playwright (end-to-end smoke test).
- TypeScript 6.0, not 7: typescript-eslint's type-aware rules support TypeScript below 6.1. Versions of shared tools (TypeScript, ESLint, Vitest) live once in the pnpm catalog in `pnpm-workspace.yaml`. Keep pnpm's minimum release age guard; don't add exclusions to get around it.

## Open questions
- **Hosting.** Where the server and database run (for example a managed PostgreSQL in Singapore for latency to the Philippines). Deferred: staging and production values stay placeholders in `.env.example`. Raise it again before the first deploy.

## How to work
1. Read the files above. Ask about anything unclear before planning.
2. Write a plan: files to add or change, migrations, endpoints, components, tests. Wait for approval.
3. Build in this order, stopping after each step for review: migration → server logic and tests → API → screens.
4. Finish with the Definition of Done checklist from CLAUDE.md, ticked.
