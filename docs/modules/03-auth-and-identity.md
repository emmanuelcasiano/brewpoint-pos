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

## Open questions
- None. Sign-in approach answered under "Decisions already made".

## How to work
1. Read the files above. Ask about anything unclear before planning.
2. Write a plan: files to add or change, migrations, endpoints, components, tests. Wait for approval.
3. Build in this order, stopping after each step for review: migration → server logic and tests → API → screens.
4. Finish with the Definition of Done checklist from CLAUDE.md, ticked.
