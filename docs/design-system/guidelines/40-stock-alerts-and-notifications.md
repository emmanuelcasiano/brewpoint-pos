# Stock alerts and notifications

How BrewPoint tells an owner or manager that stock is low, out, expired or about to expire. The back-office shows it; the server decides it; the POS only reacts.

## The four alerts

| Alert | Starts when | Severity | Icon and chip | Next step offered |
| --- | --- | --- | --- | --- |
| Out of stock | On-hand quantity reaches 0 (or below) | danger | `x`, "Out of stock" | Create purchase order, Adjust stock |
| Expired | A batch passes its expiry date with quantity left | danger | `calendar-x`, "Expired" | Record as waste |
| Expiring soon | A batch is within its warning window (default 3 days; 1 day for pastries) | warning | `clock`, "Expires in 2 days" | View batch, Use first |
| Low stock | On-hand quantity falls to or below the item's reorder point | warning | `alert`, "Low, 3 left" | Create purchase order, Adjust stock |

- Each inventory item has a reorder point in its base unit (ml, g, pcs), set on the item. Leave it empty and the item never raises Low stock; show a hint on the Inventory table: "Set a reorder point to get low stock alerts."
- Expiry needs batches. When stock is received, record the batch code, quantity and expiry date. Sales use the batch that expires first (FEFO), so the oldest milk goes first.
- "Create purchase order" adds the item to its supplier's open draft (see the purchasing section). When the item is already on an open order, the alert says "On PO-0044, arriving Sep 29" and the button becomes View order.
- Negative stock (a sale recorded offline after stock ran out) raises Out of stock and adds "Count this item" to the actions.

## Where the user sees them

In order from most to least interruptive, and only these places:

1. **Toast** on `brand`, when an alert starts while the user has the back-office open. One sentence and one action; 8 seconds.
2. **Bell** in the page header with the unread count, opening the alert panel grouped Out of stock, Expired, Expiring soon, Low stock.
3. **Side navigation badges** on Alerts (unread) and Inventory (items in any alert).
4. **Dashboard Stock alerts card**, the 4 most severe, always present.
5. **Inventory table** status chips and a filter "Needs attention"; the Expiry tracking page sorted by expiry date.
6. **Danger banner** on the Inventory page only when an item sold on the POS is out of stock.
7. **Daily digest** outside the app (email, and push on the owner's phone), sent at a time the owner picks (default 7:00 AM Asia/Manila), listing every open alert per branch. Out of stock and Expired can also send an immediate push.

On the POS, never show these alerts to a cashier. An out-of-stock product tile turns to its "out of stock" state and cannot be added; that is all.

## How they are produced

- The server evaluates alerts after every stock change it receives: a synced sale, a receipt of stock, an adjustment, a waste record. Expiry is also checked by a scheduled job every hour and at shop opening time.
- Because devices work offline, an alert may start late, when the sale syncs. Show the time the stock actually ran out ("Ran out at 10:42 AM, synced 11:05 AM") when they differ.
- One open alert per item, per branch, per type. A new low reading updates the open alert; it does not add another row or another push.
- An alert resolves itself when its condition clears (stock received above the reorder point, the batch written off). Resolved alerts move to the history on the Alerts page for 90 days.
- Snooze hides a warning alert for 1 day, 3 days or until the next delivery. Danger alerts can be snoozed for 1 day at most, and never silence the daily digest.

## Who gets them

- Owners get every branch. Managers get their branch. Cashiers get none.
- Permission `inventory.alerts.view` decides who sees the bell's stock alerts; `inventory.alerts.settings` decides who can change thresholds and channels.
- Notification settings (Settings, Notifications): per alert type, the channels (in-app, push, email digest), the digest time, and quiet hours. Default: all four in-app, Out of stock and Expired also by push, a digest at 7:00 AM.

## Writing alerts

- Title: the item and the state. "Oat milk is low." "Fresh milk batch B-0921 expired."
- Body: the quantity in both units, the branch, and the threshold or date. "0.5 box (500 ml) left at Main branch. Reorder point is 2 boxes."
- Buttons name the result: "Create purchase order", "Record as waste". Never "View details" or "OK".
- No exclamation marks, no "Urgent!". The icon and the danger color already say it.
