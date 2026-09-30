The Register sessions page: every shift from open to close, with expected against counted cash and the variances to approve.

**Built from:** `bp-app` with `<nav data-sidenav="sessions">`, `bp-pagehead`, a row of StatTiles, and a `bp-split--wide` of a DataTable beside a `bp-drawer` holding a `bp-kv` cash summary, a count table with a `tfoot`, and the cashier's note.

**The consumer provides** the sessions with float, cash sales, cash movements, the counted amount and denominations, notes and approvals.

- Expected cash = opening float + cash sales − cash out + cash in. Show each part in the drawer so a manager can see why.
- Variance: "Balanced" when zero, "Short ₱100.00" or "Over ₱50.00" otherwise, in words, never a bare minus sign. Short or over past the tolerance is `warning` and the session is Needs review.
- Approving a variance needs `register.variance.approve` (up to ₱500) or `register.variance.approve_large`, asks for a PIN, and is written to the audit log.
- An open session shows a dash under Counted and updates as sales sync. Offline devices show their last synced time.
