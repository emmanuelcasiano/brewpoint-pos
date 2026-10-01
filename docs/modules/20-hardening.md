# Module 20: Hardening

## Goal
BrewPoint is safe to trust with real shops: data is backed up and restorable, problems are noticed before shops report them, and the riskiest parts have been tested under load and reviewed for security. Start pieces of this during Phase 1 and finish before the first paying shop.

## Depends on (already built)
- Runs alongside everything; complete before other shops go live.

## Read before planning
- CLAUDE.md
- docs/database/schema.sql
- docs/design-system/guidelines/20-offline-and-license-states.md

## In scope
- Backups: automatic daily backups with point-in-time recovery; a documented restore tested on a copy, with the time it took.
- Monitoring: server errors and slow requests (for example Sentry and uptime checks), POS errors reported through device_error_reports, alerts to you when sync failures or webhook failures rise.
- Load test: 10 iPads syncing 500 offline sales each at once; the server applies all exactly once and stays responsive.
- Security review:
  - Row-level security test generated from the table list (from Module 02) runs in CI.
  - Sign-in: rate limits, lockouts, password reset tokens single-use and expiring, two-step for staff.
  - Every write route declares a permission (test from Module 04).
  - Staff access to shop data only with an active grant (test from Module 18).
  - Webhook signature verification and idempotency (Module 17).
  - Secrets in a secret manager, never in the repository.
- Data retention: logs and audit kept as decided; personal data handling written in a privacy policy.
- Performance: Dashboard and Reports under 1 second on a shop with a year of sales; add indexes or summary tables where needed.
- Release process: staging environment, database migration checks, POS app version rollout with the minimum-version rules.

## Acceptance criteria
- [ ] A restore from backup to a new database completes and the app works against it.
- [ ] The load test passes with no duplicate or lost sales.
- [ ] CI runs the isolation, permission and staff-access tests on every change.
- [ ] You receive an alert within 5 minutes when the webhook endpoint fails.

## Decisions already made
- From Module 01: CI (`.github/workflows/ci.yml`) already runs lint, typecheck, unit tests, the build, the Playwright smoke test and a gitleaks secret scan on every push and pull request. Add the isolation, permission and staff-access tests to it.
- From Module 01: development uses Neon (PostgreSQL 18, AWS US East 2). Production hosting is not chosen yet.
- From Module 02: foreign keys ignore row-level security, so a row can reference another shop's row by ID. Consider composite `(tenant_id, id)` foreign keys. CI already runs the isolation test (`apps/server/src/db/rls.test.ts`) against a PostgreSQL 18 service.
- From Module 02: production needs `pnpm db:roles` run once against its database, and the server must use the `brewpoint_app` URL, never the owner. From the Philippines each query to Neon US East 2 takes about 230 ms; consider the region when hosting is chosen.

## Open questions
- Hosting region and provider (deferred in Module 01; Singapore suggested for latency to the Philippines).
- Whether to get an outside security review before launch.

## How to work
1. Read the files above. Ask about anything unclear before planning.
2. Write a plan: files to add or change, migrations, endpoints, components, tests. Wait for approval.
3. Build in this order, stopping after each step for review: migration → server logic and tests → API → screens.
4. Finish with the Definition of Done checklist from CLAUDE.md, ticked.
