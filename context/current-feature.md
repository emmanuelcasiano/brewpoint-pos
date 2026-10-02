# Current Feature

<!-- Module number and name -->

## Status

<!-- Not Started|Planning|Approved|In Progress|Complete -->

## Brief

<!-- docs/modules/<nn>-<name>.md, or "none" for a fix -->

## Goals

<!-- The brief's acceptance criteria, as checkboxes -->

## Build steps

<!-- Migration, Server logic and tests, API, Screens: checkboxes, or "none" -->

## Plan

<!-- The approved plan -->

## Notes

<!-- Out of scope, open questions and their answers, anything else -->

## History

2026-10-02 - 01 Project skeleton - pnpm and Turborepo monorepo: Fastify server with /health, .env check and `pnpm db:check`; Vite, React and Tailwind v4 placeholders for back-office, POS and console; `formatPeso` in packages/shared with tests; Playwright smoke test; GitHub Actions CI with a gitleaks scan. Decisions: Kysely, TypeScript 6.0, Neon PostgreSQL 18 for development, POS as a web app for now, hosting deferred.

---

2026-10-02 - 02 Database and tenant isolation - All 70 tables as 12 Kysely migrations (181 foreign keys, no cascades, `uuidv7()` defaults); row-level security forced on the 59 shop tables with a `tenant_isolation` policy on `app.tenant_id`; three roles from `pnpm db:roles` (`brewpoint_migrator` owns tables, `brewpoint_app` is the server's login, `brewpoint_platform` gets cross-shop access to the BrewPoint-run tables); `createDb` and `withTenant` in core/db; uuidv7 and the 42 permission codes in packages/shared; `pnpm db:seed` (permissions, three plans, demo shops Kape Davao and Brew Bros Cebu); generated `types.ts`; isolation, migration and seed tests on a separate Neon test branch and a PostgreSQL 18 CI service. Decisions: `tenant_id` added to 24 child tables, receipt and PO numbers unique per shop, append-only tables by grant, plain-text role password for Neon, four database URLs (owner direct and app pooled, per branch).

---

2026-10-02 - 05 UI foundation - packages/ui: bundle.css ported verbatim into Tailwind's components layer, tokens.css plus a `@theme inline` mapping (default palette and spacing off), bundled @fontsource fonts with ₱; `deriveAccent`, `applyAccent`, `contrast`, the 45 icons, `applyTheme`/`useTheme` (per device, Daylight default); `formatPesoShort` in packages/shared; 39 components (actions, forms, feedback, keypads and PinPrompt, layout, navigation, DataTable, Card, StatTile, Chart, Meter, Timeline) with state tests, and chart geometry checked against bundle.js; a dev-only gallery (`pnpm --filter @brewpoint/ui gallery`) showing each component in both themes beside its preview.html; Playwright gallery checks for accent-only token changes and focus rings, with Linux screenshot baselines from a manual CI job (not yet made). Decisions: built before 03; controlled PinPrompt and Numpad; SideNav `renderLink`; inline styles only for runtime geometry; ProductTile, CartLine, Receipt, AccentPicker and PermissionMatrix left to the modules that use them. /feature test and review skipped by choice.

---
