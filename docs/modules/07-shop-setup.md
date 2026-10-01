# Module 07: Shop setup and onboarding

## Goal
A new coffee shop owner signs up, sets up the shop and first branch, and pairs the first iPad, all without help.

## Depends on (already built)
- Modules 03, 04, 05, 06.

## Read before planning
- CLAUDE.md
- docs/design-system/components/SettingsScreen/README.md (Shop profile, Branches sections)
- docs/design-system/components/AccentPicker/README.md and guidelines/30-per-shop-accent.md
- docs/design-system/components/DevicesScreen/README.md (pairing)
- docs/design-system/components/Navigation/README.md (back-office side nav)

## Data
- Owns: tenants, branches, the first users and user_assignments row, tenant_payment_methods (defaults)
- Reads only: plans, plan_prices
- Schema changes: none

## In scope
- Sign-up: owner name, email, password, shop name, city. Creates the tenant (status trial), first branch, Owner user and assignment, default roles (Module 04), default payment methods (Cash, GCash, Card, Maya).
- A subscriptions row in trial status for 14 days on Growth (the billing screens come in Module 17).
- First-run checklist in the back-office: add products, pair a device, invite staff.
- Settings, Shop profile: name, address, TIN, accent color (AccentPicker), timezone (default Asia/Manila).
- Settings, Branches: add, rename, deactivate (within the plan limit).
- The back-office shell: side navigation (Module 05 SideNav), page header, empty Dashboard placeholder.

## Out of scope (do not build)
- Payment collection (Module 17). Inviting users (Module 16). Products (Module 09).

## Business rules
- Shop names do not need to be unique; emails must be.
- Branch limit follows the plan (Growth: 2). Adding a third says: "Your plan includes 2 branches. Change plan to add more."
- The accent is stored as the hex the owner typed; the app derives accent tokens at runtime.

## Permissions
- Settings changes need settings.manage.

## Audit
- "Created the shop Kape Davao", "Added branch SM Lanang kiosk", "Changed the shop accent to #1F8A8A".
- tenant_events row: signed_up with signup_source.

## Offline behaviour
- Sign-up is online only. The POS picks up the new shop name, branch and accent at its next pull.

## Screens
- Sign-up (display-xl headline), first-run checklist, Settings Shop profile and Branches, back-office shell.

## Acceptance criteria
- [ ] A new owner goes from sign-up to a paired iPad in under 5 minutes.
- [ ] A new tenant has 5 default roles, 4 payment methods and a 14-day trial subscription.
- [ ] Changing the accent recolors back-office and POS, and contrast stays at 4.5:1.
- [ ] The branch limit message appears at the limit.

## Test cases
- Given sign-up with an email already used, then "An account with this email already exists. Sign in instead."

## Decisions already made
- Trial: 14 days on Growth.
- From Module 02: the app may insert a `tenants` row only inside `withTenant` set to that new tenant's ID (generate it with `uuidv7()` first); it can never see or create another tenant. Plans have fixed IDs (`PLAN_IDS` in `apps/server/src/db/seed/reference.ts`); the trial uses `PLAN_IDS.growth`.

## Open questions
- Email verification required before pairing a device, or only before the trial ends.

## How to work
1. Read the files above. Ask about anything unclear before planning.
2. Write a plan: files to add or change, migrations, endpoints, components, tests. Wait for approval.
3. Build in this order, stopping after each step for review: migration → server logic and tests → API → screens.
4. Finish with the Definition of Done checklist from CLAUDE.md, ticked.
