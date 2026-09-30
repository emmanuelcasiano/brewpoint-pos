The purchase order editor: build one order with many items from one supplier, then send it.

**Built from:** `bp-app` with `<nav data-sidenav="purchases">`, `bp-pagehead`, and a `bp-split`: a card with the lines DataTable (`bp-cellinput` for quantity and cost, a remove `bp-iconbtn`, a `bp-addrow` search row), suggestion chips and `bp-totals`; beside Supplier and Delivery cards and the send actions.

**The consumer provides** the supplier list with contact, order days, lead time, minimum order and terms; the items that supplier sells with last cost and pack unit; on-hand and reorder point per item; and the saved draft.

- One order, one supplier. The add row searches only items linked to that supplier; linking a new item to a supplier happens on the fly ("Add Almond milk to GreenLeaf").
- Quantities are in the supplier's pack (boxes, sleeves, pieces); show the base unit on receipt, not here. Cost defaults to the last price paid and can be changed per line.
- Each line shows why it is there: on hand and reorder point. Suggestion chips offer other low or nearly low items from the same supplier.
- Show the minimum order: a check when met, a `warning` note with the amount still needed when not ("Add ₱420.00 to reach the ₱1,500.00 minimum").
- Drafts save by themselves. "Send to supplier" emails a PDF from the shop's address and marks the order Sent; "Download PDF" is for Viber or print. Orders above a set amount need `purchase.approve` before sending.
