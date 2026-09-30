The Subscription page: the plan, how much of it is used, and how to pay. Only people with `billing.manage` see it.

**Built from:** `bp-app` with `<nav data-sidenav="subscription">`, `bp-pagehead`, a trial `bp-banner`, a `bp-dash--2` of a plan card (`bp-kv`) and a usage card (`bp-meter`), a `bp-segmented` monthly or yearly switch, `bp-plans` of `bp-plan` cards (`is-current` for the active one), and billing history.

**The consumer provides** the plan, trial or renewal dates, payment method, usage against each limit, the plans with prices in centavos, and invoices.

- Say dates and amounts plainly: "Your trial ends Oct 7, 2026. Nothing is charged until then."
- A meter at 90% or more turns `warning` (`bp-meter--warning`) and names what happens at the limit.
- Payment methods: GCash, Maya, or a card. A failed payment shows the warning banner and the StatusChip "Payment failed"; selling continues for 7 days before the danger banner.
- Show the plan the shop is on as `is-current` with the primary button; changing plans takes effect now, with the price difference prorated.
- Invoices list date, amount, status and a PDF.
