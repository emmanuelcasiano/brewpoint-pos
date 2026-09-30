The two navigation surfaces: the POS top bar and the back-office side navigation.

**Classes:** `bp-topbar` with `bp-topbar__shop` (`bp-topbar__name`, `bp-topbar__meta`), `bp-topbar__spacer`, chips and `bp-user`; `bp-sidenav` with `bp-sidenav__group`, `bp-sidenav__item` (an `<i data-icon>` first; `aria-current="page"` on the active one) and an optional `bp-sidenav__badge` count.

Render the side navigation with `<nav data-sidenav="<key>">` and `BrewPoint.mount()` (or `BrewPoint.sidenav(key, counts, hide)`), so every screen shows the same destinations in the same order. Keys: dashboard, alerts, transactions, reports, sessions, products, inventory, expiry, purchases, suppliers, users, devices, audit, subscription, settings.

**The consumer provides** the shop, branch and device names, the register state, the sync and license states, the signed-in user and role, and the destinations the user's permissions allow.

- On the POS top bar, put shop and device at the left, the register chip next, then the sync chip and the user at the right, in that order in every state.
- Show the license chip only when the offline license is within 3 days of ending.
- The user button opens a menu with Switch user and Log out. Switching user needs a PIN.
- In the side navigation, list only destinations the user has permission for; hide the rest instead of disabling them.
- Order the back-office as: Dashboard and Alerts at the top, then Sales (Transactions, Reports, Register sessions), Menu and stock (Products, Inventory, Expiry tracking), Purchasing (Purchase orders, Suppliers), People, Business. Owners land on Dashboard.
- Put a count badge only on Alerts (unread alerts) and Inventory (items low, out or expiring). Give it an `aria-label` that says what is counted. Cap it at "99+".
- Each destination has a screen card in Back-office screens: Dashboard, AlertsScreen, TransactionsScreen, ReportView, RegisterSessionsScreen, ProductsScreen, InventoryScreen, ExpiryScreen, PurchaseOrdersScreen (with PurchaseOrderEditScreen and ReceiveDeliveryScreen), SuppliersScreen, UsersScreen, DevicesScreen, AuditLogScreen, SubscriptionScreen, SettingsScreen.
- Every back-office page opens with a `bp-pagehead`: the title in `display-lg`, then the branch and date range, then the `bp-bell` at the far right (see NotificationCenter).
- Mark the current page with `aria-current="page"`, which fills the item in `accent`.
- Keep the side navigation on `brand` in every shop; it does not take the shop accent except for the current item.
- Tokens: `brand`, `on-brand`, `focus-inverse`, `accent`, `on-accent`, `surface-raised`, `topbar-height`, `sidenav-width`, `target-min`.
