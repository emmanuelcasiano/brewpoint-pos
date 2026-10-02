# Current Feature: 03 Sign-in and identity

## Status

In Progress

## Brief

docs/modules/03-auth-and-identity.md

## Goals

- [ ] A cashier signs in with PIN on a device with no internet.
- [ ] A shop user's token cannot call a console endpoint, and a staff token cannot call a shop endpoint.
- [ ] Five wrong PINs lock the user on that device for 5 minutes with the message above.
- [ ] A deactivated user cannot sign in to the back-office immediately, or to the POS after sync.

## Build steps

- [x] Migration: `0013-auth`, platform login in `db:roles`, env and test setup, seed, schema.sql, regenerated types
- [x] Server logic and tests: `core/auth`, `core/audit`, `core/errors.ts`, `core/mail`, the auth service, DB tests
- [ ] API: routes, schemas, cookie and bearer hooks, rate limit, shared contracts, route tests
- [ ] Screens: back-office, POS (with the offline PIN cache), console, app test setup

## Plan

### 1. Migration

**`apps/server/src/db/migrations/0013-auth.ts`** (up and down, lists like 0011/0012):

| Table | Columns | Access |
|---|---|---|
| `sessions` (new) | id, tenant_id, user_id, surface (`backoffice`, `pos`), device_id (POS only), token_hash bytea UNIQUE, created_at, last_seen_at, revoked_at, revoke_reason, ip_address inet | tenant table: RLS `tenant_isolation`; app SELECT, INSERT, UPDATE |
| `auth_tokens` (new) | id, tenant_id, user_id, purpose (`invite`, `password_reset`), token_hash bytea UNIQUE, expires_at, used_at, created_at | tenant table; app SELECT, INSERT, UPDATE |
| `pin_lockouts` (new) | tenant_id, user_id, device_id, failed_count, locked_until; PK (user_id, device_id) | tenant table; app SELECT, INSERT, UPDATE |
| `platform_sessions` (new) | id, staff_id, stage (`two_step`, `two_step_setup`, `active`), pending_totp_secret_enc, token_hash bytea UNIQUE, created_at, last_seen_at, revoked_at, revoke_reason, ip_address inet | platform only: brewpoint_platform SELECT, INSERT, UPDATE; app none |
| `users` (owned) | + failed_sign_in_count int NOT NULL DEFAULT 0, + locked_until timestamptz, + CHECK email = lower(email) | unchanged |
| `platform_users` (owned) | + failed_sign_in_count, + locked_until, + CHECK email = lower(email) | unchanged |

Foreign keys to tenants, users, devices and platform_users, indexes on every FK, no cascades.

- `auth_find_user(email text) RETURNS TABLE (user_id uuid, tenant_id uuid)`: SECURITY DEFINER, owned by the migrator, `SET search_path = public`. Plus the policy `auth_lookup ON users FOR SELECT TO brewpoint_migrator USING (true)`. EXECUTE goes to brewpoint_app only (revoked from PUBLIC).
- Tokens carry their shop where needed: a shop session or link token is `<tenant_id>.<32 random bytes, base64url>`. The server opens `withTenant` with the prefix and looks up `sha256(token)`, so a forged prefix finds nothing. Staff tokens are random only.

**Platform login** (decided at load):
- `db/roles.ts`: `setRolePassword(role, password)`, generalising `setAppRolePassword`.
- `scripts/db-roles.ts`: also prints `PLATFORM_DATABASE_URL` (pooled).
- `core/db/client.ts`: `createPlatformDb`.
- `db/test-database.ts`: sets the platform password from `PLATFORM_TEST_DATABASE_URL` and adds it to the URL checks.
- `.env.example`, `ci.yml`: add the platform URLs.

**Env** (`env.ts`, each with a plain-language error):
- `PLATFORM_DATABASE_URL` (required)
- `TOTP_ENCRYPTION_KEY` (required, 32 bytes base64, for AES-256-GCM)
- `BACKOFFICE_URL` (default `http://127.0.0.1:5173`, for email links)
- `DEMO_DEVICE_KEY` (optional, used only when `APP_ENV=local`)

**Seed** (`db/seed/demo.ts`, local only):
- Demo password for Carlo and Jake, and PINs.
- Cashier Ana Cruz (PIN 1234) at Kape Davao.
- Placeholder Owner (locked) and Cashier roles, and the assignments.
- `db/seed/reference.ts` or a local-only seed: a Superadmin platform role and the dev staff account `dev@brewpoint.test`.
- `scripts/staff-create.ts` (`pnpm staff:create --email --name`): creates an active Superadmin with a generated password and prints it once.

**Docs and types:** schema.sql (new tables, columns, function, policy, grants), `pnpm db:types`, and file-structure.md (adds `modules/auth/` and `core/mail/`).

**Tests:** migrations.test.ts (up and down); rls.test.ts (sessions, auth_tokens and pin_lockouts in TENANT_TABLES, platform_sessions in PLATFORM_ONLY_TABLES; the app can call `auth_find_user` but cannot read users with no tenant; the platform role can read platform_sessions); seed.test.ts (demo logins exist and Ana is assigned).

### 2. Server logic and tests

`apps/server/src/core/` (shared rules):

| Location | Contents |
|---|---|
| `auth/password.ts` | Argon2id hash and verify (`@node-rs/argon2`, m=19 MiB, t=2, p=1), used for passwords and PINs (PHC strings) |
| `auth/tokens.ts` | new token, sha256 hash, parse the `<tenant>.<secret>` form |
| `auth/totp.ts` | `otpauth` (SHA-1, 6 digits, 30 s, ±1 step), AES-256-GCM encrypt and decrypt of the secret |
| `auth/sessions.ts` | create, look up (joins user status; refuses deactivated users and back-office sessions idle 12 h or more), touch last_seen_at at most once a minute, revoke |
| `auth/identity.ts` | `ShopIdentity` (userId, tenantId, branchIds expanded from null = all active branches, roles per branch, surface, deviceId) and `StaffIdentity` (staffId, roleId, roleName, stage) |
| `auth/lockout.ts` | pure rules: 10 wrong passwords or codes → 15 min; 5 wrong PINs per device → 5 min; tries-left text |
| `auth/device.ts` | temporary device check: `DEMO_DEVICE_KEY` and a seeded demo device id, refused unless APP_ENV=local (replaced in Module 06) |
| `audit/audit.ts` | `writeAudit(trx, entry)` into audit_log |
| `audit/platform-audit.ts` | `writePlatformAudit(db, entry)` into platform_audit_log |
| `errors.ts` | `AppError(status, code, message)` and the Fastify error handler; plain-language messages |
| `mail/mailer.ts` | `Mailer` interface and a log mailer that keeps sent mail in memory for tests |

`apps/server/src/modules/auth/`: `service.ts` (split into `shop.service.ts`, `pos.service.ts`, `staff.service.ts` if it grows past the size limit), `repository.ts`, `auth.test.ts`.

Rules:
- **Back-office sign-in.** Find the user with `auth_find_user`, verify inside `withTenant`, and check the lock before the password.
  - A wrong email and a wrong password get the same message.
  - A deactivated user is told so only after a correct password.
  - On success: reset the counter, set last_active_at, create a session, write the audit row.
- **Forgot password.** Always the same response. For an active user, create a 1-hour reset token and mail the link.
- **Set password.** The token must be valid, unused and unexpired.
  - Invite: sets status active.
  - Reset: revokes the user's other sessions.
  - Marks the token used and writes the audit row.
- **POS PIN.**
  - PIN cache: active users who have a PIN and are assigned to the device's branch (or all branches).
  - Session: verify the PIN against `pin_lockouts` for this user and device; 5 wrong → locked 5 minutes. A POS session has no idle expiry; it ends at sign-out (register close comes in Module 10).
  - Events: offline sign-ins and lockouts reported by the device are written once each, using the device's event id as audit_log.id (ON CONFLICT DO NOTHING) with client_created_at.
- **Staff sign-in.**
  - Password correct, no TOTP yet, and no earlier platform_sessions: stage `active`, and two-step setup is offered.
  - No TOTP but an earlier session exists: stage `two_step_setup`, and only setup routes work (test case 2).
  - TOTP set: stage `two_step`, which needs the code within 10 minutes.
  - Wrong codes share the account's lock counter. A shop user's email is never looked up here, nor a staff email in `users`.

Audit sentences:

| Where | Sentence |
|---|---|
| audit_log | "Signed in to the back-office" · "Signed out of the back-office" · "Wrong password 10 times, locked for 15 minutes" (sensitive) · "Set a new password from a reset link" (sensitive) · "Set a password from an invite" · "Signed in on T1" · "Signed out on T1" · "Wrong PIN 5 times on T1, locked for 5 minutes" (sensitive) |
| platform_audit_log | "Signed in to the staff console" · "Signed out of the staff console" · "Turned on two-step sign-in" (sensitive) · "Wrong password or code 10 times, locked for 15 minutes" (sensitive) |

Each row uses the request IP and entity user or platform_user.

Tests (`auth.test.ts` against the test DB, plus pure unit tests for lockout, tokens and totp):
- **Back-office:** sign-in works; wrong password; 10 wrong → locked with the message; lock lifts after 15 min; deactivated user refused at sign-in **and** their open session refused on the next request (AC4); session idle 12 h refused, 11 h 59 m accepted; sign-out revokes.
- **Passwords:** forgot password does not reveal unknown emails and mails a link; set password works once; expired or used links are refused; an invite activates the user.
- **PIN cache:** only active users of the branch; a deactivated user disappears (AC4 POS side); wrong key refused; refused when APP_ENV is not local.
- **POS session:** PIN ok; wrong PIN says "Wrong PIN. 4 tries left on this device."; 5 wrong → locked with the audit sentence (AC3, server side); other device unaffected.
- **Events:** the same event twice → one audit row.
- **Staff:** first sign-in without TOTP → active; second → setup required (test case 2); setup with a valid code turns two-step on; wrong code; code required once set; platform_audit_log rows written.
- **Identity:** branch ids and roles resolved, null branch expands to all branches.

### 3. API

`modules/auth/routes.ts` and `schemas.ts` (Zod), mounted in `app.ts` under `/api`. `@fastify/cookie` and `@fastify/rate-limit` (per IP: 20 a minute on auth routes). Hooks: `requireShopUser(surface)`, `requireStaff(stage)`, `requireDemoDevice`. No permission codes yet (Module 04): each route declares its auth level instead.

| Method and path | Auth | Does |
|---|---|---|
| POST /api/auth/sign-in | public | email, password → sets `bp_session` cookie, returns Me |
| POST /api/auth/sign-out | shop cookie | revoke, clear cookie |
| GET /api/auth/me | shop cookie | Me: user, shop, branches, roles |
| POST /api/auth/password/forgot | public | always 204 |
| GET /api/auth/password/link?token= | public | is the link valid, who it's for, invite or reset |
| POST /api/auth/password/set | public | token, password |
| GET /api/pos/auth/users | demo device | PIN cache for the branch |
| POST /api/pos/auth/sessions | demo device | userId, pin → bearer token |
| DELETE /api/pos/auth/sessions/current | POS bearer | sign out |
| GET /api/pos/auth/me | POS bearer | Me |
| POST /api/pos/auth/events | demo device | offline sign-in and lockout events |
| POST /api/console/auth/sign-in | public | → sets `bp_staff_session`, returns the stage |
| POST /api/console/auth/two-step | staff, stage two_step | code |
| POST /api/console/auth/two-step/setup | staff, first sign-in or two_step_setup | → otpauth URI and secret |
| POST /api/console/auth/two-step/setup/confirm | same | code → turns two-step on |
| POST /api/console/auth/sign-out | staff | |
| GET /api/console/auth/me | staff, stage active | StaffMe |

- Cookies: httpOnly, SameSite=Strict, Path=/api, Secure unless APP_ENV=local. Separate names. A bearer token is accepted only on `/api/pos/*`.
- The shared Vite config gets an `/api` proxy to the server.
- Contracts: `packages/shared/src/contracts/auth.ts`.
- Route tests (Fastify `inject`): AC2 (a shop cookie or POS bearer on `/api/console/auth/me` → 401; a staff cookie on `/api/auth/me` and `/api/pos/auth/me` → 401); every input validated (bad email, short password, 7-digit PIN, 5-digit code → 400 with a plain message); the rate limit returns 429 with "Too many tries from this network. Wait a minute and try again."; cookie flags.

### 4. Screens

There's no preview.html for sign-in, so the screens are built from the ported components (Card, Field, TextInput, Button, Banner, PinDots, Numpad, TopBar, UserButton) following `guidelines/10-layout-and-touch.md` (PIN login: user picker above centred dots and numpad, numpad confirm). Both themes, tokens only.

**Back-office** (`apps/backoffice/src/app/`):
- `router.tsx`, `sign-in/SignInPage.tsx`, `ForgotPasswordPage.tsx`, `SetPasswordPage.tsx`, `use-auth.ts`, `RequireSignIn.tsx`.
- A signed-in placeholder (name and Sign out) until the dashboard (Module 12).
- `lib/api-client.ts`.
- States:
  - sign-in: errors under the fields, lockout Banner, loading button
  - forgot: sent confirmation
  - set password: checking link, expired or used link Banner with "Request a new link", mismatch under the field, success → sign-in with a Banner
  - idle sign-out: Banner "You were signed out after 12 hours without activity."
- Buttons: "Sign in", "Send reset link", "Set password".

**POS** (`apps/pos/src/`):
- `offline/pin-cache.ts`: IndexedDB store of cached users, lockouts and pending events.
- `offline/pin-verifier.ts`: `hash-wasm` argon2Verify.
- `app/sign-in/UserPicker.tsx`, `PinSignIn.tsx`, `use-pin-sign-in.ts`; `app/PosShell.tsx` (TopBar with the user button for switch user and sign out, and a placeholder body).
- `lib/api-client.ts`.
- Flow: the PIN is always verified locally, so it works the same online and offline. When online, the POS also opens a server session and sends pending events. The cache refreshes at start and every 5 minutes online, replacing the list, so deactivated users drop out.
- A 4 to 6 digit PIN with a numpad confirm key, "Sign in".
- States:
  - normal
  - wrong PIN: dots cleared, error, "Wrong PIN. 3 tries left on this device."
  - locked: "Wrong PIN 5 times. Ana is locked on this device until 3:10 PM."
  - offline: a neutral offline Banner; sign-in otherwise identical
  - empty: "No one can sign in on this device yet. Connect to the internet to load the staff list."
  - loading
- POS-sized controls.

**Console** (`apps/console/src/app/`):
- `router.tsx`, `sign-in/SignInPage.tsx`, `TwoStepPage.tsx` (six-digit code field, numeric inputmode, "Verify code"), `TwoStepSetupPage.tsx` (QR from the otpauth URI via `qrcode` as SVG, the secret as text, code field, "Turn on two-step sign-in"; on the first sign-in also "Set up later").
- `use-staff-auth.ts`, a signed-in placeholder, `lib/api-client.ts`.

**App test setup:** add Vitest, jsdom and Testing Library to the three apps (as in packages/ui) and `fake-indexeddb` to the POS.

Tests:
- **POS:** test case 1 and AC1 (Ana, PIN 1234, cached, network down → signed in); AC3 (5 wrong → locked message, keypad disabled; unlocks after 5 min with fake timers; other users unaffected); AC4 (a refresh without Ana → she can't sign in); `hash-wasm` verifies an Argon2id hash made by the server (a fixed PHC fixture); empty, loading and offline states; pending events sent once.
- **Back-office:** each state above.
- **Console:** sign-in → code step; setup-required path; wrong code.
- Visual check against the components in both themes.

### New dependencies
- server: `@node-rs/argon2`, `otpauth`, `@fastify/cookie`, `@fastify/rate-limit`
- apps: `react-router` (back-office, console), `hash-wasm` (POS), `qrcode` (console)
- dev: `vitest`, `jsdom`, `@testing-library/*`, `fake-indexeddb`

## Notes

Out of scope (do not build): permission checks (Module 04), inviting users and roles UI (Module 16), device pairing (Module 06), staff roles UI (Module 18).

Open questions in the brief: none (sign-in approach answered under "Decisions already made").

Questions raised at load, answered 2026-10-03 and recorded in the brief's "Decisions already made":
- Staff DB access: `brewpoint_platform` gets a login and `PLATFORM_DATABASE_URL` now (pulled forward from Module 18).
- PIN cache endpoint: `DEMO_DEVICE_KEY`, accepted only when `APP_ENV=local` and only for the demo device, until Module 06.
- Tokens: httpOnly SameSite=Strict cookies for the back-office and console (served through the Vite dev proxy), a bearer token for the POS.
- Seed: demo passwords and PINs, cashier Ana (PIN 1234), a Superadmin platform role and a dev staff account; `pnpm staff:create` for staging.

Answered at plan, also recorded in the brief: placeholder demo roles, `auth_find_user` definer function with a migrator SELECT policy, React Router v7, and the default limits.

Left for later modules:
- A cashier who signs in offline has only a local session; the server learns of it from the events endpoint. Server calls on that cashier's behalf come with Module 06's device credential.
- Register close ends POS sessions in Module 10.
- PinPrompt's "lock until an online login" is the approval rule (Modules 04 and 11). Sign-in locks for 5 minutes, as the brief says.
- Invite creation is Module 16; this module only accepts invite links.

## History

2026-10-02 - 01 Project skeleton - pnpm and Turborepo monorepo: Fastify server with /health, .env check and `pnpm db:check`; Vite, React and Tailwind v4 placeholders for back-office, POS and console; `formatPeso` in packages/shared with tests; Playwright smoke test; GitHub Actions CI with a gitleaks scan. Decisions: Kysely, TypeScript 6.0, Neon PostgreSQL 18 for development, POS as a web app for now, hosting deferred.

---

2026-10-02 - 02 Database and tenant isolation - All 70 tables as 12 Kysely migrations (181 foreign keys, no cascades, `uuidv7()` defaults); row-level security forced on the 59 shop tables with a `tenant_isolation` policy on `app.tenant_id`; three roles from `pnpm db:roles` (`brewpoint_migrator` owns tables, `brewpoint_app` is the server's login, `brewpoint_platform` gets cross-shop access to the BrewPoint-run tables); `createDb` and `withTenant` in core/db; uuidv7 and the 42 permission codes in packages/shared; `pnpm db:seed` (permissions, three plans, demo shops Kape Davao and Brew Bros Cebu); generated `types.ts`; isolation, migration and seed tests on a separate Neon test branch and a PostgreSQL 18 CI service. Decisions: `tenant_id` added to 24 child tables, receipt and PO numbers unique per shop, append-only tables by grant, plain-text role password for Neon, four database URLs (owner direct and app pooled, per branch).

---

2026-10-02 - 05 UI foundation - packages/ui: bundle.css ported verbatim into Tailwind's components layer, tokens.css plus a `@theme inline` mapping (default palette and spacing off), bundled @fontsource fonts with ₱; `deriveAccent`, `applyAccent`, `contrast`, the 45 icons, `applyTheme`/`useTheme` (per device, Daylight default); `formatPesoShort` in packages/shared; 39 components (actions, forms, feedback, keypads and PinPrompt, layout, navigation, DataTable, Card, StatTile, Chart, Meter, Timeline) with state tests, and chart geometry checked against bundle.js; a dev-only gallery (`pnpm --filter @brewpoint/ui gallery`) showing each component in both themes beside its preview.html; Playwright gallery checks for accent-only token changes and focus rings, with Linux screenshot baselines from a manual CI job (not yet made). Decisions: built before 03; controlled PinPrompt and Numpad; SideNav `renderLink`; inline styles only for runtime geometry; ProductTile, CartLine, Receipt, AccentPicker and PermissionMatrix left to the modules that use them. /feature test and review skipped by choice.

---
