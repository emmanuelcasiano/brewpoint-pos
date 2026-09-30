Plans and prices: what each plan includes and costs, with every price kept as a version.

**Built from:** `bp-app` with `<nav data-adminnav="plans">`, `bp-pagehead`, `bp-plans` of `bp-plan` cards with a version chip, a price-history DataTable, and a warning banner for shops on old versions.

**The consumer provides** `plans` (limits and features) and `plan_prices` (plan, version, monthly and yearly price, valid from and until), with shop counts per version.

- Changing a price never edits the old row: it adds a new `plan_prices` version. Existing shops stay on theirs.
- Moving shops to a new price sends a 30-day notice and is logged per shop in `tenant_events`.
- Limits (devices, branches, users) are enforced from the plan, with per-shop exceptions in Feature flags.
