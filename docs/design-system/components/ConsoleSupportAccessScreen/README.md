Support access: the only way staff see inside a shop, and only with the owner's approval.

**Built from:** `bp-app` with `<nav data-adminnav="support">`, `bp-pagehead`, a `bp-banner`, and a `bp-split` of the grants DataTable beside a request `bp-drawer` that previews the `bp-support-bar` the shop will see.

**The consumer provides** `support_access_grants` (staff, tenant, reason, scope, duration, owner approval, start and end), and the owner's contact for approval.

- A request needs a reason (usually a ticket), a scope (Read only by default) and a duration (30 minutes to 2 hours).
- The owner approves in their back-office or by the email link. Until then the grant is Waiting and gives no access.
- While a grant is active, the shop's back-office shows the `bp-support-bar` on every page with an End now button.
- Every page staff view during a grant is logged in `platform_audit_log`, and the shop's own audit log shows the session start and end.
