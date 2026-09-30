The back-office table for inventory, users, devices, sessions and the audit log.

**Classes:** `bp-tablewrap` around `bp-table`; give numeric cells `num`, secondary lines `bp-table__sub`, codes `bp-table__code`, and the selected row `is-selected`.

**The consumer provides** column definitions, the rows, the money values in integer centavos formatted with `BrewPoint.formatPeso`, and the status for each row.

- Keep rows at least 44px tall. Left-align text, right-align every numeric and money column, and set tabular figures.
- Show stock as a value plus its base-unit line underneath: "4.75 boxes" over "4,750 ml".
- Put the status chip in the last column, with icon and word.
- Give the table a visually hidden `caption` and `scope="col"` headers.
- Let the wrapper scroll horizontally on narrow screens; never wrap or shrink numbers.
- Do not use a table on the POS screens; tiles and cart lines do that job there.
- Tokens: `surface-raised`, `surface-sunken`, `border`, `border-strong`, `accent-soft`, `ink-muted`, `radius-lg`.
