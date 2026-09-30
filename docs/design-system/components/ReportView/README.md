The Reports page: pick a report, set the period and scope, read the totals, chart and table, and export.

**Classes:** a `bp-pagehead`, then `bp-tabs` of report types, a `bp-filters` bar (fields with `bp-input bp-select`); the export buttons sit in the page header beside the bell, a `bp-dash bp-dash--kpis` row of StatTiles, a Chart card, and a DataTable with a `tfoot` totals row. `bp-bar-inline` draws a share bar inside a cell.

**The consumer provides** the report list the user may see, the filter values, the rows (money in integer centavos), the totals computed on the server, and CSV and PDF files for export.

- Reports, in this order: Sales summary, By product, By category, By hour, By payment method, By cashier, Discounts and voids, Register sessions, Inventory movement, Waste and expiry.
- Filters sit in one row above everything: Date range, Branch, Register, then Group by when the report has it. Changing one reloads the whole page of numbers; nothing below the filters has its own period.
- Default the period to "This month so far" and say it in words in the page meta: "Sep 1 to Sep 27, 2026, all branches".
- Totals come from the server, never summed in the browser from a paged table. Put them in the stat tiles and repeat them in the `tfoot`.
- Right-align numbers, use tabular figures, show money with `formatPeso`, and sort by net sales descending unless the report is about time.
- Export gives what is on screen with the same filters: "Export CSV" for spreadsheets, "Export PDF" for printing. Name the file after the report and period: `sales-by-product_2026-09-01_2026-09-27.csv`.
- Reports read synced data only. When a device has unsynced sales, show an info banner: "2 sales from device T1 have not synced yet and are not included."
- Hide reports the role cannot see (a Cashier sees none; a Manager sees their branch).
- Tokens: `surface-sunken`, `surface-raised`, `border-strong`, `chart-1`, `ink-muted`, `radius-lg`, `target-min`.
