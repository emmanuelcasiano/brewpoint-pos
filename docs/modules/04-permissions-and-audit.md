# Module 04: Permissions and audit

## Goal
One way to check "may this user do this?" on the server, and one way to record sensitive actions, used by every later module.

## Depends on (already built)
- Module 03 sign-in and identity.

## Read before planning
- CLAUDE.md
- docs/design-system/components/PermissionMatrix/README.md and preview.html (the full permission list and default roles)
- docs/design-system/components/AuditLogScreen/README.md (how entries read)

## Data
- Owns: permissions (seed), roles, role_permissions, user_assignments, audit_log
- Reads only: users, branches
- Schema changes: none

## In scope
- Seed every permission code from the PermissionMatrix preview, plus inventory.alerts.view and inventory.alerts.settings.
- Default roles created for every new shop: Owner (locked, all), Manager, Cashier, Barista, Inventory Clerk, with the sets in the PermissionMatrix preview.
- `can(user, code, branchId?)` on the server; a user's permissions come from their role in that branch (or all branches).
- A route guard that returns 403 with a plain message: "You do not have permission to void sales. Ask a manager."
- Manager approval flow helper: an action that needs a higher permission accepts an approver's PIN and records the approver.
- `audit(ctx, actionCode, sentence, entity, before?, after?, sensitive?)` writing audit_log.
- The client receives the user's permission codes to hide actions (hiding is convenience only; the server always checks).

## Out of scope (do not build)
- Roles editor and audit log screens (Module 16). Staff permissions (Module 18).

## Business rules
- The Owner role cannot be edited or removed, and a shop always has at least one Owner.
- Every write endpoint declares its permission code; a test fails if one does not.
- Audit sentences use real values: "Changed the price of Iced Latte from ₱140.00 to ₱145.00".
- audit_log is append-only: no update or delete path exists.

## Permissions
- Defines them all.

## Audit
- Defines the helper; this module logs role or assignment changes made by seed or API.

## Offline behaviour
- The POS keeps the signed-in user's permission codes and checks them locally for offline actions; the server re-checks when the action syncs and rejects it into "needs attention" if not allowed.
- Offline manager approvals are marked in audit_log as approved offline.

## Screens
- None (the 403 message appears wherever the action is).

## Acceptance criteria
- [ ] A Cashier calling the void-approve endpoint gets 403 with the plain message.
- [ ] A Cashier void request with a Manager's PIN succeeds and records both people.
- [ ] Every write route has a declared permission (enforced by a test).
- [ ] No API or SQL path can update or delete audit_log rows.

## Test cases
- Given a Manager assigned only to Main branch, when acting on another branch, then 403.
- Given an offline void approved by PIN, when it syncs, then audit_log shows approver, time on device and "approved offline".

## Decisions already made
- Roles are per shop; permissions are a global list.
- From Module 02: the 42 permission codes are already seeded from `packages/shared/src/permissions/codes.ts` (the PermissionMatrix preview plus `inventory.alerts.view` and `inventory.alerts.settings`). Build the default roles on them; no new permission seed is needed. No roles exist yet and the demo owners have no assignment.
- From Module 02: `audit_log` is already append-only by grant: `brewpoint_app` has SELECT and INSERT only, so UPDATE and DELETE fail with "permission denied" (tested in `apps/server/src/db/rls.test.ts`).
- From Module 03: the identity is on every request through the hooks in `core/auth/request-auth.ts`.
  - `requireShopUser(deps, 'backoffice' | 'pos')` puts a `ShopIdentity` on `request.shopIdentity`: userId, tenantId, branchIds (a null-branch assignment expanded to every active branch), roles per branch, surface and deviceId.
  - `requireStaff(deps, stages)` does the same for staff.
  - Add the permission check as a hook that runs after these. The sign-in routes (`modules/auth/routes.ts`) declare who may call them but no permission code.
- From Module 03: the local demo seed added placeholder roles with no permissions to `roles`: a locked Owner and a Cashier per shop. Carlo and Jake are Owners for all branches, and Ana Cruz is a Cashier at Main branch. Replace them with the real default roles.
- From Module 03: the shared helpers are ready.
  - `writeAudit(trx, entry)` (`core/audit/audit.ts`) and `writePlatformAudit` (`core/audit/platform-audit.ts`) write the audit rows. An entry with its own `id` is written once (ON CONFLICT DO NOTHING).
  - Errors are `AppError(status, code, message, details?)` from `core/errors.ts`, sent as `{ error: { code, message, details? } }`, and `parseInput` validates with Zod.
  - The sign-in lock rules (`PIN_LOCK`, `ACCOUNT_LOCK`, `recordFailure`, `isLocked`) are in `packages/shared/src/auth/lockout.ts`.
  - The approval PIN's "locked until an online login" (PinPrompt README) is a different rule, still to build.

## Open questions
- None.

## How to work
1. Read the files above. Ask about anything unclear before planning.
2. Write a plan: files to add or change, migrations, endpoints, components, tests. Wait for approval.
3. Build in this order, stopping after each step for review: migration → server logic and tests → API → screens.
4. Finish with the Definition of Done checklist from CLAUDE.md, ticked.
