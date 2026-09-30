A full-width message under the top bar for offline mode, license countdowns, trial and payment states, with an optional single action.

**Classes:** `bp-banner` (info by default) with `bp-banner--warning`, `bp-banner--danger` or `bp-banner--offline`; inside, `bp-banner__icon`, `bp-banner__body` (with a `bp-banner__title` sentence first) and an optional `bp-btn bp-btn--sm`.

**The consumer provides** the title sentence, one plain follow-up sentence, an icon and, when the user can act, one action label.

- Lead with a bold sentence that states the situation, then one sentence that says what happens or what to do.
- Use `bp-banner--offline` (roasted brown, `wifi-off` icon) for offline. Use warning for a countdown, danger only when selling is blocked.
- Show one banner at a time per concern, in priority order: blocked, payment failed, license ending, trial ending, offline.
- Give `role="status"` to informational banners and `role="alert"` to blocking ones.
- Do not stack more than two banners. Do not auto-dismiss; a banner clears when its condition does.
- Tokens: `info-soft`, `warning-soft`, `danger-soft`, `brand`, `on-brand`, `ink`, `radius-lg`, `z-banner`.
