# Module 05: UI foundation

## Goal
The shared React component library that every screen is built from, matching the BrewPoint design system in both themes and with a per-shop accent.

## Depends on (already built)
- Module 01 project skeleton (can run in parallel with 02 to 04).

## Read before planning
- CLAUDE.md (section "UI")
- docs/design-system/README.md (all of it)
- docs/design-system/tokens.json, tokens.css
- docs/design-system/components/bundle.css, bundle.js, index.d.ts
- READMEs and previews: Button, Field, StatusChip, Banner, DataTable, Navigation, StatTile, Chart, NotificationCenter (bell and toast parts), PinPrompt, Numpad
- docs/design-system/guidelines/30-per-shop-accent.md
- Open docs/design-system/previews/*.html in a browser to compare

## Data
- None.

## In scope
- `packages/ui`: import tokens.css; Tailwind config mapping colors, spacing, radii, shadows and fonts to the CSS variables.
- Theme switch (Daylight, Night shift) via `data-theme` on <html>, remembered per device.
- Port helpers to TypeScript in packages/shared or packages/ui: formatPeso (already), formatPesoShort, deriveAccent, applyAccent, contrast, icon set.
- React components keeping the bp- class names and states: Button (primary, quiet, danger, sizes, loading), Field and inputs (money, select, checkbox, switch), StatusChip, Banner, Toast, DataTable (with sub-lines, numeric columns, selected row, pager), Tabs, Segmented, Drawer and Split layout, Toolbar and Search, PageHead, SideNav (shop) and ConsoleNav (staff), TopBar (POS), Numpad, PinPrompt, Modal, StatTile, Chart (bar, line, hbar with tooltip and table view), Meter, Timeline.
- A component gallery page (for example Storybook or a simple route) showing every component in both themes.

## Out of scope (do not build)
- Real screens and data fetching (later modules).

## Business rules
- No hex values in components; only tokens.
- Minimum heights: POS controls 56px, numpad keys and Pay 72px, back-office controls 44px.
- Every status shows an icon and a word. Focus ring: 2px focus color with a 2px gap.
- Charts follow the Chart README: fixed series colors chart-1 to chart-4, never the shop accent or status colors; every chart has a table view.

## Permissions
- None.

## Audit
- None.

## Offline behaviour
- Components render with no network; fonts are bundled in the POS app so it looks right offline.

## Screens
- The component gallery.

## Acceptance criteria
- [ ] Every component in the list renders in both themes, side by side with its preview.html, with no visible differences in spacing, color or type.
- [ ] Switching the accent to #9C3D54 recolors only accent tokens, and all accent text pairs stay at 4.5:1 or more.
- [ ] Keyboard focus is visible on every interactive component.
- [ ] Components have unit tests for their states (disabled, selected, error, loading).

## Test cases
- Given accent #222222 in Night shift, when deriveAccent runs, then accent is lifted to at least 3:1 against the dark ground.

## Decisions already made
- Fonts: Bricolage Grotesque (headings), IBM Plex Sans (UI), IBM Plex Mono (receipts, codes).
- From Module 01: Tailwind v4 with CSS-based configuration. Map the tokens with `@theme inline` over tokens.css; `inline` keeps theme and accent switching at runtime, including two themes side by side in the gallery. Shared Vite settings live in `packages/config/vite` and React lint rules in `packages/config/eslint` (`react`). Each app's placeholder `src/app/App.tsx` is replaced by real screens.
- Built before Module 03, because the 03 sign-in screens use Button, Field, Numpad and PinPrompt.
- Gallery: a dev-only Vite page inside packages/ui, run with `pnpm --filter @brewpoint/ui gallery`. It shows each component in Daylight and Night shift beside an iframe of its preview.html, with an accent input. Nothing from it ships in an app.
- Styling: bundle.css is ported into packages/ui as CSS in Tailwind's `components` layer, using only token variables. Components set the bp- classes; screens use Tailwind utilities for layout. This is how "Tailwind for all styling" applies to bp- components (noted in context/coding-standards.md).
- Visual check: compare by eye in the gallery (both themes, beside preview.html) while building, then lock the approved look with Playwright screenshot baselines of the gallery in CI.
- Screenshot tests run on Linux Chromium only. Their baselines come from a manual `update-gallery-snapshots` CI job (no Docker is used locally), and Windows runs skip them.
- Fonts are bundled from `@fontsource` packages in packages/ui's stylesheet, used by all three apps; no Google Fonts request.
- Tailwind's default palette and spacing are switched off; only token values exist. Where a Tailwind setting has the same name as a token (`--radius-*`, `--shadow-*`, `--font-*`), the mapping uses `reference` so the variable is never redeclared as itself.
- Chart is a React SVG component with the same geometry, classes and tooltip as bundle.js, not an HTML string.
- SideNav and ConsoleNav take a `renderLink` prop; the router is chosen when each app's shell is built.
- The theme is stored per device in localStorage under `brewpoint.theme`; Daylight is the default.
- The Crema values in tokens.css are hand-tuned and differ slightly from `deriveAccent('#E2A13B')` (the port matches bundle.js exactly; a test runs bundle.js to check). So `applyTheme` applies an accent only for a shop color other than Crema; with no shop color or Crema, tokens.css applies unchanged.
- tokens.css and components.css are verbatim copies (Prettier skips them) with tests that keep them in step with the design system. The type styles live in theme.css as Tailwind `text-*` values, also checked against tokens.json.
- `compat.css` undoes the Tailwind preflight resets that bundle.css relies on, starting with icons (preflight makes every svg a block). It is the only place to add such fixes.
- Fonts are declared by BrewPoint's own `@font-face` rules over the fontsource files (latin and latin-ext per weight, so ₱ is covered), because fontsource names the variable font "Bricolage Grotesque Variable".
- Not built here: ProductTile, CartLine, Receipt, AccentPicker, PermissionMatrix, the notification panel and alert rows. Each is built with the module that uses it.
- Field passes its id, `aria-invalid` and `aria-describedby` to the TextInput, Select or MoneyInput inside it through context, so a consumer writes `<Field label error><TextInput /></Field>`.
- MoneyInput takes and returns integer centavos (null when empty). It parses the typed text without floats, accepts at most two decimals and ₱9,999,999.99, and formats on blur.
- PinPrompt and Numpad are controlled: the caller holds the PIN (`pin`, `onPinChange`), checks it and counts the tries; a wrong PIN is shown by clearing `pin` and passing `error`. `applyNumpadKey` is the shared key rule for PINs and cash.
- Numpad takes an optional full-width confirm key (`confirmLabel`) for entries whose length varies.
- Modal renders through a portal over the page (`fixed`, `z-modal`), moves focus in, traps Tab, cancels on Escape and returns focus on close. `contained` renders it in place inside a `bp-stage` without moving or trapping focus; it is for the gallery and previews only.
- Banner picks its role from its tone (danger is `alert`, the rest `status`) and a default icon per tone; Toast pauses its 8 seconds while hovered or focused.
- Tabs use a roving tab stop: only the selected tab is in the Tab order, arrow keys, Home and End move focus, and Enter or Space selects (manual activation).
- SideNav and ConsoleNav call `renderLink({ destination, className, 'aria-current', children })`; the app spreads everything but `destination` onto its router link. Both take `hidden` (destinations the user may not open are removed, and an emptied group loses its heading). Badge labels are plural-aware ("1 unread alert", "5 items need attention"; console: "4 open").
- DataTable takes column definitions (`cell`, optional `sub` line, `numeric`, `className`). Numeric cells also get `bp-nowrap`, so numbers never wrap and the wrapper scrolls instead. Clickable rows (`onRowClick`) are focusable and open on Enter or Space; their focus ring is a 2px `focus` outline drawn inside the row (offset -2px, Tailwind utilities on the row) so the scrolling wrapper never clips it. The selected row has `is-selected` and `aria-current="true"`.
- Bell's name keeps the real count ("Alerts, 120 unread") while the badge shows "99+"; with nothing unread it reads "Alerts, none unread" and shows no badge.
- TopBar takes `register`, `license` (only when due), `sync` and `user` slots and renders them in the fixed order. Pager takes `hasPrevious`/`hasNext` and labels that default to Previous and Next (logs pass Newer and Older).

## Open questions
- None. Gallery tool answered under "Decisions already made".

## How to work
1. Read the files above. Ask about anything unclear before planning.
2. Write a plan: files to add or change, migrations, endpoints, components, tests. Wait for approval.
3. Build in this order, stopping after each step for review: migration → server logic and tests → API → screens.
4. Finish with the Definition of Done checklist from CLAUDE.md, ticked.
