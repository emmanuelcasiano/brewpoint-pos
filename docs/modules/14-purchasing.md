# Module 14: Purchasing and receiving

## Goal
Owners order stock from suppliers with purchase orders holding many items, and receive each delivery in one step that records every line's quantity, cost, batch and expiry.

## Depends on (already built)
- Module 13 (inventory operations).

## Read before planning
- CLAUDE.md
- docs/design-system/guidelines/50-purchasing-and-receiving.md
- READMEs and previews: PurchaseOrdersScreen, PurchaseOrderEditScreen, ReceiveDeliveryScreen, SuppliersScreen, InventoryScreen (item drawer "Add to order")
- docs/database/schema.sql: suppliers, supplier_items, purchase_orders, purchase_order_lines, goods_receipts, goods_receipt_lines

## Data
- Owns: suppliers, supplier_items, purchase_orders, purchase_order_lines, goods_receipts, goods_receipt_lines
- Writes through Module 08: batches, stock_movements (reason receipt), item_branch_settings (avg_cost, last_cost, default_supplier_id)
- Reads only: inventory_items, item_branch_settings
- Schema changes: none

## In scope
- Suppliers: list, add, edit, items and last prices, order days, lead time, minimum order, terms.
- Purchase orders: list with statuses and tabs, reorder suggestions with "covered by", new or edit draft (many lines, add row search, suggestions, totals, minimum order check), send by email with PDF, download PDF, cancel, copy.
- Receive delivery: from an order (lines prefilled) or without an order (empty table with supplier); received quantity, cost, batch code (generated), expiry (from shelf days); short and price-changed flags; keep rest on order or close; delivery receipt number; one "Receive N items" action.
- "Add to order" from an Inventory item and "Create purchase order" from alerts (Module 15 wires the alert button) add to the supplier's open draft or start one.
- Purchases by supplier report (added to ReportView).

## Out of scope (do not build)
- Supplier payments or accounts payable. Alerts engine (Module 15).

## Business rules
- One open draft per supplier per branch; new items join it.
- Suggested quantity = order up to − on hand − already on order, rounded up to whole supplier packs.
- PO numbers run per shop: PO-0001, PO-0002.
- A sent order is changed by cancelling and copying it.
- Orders above ₱10,000.00 need purchase.approve before sending.
- Receiving adds one batch and one movement per line, updates average cost (weighted) and last cost, and marks the order Partly received or Received.
- A received cost that differs from the order is flagged and becomes the new last price.

## Permissions
- purchase.view, purchase.create, purchase.approve, inventory.receive, supplier.manage.

## Audit
- "Sent PO-0043 to Mindanao Bakehouse (₱3,084.00)", "Received PO-0043: 66 items, 6 Butter Croissant short, kept on order", "Ensaymada price changed from ₱35.00 to ₱38.00 on receipt".

## Offline behaviour
- Back-office only, online.

## Screens
- PurchaseOrdersScreen, PurchaseOrderEditScreen, ReceiveDeliveryScreen, SuppliersScreen per their READMEs; Inventory item drawer Add to order.

## Acceptance criteria
- [ ] Receiving PO-0043 with 30 of 36 croissants and Ensaymada at ₱38.00 gives received value ₱2,868.00, marks the order Partly received, and creates 3 batches.
- [ ] A low item already on an open order is not suggested again.
- [ ] Receive without an order accepts many lines and a supplier.
- [ ] An order over ₱10,000.00 cannot be sent without purchase.approve.

## Test cases
- Given on hand 0.5 box, order up to 6 boxes and nothing on order, then suggested is 6 boxes (5.5 rounded up).

## Decisions already made
- Orders are per supplier and per branch. Email sends a PDF from the shop's name.
- From Module 02: brewpoint_app may DELETE only from role_permissions, user_assignments, product_modifier_groups, recipe_lines, modifier_recipe_lines, supplier_items, pairing_codes and purchase_order_lines; everything else is voided, cancelled or deactivated with a status column. A new DELETE needs a grant in a new migration.

## Open questions
- Email sending service (for example Postmark, Resend or SES), shared with Module 15.

## How to work
1. Read the files above. Ask about anything unclear before planning.
2. Write a plan: files to add or change, migrations, endpoints, components, tests. Wait for approval.
3. Build in this order, stopping after each step for review: migration → server logic and tests → API → screens.
4. Finish with the Definition of Done checklist from CLAUDE.md, ticked.
