# Module 13: Inventory operations and expiry

## Goal
Managers and clerks keep stock accurate: see every item in both units, count and adjust stock, record waste, and track batches by expiry date.

## Depends on (already built)
- Modules 08 (ledger) and 11 (sales deduct stock).

## Read before planning
- CLAUDE.md
- READMEs and previews: InventoryScreen, ExpiryScreen, DataTable, StatTile
- docs/design-system/guidelines/40-stock-alerts-and-notifications.md (Expired, Expiring soon definitions)
- docs/database/schema.sql: stock_counts, stock_count_lines, batches, stock_movements

## Data
- Owns: stock_counts, stock_count_lines
- Writes through Module 08: stock_movements (reasons count, adjustment, waste), batches
- Reads only: inventory_items, item_branch_settings, categories (expiry_warn_days), purchase orders (on order, empty until Module 14)
- Schema changes: none

## In scope
- InventoryScreen: KPIs (stock value, low, out, expired or expiring), filter chips (All, Needs attention, Ingredients, Packaging, Retail), search, table with on hand in two units, reorder point, stock value, next expiry, status chip; item drawer with batches, settings and actions.
- Stock count: start a count for all or some items, enter counted quantities (packs or base units), finish; differences become count movements.
- Adjust: one item, quantity change and required reason (spilled, broken, found, other).
- Record waste: item or batch, quantity, reason (expired, spoiled, spilled).
- ExpiryScreen: batches soonest first, window filter (Expired, 3 days, 30 days, All), status chips, "Record as waste" on expired batches, Waste this month chart.
- Inventory reports: Inventory movement, Waste and expiry (added to Module 12 ReportView tabs).

## Out of scope (do not build)
- Receiving from suppliers (Module 14): the "Receive stock" button can link to a placeholder until then. Alerts and notifications (Module 15).

## Business rules
- Item status: Out of stock at 0 or below; Low at or below reorder point; Expired batch when a batch with stock has passed expiry; Expires in N days inside the category window (default 3, pastries 1).
- Large adjustments (more than 20% of on hand or over ₱1,000.00 in value) need inventory.adjust.approve.
- A count shows expected vs counted and the value of the difference before finishing.
- Waste lowers stock at the batch's cost and appears in the waste report.

## Permissions
- inventory.view, inventory.adjust, inventory.adjust.approve, inventory.waste, inventory.costs.view, report.inventory.view.

## Audit
- "Adjusted Oat milk by −0.5 box (500 ml). Reason: spilled", "Recorded 2 boxes (2,000 ml) of Fresh milk batch B-0921 as waste. Reason: expired", "Finished stock count at Main branch: 3 differences worth −₱120.00".

## Offline behaviour
- Back-office screens are online. If counts are later done on an iPad, they follow the Module 06 sync contract.

## Screens
- InventoryScreen and ExpiryScreen per their READMEs; count flow (list with counted inputs, review, finish); adjust and waste drawers.

## Acceptance criteria
- [ ] Every quantity shows pack and base units.
- [ ] Finishing a count creates one movement per difference and on_hand matches counted.
- [ ] An adjustment over the threshold asks for approval.
- [ ] Expiry list order and status chips match the rules for the seed batches.

## Test cases
- Given Fresh milk batch B-0921 expired Sep 27 with 2,000 ml, when recorded as waste, then on hand drops by 2,000 ml and the batch leaves the expiry list.

## Decisions already made
- Expiry windows come from categories.expiry_warn_days (default 3).
- From Module 05: Split, Drawer, Toolbar, FilterChip, SearchInput, DataTable (sub-lines for the base unit, selected row, clickable rows), StatTile and Chart are in `@brewpoint/ui`.

## Open questions
- Allow counts on the iPad in this module, or back-office only for now.

## How to work
1. Read the files above. Ask about anything unclear before planning.
2. Write a plan: files to add or change, migrations, endpoints, components, tests. Wait for approval.
3. Build in this order, stopping after each step for review: migration → server logic and tests → API → screens.
4. Finish with the Definition of Done checklist from CLAUDE.md, ticked.
