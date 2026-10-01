# Module 18: Staff console core

## Goal
The BrewPoint team can see every shop's account, help a shop safely with owner-approved support access, and every staff action is recorded.

## Depends on (already built)
- Modules 03 (staff sign-in), 04, 17.

## Read before planning
- CLAUDE.md (staff rules)
- docs/design-system/guidelines/60-staff-console.md
- READMEs and previews: ConsoleOverviewScreen, ConsoleShopsScreen, ConsoleShopDetailScreen, ConsoleSupportAccessScreen, ConsoleAuditScreen, ConsoleStaffScreen
- docs/database/schema.sql: platform_users, platform_roles, platform_permissions, platform_role_permissions, support_access_grants, platform_audit_log, tenant_events

## Data
- Owns: platform_users, platform_roles, platform_permissions, platform_role_permissions, support_access_grants, platform_audit_log, tenant_events
- Reads only: tenants, subscriptions, invoices, devices, users, plans, plan_prices
- Schema changes: none

## In scope
- apps/console shell: ConsoleNav (light, "Staff console" tag), page header with the signed-in staff member.
- Staff roles and permissions seed: Superadmin, Support, Billing, Engineer; staff list and invite (ConsoleStaffScreen).
- A platform permission check and a platform audit helper (like Module 04, for staff).
- Overview: MRR, paying shops by plan, trials, past due and suspended, MRR trend, needs attention, recent staff activity.
- Shops list and Shop detail: account, subscription and price version, usage, devices, history; actions extend trial, change plan, suspend and reactivate, each with a reason.
- Support access: request with reason, scope and duration; owner approves in the shop back-office (approval card and email link); the shop sees the support bar with End now on every page; access ends on time, by owner or by staff.
- Server enforcement: staff requests to any shop data endpoint are refused unless an active grant exists for that shop and scope; every page viewed during a grant is logged.
- Staff audit log screen.

## Out of scope (do not build)
- Billing overview, plans editor, flags, releases, announcements, data requests, tickets (Module 19).

## Business rules
- Staff accounts are separate from shop users and require two-step sign-in.
- Without a grant, staff see account data only (plan, billing, devices, users list), never sales, stock or customers.
- Every staff action asks for a reason and writes platform_audit_log; changes to a shop also write tenant_events.
- Suspend asks for the shop name typed in.
- Only Superadmins manage staff.

## Permissions
- Platform codes such as tenant.view, tenant.trial.extend, tenant.plan.change, tenant.suspend, support.access.request, audit.view, staff.manage (seed the full list).

## Audit
- platform_audit_log for every action and every page viewed under a grant; the shop's audit_log records support session start and end.

## Offline behaviour
- Not applicable (console is online). Suspension reaches devices via the license on sync.

## Screens
- The six console screens listed above, plus the shop-side approval card and support bar.

## Acceptance criteria
- [ ] A Support staff member without a grant gets 403 on the shop's sales endpoint.
- [ ] After the owner approves, the same request works for the grant's duration and scope, and stops when the owner clicks End now.
- [ ] Every staff action appears in the staff audit log with the reason.
- [ ] Extending a trial writes tenant_events and shows in the shop's history.

## Test cases
- Given a read-only grant, when staff try to change a product price, then 403.

## Decisions already made
- Console is a separate app with its own sign-in and navigation.
- From Module 02: the `brewpoint_platform` role exists without a login. Give it one and a `PLATFORM_DATABASE_URL` here, the same way `pnpm db:roles` does for the app. Through `platform_all` policies it reads and writes these shop tables across shops: tenants, subscriptions, invoices, invoice_lines, billing_customers, payment_methods, payment_events, credit_notes, support_access_grants, tenant_events, data_requests, tenant_feature_overrides, device_error_reports, support_tickets, support_ticket_messages. It has no grant on shop business data: staff read it through `withTenant` on the app connection after the server checks an active grant. `platform_audit_log` and `tenant_events` are append-only by grant.

## Open questions
- Should owners be able to pre-approve support access (for example "always allow read-only for 30 minutes")? Recommendation: no, approve each time.

## How to work
1. Read the files above. Ask about anything unclear before planning.
2. Write a plan: files to add or change, migrations, endpoints, components, tests. Wait for approval.
3. Build in this order, stopping after each step for review: migration → server logic and tests → API → screens.
4. Finish with the Definition of Done checklist from CLAUDE.md, ticked.
