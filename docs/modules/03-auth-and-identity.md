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

## Open questions
- Build sign-in yourself or use a library/service (for example Lucia-style sessions, Auth.js, or a hosted provider). A hosted provider must support offline PIN on the POS, which usually means PINs stay in BrewPoint regardless.

## How to work
1. Read the files above. Ask about anything unclear before planning.
2. Write a plan: files to add or change, migrations, endpoints, components, tests. Wait for approval.
3. Build in this order, stopping after each step for review: migration → server logic and tests → API → screens.
4. Finish with the Definition of Done checklist from CLAUDE.md, ticked.
