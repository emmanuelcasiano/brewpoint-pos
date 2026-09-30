The acknowledgment receipt: a monochrome, monospaced slip for 58mm or 80mm thermal paper, shown on screen and printed from stored receipt data.

**Classes:** `bp-receipt` with `bp-receipt--58` (32 columns) or `bp-receipt--80` (48 columns); inside, `bp-receipt__row`, `bp-receipt__c` (centered), `bp-receipt__b` (bold), `bp-receipt__mod`, `bp-receipt__rule`. Scale the on-screen preview with `--rs`; printing forces `--rs: 1`.

**The consumer provides** the immutable stored receipt data: shop name and address, number `ACK-{device_code}-{sequence}`, date and time, cashier, lines with modifiers, subtotal, discount, total, payments and change.

- Print in one ink on `paper` with no color, shadows or images. Use `receipt` and `receipt-strong` only.
- Set columns with the `ch` unit. Plex Mono is 0.6em wide, so 9.4px text gives 32 columns on 58mm and 48 on 80mm.
- Print amounts as "1,245.00" and add an "Amounts in PHP" line. Do not print the peso sign.
- End with the fixed footer: "THIS IS NOT AN OFFICIAL RECEIPT." then "For BIR Official Receipt, please request at counter."
- Never add a tax line or a tax identifier. A reprint uses the stored data and raises the print count.
- Tokens: `paper`, `paper-ink`, `shadow-1`, `radius-lg`, type styles `receipt`, `receipt-strong`.
