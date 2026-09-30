The staff console home: how the business is doing and what needs a staff member today. Only BrewPoint staff (`platform_users`) can open the console; it is a separate app from any shop's back-office.

**Built from:** `bp-app` with `<nav data-adminnav="overview">` (the console navigation on `ink`, with a "Staff console" tag so it is never mistaken for a shop), `bp-pagehead` with the signed-in staff member, StatTiles, a revenue `line` Chart and a plan `hbar` Chart, a Needs attention card of `bp-alert` rows and a recent activity list.

**The consumer provides** MRR and its history, shop counts by plan and status, trial conversion, and the attention items (failed payments, old app versions, data requests near their deadline, pending support access).

- MRR counts active paying shops only; trials and past due shops are shown next to it, never inside it.
- Needs attention items link to the screen that resolves them. Order: data requests near a legal deadline, failed payments, then everything else.
- Recent activity comes from `platform_audit_log` and uses the same sentences.
