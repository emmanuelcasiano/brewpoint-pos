# Module 16: Shop management screens

## Goal
Owners manage their team, devices and settings, and can see a permanent record of sensitive actions.

## Depends on (already built)
- Modules 04 and 07 (and 06 for devices).

## Read before planning
- CLAUDE.md
- READMEs and previews: UsersScreen, PermissionMatrix, DevicesScreen, AuditLogScreen, SettingsScreen
- docs/design-system/guidelines/30-per-shop-accent.md

## Data
- Owns: users (invite, change role, deactivate), roles and role_permissions (custom roles), user_assignments, discount_rules (UI), tenant_payment_methods (UI)
- Reads only: audit_log, devices, plans (limits)
- Schema changes: none

## In scope
- Users and roles: list, invite by email, change role and branch, reset PIN, deactivate; roles list and the PermissionMatrix editor (custom roles, locked Owner).
- Devices: device cards with sync, license, app version, printer; rename; revoke; pairing card (from Module 06); revoked list.
- Audit log: filters (date, person, area, sensitive only), search, paging, export CSV.
- Settings sections: Shop profile and Branches (Module 07), Receipts (58 or 80 mm, footer text), Taxes and discounts (VAT 12%, Senior and PWD 20% with VAT exemption, discount limits per role), Payment methods (enable Cash, GCash, Card, Maya; reference required), Appearance (accent, theme), Data and backups (request export; the request is handled in Module 19).

## Out of scope (do not build)
- Subscription screen (Module 17). Notifications section (Module 15).

## Business rules
- Plan user limit: at the limit, Invite explains it and links to Subscription.
- Deactivating keeps the user's name on their sales and audit entries.
- Role changes apply on each device's next sync.
- Settings saves show a toast: "Settings saved. Registers update at their next sync."

## Permissions
- user.view, user.manage, role.manage, pin.reset, device.manage, audit.view, settings.manage.

## Audit
- "Invited Paolo Garcia as Inventory Clerk", "Changed Cashier role: added sale.refund.request", "Revoked device T0", "Changed Senior Citizen discount settings" (all sensitive).

## Offline behaviour
- Back-office only. Devices receive users, roles and settings on pull.

## Screens
- UsersScreen, PermissionMatrix, DevicesScreen, AuditLogScreen, SettingsScreen sections per their READMEs.

## Acceptance criteria
- [ ] An invited user sets a password and PIN from the email link and can sign in on the POS after sync.
- [ ] The Owner role cannot be edited and the last Owner cannot be deactivated.
- [ ] A revoked device is signed out at its next sync after uploading its unsynced sales.
- [ ] The audit log cannot be edited from any screen or API.

## Test cases
- Given the plan limit of 10 users reached, when inviting an 11th, then the invite is blocked with the plan message.

## Decisions already made
- Default roles from the PermissionMatrix preview.
- From Module 05: PermissionMatrix is not in packages/ui yet; it is built in this module, keeping its bp- classes. Switch, Checkbox, Tabs and DataTable are ready.
- From Module 02: brewpoint_app may DELETE only from role_permissions, user_assignments, product_modifier_groups, recipe_lines, modifier_recipe_lines, supplier_items, pairing_codes and purchase_order_lines; everything else is voided, cancelled or deactivated with a status column. A new DELETE needs a grant in a new migration.
- From Module 03: the accepting side of an invite is built.
  - An invite is an `auth_tokens` row with purpose `invite`. The token is `<tenant id>.<secret>` and is stored as sha256.
  - The back-office page `/set-password?token=…` sets the password and changes the user from `invited` to `active`.
  - To create and email invites, add a function to the auth service rather than calling `modules/auth/repository.ts`. Use `newShopToken` from `core/auth/tokens.ts` and the mailer in `core/mail`.
- From Module 03: when a user is deactivated, call `revokeUserSessions(trx, userId, 'deactivated', now)`. Their sessions are also refused on the next request, and registers drop them at the next PIN-list refresh.
- From Module 03: PINs and passwords are hashed with `hashSecret` (Argon2id, `core/auth/password.ts`). A changed PIN reaches registers at their next list refresh.

## Open questions
- None.

## How to work
1. Read the files above. Ask about anything unclear before planning.
2. Write a plan: files to add or change, migrations, endpoints, components, tests. Wait for approval.
3. Build in this order, stopping after each step for review: migration → server logic and tests → API → screens.
4. Finish with the Definition of Done checklist from CLAUDE.md, ticked.
