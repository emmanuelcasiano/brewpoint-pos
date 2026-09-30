Feature flags: turn a feature on for chosen shops before everyone, and allow exceptions to plan limits.

**Built from:** `bp-app` with `<nav data-adminnav="flags">`, `bp-pagehead`, and a `bp-split` of the flags DataTable and a limit overrides card, beside a flag `bp-drawer` with a `bp-segmented` rollout and the list of shops.

**The consumer provides** `feature_flags` (key, description, rollout) and `tenant_feature_overrides` (tenant, flag or limit, value, until).

- Rollout is one of Off, Chosen shops, Plans, Everyone. Devices read flags at sync, so a change reaches a register at its next sync.
- A limit override names the limit, the plan's value, the allowed value and an optional end date; expired overrides fall back to the plan.
- Flag keys are code-facing (`kitchen_display`); the description is what staff read.
