# Module 11: POS sale and checkout

## Goal
A cashier rings up a sale on the iPad, takes payment, prints a receipt, and the sale deducts stock, online or offline. Managers can approve discounts, voids and refunds.

## Depends on (already built)
- Modules 08, 09, 10 (and 03 to 06 underneath).

## Read before planning
- CLAUDE.md
- docs/design-system/guidelines/10-layout-and-touch.md (POS layout, checkout, screens table)
- READMEs and previews: ProductTile, CartLine, Numpad, PinPrompt, Receipt, Navigation (top bar), Banner, StatusChip
- docs/design-system/components/TransactionsScreen/README.md (statuses; the screen itself is Module 12)
- docs/database/schema.sql: sales, sale_lines, sale_line_modifiers, sale_discounts, payments, refunds, refund_lines, discount_rules, tenant_payment_methods

## Data
- Owns: sales, sale_lines, sale_line_modifiers, sale_discounts, payments, refunds, refund_lines, discount_rules (seed defaults)
- Reads only: products, modifiers, recipe_lines, modifier_recipe_lines, register_sessions, tenant_payment_methods
- Writes through Module 08: stock_movements (reason sale, refund, void)
- Schema changes: none

## In scope
- POS working screen: category rail, product grid, cart (always visible), modifiers sheet, quantity stepper, hold order (optional).
- Discounts: Senior Citizen and PWD (with ID number), promo, manual; limits per role; approval by manager PIN above the limit.
- Checkout: total in amount-xl, payment method row (Cash, GCash, Card, Maya from tenant_payment_methods), cash keypad with quick amounts and change, reference number for GCash, card and Maya, split payment.
- Receipt number per device (ACK-T1-000123), receipt print on 58 or 80 mm Bluetooth printer, reprint.
- Stock: on payment, record sale movements from the recipe with modifier deltas, FEFO.
- Void (same day, before close) and refund (full or by line) with reason and approval; both return stock with reason void or refund.
- Out-of-stock tiles: a product whose recipe item is at or below 0 shows the Out state and cannot be added.

## Out of scope (do not build)
- Transactions screen and reports (Module 12). Alerts (Module 15). Card terminal or GCash API integration (payments are recorded, not processed).

## Business rules
- Money in centavos; round only at the final total to the nearest centavo.
- Prices include 12% VAT. VAT amount = total − total ÷ 1.12.
- Senior Citizen and PWD: remove VAT first (price ÷ 1.12), then take 20% off; record the ID number. (Confirm the exact computation with your accountant; see open questions.)
- Cashier discount limit default: 10% and up to ₱100.00; above needs sale.discount.approve.
- A button names its result: "Pay ₱373.50", "Void sale".
- Receipts print "Amounts in PHP", amounts without the peso sign, and the acknowledgment footer from the Receipt README.
- A voided sale keeps its receipt number.

## Permissions
- sale.create, sale.discount.apply, sale.discount.approve, sale.void.request, sale.void.approve, sale.refund.request, sale.refund.approve, receipt.reprint.

## Audit
- "Voided ACK-T1-000121 (₱540.00). Reason: wrong order. Approved by Maria Santos" (sensitive). Same for refunds and discounts over limit.

## Offline behaviour
- Everything in this module works offline. Sales, payments, discounts, voids and their stock movements queue in the outbox and sync in order. Receipt numbers come from the device so they never collide.

## Screens
- POS: working screen, modifiers sheet, discount sheet, approval PinPrompt, checkout, payment success with receipt, void and refund flows. States: offline, printer not connected, license warning.

## Acceptance criteria
- [ ] 2 Iced Latte (one with oat milk, +₱30.00) and 1 Butter Croissant with a 10% discount totals ₱373.50 (subtotal ₱415.00, discount ₱41.50); cash ₱400.00 gives ₱26.50 change.
- [ ] That sale deducts 36 g beans, 180 ml fresh milk, 180 ml oat milk, 30 ml syrup, 2 cups and 1 croissant.
- [ ] A 30% discount by a cashier asks for a manager PIN with the message from CLAUDE.md's writing rules.
- [ ] 100 sales made offline sync once each, with stock correct afterwards.
- [ ] A receipt prints on a 58 mm printer at 32 columns.

## Test cases
- Given a senior discount on a ₱145.00 drink, then the discounted price follows the rule above and the ID number is required.
- Given a refund of 1 of 2 lattes, then 1 latte's stock returns and the sale shows Partly refunded.

## Decisions already made
- Receipt number format ACK-<device>-<6 digits>. Payments are recorded, not processed through a gateway.

## Open questions
- **BIR compliance.** Selling in the Philippines may require an accredited POS, a Permit to Use and official receipts or invoices, depending on registration. The current design prints an acknowledgment receipt. Check with an accountant before a shop relies on BrewPoint for official receipts.
- Hold and recall orders: in this module or later.

## How to work
1. Read the files above. Ask about anything unclear before planning.
2. Write a plan: files to add or change, migrations, endpoints, components, tests. Wait for approval.
3. Build in this order, stopping after each step for review: migration → server logic and tests → API → screens.
4. Finish with the Definition of Done checklist from CLAUDE.md, ticked.
