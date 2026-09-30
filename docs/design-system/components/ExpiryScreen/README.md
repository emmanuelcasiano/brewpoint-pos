The Expiry tracking page: every batch with stock left, soonest expiry first, and what was wasted.

**Built from:** `bp-app` with `<nav data-sidenav="expiry">`, `bp-pagehead` with Record waste, StatTiles, a `bp-toolbar` with a `bp-segmented` window (Expired, 3 days, 30 days, All batches) and search, and a `bp-split` of a DataTable beside a Waste this month card with an `hbar` Chart.

**The consumer provides** batches (item, batch code, received and expiry dates, quantity left in both units), the waste totals by item at cost, and the expiring-soon window per category.

- Sort by expiry date ascending. Expired batches with stock left sit on top, in `danger`, with "Record as waste".
- Status in words: "Expired", "Expires tomorrow", "Expires in 2 days" (`warning`, inside the window), "In 4 days" (neutral, outside the window), "Good" (`success`).
- The window is 3 days by default and 1 day for pastries, set in Settings, Notifications.
- Sales take stock from the batch that expires first. A batch at zero leaves the list.
- Recording waste asks for the quantity and a reason (expired, spoiled, spilled), lowers stock, and goes to the audit log and the Waste and expiry report.
