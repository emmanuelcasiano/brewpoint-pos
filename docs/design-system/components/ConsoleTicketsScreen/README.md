Support tickets from shops, answered inside BrewPoint. Optional: skip this screen and its two tables if you use an outside help desk.

**Built from:** `bp-app` with `<nav data-adminnav="tickets">`, `bp-pagehead`, a `bp-toolbar`, and a `bp-split--wide` of a DataTable beside a ticket `bp-drawer` with a `bp-thread` of `bp-msg` bubbles (`bp-msg--staff` for replies).

**The consumer provides** `support_tickets` and `support_ticket_messages`, the shop and requester, device context, and any related support access grant.

- Tickets start from the shop back-office Help button, which attaches the device, app version and last sync automatically.
- Statuses: Waiting on us (`info`), Urgent (`warning`, money or selling blocked), Waiting on shop (neutral), Solved (`success`).
- Replies are emailed to the shop and shown in their back-office.
