The staff audit log: a permanent record of what BrewPoint staff did, including every page viewed inside a shop.

**Built from:** `bp-app` with `<nav data-adminnav="audit">`, `bp-pagehead` with Export CSV, a `bp-toolbar` with an "Inside a shop only" chip, a DataTable and a `bp-pager`.

**The consumer provides** `platform_audit_log` entries: time, staff member, sentence, action code, tenant if any, and whether it was sensitive or during support access.

- Separate from each shop's `audit_log`; the shop's log only records that a support session started and ended.
- Sensitive actions (trial and plan changes, credits, manual payments, suspensions, deletions, role changes) carry the `warning` chip.
- Read-only for everyone, including Superadmins.
