The Inventory page: what is on hand in both units, what it is worth, and what needs action, with stock received as dated batches.

**Built from:** `bp-app` with `<nav data-sidenav="inventory">`, `bp-pagehead` with Count stock, Adjust and a primary Receive stock, StatTiles, a `bp-toolbar` of filter chips and search, and a `bp-split` of a DataTable beside an item `bp-drawer` (a `bp-kv` of stock settings and what is on order, a batch table, and Record waste, Adjust and Add to order).

**The consumer provides** items with pack unit and base unit, on-hand quantity, reorder point, average cost (in the item's detail), value, the next batch expiry and status; suppliers; and the result of a receipt before it is saved.

- Show every quantity twice: the pack ("4.75 boxes") over the base unit ("4,750 ml"). Reorder points are entered in packs and stored in base units.
- "Needs attention" is the same set as the stock alerts and the side-nav Inventory count.
- Receive stock does not add one item here. It opens ReceiveDeliveryScreen: pick the purchase order that arrived (its lines are prefilled), or Receive without an order for a walk-in delivery. Either way one delivery holds many items.
- Add to order puts the item on its default supplier's open draft purchase order, or starts one, with the suggested quantity (order up to minus on hand).
- Receiving stock always asks for the batch code and expiry date for anything perishable; the expiry drives the Expiry tracking page and alerts. Pieces without expiry (cups) skip both fields.
- Average cost updates on receipt (weighted by quantity); preview it before saving.
- Count stock is a full count that sets on-hand; Adjust is a single change with a required reason (spill, breakage, found). Both go to the audit log; large adjustments need `inventory.adjust.approve`.
