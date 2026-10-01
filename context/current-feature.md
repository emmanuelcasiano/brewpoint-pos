# Current Feature: 01 Project skeleton

## Status

In Progress

## Brief

docs/modules/01-project-skeleton.md

## Goals

- [ ] A fresh clone runs every app and the database with documented commands.
- [x] CI fails on a type error, a lint error or a failing test.
- [x] `formatPeso` tests pass and the function is imported by at least one app.
- [x] No secret values are committed.

## Build steps

- [x] Migration: none (no tables until Module 02)
- [x] Server logic and tests: workspace, shared config, packages/shared with formatPeso and tests
- [x] API: Fastify server with the health endpoint, env validation, Neon connection check
- [x] Screens: three Vite app placeholders, Playwright smoke test, CI, README

## Plan

### Prerequisites (before /feature start)

- Install pnpm: `npm install -g pnpm` (not installed yet). Node 22.14 is fine.
- Create a Neon account and a project: PostgreSQL version **16**, region **AWS Asia Pacific (Singapore)**. Keep its connection string for `.env` in step 3.

### Layout (docs/architecture/file-structure.md)

```
package.json                 workspace root: scripts, packageManager pnpm, engines node >=22
pnpm-workspace.yaml          apps/*, packages/*
turbo.json                   tasks: dev, build, lint, typecheck, test
.nvmrc                       22
.prettierrc.json, .prettierignore
.env.example                 local values; staging and production as placeholders (hosting deferred)
README.md                    setup and commands
playwright.config.ts
tests/e2e/smoke.spec.ts
.github/workflows/ci.yml
infra/                       empty (deploy files later)
apps/server/src/             main.ts, app.ts, app.test.ts, env.ts, core/, modules/, jobs/, db/migrations/, db/seed/
apps/server/scripts/         db-check.ts
apps/backoffice/src/         main.tsx, app/App.tsx, app/index.css, features/
apps/pos/src/                same, plus offline/ and printing/
apps/console/src/            same as backoffice
packages/shared/src/         index.ts, money/format-peso.ts, money/format-peso.test.ts, units/, ids/, contracts/, permissions/
packages/ui/src/             index.ts, components/, accent/, icons/ (empty until Module 05)
packages/config/             tsconfig/{base,react,node}.json, eslint/index.js, vite/app-config.ts
```

Empty folders get a `.gitkeep`. Package names: `@brewpoint/<folder>`.

### How it fits together

- **Internal packages.** `packages/shared` and `packages/ui` export their TypeScript source with no build step. Vite compiles them for the apps; the server runs with tsx in development and is bundled with tsup for production, so shared code is included.
- **TypeScript.** `packages/config/tsconfig/base.json` sets `strict` and `noUncheckedIndexedAccess`; `react.json` and `node.json` extend it. Every package runs `tsc --noEmit` as `typecheck`.
- **Lint and format.** ESLint flat config in `packages/config/eslint` (typescript-eslint type-checked rules, `no-explicit-any` as an error, React hooks rules for the apps). Prettier at the root; `lint` includes `prettier --check`.
- **Environment.** One root `.env`, copied from `.env.example`. The server loads it with Node's `--env-file` and validates it with Zod at start-up, naming any missing variable in plain language. The Vite apps read `VITE_` variables from the root (`envDir`).
- **Database.** `DATABASE_URL` is the Neon connection string. `pnpm db:check` connects with `pg` and prints the server version, failing unless it is PostgreSQL 16. The server does not use the database until Module 02.
- **Tailwind v4.** `@tailwindcss/vite` in each app with `@import "tailwindcss"` only. The token mapping (`@theme inline` over tokens.css) is Module 05. The placeholders use layout and type utilities only, no color classes.
- **Build version.** `packages/config/vite/app-config.ts` injects the package version and the short git commit at build time ("dev" when git is unavailable). Shared by the three apps.
- **Ports.** Server 3000, backoffice 5173, POS 5174, console 5175. All can be changed in `.env`.

### Commands (documented in README.md)

- `pnpm install`, copy `.env.example` to `.env` and paste the Neon connection string, `pnpm db:check`, then `pnpm dev` (server and the three apps through Turborepo)
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:e2e`, `pnpm format`

### Build steps and commits

1. **Migration**: none.
2. **Server logic and tests**: workspace root, Turborepo, `packages/config`, `packages/shared` with `formatPeso` (ported from bundle.js) and its tests, empty `packages/ui`, and the folder skeleton.
   Commit: `feat(skeleton): add workspace, shared config and formatPeso`
3. **API**: `apps/server` with Fastify, env validation, `GET /health` returning 200 `{ status: "ok", version }`, tests using Fastify's `inject`; `pnpm db:check`; `.env.example`.
   Commit: `feat(skeleton): add Fastify server with health endpoint and database check`
4. **Screens**: the three Vite apps, each placeholder showing the app name, the build version and "Workspace check: ₱1,245.00" from `formatPeso`; the Playwright smoke test (Chromium for all apps, plus WebKit at iPad landscape size for the POS); the CI workflow; README.md.
   Commit: `feat(skeleton): add app placeholders, smoke test and CI`

### Endpoints, permissions, audit

- `GET /health`: no sign-in, no permission code (the brief says none yet). No audit entries.

### Screens

- One placeholder page per app. There is no preview.html for these; they are replaced by real screens from Module 05 on.

### Tests, mapped to the brief

| Brief | Test |
|---|---|
| Fresh clone runs every app and the database | README commands; `pnpm db:check` confirms PostgreSQL 16 on Neon; the Playwright smoke test checks health 200 and each placeholder; one manual run from a fresh clone |
| CI fails on a type error, lint error or failing test | CI runs lint, typecheck, test, build and test:e2e; checked once on a scratch branch with one deliberate error of each kind, not merged |
| `formatPeso` tests pass and it is imported by an app | 124500 → "₱1,245.00", -4150 → "-₱41.50", 0 → "₱0.00", plus 5 → "₱0.05", 100000000 → "₱1,000,000.00"; all three apps import it and the smoke test finds "₱1,245.00" in each |
| No secret values are committed | `.gitignore` covers `.env*` except `.env.example`; the Neon connection string exists only in `.env`; a gitleaks secret scan runs in CI |
| Test case: clean checkout, all apps start, health 200 | The smoke test runs in CI from a clean checkout |

CI needs no database in this module; it gets a PostgreSQL 16 service when Module 02 adds tables.

### Definition of Done items that do not apply

- Permission codes, audit log, row-level security test, stock units: nothing in this module touches them. `schema.sql` is unchanged.

## Notes

Out of scope (do not build):
- Database tables (Module 02), sign-in (Module 03), components (Module 05).

Open questions, answered (recorded in the brief's "Decisions already made"):
- POS app shell: web app for now; native shell decided before Modules 06 and 11.
- Server: Fastify. Database library: Kysely.
- Monorepo: pnpm workspaces with Turborepo.
- Tooling: Vite, Vitest, Zod, Tailwind v4, ESLint and Prettier, Playwright.
- Development database: Neon free tier (PostgreSQL 16, Singapore) instead of Docker, because the laptop has 8 GB of RAM. Brief scope and file-structure.md `infra/` line updated.

Verification:
- CI run 36798084743 passed on the screens commit, including the Playwright smoke test and the gitleaks scan.
- CI fails as required: throwaway branches with one error each failed at the expected step (lint: run 36799229521, typecheck: 36799233826, test: 36799239685). The branches were deleted.
- Still to verify: `pnpm db:check` against Neon (goal 1, database part).

For Module 02: Neon gives a pooled and a direct connection string. Migrations should use the direct one; the app role can use the pooled one (`SET LOCAL` works inside a transaction).

Still open:
- Hosting: deferred. Staging and production stay placeholders in `.env.example`. Remind before the first deploy.

## History
