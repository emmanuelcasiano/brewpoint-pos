The Shops list: every business on BrewPoint and its account state.

**Built from:** `bp-app` with `<nav data-adminnav="shops">`, `bp-pagehead`, a `bp-toolbar` of status chips, plan filter and search, a DataTable and a `bp-pager`. A row opens ConsoleShopDetailScreen.

**The consumer provides** tenants with owner, plan, status, branch and device counts against plan limits, payment method and provider, MRR, sign-up date and last activity.

- Statuses match `tenants.status`: Trial (`info`), Active (`success`), Past due (`warning`), Suspended (`danger`).
- "Pays with" names the provider path: Stripe card, or GCash payment link for shops billed by monthly invoice.
- Staff see account data here, never a shop's sales or stock. Seeing inside a shop needs Support access.
