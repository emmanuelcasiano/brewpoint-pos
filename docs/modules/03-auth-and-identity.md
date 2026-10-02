# Module 03: Sign-in and identity

## Goal
Every request knows who is asking and for which shop. Owners and managers sign in to the back-office, cashiers sign in to the POS with a PIN, and BrewPoint staff sign in to the staff console with two-step verification.

## Depends on (already built)
- Module 02 database and tenant isolation.

## Read before planning
- CLAUDE.md
- docs/design-system/components/PinPrompt/README.md and preview.html
- docs/design-system/components/Numpad/README.md
- docs/design-system/components/Field/README.md, Button/README.md
- docs/design-system/guidelines/10-layout-and-touch.md (PIN login row)

## Data
- Owns: users (password_hash, pin_hash, status, last_active_at), platform_users (password_hash, totp_secret_enc)
- Reads only: tenants, branches, user_assignments, devices
- Schema changes: add a sessions table if the chosen approach needs one (record it in schema.sql).

## In scope
- Back-office: sign in with email and password, sign out, forgot password by email link, set password from an invite link.
- POS: choose a user on a paired device, enter a 4 to 6 digit PIN, switch user, sign out. Works offline against PIN hashes cached on the device.
- Staff console: email, password and a six-digit authenticator code (TOTP). Two-step is required after the first sign-in.
- Every authenticated request carries: user or staff id, tenant id (not for staff), branch ids and role.
- Rate limits and lockouts.

## Out of scope (do not build)
- Permission checks (Module 04), inviting users and roles UI (Module 16), device pairing (Module 06), staff roles UI (Module 18).

## Business rules
- Passwords hashed with Argon2id (or bcrypt cost 12 or more). PINs hashed too, never stored plain.
- Wrong PIN: "Wrong PIN. 3 tries left on this device." After 5 wrong tries the user is locked on that device for 5 minutes.
- Back-office sessions expire after 12 hours of inactivity; POS sessions last until sign-out or register close.
- Shop users and staff are separate: a staff account can never sign in to a shop back-office, and a shop user can never sign in to the console.
- Deactivated users cannot sign in anywhere, including offline POS after the next sync.

## Permissions
- None checked here beyond "signed in". Module 04 adds codes.

## Audit
- Writes audit_log: "Signed in on T1", "Wrong PIN 5 times on T1, locked for 5 minutes".
- Staff sign-ins write platform_audit_log.

## Offline behaviour
- The POS caches PIN hashes for users assigned to its branch and verifies them locally. Changes (new PIN, deactivation) arrive with the next sync.

## Screens
- Back-office sign-in, forgot password, set password.
- POS user picker and PinPrompt (states: normal, wrong PIN, locked, offline).
- Console sign-in and two-step code entry.

## Acceptance criteria
- [ ] A cashier signs in with PIN on a device with no internet.
- [ ] A shop user's token cannot call a console endpoint, and a staff token cannot call a shop endpoint.
- [ ] Five wrong PINs lock the user on that device for 5 minutes with the message above.
- [ ] A deactivated user cannot sign in to the back-office immediately, or to the POS after sync.

## Test cases
- Given user Ana with PIN 1234 cached on T1 offline, when she enters 1234, then she is signed in.
- Given a staff account without two-step set up, when it signs in the second time, then it must set up two-step before continuing.

## Decisions already made
- Staff and shop identities are separate tables (users, platform_users).
- From Module 01: the server is Fastify. `apps/server/src/app.ts` builds the app and mounts routes; validate input with Zod. New settings go in `apps/server/src/env.ts`, each with a plain-language error message.
- From Module 02: the server connects as `brewpoint_app` (`DATABASE_URL`, required in `env.ts`), so row-level security applies to every query. Create the connection with `createDb` (`core/db/client.ts`) and run every shop query inside `withTenant(db, tenantId, fn)` (`core/db/tenant-transaction.ts`).
- From Module 02: `users.email` is unique across all shops and sign-in looks it up before the shop is known, but with no tenant set the app sees no users. Sign-in needs a narrow lookup path added by migration (for example a `SECURITY DEFINER` function that returns only the tenant id and hashes for one email). The demo owners (`carlo@kapedavao.test`, `jake@brewbroscebu.test`) have no password or PIN yet.
- Sign-in is built in BrewPoint, not with a library or hosted provider: opaque session tokens stored hashed in BrewPoint's own sessions tables, back-office sessions sliding to 12 hours of inactivity, Argon2id for passwords and PINs, and a small library for TOTP only.
- Module 05 (UI foundation) is built before this module's screens, so the sign-in screens use the real Button, Field, Numpad and PinPrompt components from `packages/ui`.
- Offline PIN in this module is a minimal cache: a server endpoint returns the PIN hashes of a branch's active users, and the POS keeps them in a small IndexedDB cache with its own verifier and per-device lockout, tested offline. It uses the seeded demo device until Module 06 adds pairing, the device credential and sync.
- Email goes through a small mailer interface. In local and CI it logs the link and keeps it for tests; a real provider is chosen before staging.
- From Module 05: PinPrompt and Numpad are controlled. The screen holds the PIN (`pin`, `onPinChange`), checks it and counts the tries; show a wrong PIN by clearing `pin` and passing `error`, and a lock with `locked`. `applyNumpadKey` is the shared key rule. Field passes its id and error to the TextInput or Select inside it (`<Field label error><TextInput /></Field>`). Each app's `main.tsx` already calls `applyTheme(readStoredTheme())`. Browse every component with `pnpm --filter @brewpoint/ui gallery`.
- Staff tables are reached through the platform login, set up here instead of in Module 18: `pnpm db:roles` gives `brewpoint_platform` a login, `env.ts` requires `PLATFORM_DATABASE_URL`, and `core/db` gets `createPlatformDb`. Tests have no platform test URL: the test setup gives `brewpoint_platform` the password from `TEST_DATABASE_URL` and logs in with that URL's role swapped. Staff sign-in, staff sessions and `platform_audit_log` writes use it; Module 18 reuses it.
- Until Module 06, the POS PIN cache endpoint is protected by a `DEMO_DEVICE_KEY` from `.env`. It is accepted only when `APP_ENV=local` and only for the seeded demo device, so the endpoint is off in staging and production. Module 06 replaces it with the paired-device credential.
- Tokens: the back-office and console use httpOnly, Secure, SameSite=Strict cookies with separate names, and the Vite dev proxy serves each app from the server's origin. The POS sends a bearer token kept with its local session.
- Seed (local only): a password and PIN for Carlo and Jake, cashier Ana with PIN 1234 at Kape Davao, one Superadmin platform role and a dev staff account. `pnpm staff:create` makes the first real staff account in staging.
- The local demo seed adds placeholder roles to `roles` (Module 04's table, agreed here): an Owner role (locked) and a Cashier role per shop, with no permissions. Carlo and Jake are Owners for all branches; Ana is a Cashier at Main branch. Module 04 adds the permissions and the real default roles.
- Email lookup before the shop is known: a `SECURITY DEFINER` function `auth_find_user(email)`, owned by the migrator, returns only `(user_id, tenant_id)` for one exact email. A SELECT-only policy on `users` for `brewpoint_migrator`, active only while no tenant is set, lets it see the row, so inside a tenant transaction the migrator still sees one shop. `brewpoint_app` may only EXECUTE it. Hashes and status are read afterwards inside `withTenant`.
- Migration (step 1): `0013-auth` adds `sessions`, `auth_tokens` and `pin_lockouts` (shop tables with row-level security) and `platform_sessions` (staff only). It also adds `failed_sign_in_count`, `locked_until` and a lower-case email check to `users` and `platform_users`. Tokens are stored as sha256 hex in `token_hash`; shop tokens start with the tenant id. The schema now has 74 tables and 190 foreign keys. `core/auth/password.ts` (Argon2id, 19 MiB, t=2, p=1, via `@node-rs/argon2`) was built in this step, because the seed and `pnpm staff:create` need it. The Superadmin staff role is reference data, seeded in every environment. Demo sign-in, local only: password `brewpoint-demo` for Carlo, Jake and `dev@brewpoint.test`; owner PINs 1111, Ana Cruz 1234.
- Server logic (step 2):
  - **core/auth:** `identity.ts` (`ShopIdentity`, `StaffIdentity`, `loadBranchAccess`), `sessions.ts` (create, resolve on each request, revoke, for shop and staff), `tokens.ts`, `totp.ts` (otpauth; AES-256-GCM `v1.<iv>.<tag>.<data>`), `lockout.ts` (the rules and messages) and `device.ts` (the demo-device check).
  - **Other core:** `core/audit/audit.ts` and `platform-audit.ts`, `core/errors.ts` (`AppError` with a stable `code` and `details`), `core/mail/mailer.ts` (`LogMailer`).
  - **modules/auth:** the service is split into `shop.service.ts`, `pos.service.ts` and `staff.service.ts`, each with its own test file. Beside them: `repository.ts`, `errors.ts` (every sign-in message in one place), `outcome.ts`, `deps.ts` (clock injected for tests) and the test-only `test-support.ts`.
  - **Shared:** `formatTime` ("3:05 PM", Asia/Manila) is in `packages/shared/src/time/`, and the PIN, password and code limits are in `packages/shared/src/contracts/auth.ts`.
- Sign-in transactions return their failure instead of throwing, so wrong-try counts and lock audits are kept, and the service throws after the commit.
- An unknown email is checked against a throwaway hash, so it takes as long as a wrong password.
- Staff: a correct password does not clear the wrong-try count until the sign-in is complete, so wrong two-step codes keep counting towards the same 10-try lock. The first sign-in without two-step may set it up straight away.
- POS:
  - A PIN sign-in updates `last_active_at` but leaves the password's wrong-try count alone.
  - Device events (`signed_in`, `signed_out`, `pin_locked`) use the device's event id as the `audit_log` id, so a resend is recorded once.
  - A reported `pin_locked` also locks that user on that device on the server.
- The reset email links to `<BACKOFFICE_URL>/set-password?token=…`. A new reset link retires older unused ones.
- API (step 3):
  - **Routes:** `modules/auth/routes.ts` is a Fastify plugin mounted under `/api`; `buildApp({ deps })` mounts it and `main.ts` builds the deps from `.env`. Without deps only `/health` runs, which the health test uses.
  - **Request hooks:** `core/auth/request-auth.ts` (`requireShopUser(deps, surface)`, `requireStaff(deps, stages = ['active'])`, `requireDemoDevice(deps)`) put `shopIdentity`, `staffIdentity` or `device` on the request. Every later module's routes use them.
  - **Tokens:**
    - Back-office: cookie `bp_session`.
    - Console: cookie `bp_staff_session`.
    - Both cookies: httpOnly, SameSite=Strict, Path=/api, no Max-Age, Secure unless `APP_ENV=local`.
    - POS: `Authorization: Bearer`, accepted only by POS routes.
    - The demo device sends the `x-brewpoint-device` and `x-brewpoint-device-key` headers.
  - **Errors:** every error body is `{ error: { code, message, details? } }` (`ApiError` in shared contracts). `core/errors.ts` has `parseInput` (the first Zod issue becomes a 400 with `details.field`), the error handler (unknown errors become a plain 500 without details) and the 404 handler.
  - **Rate limit:** `@fastify/rate-limit` allows 20 a minute per IP per route on every route that takes a password, PIN, code, link or device events.
  - **Staff `/me`:** `GET /api/console/auth/me` answers at any stage (with `stage`), so the console can resume a two-step sign-in after a reload. Other console routes require `active` and answer 403 `two_step_required`.
  - **Dev proxy:** the shared Vite config proxies `/api` to the server (dev and preview), so cookies belong to each app's own origin.
- Screens (step 4):
  - **Router:** React Router v8 (the current major; the same declarative `BrowserRouter`/`Routes` API as v7) in the back-office and console.
  - **API client:** each app has `lib/api-client.ts` built on `createApiRequest` in `packages/shared/src/api/client.ts`. It takes `fetch` as an argument, so shared needs no DOM types. It throws `ApiRequestError`; a network failure, or a 5xx not from BrewPoint, counts as offline. `formErrorOf` decides between "under the field" and "in a banner".
  - **Shared lockout rules:** they moved from `core/auth/lockout.ts` to `packages/shared/src/auth/lockout.ts`, so the POS counts tries and words its messages exactly like the server.
  - **Sign-in screens:** the back-office and console sign-in pages are a centred Card under the BrewPoint name (no preview exists), with the version line under it. Session state lives in a provider (`SessionProvider`, `StaffSessionProvider`) that checks `/me` on load. The console sends each stage to its page (`stagePath`), so a reload in the middle of two-step resumes it.
  - **QR code:** drawn as SVG from `qrcode`'s `create()`, in `paper`/`paper-ink` so it scans in both themes. The server returns the same pending secret if setup starts twice on one sign-in (`keepPendingTotpSecret`, a single `coalesce` update).
  - **POS PIN check:** it always checks the PIN on the device (`hash-wasm` verifies the server's Argon2id hashes), against IndexedDB stores in `offline/local-store.ts`: `pin_cache`, `pin_lockouts`, `auth_events` and `session`. Online, it also opens a server session; offline, the sign-in is queued. The staff list refreshes on start, every 5 minutes and on reconnect, and replaces the cache whole. "Offline" is decided from real request failures. A signed-in person dropped from the refreshed list is signed out with a notice.
  - **POS device info:** the PIN list response now carries `device` (`PosDeviceSummary`: register, branch, shop, accent), so the POS can name them offline.
  - **Demo device in the POS:** it reads `DEMO_DEVICE_KEY` (and an optional `DEMO_DEVICE_ID`) from the root `.env` through Vite's `envDir` and `envPrefix: 'DEMO_DEVICE_'`. Only variables with that prefix reach the browser.
  - **Layout:** the POS sign-in fits a landscape iPad (1180×820) without scrolling; offline, the Sign in key still clears the bottom.
  - **Page background:** `packages/ui` gives `html` the `surface` background and `ink` color (`styles/page.css`), so the whole window follows the theme, not just each screen's box.
  - **POS user menu:** the design system has no menu style, so `apps/pos/src/app/UserMenu.tsx` builds one from tokens (`surface-raised`, `border`, `shadow-2`, `z-modal`). It floats under the user button without moving the page and follows the menu button pattern (focus on the first item, arrow keys, Home and End, Escape returns to the button, a press outside or Tab closes it). Its items are 56px tall, and the chosen item shows "Signing out…" while the server answers.
  - **App tests:** Vitest with jsdom and Testing Library in all three apps, plus `fake-indexeddb` in the POS. The POS test timeout is 20 s because each PIN check is a real Argon2id verify.
  - **Smoke test:** it now checks each app's sign-in screen instead of the old placeholder.
- Routing: React Router v7 (declarative mode), later v8 (see Screens above) in the back-office and console. The POS has no URL routing.
- Limits: passwords are at least 10 characters with no composition rules. 10 wrong passwords or two-step codes in a row lock the account for 15 minutes, and there's a per-IP limit of 20 auth requests a minute. Back-office and staff sessions expire after 12 hours of inactivity; an unfinished two-step step expires after 10 minutes. Reset links last 1 hour.

## Open questions
- None. Sign-in approach answered under "Decisions already made".

## How to work
1. Read the files above. Ask about anything unclear before planning.
2. Write a plan: files to add or change, migrations, endpoints, components, tests. Wait for approval.
3. Build in this order, stopping after each step for review: migration → server logic and tests → API → screens.
4. Finish with the Definition of Done checklist from CLAUDE.md, ticked.
