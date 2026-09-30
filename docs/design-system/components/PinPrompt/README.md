The approval modal: it explains why a manager is needed, names the approver, takes their PIN on a keypad and approves or cancels.

**Classes:** `bp-scrim` containing `bp-modal` (`bp-modal__title`, `bp-modal__body`, `bp-modal__actions`), with a `bp-field` select for the approver, `bp-pin` dots and a `bp-numpad`.

**The consumer provides** the reason and the limit that was exceeded, the list of eligible approvers (users holding the needed approve permission), the PIN check (local hash when offline, server when online) and the result.

- State the reason with the numbers: "A 30% discount is over your limit (10%, up to ₱100). Ask a manager to enter their PIN."
- List only people who hold the required permission and whose own limit covers the amount.
- On a wrong PIN clear the dots, show "Wrong PIN. 3 tries left on this device.", and after five failures lock that user on the device until an online login.
- Keep Approve disabled until the PIN is complete. Cancel returns to the cart with nothing changed.
- Look identical online and offline; the audit log records `approved_offline`, not the interface.
- Trap focus inside the modal, set `aria-modal="true"` and label it with its title.
- Tokens: `scrim`, `surface-raised`, `shadow-2`, `radius-xl`, `z-modal`, `danger`.
