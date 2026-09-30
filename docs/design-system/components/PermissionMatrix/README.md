The role editor: role tabs, then every permission grouped by feature area with a checkbox for each.

**Classes:** `bp-matrix` containing `bp-tabs` with `bp-tab` (`aria-selected`), then `bp-group` (a `details`) with `bp-group__head` and `bp-perm` rows (`bp-perm__name`, `bp-perm__code`, `bp-check`); add `is-locked` on rows of the Owner role.

**The consumer provides** the permission catalog (code, plain-language name, group), each role's permission set, and which roles are locked.

- Group permissions exactly as the catalog does: Sales, Register and cash, Catalog, Inventory, Reports and audit, Users and access, Devices, settings and billing.
- Name each permission in plain language and show its code beneath in mono, so an owner reads the sentence and a developer finds the code.
- Show the count for the role and for each group ("5 of 8"), and open the first two groups by default.
- Lock the Owner role: all boxes checked, disabled, with the "Locked" chip. A shop always has one active Owner.
- A user can grant only permissions they hold, and cannot edit their own role. Disable and explain any box they may not change.
- Start "New role" from a template, not from empty. Save with one primary button and confirm the change in a toast.
- Tokens: `surface-sunken`, `surface-raised`, `accent`, `accent-strong`, `border`, `target-min`, `radius-lg`.
