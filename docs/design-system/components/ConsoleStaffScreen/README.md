Staff: the BrewPoint team who can sign in to the console, and what each role may do.

**Built from:** `bp-app` with `<nav data-adminnav="staff">`, `bp-pagehead` with Invite staff, and a `bp-split` of the staff DataTable beside a `bp-group` of roles that open a permission editor like the PermissionMatrix.

**The consumer provides** `platform_users` (name, email, role, two-step status, last active, status), `platform_roles` and their `platform_permissions`.

- Staff accounts live apart from shop `users`; a staff member never needs a shop account.
- Two-step sign-in is required; an account without it cannot open the console after its first sign-in.
- Roles: Superadmin, Support, Billing, Engineer. Only a Superadmin manages staff and deletes shop data.
