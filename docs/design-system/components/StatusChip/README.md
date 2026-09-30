A pill that states one status in an icon and a word: sync state, stock level, expiry, subscription state or register state.

**Classes:** `bp-chip` with `bp-chip--success`, `bp-chip--warning`, `bp-chip--danger` or `bp-chip--info` (none for neutral); add `bp-chip--action` on a `button` when tapping it does something (the sync chip opens the queue).

**The consumer provides** the state, the matching icon from `BrewPoint.icon`, and a short label. Add a count when it helps ("Offline, 2 sales waiting").

- Always pair the icon with the word. Color is a reinforcement, never the message.
- Use check for good, alert (triangle) for warning, x or lock for danger and blocked, clock for time-limited states (Expires in 2 days), calendar-x for Expired, refresh for syncing, wifi-off for offline.
- Use `bp-chip--action` only for tappable chips; it is 44px tall. Static chips are 28px and never carry actions.
- Keep labels to three words. Put detail in a banner or the list the chip opens.
- Do not invent a new status color. Offline is neutral, not red.
- Tokens: `success`, `success-soft`, `warning`, `warning-soft`, `danger`, `danger-soft`, `info`, `info-soft`, `surface-sunken`, `radius-pill`, `target-min`.
