The cart panel: one line per item with its modifiers, a quantity stepper, a remove action, then the discount, total and Pay button.

**Classes:** `bp-cart` containing `bp-cartline` (`bp-cartline__name`, `bp-cartline__total`, `bp-cartline__mods`, `bp-cartline__ctl` with a `bp-stepper`), then `bp-cart__foot` with `bp-sumrow` rows and `bp-sumrow--total`.

**The consumer provides** each line's name, modifier names with price adjustments, quantity, and line total in centavos, plus subtotal, discount and total.

- Keep the panel at `cart-width` (384px) beside the grid and pin the foot, with Pay, to the bottom.
- List modifiers under the name in `ink-muted`, one per line, with their price adjustment.
- Make stepper buttons 56px squares. Decreasing from 1 asks nothing; it removes the line, and the Remove button does the same in one tap.
- Show the discount as its own row with the percentage or amount. A discount over the user's limit opens the PinPrompt before it is applied.
- Right-align every amount in tabular figures. The total is `amount-lg` bold; the Pay button repeats it.
- Do not edit prices in the cart. A price override is a separate approved action.
- Tokens: `surface-raised`, `border`, `border-strong`, `ink-muted`, `target-pos`, `cart-width`, `radius-lg`.
