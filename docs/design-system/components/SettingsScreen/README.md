The Settings page: shop-wide configuration in sections, shown here on Notifications.

**Built from:** `bp-app` with `<nav data-sidenav="settings">`, `bp-pagehead`, and `bp-settings`: a `bp-subnav` (`aria-current="page"` on the open section) beside the section's content, built from `bp-group` with `bp-setrow` rows of `bp-switch` per channel, and `bp-card` with a `bp-formgrid` of fields.

**The consumer provides** each section's saved values, which ones the user may change (`settings.manage`, `inventory.alerts.settings`), and which are locked.

- Sections, in order: Shop profile (name, address, TIN, logo-free receipt header), Branches, Receipts (58 or 80 mm, footer text, the "not an official receipt" line), Taxes and discounts (VAT 12%, Senior Citizen and PWD 20% with VAT exemption, discount limits per role), Payment methods (Cash, GCash, Maya, Card), Notifications, Appearance (the AccentPicker and theme), Data and backups.
- A locked switch (urgent alerts in the back-office) is disabled with its reason in the section note.
- Save applies to every device at its next sync; show a toast "Settings saved. Registers update at their next sync."
- Leaving with unsaved changes asks "Discard changes?" with Discard and Keep editing.
