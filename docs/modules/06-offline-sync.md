# Module 06: Offline sync engine

## Goal
A paired iPad keeps working with no internet: it saves every change locally, sends it when online, and receives updates from the server, without ever duplicating or losing a sale.

## Depends on (already built)
- Modules 02, 03, 04.

## Read before planning
- CLAUDE.md
- docs/design-system/guidelines/20-offline-and-license-states.md
- docs/design-system/components/Navigation/README.md (POS top bar and sync chip)
- docs/design-system/components/Banner/README.md
- docs/design-system/components/DevicesScreen/README.md (pairing code, license)
- docs/database/schema.sql: devices, pairing_codes, and the sync columns (device_id, client_created_at, synced_at)

## Data
- Owns: devices, pairing_codes; the sync mechanism for every device-written table.
- Reads only: tenants, branches, subscriptions (for the license)
- Schema changes: add a sync_changes (or per-table cursor) mechanism if needed for pull; record it in schema.sql.

## In scope
- Pairing: back-office shows a 6-digit code valid 10 minutes; the POS enters it and receives a device credential.
- Local store on the POS (SQLite via Capacitor, or IndexedDB) holding the data the POS needs: menu, users and PIN hashes, open register session, and an outbox of unsent changes.
- Push: the outbox sends changes in order; the server applies each exactly once (idempotent by row id), sets synced_at, and returns accepted or rejected per change.
- Pull: the device asks for changes since its last cursor (menu, prices, users, flags, settings).
- Rejected changes go to a "needs attention" list on the device and are never dropped.
- Connection state from real request results, not the browser online flag. Top bar chip: Synced, Syncing N, Offline with N waiting, N need attention.
- Offline license: the device stores a signed lease (default 7 days). Warn at 3 days; at expiry, lock selling but allow closing the register, viewing data and syncing.
- A generic "sync this table" contract later modules plug into (sales, cash moves, stock movements, audit entries).

## Out of scope (do not build)
- The sale itself (Module 11). Devices screen UI beyond pairing (Module 16).

## Business rules
- Never block a sale because the connection is down.
- The same change sent twice creates one row.
- Changes from one device apply in the order they happened on that device (client_created_at, then sequence).
- Offline is shown in neutral brand colors, never red.
- A revoked device is signed out at its next sync; unsynced changes on it still upload first.

## Permissions
- Pairing needs device.manage.

## Audit
- "Paired device T2 at Main branch", "Revoked device T0". Changes made offline keep their device time in audit entries.

## Offline behaviour
- This module defines it.

## Screens
- POS: pairing screen, sync chip states, offline banner, license warning banner, license lock screen, needs-attention list.
- Back-office: pairing code card (from DevicesScreen).

## Acceptance criteria
- [ ] With networking off for an hour, 50 test changes are saved; turning it on syncs all 50 once, in order.
- [ ] Killing the app mid-sync and reopening loses and duplicates nothing.
- [ ] A change the server rejects appears in needs attention with the reason.
- [ ] License at 2 days shows the warning; at 0 selling locks and close register still works.

## Test cases
- Given the same change posted twice (network retry), then one row exists and both responses say accepted.
- Given device clock 10 minutes ahead, then client_created_at is kept and synced_at is the server time.

## Decisions already made
- Device-generated UUID v7 ids; device_id, client_created_at, synced_at on device-written tables.
- From Module 01: the POS is a web app for now. Decide the native shell (Capacitor recommended) before choosing the local store: SQLite needs the native shell, IndexedDB works in the browser.
- From Module 02: `uuidv7()` is in `@brewpoint/shared` (monotonic within a millisecond, works in browsers and Node). The database defaults IDs to PostgreSQL 18's `uuidv7()` and accepts client-supplied IDs.

## Open questions
- Local store: SQLite (Capacitor plugin) or IndexedDB. Recommendation: SQLite if Capacitor was chosen in Module 01.
- Conflict rule for back-office edits of data a device also edits (for example a product price changed while offline): server wins, device refreshes on pull.

## How to work
1. Read the files above. Ask about anything unclear before planning.
2. Write a plan: files to add or change, migrations, endpoints, components, tests. Wait for approval.
3. Build in this order, stopping after each step for review: migration → server logic and tests → API → screens.
4. Finish with the Definition of Done checklist from CLAUDE.md, ticked.
