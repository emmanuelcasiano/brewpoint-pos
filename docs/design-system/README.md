BrewPoint is the design system for a multi-tenant, offline-first point of sale for small coffee shops in the Philippines. Design for two people: a cashier at a landscape iPad with a queue in front of them, and an owner at a desk in the back-office. The look is warm café: milk and espresso neutrals, a crema-amber accent, and no ornament that slows a tap.

## Content fundamentals

- Write short, plain sentences in sentence case: "Open register", "Approve larger discounts". Never Title Case.
- A button names its result: "Pay ₱373.50", "Approve", "Void sale". Never "OK" or "Submit".
- An error says what happened and what to do next: "Wrong PIN. 3 tries left on this device." Never "Something went wrong."
- Format money as peso sign, comma thousands, two decimals: ₱1,245.00. Money is integer centavos everywhere; turn it into text only with `BrewPoint.formatPeso`. Receipts print "1,245.00" with an "Amounts in PHP" line, because thermal code pages drop the peso sign.
- Show times in 12-hour Asia/Manila ("3:05 PM"), dates as "Sep 27, 2026" in the UI and 2026-09-27 on receipts.
- Show stock in both units: "4.75 boxes (4,750 ml)". Never make a clerk convert.
- Offline is a normal state, not an alarm: "You are offline. Sales are saved on this device and will sync when you reconnect." Use the `brand` banner, never red.
- Name limits and who can approve: "A 30% discount is over your limit (10%, up to ₱100). Ask a manager to enter their PIN."
- Use no emoji and no exclamation marks. The one exception is the receipt's "Thank you!".
- Use the product's own vocabulary in examples: Iced Latte, Butter Croissant, oat milk, register T1, ACK-T1-000123.

## Visual foundations

**Color.** Put every screen on `surface`. Put anything raised (tiles, cards, inputs, modals, table rows) on `surface-raised`, and wells (category rail, cart background, keypad tray, table header) on `surface-sunken`. Set text in `ink`, secondary text in `ink-muted`.
- `accent` fills the one primary action in a region and the selected category. Text on it is `on-accent`. A selected tile or row uses `accent-soft` with a 2px `accent-strong` border. Accent-colored text or icons on a surface use `accent-strong`, never `accent`.
- `brand` (roasted brown) is fixed identity chrome only: the back-office side navigation, toasts and the offline banner. It never changes per shop.
- Status colors (`success`, `warning`, `danger`, `info` with their `-soft` fills) appear only as chips, banners and alerts, and always with an icon and a word. `success` is teal on purpose, so it stays apart from `danger` for people with red-green color blindness. `warning` never fills a button.
- Charts use their own series colors, `chart-1` to `chart-4` in that fixed order, with `chart-compare` (dashed) for the period before and `chart-grid` for gridlines. Never draw a series in the shop accent or a status color, so a red shop accent never makes sales look like an error. Values and labels in charts stay `ink` and `ink-muted`.
- Both themes exist for every token: Daylight (default) and Night shift for dim shops. Switch by setting `data-theme` on the root. Never write a hex in component code.

**Type.** Set headings and screen titles in Bricolage Grotesque (`display-lg`, `heading-md`, `heading-sm`). Set everything a person operates in IBM Plex Sans: tile names in `body-lg`, prices in `amount`, totals in `amount-lg` and `amount-xl`, helper text in `body-sm`, timestamps in `caption`. Set receipts and permission codes in IBM Plex Mono. Turn on tabular figures wherever digits line up, and right-align money columns. Keep anything actionable at 14px or larger; use 12px only for metadata.

**Spacing and touch.** Build on a 4px grid with `space-1` to `space-12`. Make every POS control at least `target-pos` (56px) tall, numpad keys and the Pay button `target-key` (72px), and never go below `target-min` (44px) in the back-office. Keep `space-2` (8px) between neighboring tap targets.

**Shape, borders and shadow.** Tiles, cards and banners use `radius-lg`; buttons, inputs and keys `radius-md`; modals `radius-xl`; chips `radius-pill`. Structure comes from borders: `border` for hairlines, `border-strong` for any edge a person must find (inputs, unselected controls). Only floating layers get a shadow (`shadow-2` for modals and toasts).

**Motion.** Use 120ms ease-out color changes and nothing else. Never animate a step that stands between a cashier and the next tap. Show a spinner only for a save that outlasts 300ms. Honor `prefers-reduced-motion`.

**Focus and states.** Draw keyboard focus as a 2px `focus` ring with a 2px gap (`focus-inverse` on `brand`). Give every control default, pressed, focus-visible and disabled states; tiles add selected and out of stock; inputs add error. Disabled controls stay readable: `ink-muted` on `surface-sunken`.

**Layout.** The landscape tablet POS is three regions: category rail (`rail-width`), product grid (tiles at least `tile-min` wide) and a cart that never hides (`cart-width`). The back-office is `sidenav-width` navigation beside a content column that opens with a page header (title, branch, period, alert bell). Owners land on the Dashboard; numbers beyond it live in Reports. Every side-navigation destination has a full screen in the Back-office screens group (Dashboard, Alerts, Transactions, Reports, Register sessions, Products, Inventory, Expiry tracking, Purchase orders, Suppliers, Users and roles, Devices, Audit log, Subscription, Settings), built from the same parts: a page header, a toolbar of filters in one row, a table, and a detail drawer (`bp-split`, `bp-drawer`) for the selected row. Render the navigation with `<nav data-sidenav="key">` so it is identical on every screen. See the layout and offline sections.

**Dashboards, reports and charts.** A dashboard answers today's questions in one screen: 4 StatTiles, then Sales by hour (bars), Last 7 days against the week before (line), Top products and Payment mix (ranked bars with values printed), and the Stock alerts card. Reports add a filter bar, totals from the server, a chart and a table with a totals row, and export to CSV or PDF. Pick the chart by the question, never a pie, donut or second y-axis, and give every chart a table view. Draw charts with `BrewPoint.chart`.

**Purchasing.** Stock comes in through purchase orders: one order per supplier with many items, sent by email or PDF, then received as one delivery that records every line's quantity, cost, batch and expiry at once. Walk-in deliveries use the same receiving screen without an order. See the purchasing section.

**Staff console.** BrewPoint's own team works in a separate staff console (the Staff console screens group): shops, support access approved by the owner, billing, versioned plans and prices, feature flags, app releases, announcements, data requests, a staff audit log and staff roles. Its navigation is light, never brand brown, so it is never mistaken for a shop. See the staff console section.

**Alerts.** Low stock, out of stock, expired and expiring batches reach the owner through the bell and its panel, side-nav badges, the dashboard card, a toast when one starts, and a daily digest by email and push. The POS never shows them to a cashier. See the stock alerts section.

## Iconography

- Use the bundled stroke icons: 24px grid, 2px stroke, round caps, `currentColor`. Call `BrewPoint.icon(name, size)`; the names are in `BrewPoint.icons` (check, x, plus, minus, alert, info, wifi-off, wifi, refresh, lock, backspace, printer, user, clock, trash, search, chevron-down, chevron-right, bell, dashboard, chart, trend-up, trend-down, arrow-up, arrow-down, receipt, box, calendar, calendar-x, download, filter, tag, users, tablet, shield, card, settings, edit, key, mail, store, eye, more, truck). They were drawn for BrewPoint; replace the set as a whole if you adopt another line icon family.
- Use 16px in chips, 20px by default and in the side navigation, 26px on keypad keys.
- Pair every status icon with a word. Give icon-only buttons an `aria-label`.
- There is no logo yet. Set the name "BrewPoint" in `display-xl` or `display-lg` and draw no mark.

## Building in the codebase

The web app is React, TypeScript and Tailwind. Expose the tokens as CSS variables (`tokens.css`) and map Tailwind colors, radii and spacing to `var(--…)` so themes and the per-shop accent switch without a rebuild. Components here are plain classes prefixed `bp-` in `bundle.css`; port each to a React component that keeps the class names and states.
