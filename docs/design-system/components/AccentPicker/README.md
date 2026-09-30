The owner's control for choosing the shop accent, with presets, a hex field, a live preview and a contrast readout.

**Classes:** `bp-swatches` with `bp-swatch` (set `--swatch` and `aria-pressed`), a `bp-field` for the hex, and `bp-readout` for the checks. The logic is `BrewPoint.deriveAccent` and `BrewPoint.applyAccent`.

**The consumer provides** the current hex, the current theme, and a save handler that stores the hex in the shop's settings.

- Offer six presets plus a custom hex. The default is Crema.
- Validate `#RRGGBB` before deriving and show "Enter a color like #1F8A8A" otherwise.
- Apply the derived tokens live on the preview area so the owner sees the button, selected tile and checkbox change before saving.
- Show the readout with each pair's ratio and a check or x icon. If the derived accent moved from what was typed, say so.
- Re-derive when the theme changes.
- Do not let the picker recolor status colors, the side navigation or receipts.
- Tokens: `accent`, `accent-hover`, `accent-pressed`, `on-accent`, `accent-soft`, `accent-strong`, `target-pos`.
