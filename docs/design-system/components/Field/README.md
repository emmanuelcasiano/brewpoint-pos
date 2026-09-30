Form controls: text input, money input, select and checkbox, each with a label, help text and an error state.

**Classes:** wrap in `bp-field` with `bp-field__label`, a `bp-input` (add `bp-select` on a select), `bp-field__help` and `bp-field__error`; add `bp-field--error` to the wrapper for the error state. Money uses `bp-money` with a `bp-money__prefix`; checkboxes use `bp-check`.

**The consumer provides** a visible label tied with `for` and `id`, the value, an `inputmode` (use `decimal` for money and `numeric` for PINs), and error text.

- Always show a label above the field. Placeholders never replace labels.
- Write error text that says how to fix it, with the alert icon: "Enter an email like name@shop.com". Set `aria-invalid="true"` and point `aria-describedby` at the message.
- Right-align money in tabular figures and keep the peso prefix outside the editable text.
- Keep entered money as integer centavos in state; parse and format only at the edges.
- Give checkboxes a tap area of at least 44px by wrapping the input and its text in one `label`.
- Do not use the accent to mark an input's edge; the edge is `border-strong` and focus turns it to `ink` with the focus ring.
- Tokens: `border-strong`, `surface-raised`, `surface-sunken`, `danger`, `focus`, `target-pos`, `radius-md`, `radius-sm`.
