The Purchase orders page: every order to a supplier, from draft to received, and which low items are already on order.

**Built from:** `bp-app` with `<nav data-sidenav="purchases">`, `bp-pagehead` with Receive without an order and a primary New purchase order, StatTiles, a `bp-toolbar` of status `bp-tabs`, supplier filter and search, and a `bp-split` of the orders DataTable and a Reorder suggestions card beside an order `bp-drawer` (`bp-sumrow` lines, a `bp-timeline`).

**The consumer provides** orders with number, supplier, dates, line count, total in centavos and status; each order's lines and history; and the reorder suggestions with the order that covers each one.

- Statuses: Draft (neutral, edit), Sent (`info`, mail), Arriving today (`info`, truck), Partly received (`warning`), Received (`success`), Cancelled (neutral, x).
- An order holds many items from one supplier. "New purchase order" opens PurchaseOrderEditScreen; "Receive delivery" opens ReceiveDeliveryScreen for that order.
- Reorder suggestions list every item at or below its reorder point, the suggested quantity (order-up-to level minus on hand, rounded up to whole packs), and the open order that already covers it, so nobody orders twice.
- "Create purchase order" on a Low stock or Out of stock alert adds the item to that supplier's open draft, or starts one.
- Numbers run per shop: PO-0001, PO-0002. A sent order is edited by cancelling and copying it, so the supplier never holds a stale version.
