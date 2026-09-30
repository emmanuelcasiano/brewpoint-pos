The product button in the POS grid, with the category rail beside it: name, price, an optional stock chip and a quantity badge once it is in the cart.

**Classes:** `bp-rail` with `bp-rail__item` (set `aria-current="true"` on the active one); `bp-grid` containing `bp-tile` with `bp-tile__name`, `bp-tile__foot`, `bp-tile__price`; add `is-selected` (with a `bp-tile__qty` badge) or `is-out`.

**The consumer provides** the product name, the price in integer centavos formatted with `BrewPoint.formatPeso`, the in-cart quantity, and a stock state derived from the local inventory preview.

- Make the whole tile the tap target, at least 112px tall and `tile-min` (148px) wide, and keep 8px between tiles.
- Cap the name at two lines. Never truncate the price.
- Show a "Low, N left" chip only for tracked products at or below their reorder level. Show an "Out" chip and the dashed, dimmed tile for zero or negative stock, and keep it in the grid. A tap on an out-of-stock tile explains why instead of adding it, unless the shop allows overselling.
- A tap adds one. Products with required modifiers open the modifier picker first.
- Do not use color or a photo to tell products apart; the name is the identity.
- Do not show the recipe's ingredients or cost on the tile.
- Tokens: `surface-raised`, `border`, `accent-soft`, `accent-strong`, `accent`, `on-accent`, `warning`, `danger`, `radius-lg`, `tile-min`, `rail-width`.
