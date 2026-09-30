Receiving a delivery: check every line of an order at once, record batches and expiry dates, and deal with short or changed items.

**Built from:** `bp-app` with `<nav data-sidenav="purchases">`, `bp-pagehead`, an info `bp-banner`, a card with the lines DataTable (`bp-cellinput` for received, cost, batch and expiry; `is-short` rows; `is-changed` cost inputs; a check chip per line), and a `bp-dash--2` of the short-items choice and a Summary with the primary Receive button.

**The consumer provides** the order lines with ordered quantity and cost, generated batch codes, the default shelf life per item for the expiry date, the receiver, and the result preview (value, shorts, price changes, alerts resolved).

- Received starts at the ordered quantity so a complete delivery is one tap; a different number marks the line "6 short" or "2 extra" (`warning`) and tints the row.
- A cost different from the order is flagged "Price changed" with the ordered price under it; the new price becomes the item's last cost.
- Perishable lines need a batch code and expiry date; items without expiry (cups) hide those two cells.
- When anything is short, ask once: keep the rest on order (Partly received) or close the order (Received).
- "Receive without an order" opens this same screen with an empty table and a supplier picker, so a walk-in delivery can also have many lines.
- Receiving is one action for the whole delivery: it adds a batch per line, updates average costs, resolves stock alerts, and writes one audit entry per line. Needs `inventory.receive`.
