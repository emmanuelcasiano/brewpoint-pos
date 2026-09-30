The owner's back-office home: today's numbers, how the day is going, what is selling, and which stock needs action.

**Classes:** `bp-app` (the `bp-sidenav` beside `bp-app__main`), a `bp-pagehead` with a `bp-segmented` period switch and the `bp-bell`, then rows built with `bp-dash`: `bp-dash--kpis` for StatTiles, `bp-dash--2` for the two main charts, `bp-dash--3` for top products, stock alerts and payment mix, each in a `bp-card`.

**The consumer provides** the branch list, the period, the KPI values and comparisons, the chart series, the stock alerts (the same records as the NotificationCenter), and the payment totals, all money in integer centavos.

- Read top to bottom as questions: How much did we sell? (KPIs) When? (Sales by hour) Is it better than last week? (7-day line) What sold? (Top products) What needs me? (Stock alerts) How were we paid? (Payment mix).
- The period switch (Today, 7 days, 30 days, Custom) changes every card at once. The branch select sits beside it.
- Stock alerts is always on the dashboard, even when empty ("No stock alerts"). Show the 4 most severe with their actions and a "See all 5 alerts" link.
- Payment mix uses ranked bars with pesos printed on each row: Cash, GCash, Card, Maya. Never a donut.
- Keep the page to one screen on a 1440 by 900 desktop: 4 KPIs, 2 charts, 3 cards. Anything more belongs in Reports.
- Numbers refresh when a device syncs; show "Updated 3:05 PM" in the page meta, never a spinner over the cards.
- A Manager sees their own branch; a Cashier never reaches the back-office.
- Tokens: every token the StatTile, Chart, NotificationCenter and Navigation use, plus `space-4` between cards.
