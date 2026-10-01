# Module 08: Inventory core (items and the stock ledger)

## Goal
Inventory items exist with their units, and every stock change in the product goes through one ledger that keeps on-hand correct, even with late offline syncs.

## Depends on (already built)
- Module 07 shop setup.

## Read before planning
- CLAUDE.md (section "Data": stock ledger and FEFO)
- docs/design-system/components/InventoryScreen/README.md (for the item model, not the full screen)
- docs/design-system/guidelines/40-stock-alerts-and-notifications.md (reorder point, batches)
- docs/database/schema.sql: inventory_items, item_branch_settings, batches, stock_movements

## Data
- Owns: inventory_items, item_branch_settings, batches, stock_movements
- Reads only: branches, suppliers (default_supplier_id may stay empty until Module 14)
- Schema changes: none

## In scope
- Create and edit inventory items: name, kind (ingredient, packaging, retail), base unit (ml, g, pc), pack unit and size (1 L box = 1000 ml), perishable flag, default shelf days, barcode.
- Per branch: reorder point, order-up-to level, average cost, last cost.
- A single server function `recordMovement(branch, item, qtyDelta, reason, source, batch?)` that inserts stock_movements and updates on_hand and batch qty_remaining in one transaction.
- FEFO: outgoing movements take from the batch that expires first (no-expiry batches last); one outgoing change may split across batches.
- An opening-stock action (reason count) to set starting quantities with a batch.
- Unit helpers in packages/shared: base to pack and back, and the two-unit display ("4.75 boxes (4,750 ml)").
- A basic item list and item editor in the back-office (the full Inventory screen comes in Module 13).

## Out of scope (do not build)
- Counts, adjustments, waste, expiry screens (Module 13). Receiving from suppliers (Module 14). Alerts (Module 15).

## Business rules
- No code path updates on_hand except recordMovement.
- on_hand may go negative (an offline sale after stock ran out); that is allowed and flagged later by alerts.
- Average cost is weighted by quantity on every incoming movement.
- Movements are never edited or deleted; a mistake is corrected by a new movement.

## Permissions
- inventory.view to see, catalog.manage or settings.manage to create items (decide), inventory.costs.view to see costs.

## Audit
- "Added inventory item Oat milk (1 L box)", "Set opening stock of Fresh milk to 4.75 boxes (4,750 ml)".

## Offline behaviour
- Movements from devices (sales) arrive via sync and are applied in device order; on_hand is recomputed correctly regardless of arrival order.

## Screens
- Item list (simple DataTable) and item editor drawer.

## Acceptance criteria
- [ ] on_hand always equals the sum of movements for that item and branch (property test with random movements).
- [ ] An outgoing movement of 2,500 ml takes 2,000 ml from the batch expiring Sep 27 and 500 ml from the one expiring Oct 2.
- [ ] Two movements applied concurrently leave a correct on_hand (no lost update).

## Test cases
- Given batches A (exp Sep 27, 2,000 ml) and B (exp Oct 2, 2,750 ml), when 2,500 ml goes out, then A is 0 and B is 2,250.

## Decisions already made
- Base units only in storage: ml, g, pc.
- From Module 02: `numeric` columns (stock in base units, costs per base unit) come back from the driver as strings; decide here how they are read. `item_branch_settings.avg_cost`, `last_cost` and `batches.unit_cost` stay `numeric` because they can be fractions of a centavo. `stock_movements` is append-only by grant (SELECT and INSERT only).

## Open questions
- Which permission creates inventory items: catalog.manage or a new inventory.manage. Recommendation: add inventory.manage.

## How to work
1. Read the files above. Ask about anything unclear before planning.
2. Write a plan: files to add or change, migrations, endpoints, components, tests. Wait for approval.
3. Build in this order, stopping after each step for review: migration → server logic and tests → API → screens.
4. Finish with the Definition of Done checklist from CLAUDE.md, ticked.
