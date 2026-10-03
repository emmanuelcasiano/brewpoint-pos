# Module 12: Transactions, dashboard and reports

## Goal
Owners see how the shop is doing: today's numbers on the Dashboard, every sale in Transactions, and exportable Reports.

## Depends on (already built)
- Module 11 (real sales data).

## Read before planning
- CLAUDE.md (charts rules)
- READMEs and previews: Dashboard, TransactionsScreen, ReportView, StatTile, Chart, DataTable
- docs/design-system/README.md ("Dashboards, reports and charts")

## Data
- Owns: none (read models only). Optional summary tables or materialized views for speed.
- Reads only: sales, sale_lines, payments, sale_discounts, refunds, products, categories, register_sessions, users, stock alerts (for the Dashboard card, empty until Module 15)
- Schema changes: optional daily summary table; record it in schema.sql.

## In scope
- Dashboard: 4 StatTiles (net sales, orders, average order, voids and refunds) with comparison to the same weekday last week, Sales by hour (bar), Last 7 days vs week before (line), Top products and Payment mix (hbar), Stock alerts card placeholder.
- Transactions: search by receipt number or item, filters (date, register, cashier, payment, status), paging, detail drawer with lines, payments, discounts and approvers. Reprint, refund and void call Module 11.
- Reports: Sales summary, By product, By category, By hour, By payment method, By cashier, Discounts and voids. Filters: date range, branch, register. Totals from the server. Export CSV and PDF.
- Unsynced notice: "2 sales from device T1 have not synced yet and are not included."

## Out of scope (do not build)
- Inventory reports (Module 13 and 14). Register session report (in Module 10 screen already).

## Business rules
- Net sales = gross − discounts − refunds. Voided sales are excluded from sales and counted in voids.
- Totals are computed on the server, never by summing a paged table.
- Times in Asia/Manila; a "day" runs midnight to midnight Manila time.
- Charts: never pie or donut, never two y-axes, every chart has a table view.
- Export file names: sales-by-product_2026-09-01_2026-09-27.csv.

## Permissions
- report.sales.view for Dashboard and Reports; report.margin.view to see margins; a Manager sees their branch only.

## Audit
- "Exported Sales by product, Sep 1 to 27" (not sensitive).

## Offline behaviour
- Back-office is online. Numbers include synced sales only, with the unsynced notice.

## Screens
- Dashboard, TransactionsScreen, ReportView per their READMEs, in both themes, with empty states ("No sales yet today.").

## Acceptance criteria
- [ ] Dashboard numbers match a SQL check on the seed data for a given day.
- [ ] Report totals equal the sum of their rows for every report type.
- [ ] CSV export contains exactly the filtered rows.
- [ ] Dashboard loads under 1 second with 50,000 sales in the database.

## Test cases
- Given a voided sale of ₱540.00 today, then net sales exclude it and voids show 1.

## Decisions already made
- Chart library: port of BrewPoint.chart (bar, line, hbar) from Module 05.
- From Module 05: `Chart` takes `type`, `title`, `labels`, `series` (`compare: true` for last period), `format` and `labelHeading`. It draws its own table view, and shows `emptyText` when there are no labels or every value is zero. Place it in a `Card` with the period first in `meta`. `StatTile` takes `delta: { direction, amount, comparison, tone? }`; leave `delta` out when there is nothing to compare with. `DataTable` and `Pager` are ready for the transactions list.
- From Module 03: the back-office uses React Router v8 in declarative mode: `BrowserRouter` in `main.tsx`, with routes in `app/App.tsx`. After sign-in it shows a placeholder, `app/HomePage.tsx`, behind `RequireSignIn`; the dashboard replaces it. `useSession()` gives the signed-in `ShopMe` (user, shop, branches, roles), and the shop's accent is applied on sign-in.

## Open questions
- PDF generation: server-side (for example a headless browser) or a PDF library.

## How to work
1. Read the files above. Ask about anything unclear before planning.
2. Write a plan: files to add or change, migrations, endpoints, components, tests. Wait for approval.
3. Build in this order, stopping after each step for review: migration → server logic and tests → API → screens.
4. Finish with the Definition of Done checklist from CLAUDE.md, ticked.
