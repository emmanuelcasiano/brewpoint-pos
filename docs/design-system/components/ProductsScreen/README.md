The Products page: the menu the POS sells, with each product's price, recipe and margin.

**Built from:** `bp-app` with `<nav data-sidenav="products">`, `bp-pagehead` with Import CSV and a primary Add product, a `bp-toolbar` of `bp-tabs` categories and `bp-search`, and a `bp-split--wide` of a DataTable (`bp-cell` with `bp-thumb`, a `bp-switch` for POS visibility) beside an editing `bp-drawer` (`bp-formgrid`, `bp-money`, modifier chips, a recipe table with a cost `tfoot`).

**The consumer provides** the products with category, price, recipe lines in base units with their current average cost, modifiers, visibility and stock status.

- Recipe cost comes from the ingredients' average cost; margin = (price − cost) ÷ price. Show both, so a price change shows its effect before saving.
- A recipe uses base units ("18 g", "180 ml", "1 pc"). Selling a product takes those amounts out of Inventory, which is what drives low stock and out of stock.
- The On POS switch hides a product from every register without deleting it; Hidden is neutral, with a lock icon.
- Out of stock is decided by Inventory, not set here; the product shows the chip and the POS tile turns off by itself.
- Price changes need `catalog.price.edit`, reach registers at the next sync, and are written to the audit log with the old and new price.
