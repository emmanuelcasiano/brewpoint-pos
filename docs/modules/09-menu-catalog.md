# Module 09: Menu (catalog)

## Goal
Owners set up what the POS sells: categories, products with prices, add-ons like oat milk, and the recipe each product uses from inventory.

## Depends on (already built)
- Module 08 inventory core.

## Read before planning
- CLAUDE.md
- docs/design-system/components/ProductsScreen/README.md and preview.html
- docs/design-system/components/ProductTile/README.md (how products show on the POS)
- docs/database/schema.sql: categories, products, modifier_groups, modifiers, product_modifier_groups, recipe_lines, modifier_recipe_lines

## Data
- Owns: categories, products, modifier_groups, modifiers, product_modifier_groups, recipe_lines, modifier_recipe_lines
- Reads only: inventory_items, item_branch_settings (costs)
- Schema changes: none

## In scope
- Categories: add, rename, reorder, set expiry warning days (pastries 1).
- Products: name, category, price, visible on POS switch, sort order.
- Modifier groups (for example Milk: min 0, max 1) and modifiers with price deltas; attach groups to products.
- Recipes: lines of inventory item and quantity in base units; modifier recipe deltas (Oat milk: fresh milk −180 ml, oat milk +180 ml).
- Recipe cost and margin computed from average costs, shown live while editing.
- Import products from CSV.
- The POS pulls the menu (via Module 06) and shows categories and tiles (tile states: normal, selected, out of stock placeholder).

## Out of scope (do not build)
- Selling (Module 11). Out-of-stock state logic (Module 13 and 15 decide it; here only the tile state exists).

## Business rules
- Margin = (price − recipe cost) ÷ price, shown to one decimal.
- Price changes reach registers at the next sync.
- Hiding a product never deletes it; past sales keep their name snapshot.
- A product can be sold without a recipe (warn: "No recipe. Selling it will not change stock.").

## Permissions
- catalog.view to see, catalog.manage to edit, catalog.price.edit to change prices, inventory.costs.view to see costs and margins.

## Audit
- "Changed the price of Iced Latte from ₱140.00 to ₱145.00" (sensitive), "Added Oat milk (+₱30.00) to Milk".

## Offline behaviour
- The POS uses the last menu it pulled. A price changed in the back-office applies to POS sales after that device syncs.

## Screens
- ProductsScreen per its README (tabs, table, editor drawer with recipe table).
- POS category rail and product grid (read-only here).

## Acceptance criteria
- [ ] Iced Latte recipe (18 g beans, 180 ml milk, 15 ml syrup, 1 cup) shows cost ₱41.00 and margin 71.7% with the seed costs.
- [ ] A price change appears on a paired POS after its next sync.
- [ ] A CSV import of 20 products creates them with categories and reports rows it skipped.

## Test cases
- Given Iced Latte with Oat milk, then the recipe used is 18 g beans, 0 ml fresh milk, 180 ml oat milk, 15 ml syrup, 1 cup.

## Decisions already made
- Recipes are in base units; modifiers can change recipes.

## Open questions
- Product images: none for now (tiles are text only), or add later.

## How to work
1. Read the files above. Ask about anything unclear before planning.
2. Write a plan: files to add or change, migrations, endpoints, components, tests. Wait for approval.
3. Build in this order, stopping after each step for review: migration → server logic and tests → API → screens.
4. Finish with the Definition of Done checklist from CLAUDE.md, ticked.
