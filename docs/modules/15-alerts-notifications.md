# Module 15: Stock alerts and notifications

## Goal
Owners and managers learn about out-of-stock, expired, expiring and low items the moment it matters, in the back-office and on their phone, without anyone checking the Inventory page.

## Depends on (already built)
- Modules 13 and 14.

## Read before planning
- CLAUDE.md
- docs/design-system/guidelines/40-stock-alerts-and-notifications.md (the full rule set)
- READMEs and previews: NotificationCenter, AlertsScreen, Dashboard (Stock alerts card), Navigation (badges), SettingsScreen (Notifications section)
- docs/database/schema.sql: alerts, alert_reads, notification_settings, notification_deliveries

## Data
- Owns: alerts, alert_reads, notification_settings, notification_deliveries
- Reads only: item_branch_settings, batches, stock_movements, purchase_orders (covered by), categories
- Schema changes: none

## In scope
- Alert engine on the server: evaluate after every stock movement batch and on an hourly schedule (plus at shop opening) for Out of stock, Expired, Expiring soon, Low stock.
- One open alert per item, branch and type; updates instead of duplicates; resolves itself when the condition clears, recording what resolved it.
- Snooze rules: warnings 1 day, 3 days or until next delivery; danger at most 1 day.
- Back-office: bell with unread count and panel grouped by severity, toast on new alerts while open, side-nav badges (Alerts unread, Inventory items in any alert), Dashboard Stock alerts card, AlertsScreen (Open, Snoozed, Resolved).
- Alert actions wired: Create purchase order (Module 14 draft), Adjust stock, Record as waste, View batch; "On PO-0044, arriving Sep 29" when already on order.
- Daily digest email at the owner's time (default 7:00 AM Manila) and push for Out of stock and Expired, respecting quiet hours.
- Settings, Notifications: channels per alert type, expiring window, digest time, quiet hours, recipients.
- The Inventory danger banner when a sold item is out of stock.

## Out of scope (do not build)
- Other notification events beyond the three in Settings' "Other notifications" can come later (cash variance, device offline, approvals) unless cheap to add here.

## Business rules
- Follow guidelines/40 exactly, including titles ("Oat milk is low.") and bodies with both units and branch.
- When the device ran out before it synced, show both times: "Ran out at 10:42 AM, synced 11:05 AM."
- Cashiers never see alerts on the POS; the POS only shows out-of-stock tiles.
- Owners get every branch; Managers their branch.

## Permissions
- inventory.alerts.view to see alerts, inventory.alerts.resolve to snooze and act, inventory.alerts.settings to change notification settings.

## Audit
- "Snoozed Oat milk is low for 1 day", "Changed notification settings: push off for Low stock".

## Offline behaviour
- Alerts are computed on the server from synced data, so they can start late; the two-time display covers this.

## Screens
- Bell panel, toast, AlertsScreen, Dashboard card, side-nav badges, Settings Notifications, Inventory banner.

## Acceptance criteria
- [ ] Selling the last Bottled Water creates exactly one Out of stock alert, a toast in an open back-office and a push to the owner.
- [ ] Receiving stock above the reorder point resolves the Low stock alert with "Received".
- [ ] The digest at 7:00 AM lists every open alert per branch and is not sent during quiet hours.
- [ ] A danger alert cannot be snoozed for more than 1 day.

## Test cases
- Given a low alert open for Oat milk, when another sale lowers it further, then the same alert updates and no second push is sent.

## Decisions already made
- Channels: in-app, push, email digest.

## Open questions
- Push delivery: web push to the owner's browser, a mobile app, or SMS/Viber. Recommendation: email plus web push first.

## How to work
1. Read the files above. Ask about anything unclear before planning.
2. Write a plan: files to add or change, migrations, endpoints, components, tests. Wait for approval.
3. Build in this order, stopping after each step for review: migration → server logic and tests → API → screens.
4. Finish with the Definition of Done checklist from CLAUDE.md, ticked.
