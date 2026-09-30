A 3-by-4 numeric keypad for PIN entry and cash amounts, with PIN dots and a cash display.

**Classes:** `bp-numpad` containing `bp-key` buttons (`bp-key--action` for Clear, `bp-key--confirm` for a confirm key); `bp-pin` with `bp-pin__dot` (`is-filled`, and `bp-pin--error` on the wrapper); `bp-display` with `bp-display__label` and `bp-display__value`; `bp-quick` for quick amounts.

**The consumer provides** the entered digits, the maximum length (4 to 6 for a PIN), and an `onKey` handler. For cash, keep the value as integer centavos and format it with `BrewPoint.formatPeso`.

- Make keys 72px tall with 8px gaps, the layout 1-2-3 down to Clear, 0, Delete. Never reorder digits.
- Show a PIN as dots, never digits, with `role="img"` and an `aria-label` such as "2 of 4 digits entered".
- Submit a PIN automatically at its length, or with a confirm key when the length varies. On a wrong PIN clear the dots, switch to `bp-pin--error` and say how many tries remain.
- For cash, right-align the display, offer "Exact" and common notes as quick amounts, and show change due on the confirm screen.
- Do not use the device's on-screen keyboard for either; use this keypad so nothing covers the cart.
- Tokens: `target-key`, `surface-sunken`, `surface-raised`, `border-strong`, `accent`, `on-accent`, `danger`, `key` type style.
