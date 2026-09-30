The action control: a 56px button on the POS with primary, default, quiet and danger variants.

**Classes:** `bp-btn` plus one of `bp-btn--primary`, `bp-btn--quiet`, `bp-btn--danger` (none for the default outlined button); size `bp-btn--lg` (72px, Pay only) or `bp-btn--sm` (44px, back-office); `bp-btn--block` for full width; `is-loading` while saving.

**The consumer provides** the label (a verb or verb phrase), an optional leading icon, and `disabled` or `aria-disabled` when unavailable.

- Use one primary button per region. Its label names the result and carries the amount: "Pay ₱373.50".
- Use the default button for secondary actions ("Hold order"), quiet for cancel and low-emphasis links, danger only for destructive steps ("Void sale") behind an approval.
- Do not use `bp-btn--sm` on a tablet POS screen; it is 44px and meant for a mouse.
- Do not put a status color on a button other than danger.
- While a save runs, keep the label, add the spinning refresh icon, set `aria-busy="true"` and ignore further taps.
- Tokens: `accent`, `accent-hover`, `accent-pressed`, `on-accent`, `danger`, `on-danger`, `border-strong`, `target-pos`, `target-key`, `target-min`, `radius-md`.
