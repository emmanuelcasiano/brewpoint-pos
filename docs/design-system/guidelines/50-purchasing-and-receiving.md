# Purchasing and receiving

How stock gets into BrewPoint: ordered from a supplier on a purchase order, then received as one delivery with many items. Purchasing sits in its own side-navigation group, after Menu and stock, with two pages: Purchase orders and Suppliers.

## The flow

1. **Something needs ordering.** A Low stock or Out of stock alert, the Reorder suggestions card, or the owner's own plan.
2. **Draft.** "Create purchase order" (from an alert), "Add to order" (from an Inventory item) or "New purchase order" puts items on a draft for that item's default supplier. One open draft per supplier per branch; new items join it.
3. **Send.** The editor holds many lines. "Send to supplier" emails a PDF and marks the order Sent; "Download PDF" is for Viber or print. Orders over the approval amount (default ₱10,000.00) need `purchase.approve`.
4. **Receive.** When the delivery arrives, open the order and choose "Receive delivery". Every line is prefilled with the ordered quantity and cost; the receiver changes what differs, and fills batch code and expiry for perishables.
5. **Short or extra.** If anything is short, choose once: keep the rest on order (Partly received) or close the order (Received).
6. **Done.** One action adds a batch per line, updates average and last cost, resolves the stock alerts it covers, and writes the audit log.

A delivery without an order (the baker drops off extra, a quick market run) uses "Receive without an order": the same receiving screen with a supplier picker and an empty table, so it can still hold many items.

## Statuses

| Status | Chip | Means |
| --- | --- | --- |
| Draft | neutral, edit | Being built. Not sent. Editable. |
| Sent | `info`, mail | Sent to the supplier. Edit by cancelling and copying. |
| Arriving today | `info`, truck | Sent, expected date is today. |
| Partly received | `warning`, alert | Some lines or quantities still to come. |
| Received | `success`, check | Everything received, or closed short. |
| Cancelled | neutral, x | Will not arrive. Kept for the record. |

## Quantities and costs

- Each item has a **reorder point** (when to order) and an **order up to** level (how much to have after the delivery). Suggested quantity = order up to − on hand − already on order, rounded up to whole supplier packs.
- Orders are in the supplier's pack ("6 boxes", "10 sleeves"); stock shows both units after receiving ("16.75 boxes, 16,750 ml").
- Cost on an order defaults to the last price paid. A received cost that differs is flagged "Price changed" and becomes the new last price; average cost is weighted by quantity.

## Where it shows up

- **Purchase orders page:** open, draft and received orders; Reorder suggestions with the order that covers each low item, so nobody orders twice.
- **Inventory item drawer:** "On order: 12 boxes, PO-0044, Sep 29".
- **Alerts:** a low item already on an order says so ("On PO-0044, arriving Sep 29") and its Create purchase order button becomes View order.
- **Dashboard:** "Arriving today" in the Stock alerts card when a delivery is due.
- **Reports:** Purchases by supplier, and Inventory movement shows each receipt.

## Permissions

`purchase.view`, `purchase.create` (build and send), `purchase.approve` (over the approval amount), `inventory.receive` (receive deliveries), `supplier.manage`. Owners and Managers have all; Inventory Clerks can view, create and receive but not approve.
