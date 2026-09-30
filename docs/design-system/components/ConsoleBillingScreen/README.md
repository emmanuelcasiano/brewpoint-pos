Billing across all shops: invoices, what the payment provider reported, and how to recover a failed payment.

**Built from:** `bp-app` with `<nav data-adminnav="billing">`, `bp-pagehead`, StatTiles, `bp-tabs` (Invoices, Payment events, Credit notes), and a `bp-split--wide` of the invoices DataTable beside an invoice `bp-drawer` (`bp-sumrow` lines, a `bp-timeline` of provider events, recovery actions).

**The consumer provides** `invoices` with `invoice_lines`, `payment_events` received from the provider's webhooks, `credit_notes`, `billing_customers` and `payment_methods`.

- Provider-neutral: every row names its provider (Stripe now; PayMongo or Xendit later). Webhooks land in `payment_events` first, are processed once (idempotent by the provider's event ID), then update the invoice.
- GCash shops are billed by invoice with a payment link each month, since automatic GCash charges are not available from these providers; "Send GCash payment link" resends it.
- A failed card is retried on the provider's schedule. The shop gets a warning banner at the first failure and selling pauses after the grace period (7 days).
- "Mark paid manually" (a bank transfer, for example) and credit notes need `billing.manage` and a reason, and are written to the staff audit log.
- Prices shown include 12% VAT; the invoice lists VAT on its own line.
