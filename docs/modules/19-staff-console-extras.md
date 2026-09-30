# Module 19: Staff console extras

## Goal
The staff console covers the rest of running BrewPoint: billing recovery, plan prices, feature flags, app releases, announcements, data requests and support tickets. Build each part when you need it; they are independent.

## Depends on (already built)
- Module 18.

## Read before planning
- CLAUDE.md
- docs/design-system/guidelines/60-staff-console.md
- READMEs and previews: ConsoleBillingScreen, ConsolePlansScreen, ConsoleFlagsScreen, ConsoleReleasesScreen, ConsoleAnnouncementsScreen, ConsoleDataRequestsScreen, ConsoleTicketsScreen
- docs/database/schema.sql: the tables listed per part below

## Parts (build in this order, each as its own session)

### 19a. Billing overview
- Tables: invoices, invoice_lines, payment_events, credit_notes (read and act).
- Invoices across shops, payment events per invoice, resend GCash payment link, mark paid manually (reason), issue credit note (reason). Needs billing.manage (platform).
- Accept: marking a GCash invoice paid reactivates a suspended shop and logs both actions.

### 19b. Plans and prices
- Tables: plans, plan_prices.
- Plan cards, price history by version, new price creates a new version, "plan the move" for shops on an old version with a 30-day notice (uses announcements or email).
- Accept: creating Growth v3 never changes what v1 and v2 shops pay.

### 19c. Feature flags and limit overrides
- Tables: feature_flags, tenant_feature_overrides.
- Rollout Off, Chosen shops, Plans, Everyone; per-shop limit overrides with an end date. Devices read flags on pull.
- Accept: turning kitchen_display on for one shop shows it only in that shop after sync.

### 19d. App releases and device errors
- Tables: app_releases, device_error_reports (devices send reports through sync).
- Release list with device counts, minimum version with warn-from and required-from dates, grouped errors.
- Accept: a device below the minimum after the required date must update before selling, but never mid-shift (applies when the register is next opened).

### 19e. Announcements
- Tables: announcements, announcement_reads.
- Composer with audience (all, plans, chosen shops), back-office banner and email, schedule, preview; owners dismiss. Never shown on the POS.
- Accept: a scheduled announcement appears at its time for the chosen audience only.

### 19f. Data requests
- Tables: data_requests (and every tenant table for export or delete).
- Export: a downloadable archive of every table for the tenant. Delete: identity check, export first, delete tenant data, keep invoices and tax records with personal details removed. Superadmin only, shop name typed to confirm.
- Accept: after deletion no tenant rows remain except retained billing records, and the request shows each step with who and when.

### 19g. Support tickets (optional)
- Tables: support_tickets, support_ticket_messages.
- Help button in the shop back-office creates a ticket with device and app version; console inbox and thread; replies emailed; link to support access.
- Skip this part if you use an outside help desk.

## Business rules (all parts)
- Every action asks for a reason where it changes a shop, and writes platform_audit_log (and tenant_events if it changes a shop).
- Follow the screen READMEs for statuses and wording.

## Open questions
- Data request deadlines: set from your privacy policy and the Data Privacy Act of 2012 (confirm with a lawyer).

## How to work
1. Read the files above. Ask about anything unclear before planning.
2. Write a plan: files to add or change, migrations, endpoints, components, tests. Wait for approval.
3. Build in this order, stopping after each step for review: migration → server logic and tests → API → screens.
4. Finish with the Definition of Done checklist from CLAUDE.md, ticked.
