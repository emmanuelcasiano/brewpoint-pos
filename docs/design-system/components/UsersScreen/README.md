The Users and roles page: who can use BrewPoint, in which role and branch, and the roles that define what each person can do.

**Built from:** `bp-app` with `<nav data-sidenav="users">`, `bp-pagehead` with a primary Invite person, a `bp-toolbar`, and a `bp-split` of a DataTable (`bp-cell` with `bp-avatar` initials, chips, a `bp-iconbtn` menu) beside a `bp-group` of roles that each open the PermissionMatrix.

**The consumer provides** the people with email, role, branch, PIN state, last activity and status; roles with member counts and a one-line summary; and the plan's user limit.

- An invite sends an email; the person sets a password for the back-office and a 4 to 6 digit PIN for the POS. Until then: Invited (`info`) and PIN Not set (`warning`).
- The row menu has Change role, Reset PIN (needs `pin.reset`), and Deactivate. Deactivate never deletes: their sales and audit entries keep their name.
- There is always at least one Owner, and the Owner role is locked.
- Show the plan limit in the page meta; at the limit, Invite person explains the limit and links to Subscription.
