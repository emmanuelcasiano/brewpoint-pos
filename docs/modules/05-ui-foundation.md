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

## Open questions
- Gallery tool: Storybook or a lightweight in-app route.

## How to work
1. Read the files above. Ask about anything unclear before planning.
2. Write a plan: files to add or change, migrations, endpoints, components, tests. Wait for approval.
3. Build in this order, stopping after each step for review: migration → server logic and tests → API → screens.
4. Finish with the Definition of Done checklist from CLAUDE.md, ticked.
