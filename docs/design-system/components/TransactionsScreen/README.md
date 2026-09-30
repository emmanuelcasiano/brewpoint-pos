The Transactions page: find any sale, see what was on it, and reprint, refund or void it.

**Built from:** `bp-app` with `<nav data-sidenav="transactions">`, `bp-pagehead` with Export CSV, a `bp-toolbar` (`bp-search` and `bp-select` filters), a `bp-split` of a DataTable (`is-link` rows, `is-selected` for the open one) and a `bp-pager`, beside a `bp-drawer` (`bp-kv`, `bp-sumrow` lines, actions in `bp-drawer__foot`).

**The consumer provides** the sales for the filters (paged on the server), each sale's lines, payments, discounts and approvals, and the actions the user may take.

- Statuses: Paid (`success`, check), Refunded (neutral, refresh), Voided (`danger`, x), Not synced (neutral, wifi-off). A sale saved on an offline device shows here as Not synced with the device name until it arrives.
- Search matches receipt numbers (ACK-T1-000123) and item names. Filters sit in one row above the table.
- Refund and Void open the PinPrompt when the user's permission needs a manager's approval; the reason is required and goes to the audit log.
- Only a Paid, synced sale can be refunded or voided. A voided sale keeps its receipt number and stays in the list.
- Show who approved any discount, refund or void in the drawer, by name.
