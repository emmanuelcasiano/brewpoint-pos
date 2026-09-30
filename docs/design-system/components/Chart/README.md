Bar, line and ranked-bar charts for the dashboard and reports, drawn as SVG by `BrewPoint.chart` with a hover tooltip.

**Classes and helpers:** wrap each chart in a `bp-card` (`bp-card__head` with `bp-card__title` and `bp-card__meta`), render into an empty `div` with `BrewPoint.chart(el, spec)`, and follow it with a `details.bp-tableview` that holds the same numbers as a `bp-table`. The chart adds `bp-chart`, `bp-legend` and `bp-tip`.

`spec` is `{type, labels, series, format, height, title}`: `type` is `"bar"` (a measure per time bucket), `"line"` (a trend across days, with an optional comparison) or `"hbar"` (a ranked list: top products, payment mix); `series` is `[{name, values, color, compare}]`; `format` is `"peso"` (values in centavos), `"count"` or `"pct"`.

**The consumer provides** the labels, the values (money in integer centavos), the series names, the period in the card meta, and the table view.

- Pick the form by the question: sales by hour is `bar`, the last 7 or 30 days is `line` with last period as `compare: true`, top products and payment mix are `hbar`. Never a pie or donut; never two y-axes.
- Color by fixed order: `chart-1` for the current period, then `chart-2`, `chart-3`, `chart-4`. Four series at most; a fifth folds into "Other". The comparison period is always `chart-compare`, dashed.
- Never color a series with the shop accent or a status color. A shop with a red accent must not turn its sales red.
- Two or more series get the legend (drawn for you). One series needs none: the card title names it.
- Text in charts is `ink` or `ink-muted`, never the series color. `hbar` prints every value at the end of its row; bar and line charts print values only in the tooltip.
- Axis money is compact ("₱12k") through `BrewPoint.formatPesoShort`; tooltips and tables use the full `formatPeso`.
- Every chart has a table view. Lead the card meta with the period in words: "Today, 7 AM to 7 PM".
- An empty period shows a sentence ("No sales yet today. Sales appear here as they sync."), not an empty axis.
- Offline, show the last synced numbers with a caption "As of 3:05 PM" and keep the chart.
- Tokens: `chart-1` to `chart-4`, `chart-compare`, `chart-grid`, `surface-raised`, `surface-sunken`, `ink`, `ink-muted`, `shadow-2`, `radius-lg`.
