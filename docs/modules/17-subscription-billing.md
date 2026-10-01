# Module 17: Subscription billing

## Goal
Shops pay BrewPoint monthly or yearly. Cards are charged automatically through Stripe, GCash shops get a monthly invoice with a payment link, and unpaid shops are warned, then paused.

## Depends on (already built)
- Modules 07 and 16.

## Read before planning
- CLAUDE.md (Billing rules)
- docs/design-system/components/SubscriptionScreen/README.md and preview.html (shop side)
- docs/design-system/components/ConsoleBillingScreen/README.md, ConsolePlansScreen/README.md (what staff will see in Module 18 and 19)
- docs/design-system/guidelines/20-offline-and-license-states.md (trial, payment failed, suspended banners)
- docs/database/schema.sql: plans, plan_prices, subscriptions, invoices, invoice_lines, billing_customers, payment_methods, payment_events, credit_notes

## Data
- Owns: plan_prices, subscriptions, invoices, invoice_lines, billing_customers, payment_methods, payment_events, credit_notes
- Reads only: plans, tenants, devices, users, branches (usage against limits)
- Writes: tenants.status, tenant_events (trial ended, suspended, reactivated)
- Schema changes: none

## In scope
- A provider interface (createCustomer, attachPaymentMethod, startSubscription, changePlan, cancel, createInvoice, createPaymentLink) with a Stripe implementation and a Manual implementation (GCash payment link or bank transfer).
- Stripe customer per shop (billing_customers), card payment method, subscription on the shop's plan price version.
- Webhook endpoint: verify signature, store in payment_events (unique provider_event_id), process once, update invoices and subscriptions.
- Invoices with lines and 12% VAT shown separately; PDF invoice.
- GCash path: monthly invoice with payment_link_url emailed to the owner; marked paid by the provider event or manually (Module 19 console).
- Trial: reminders at 7 and 2 days before the end; at the end, a plan must be chosen.
- Failed payment: warning banner and StatusChip "Payment failed"; grace period 7 days; then tenants.status suspended and the POS license stops renewing (selling pauses, closing and viewing still work).
- Shop Subscription screen: plan, usage meters, plans with monthly or yearly, payment method, billing history.
- Plan limits enforced (devices, branches, users) from the plan with overrides (overrides UI in Module 19).

## Out of scope (do not build)
- Staff console billing screens (Modules 18, 19). PayMongo or Xendit implementations (later, behind the same interface).

## Business rules
- Prices are versions in plan_prices; a shop keeps its version until moved with 30 days' notice.
- Prices include 12% VAT.
- Yearly = 10 times the monthly price (2 months free).
- A webhook processed twice changes nothing the second time.
- Changing plan takes effect now with proration by the provider.

## Permissions
- billing.manage for the shop Subscription screen.

## Audit
- Shop audit_log: "Changed plan to Multi-branch", "Added a card ending 4242". tenant_events for status changes.

## Offline behaviour
- Devices learn about suspension through the license on sync (Module 06). Suspension never deletes data.

## Screens
- SubscriptionScreen, trial and payment banners in back-office and POS, suspended lock screen text.

## Acceptance criteria
- [ ] In Stripe test mode, a shop adds a test card, chooses Growth monthly and gets a paid invoice with VAT on its own line.
- [ ] Replaying the same Stripe webhook does not create a second payment or change the invoice twice.
- [ ] A failed card shows the warning banner; after the grace period the shop is suspended and the POS pauses selling at its next sync.
- [ ] A GCash shop receives an invoice email with a payment link; marking it paid reactivates a suspended shop.

## Test cases
- Given the Growth v1 shop at ₱1,299.00 and a new v2 at ₱1,499.00, then the shop keeps paying ₱1,299.00 until moved.

## Decisions already made
- Stripe first, provider-neutral design. GCash by monthly payment link.
- From Module 02: plans and plan_prices are seeded with fixed IDs: Starter v1 ₱699.00, Growth v1 ₱1,299.00 (Jan 5 to Jul 31, 2026) and v2 ₱1,499.00 (from Aug 1, 2026), Multi-branch v1 ₱3,499.00; yearly is 10 × monthly. `plans.features` holds cumulative keys (Growth includes Starter's); refine them here if needed.
- From Module 02: `brewpoint_app` can only read `payment_events`, and sees only its own shop's rows. Webhooks (often before the shop is known) are written by `brewpoint_platform`, which has cross-shop access to the billing tables through `platform_all` policies.

## Open questions
- Stripe account entity: Stripe does not list the Philippines as a supported country. Decide the business entity that owns the Stripe account, or start with PayMongo or Xendit behind the same interface.
- Official receipts for your subscription fees (BIR): confirm with an accountant.

## How to work
1. Read the files above. Ask about anything unclear before planning.
2. Write a plan: files to add or change, migrations, endpoints, components, tests. Wait for approval.
3. Build in this order, stopping after each step for review: migration → server logic and tests → API → screens.
4. Finish with the Definition of Done checklist from CLAUDE.md, ticked.
