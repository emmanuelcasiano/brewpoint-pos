One shop's account seen by staff: who they are, what they pay, what they use, and what staff can do to the account.

**Built from:** `bp-app` with `<nav data-adminnav="shops">`, `bp-pagehead`, `bp-tabs` (Overview, Billing, Devices, Users, Features, Activity), and a `bp-split` of Account and Subscription cards, a usage card of `bp-meter`, a devices table, beside an Actions card and a `bp-timeline` history.

**The consumer provides** the tenant, its subscription, price version and billing provider, usage against limits, devices with app version and license, the allowed staff actions, and `tenant_events`.

- Staff see the account, never the shop's sales, stock or customers, until a support access grant is active.
- Every action (extend trial, change plan, override, suspend) asks for a reason, writes a `tenant_events` row and a `platform_audit_log` row, and is shown in the history.
- Suspend is a `danger` button and asks for confirmation with the shop name typed in.
- The price version shows which `plan_prices` row the shop pays, so a later price change does not change theirs silently.
