A KPI tile for the dashboard and report headers: one label, one number, how it moved, and an optional trend line.

**Classes:** `bp-stat` with `bp-stat__label`, `bp-stat__row` holding `bp-stat__value` and an optional `<span data-spark="…">` sparkline, then `bp-stat__delta` (add `bp-stat__delta--good` or `--bad` only when the direction has a clear meaning). Add `is-loading` while the number is being fetched. Lay tiles out in `bp-dash bp-dash--kpis`.

**The consumer provides** the label, the value (money in integer centavos through `BrewPoint.formatPeso`), the comparison value and its period, and up to 14 points for the sparkline.

- Label names the measure and the scope in sentence case: "Net sales today", "Average order", "Voids and refunds".
- The delta always says its comparison in words: "up 7.0% vs last Monday". Never a bare "+7%".
- Pair the arrow icon (`arrow-up`, `arrow-down`) with the word "up" or "down". Color is only a reinforcement.
- Use `--good` (teal) and `--bad` (red) only when everyone agrees on the direction. Sales up is good, voids up is bad. Neutral measures stay `ink-muted`.
- Show 4 tiles in a row at most. The first tile is the one the owner asked about: net sales.
- A tile with no comparison (a new shop's first day) drops the delta line; never show "up 100%".
- The sparkline is decoration for a trend already stated in words; it has no axis and no tooltip.
- Tokens: `surface-raised`, `border`, `ink`, `ink-muted`, `success`, `danger`, `chart-1`, `radius-lg`, `amount-lg`.
