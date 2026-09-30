Data requests: shop owners asking for a copy of their data or for it to be deleted.

**Built from:** `bp-app` with `<nav data-adminnav="datarequests">`, `bp-pagehead`, and a `bp-split` of the requests DataTable beside a request `bp-drawer` with a `bp-timeline` and a typed confirmation.

**The consumer provides** `data_requests` (tenant, type, requester, received and due dates, status, steps done) and the export file when ready.

- Two types: Export (a download of every table for that tenant) and Delete (export first, then delete).
- Set the due date from your privacy policy and the Data Privacy Act of 2012; show it as a `danger` chip within 7 days.
- Deleting keeps what the law requires (invoices and tax records) with personal details removed, and says so before confirming.
- Deletion needs the Superadmin role, the shop name typed in, and is logged in the staff audit log.
