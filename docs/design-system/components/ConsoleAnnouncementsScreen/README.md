Announcements: tell shops about maintenance, new features or price changes.

**Built from:** `bp-app` with `<nav data-adminnav="announcements">`, `bp-pagehead`, and a `bp-split--wide` of the announcements DataTable beside a composer `bp-drawer` with a live `bp-banner` preview.

**The consumer provides** `announcements` (title, body, audience, channels, schedule) and `announcement_reads` for dismissals.

- Audience: all shops, a plan, or chosen shops. Channels: back-office banner and email. Never on the POS; cashiers should not see platform news mid-sale.
- A banner shows until the owner dismisses it or its end date; dismissals are stored per user.
- Price-change notices go out at least 30 days ahead and are required before moving shops to a new price.
