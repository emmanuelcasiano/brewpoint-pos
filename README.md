# BrewPoint

Multi-tenant, offline-first point of sale for small coffee shops in the Philippines. One repository holds the API, the shop back-office, the iPad POS and the BrewPoint staff console.

## What you need

- Node.js 22 (see `.nvmrc`)
- pnpm 12: `npm install -g pnpm`
- A Neon project running PostgreSQL 18

## Set up a fresh clone

```bash
pnpm install
cp .env.example .env        # then paste your Neon connection string as DATABASE_URL
pnpm db:check               # confirms the database answers and runs PostgreSQL 18
pnpm dev                    # starts the server and all three apps
```

| App           | Folder            | Address                      |
| ------------- | ----------------- | ---------------------------- |
| Server (API)  | `apps/server`     | http://127.0.0.1:3000/health |
| Back-office   | `apps/backoffice` | http://127.0.0.1:5173        |
| POS           | `apps/pos`        | http://127.0.0.1:5174        |
| Staff console | `apps/console`    | http://127.0.0.1:5175        |

## Commands

| Command          | What it does                                                   |
| ---------------- | -------------------------------------------------------------- |
| `pnpm dev`       | Runs the server and the three apps with live reload            |
| `pnpm lint`      | ESLint in every package, then the Prettier check               |
| `pnpm typecheck` | TypeScript in every package                                    |
| `pnpm test`      | Unit tests (Vitest)                                            |
| `pnpm build`     | Production builds                                              |
| `pnpm test:e2e`  | Builds, then runs the Playwright smoke test against the builds |
| `pnpm format`    | Formats every file with Prettier                               |
| `pnpm db:check`  | Checks the database connection in `.env`                       |

Before the first `pnpm test:e2e`, install the test browsers once: `pnpm exec playwright install chromium webkit`.

CI runs lint, typecheck, unit tests, the build, the smoke test and a secret scan on every push and pull request.

## Where things are

- `CLAUDE.md`: the rules every change follows
- `docs/modules/`: the 20 module briefs, built in order
- `docs/architecture/file-structure.md`: where code goes
- `docs/design-system/`: the brand book, tokens and component references
- `docs/database/schema.sql`: the PostgreSQL schema
