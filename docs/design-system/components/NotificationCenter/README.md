How the back-office tells an owner or manager about stock that is out, low, expired or about to expire: the bell and its panel, the alert row, and the toast.

**Classes:** `bp-bell` (with `bp-bell__count`, `aria-expanded` when open) opens a `bp-panel` (`bp-panel__head`, `bp-panel__body` with `bp-panel__section` headings, `bp-panel__foot`). Each item is a `bp-alert` (`bp-alert--danger` or `bp-alert--warning`, `is-unread`) with `bp-alert__icon`, `bp-alert__title` (and `bp-alert__time`), `bp-alert__body` and `bp-alert__actions`. Live events use a `bp-toast` on `brand`. The same `bp-alert` rows fill the dashboard's Stock alerts card and the Alerts page.

**The consumer provides** the alert list from the server (type, item, branch, quantities in both units, batch and expiry date, when it started), the unread count, and the actions the user's permissions allow.

- Four stock alert types, in this order of severity: Out of stock and Expired (`danger`), then Expiring soon and Low stock (`warning`). Group the panel by those headings, most severe first, newest first inside a group.
- Title = the item and the state: "Oat milk is low". Body = the numbers in both units and the threshold or date: "0.5 box (500 ml) left at Main branch. Reorder point is 2 boxes."
- Every alert offers the next step as a button: Out of stock and Low stock get "Create purchase order" or "Adjust stock"; Expired gets "Record as waste"; Expiring soon gets "View batch". A "Snooze 1 day" quiet button sits last.
- An alert clears itself when its condition does (stock received, batch written off). Owners cannot dismiss a danger alert, only snooze it.
- The bell count is unread alerts, capped at "99+"; the dot on a row marks unread. Opening the panel does not mark everything read; opening a row does.
- A toast appears only for an alert that starts while the user is looking at the back-office. It says one sentence, offers one action, stays 8 seconds, and pauses on hover and focus. Never toast on the POS.
- Show the Inventory side-nav badge with the count of items in any stock alert, and a `bp-banner--danger` on the Inventory page only when something sold on the POS is out of stock.
- Tokens: `danger`, `danger-soft`, `warning`, `warning-soft`, `accent-strong`, `brand`, `on-brand`, `surface-raised`, `surface-sunken`, `shadow-2`, `panel-width`, `z-toast`.
