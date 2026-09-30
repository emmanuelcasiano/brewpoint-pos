The Alerts page: every open stock alert for the branch, grouped by severity, with the action that resolves it.

**Built from:** `bp-app` with `<nav data-sidenav="alerts">`, `bp-pagehead`, `bp-tabs` (Open, Snoozed, Resolved), a `bp-toolbar` of `bp-chip--action` type filters (`aria-pressed`) with `bp-chip__count`, and a `bp-split` of a card of `bp-alert` rows beside a settings summary. See NotificationCenter for the alert rules.

**The consumer provides** the alerts per status with counts, the branch list, and the user's notification settings.

- The list is the same records as the bell panel and the dashboard card; resolving one here resolves it everywhere.
- Groups run Out of stock, Expired, Expiring soon, Low stock. Empty groups are left out.
- When stock ran out on an offline device, say both times: "Ran out at 10:42 AM, synced 11:05 AM."
- Snoozed shows when each alert comes back; Resolved shows what cleared it (received, wasted, adjusted) and who, for 90 days.
- The empty Open tab says "No stock alerts. Every item is above its reorder point and nothing expires this week."
