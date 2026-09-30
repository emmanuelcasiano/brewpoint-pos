The Suppliers page: who supplies what, how fast, and at what price.

**Built from:** `bp-app` with `<nav data-sidenav="suppliers">`, `bp-pagehead` with a primary Add supplier, a `bp-toolbar`, and a `bp-split` of a DataTable beside a supplier `bp-drawer` (`bp-kv` details, a price-list table, New order).

**The consumer provides** suppliers with contact, order email, order days, lead time, minimum order, terms, the items linked to each with last price and date, open orders and spend.

- Lead time and order days set the earliest expected date on a new order and the reorder suggestion's timing.
- An item can have several suppliers; one is the default the reorder suggestion uses.
- Last price comes from the latest received delivery, not from what was typed on an order.
- Managing suppliers needs `supplier.manage`.
