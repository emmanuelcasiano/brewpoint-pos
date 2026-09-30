The Audit log page: a permanent record of who did what, when and on which device.

**Built from:** `bp-app` with `<nav data-sidenav="audit">`, `bp-pagehead` with Export CSV, a `bp-toolbar` (search, date, person, area, a Sensitive only chip), a DataTable, and a `bp-pager`.

**The consumer provides** entries with time, actor (or System), a readable sentence, the permission code, the device or Back-office, and whether the action is sensitive.

- Write each entry as a sentence with the real values: "Changed the price of Iced Latte from ₱140.00 to ₱145.00". Put the permission code under it in mono.
- Sensitive actions (voids, refunds, discounts over limit, price changes, variance approvals, role and user changes, device revokes) get the `warning` Sensitive chip.
- Actions done offline are logged with the time they happened on the device, and "(synced from T2)" when the server recorded them later.
- The log is read-only and kept for the life of the account. Export uses the current filters.
- Viewing needs `audit.view`; Managers see their branch.
