# Layout and touch

## Landscape tablet POS

- Lay out the working screen as three regions in one row: category rail (`rail-width`, 132px), product grid (fills the rest, `auto-fill` columns of at least `tile-min`, 148px) and the cart (`cart-width`, 384px, sticky). Keep the cart on screen at all times; it is the cashier's receipt in progress.
- Put the top bar (`topbar-height`, 64px) above all three: shop and device on the left, register state, then the sync chip and the signed-in user on the right.
- Keep the Pay button pinned at the bottom of the cart at `target-key` height. The total sits directly above it in `amount-lg`.
- Order the tile grid by category, then by the shop's sort order. Never reorder by recent use; muscle memory beats cleverness.
- Show an out-of-stock tile dashed and dimmed with an "Out" chip, and keep it in place. Never remove it.
- Open modals over the working screen with a scrim. The approval prompt and the PIN prompt are the only modals a sale can hit.

## Screens, in the order a shift meets them

| Screen | Layout | Primary action |
|---|---|---|
| PIN login | Centered PIN dots and numpad, user picker above | Numpad confirm |
| Open register | Centered form: float amount (money field, numpad), device and cashier shown | "Open register" |
| POS | Rail, grid, cart | "Pay" |
| Checkout | Total in `amount-xl`, payment method segmented row, cash keypad or reference field | "Confirm payment" |
| Close register | Expected versus counted cash, variance readout, note or approver | "Close register" |

## Back-office (desktop)

- Use the side navigation (`sidenav-width`, 248px, on `brand`) beside a content column with a `space-6` gutter. Group destinations as Sell, Menu and stock, People, Business.
- Present lists as the DataTable: 44px rows or taller, money right-aligned in tabular figures, a status chip in the last column, a selected row in `accent-soft`.
- Edit roles in the PermissionMatrix. Edit products in a two-column form (fields left, live tile preview right).
- Use `target-min` (44px) controls here, since a mouse or trackpad is the main input. Keep POS-sized controls on anything that may be opened on a tablet.

## Portrait and small screens

- On a portrait tablet, move the category rail to a horizontal scroller above the grid and turn the cart into a bottom panel showing the total and Pay, expandable to the full list.
- The POS is not designed for phones. The back-office may be read on a phone: stack the side navigation into a menu button and let tables scroll horizontally inside their own container.

## Safe areas and print

- Pad fixed bars with `env(safe-area-inset-*)` so the Pay button clears the iPad home indicator.
- Print receipts from the Receipt component on a `@page` of `58mm auto` or `80mm auto` with zero margin. Print in one ink, with no accent and no shadows.
