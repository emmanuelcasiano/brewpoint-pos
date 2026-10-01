# BrewPoint

Multi-tenant, offline-first point of sale for small coffee shops in the Philippines. One repository holds the API, the shop back-office, the iPad POS and the BrewPoint staff console.

## What you need

- Node.js 22 (see `.nvmrc`)
- pnpm 12: `npm install -g pnpm`
- A Neon project running PostgreSQL 18, with a development branch and a separate test branch

## Set up a fresh clone

```bash
pnpm install
cp .env.example .env        # then fill in the two MIGRATION_ connection strings (see .env.example)
pnpm db:roles               # creates the database roles; prints DATABASE_URL to paste into .env
pnpm db:roles --test        # the same for the test branch; prints TEST_DATABASE_URL
pnpm db:migrate             # builds every table on the development branch
pnpm db:check               # confirms the database answers and runs PostgreSQL 18
pnpm dev                    # starts the server and all three apps
```

The database has three roles. `brewpoint_migrator` owns the tables and runs migrations. `brewpoint_app` is the server's login; row-level security limits it to one shop per transaction. `brewpoint_platform` is for the staff console. Each Neon branch has two connection strings in `.env`: a `MIGRATION_` one (the owner, direct connection) and a plain one (the app, pooled connection).

| App           | Folder            | Address                      |
| ------------- | ----------------- | ---------------------------- |
| Server (API)  | `apps/server`     | http://127.0.0.1:3000/health |
| Back-office   | `apps/backoffice` | http://127.0.0.1:5173        |
| POS           | `apps/pos`        | http://127.0.0.1:5174        |
| Staff console | `apps/console`    | http://127.0.0.1:5175        |

## Commands

| Command                | What it does                                                               |
| ---------------------- | -------------------------------------------------------------------------- |
| `pnpm dev`             | Runs the server and the three apps with live reload                        |
| `pnpm lint`            | ESLint in every package, then the Prettier check                           |
| `pnpm typecheck`       | TypeScript in every package                                                |
| `pnpm test`            | Unit tests (Vitest)                                                        |
| `pnpm build`           | Production builds                                                          |
| `pnpm test:e2e`        | Builds, then runs the Playwright smoke test against the builds             |
| `pnpm format`          | Formats every file with Prettier                                           |
| `pnpm db:check`        | Checks the database connection in `.env`                                   |
| `pnpm db:roles`        | Creates the database roles; `--test` for the test branch, `--new-password` |
| `pnpm db:migrate`      | Runs every pending migration                                               |
| `pnpm db:migrate:down` | Rolls back the last migration                                              |
| `pnpm db:types`        | Regenerates `apps/server/src/db/types.ts` from the migrated database       |

Before the first `pnpm test:e2e`, install the test browsers once: `pnpm exec playwright install chromium webkit`.

CI runs lint, typecheck, unit tests, the build, the smoke test and a secret scan on every push and pull request.

## Where things are

- `CLAUDE.md`: the rules every change follows
- `docs/modules/`: the 20 module briefs, built in order
- `docs/architecture/file-structure.md`: where code goes
- `docs/design-system/`: the brand book, tokens and component references
- `docs/database/schema.sql`: the PostgreSQL schema
