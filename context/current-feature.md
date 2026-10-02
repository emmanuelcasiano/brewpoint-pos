# Current Feature: 05 UI foundation

## Status

In Progress

## Brief

docs/modules/05-ui-foundation.md

## Goals

- [ ] Every component in the list renders in both themes, side by side with its preview.html, with no visible differences in spacing, color or type.
- [ ] Switching the accent to #9C3D54 recolors only accent tokens, and all accent text pairs stay at 4.5:1 or more.
- [ ] Keyboard focus is visible on every interactive component.
- [ ] Components have unit tests for their states (disabled, selected, error, loading).

## Build steps

- Migration: none
- Server logic and tests: none
- API: none
- Screens, in four parts, each stopped for review and committed on approval:
  - [x] 5a Foundation: styles, tokens, fonts, helpers, icons, theme, test setup, gallery shell, app wiring
  - [x] 5b Actions, forms and feedback: Button, IconButton, Field and inputs, StatusChip, Banner, Toast, Modal, Numpad, PinPrompt
  - [x] 5c Layout and navigation: Tabs, Segmented, Split, Drawer, Toolbar, Search, PageHead, Bell, SideNav, ConsoleNav, TopBar, DataTable, Pager
  - [ ] 5d Data display and checks: Card, StatTile, Sparkline, Chart, Meter, Timeline; gallery Playwright checks and screenshot baselines

## Plan

### Approach

- `packages/ui` ships one stylesheet (`@brewpoint/ui/styles.css`) and the React components. Each app imports the stylesheet once after Tailwind.
- The `bp-` rules are `bundle.css` ported unchanged into `@layer components`, without its Google Fonts import. Components only set `bp-` classes and states; nothing in a component carries a hex value or inline style. The one exception is `applyAccent`.
- Tailwind v4 reads the tokens through `@theme inline`, so `bg-surface`, `text-ink`, `p-4`, `rounded-lg`, `min-h-target-pos`, `font-display` and `text-display-lg` all point at the CSS variables. Some Tailwind names are the same as token names (`--radius-*`, `--shadow-*`, `--font-*`). Those are mapped with `reference`, so Tailwind never redeclares a variable as itself. I'll check this against the Tailwind v4 docs while building.
- Tailwind's default palette and spacing are switched off, so only token values exist (`--color-*: initial`, `--spacing-*` mapped to `space-1` to `space-12`).
- Fonts are bundled from `@fontsource` (Bricolage Grotesque 600 and 700, IBM Plex Sans 400, 600 and 700, IBM Plex Mono 400 and 700), so the POS looks right offline. The subsets must include the peso sign (U+20B1). A gallery check confirms it renders in Plex, not a fallback.

### Files

**packages/ui**

```
packages/ui/
├── package.json                  exports ".", "./styles.css"; scripts test, gallery, build (gallery build), preview
├── vitest.config.ts              jsdom, setup file
├── eslint.config.js              switch to the react() rules
├── tsconfig.json                 include src and gallery
├── src/
│   ├── index.ts                  public exports
│   ├── styles/
│   │   ├── index.css             the published styles.css: fonts, tokens, theme, components
│   │   ├── fonts.css             @fontsource imports
│   │   ├── tokens.css            copy of docs/design-system/tokens.css, plus the type-style variables from tokens.json
│   │   ├── theme.css             @theme inline mapping for Tailwind
│   │   └── components.css        bundle.css in @layer components
│   ├── accent/
│   │   ├── contrast.ts           WCAG contrast, hex parsing (isAccentHex)
│   │   ├── derive-accent.ts      deriveAccent(hex, theme)
│   │   ├── apply-accent.ts       applyAccent(el, hex, theme)
│   │   └── accent.test.ts
│   ├── theme/
│   │   ├── theme.ts              readStoredTheme, applyTheme (data-theme on <html>, localStorage "brewpoint.theme")
│   │   ├── use-theme.ts          React hook: theme and setTheme, re-applies the accent
│   │   └── theme.test.ts
│   ├── icons/
│   │   ├── icon-paths.ts         the 45 icons from bundle.js; IconName union
│   │   ├── Icon.tsx              <svg class="bp-icon"> aria-hidden, 24px grid, currentColor
│   │   └── Icon.test.tsx
│   ├── components/               one PascalCase file per component, with its .test.tsx beside it
│   └── test/
│       ├── setup.ts              jest-dom matchers
│       └── no-hex.test.ts        fails if a component or components.css gains a hex color
└── gallery/
    ├── index.html, main.tsx, vite.config.ts   port 5176; publicDir = docs/design-system/previews
    ├── Gallery.tsx               accent input, theme switch, list of sections
    ├── Specimen.tsx              one row: Daylight, Night shift, preview.html iframe (theme set inside it)
    └── sections/                 one file per component, with demo data from the previews
```

**packages/shared**: `money/format-peso-short.ts` and its test. `formatPesoShort` is exported next to `formatPeso`.

**Apps** (backoffice, pos, console): add `@brewpoint/ui`. In `app/index.css`, add `@import '@brewpoint/ui/styles.css'` and an `@source` for packages/ui. In `main.tsx`, call `applyTheme(readStoredTheme())` before rendering. The placeholder `App.tsx` gets `bg-surface text-ink font-sans`. Its text is unchanged, so the smoke test still passes.

**Root**: `playwright.config.ts` gains the gallery web server on 5176 and a `gallery` project. `tests/e2e/gallery.spec.ts` is new. `.github/workflows/ci.yml` gains a manual `update-gallery-snapshots` job.

**Docs**: in `docs/architecture/file-structure.md`, the packages/ui tree adds `styles/`, `theme/` and `gallery/`. In `context/coding-standards.md`, a Styling line: "bp- components get their styles from packages/ui's components.css, ported from bundle.css; screens use Tailwind utilities". The brief's decisions are updated as they are made.

### Helpers

| Helper | Where | Rule |
|---|---|---|
| `formatPesoShort` | shared/money | Axis labels only: `1250000` becomes `₱12.5k` |
| `contrast`, `isAccentHex` | ui/accent | WCAG 2 ratio; `#RRGGBB` only |
| `deriveAccent` | ui/accent | Port of bundle.js. Throws on a bad hex; the message for the later AccentPicker is "Enter a color like #1F8A8A". Its ground colors are checked against tokens.json in a test |
| `applyAccent` | ui/accent | Sets only the six accent variables on the element |
| `Icon` | ui/icons | Same names and paths as bundle.js |
| `applyTheme`, `useTheme` | ui/theme | Daylight by default; remembered per device; the accent is re-derived on a theme change |

### Components

Every component keeps the `bp-` classes and states from its README. None fetch data or hold business rules.

| Component | bp- classes | Compared with | States tested |
|---|---|---|---|
| Button | bp-btn, --primary/--quiet/--danger, --sm/--lg, --block, is-loading | Button | each variant; disabled; loading (spinning refresh icon, aria-busy, ignores clicks) |
| IconButton | bp-iconbtn | InventoryScreen | requires aria-label |
| Field, TextInput, Select | bp-field, bp-input, bp-select, __help, __error, --error | Field | label tied to input; error sets aria-invalid and aria-describedby, shows the alert icon; disabled |
| MoneyInput | bp-money | Field | value in centavos in and out; inputmode decimal; error |
| Checkbox | bp-check in a 44px label | Field | checked, disabled |
| Switch | bp-switch, role="switch" | SettingsScreen | on, off, disabled |
| StatusChip, ChipButton | bp-chip, tones, --action, is-spin, aria-pressed | StatusChip, Navigation | icon and word always present; pressed; spinning |
| Banner | bp-banner, --warning/--danger/--offline | Banner | role status or alert by tone; offline uses brand; optional single action |
| Toast | bp-toast | NotificationCenter | one action; dismisses after 8 seconds; pauses on hover and focus |
| Modal | bp-scrim, bp-modal | PinPrompt | aria-modal, labelled by title, focus trapped, Escape cancels |
| Numpad, PinDots, AmountDisplay, QuickAmounts | bp-numpad, bp-key (--action, --confirm), bp-pin, bp-display, bp-quick | Numpad | key order fixed; Delete has an aria-label; disabled; dots filled count and error; aria-label "2 of 4 digits entered" |
| PinPrompt | Modal + Select + PinDots + Numpad | PinPrompt | Approve disabled until complete; wrong PIN clears dots and shows the message; locked disables the keypad; Cancel |
| Tabs | bp-tabs, bp-tab | ProductsScreen | aria-selected; arrow keys move focus |
| Segmented | bp-segmented | Dashboard | aria-pressed on the selected option |
| Split, Drawer | bp-split (--wide), bp-drawer | InventoryScreen | close button; footer actions |
| Toolbar, SearchInput, FilterChip | bp-toolbar, bp-search, bp-chip--action + bp-chip__count | InventoryScreen | search has a label; chip pressed with count |
| PageHead | bp-pagehead | Dashboard | title, meta, actions slot |
| Bell | bp-bell, bp-bell__count | NotificationCenter | count capped at "99+"; aria-expanded |
| SideNav | bp-sidenav, __group, __item, __badge | Navigation | current page; badge only on Alerts and Inventory with an aria-label; hidden destinations removed; links come from a `renderLink` prop so each app's router plugs in |
| ConsoleNav | bp-sidenav--console, __brand, __env | ConsoleShopsScreen | light surface, never brand; current page; open counts |
| TopBar, UserButton | bp-topbar, bp-user | Navigation | fixed order: shop and device, register chip, spacer, sync chip, user |
| DataTable, Pager | bp-tablewrap, bp-table, num, __sub, __code, is-selected, is-link, bp-pager | DataTable, TransactionsScreen | hidden caption; scope="col"; numeric right-aligned; selected row; clickable rows |
| Card | bp-card, __head, __title, __meta | Chart | title and meta |
| StatTile, Sparkline | bp-stat, __delta--good/--bad, is-loading, bp-spark | StatTile | loading; no delta line without a comparison; arrow plus "up" or "down" |
| Chart | bp-chart, bp-legend, bp-tip, bp-tableview | Chart | bar, line with dashed comparison, hbar with printed values; legend only with 2+ series; table view always present; empty sentence; series colors chart-1 to chart-4 only |
| Meter | bp-meter, --warning | SubscriptionScreen | fill width from value and limit; warning |
| Timeline | bp-timeline, is-done, is-now | PurchaseOrdersScreen | done, now, upcoming |

Chart is drawn as React SVG with the same geometry, classes and tooltip as bundle.js, not as an HTML string. It measures its width with a ResizeObserver.

Not built here: ProductTile, CartLine, Receipt, AccentPicker, PermissionMatrix, the notification panel and alert rows. Each belongs to the module that uses it.

### Gallery

- `pnpm --filter @brewpoint/ui gallery` opens one page with a section per component. Each section is one row: the React component in Daylight, the same in Night shift, and the component's standalone `previews/<Name>.html` in an iframe, switchable between the two themes.
- At the top: an accent hex input (default Crema, try #9C3D54) applied to both theme columns with that column's theme, and a page theme switch that uses `useTheme`, so the per-device memory can be seen.
- Dev-only. It is not exported from the package and no app imports it.

### Tests, mapped to the acceptance criteria

| Criterion or test case | Test |
|---|---|
| Every component renders in both themes, no visible differences from preview.html | Reviewed by eye in the gallery in each step. After approval, `tests/e2e/gallery.spec.ts` takes a screenshot of every section in both themes, on Linux Chromium only. Baselines come from the manual CI job (no Docker locally); Windows runs skip the screenshot tests |
| Accent #9C3D54 recolors only accent tokens; accent text pairs at 4.5:1 or more | `accent.test.ts`, in both themes: on-accent against accent, hover and pressed is at least 4.5; accent-strong against surface-raised and accent-soft is at least 4.5. In `gallery.spec.ts`, every token variable's computed value is read before and after applying #9C3D54, and only the six accent variables changed |
| Keyboard focus visible on every interactive component | In `gallery.spec.ts`, Tab through every focusable element in each section and assert a 2px solid outline with a 2px offset (`focus-inverse` on the side navigation; -2px, inside the row, on clickable table rows) |
| Unit tests for states (disabled, selected, error, loading) | The `.test.tsx` beside each component, with the states in the table above |
| Given accent #222222 in Night shift, deriveAccent lifts it to at least 3:1 against the dark ground | `accent.test.ts` |
| No hex values in components | `no-hex.test.ts` |
| Helpers | `format-peso-short.test.ts`, `theme.test.ts` (default, stored, bad stored value), `Icon.test.tsx` (every name renders, aria-hidden) |

New dev dependencies (packages/ui): vitest, jsdom, @testing-library/react, @testing-library/user-event, @testing-library/jest-dom, vite, tailwindcss. New dependencies: the three @fontsource packages. The pnpm catalog is used where an entry exists.

### Commits (each after approval, on `feature/05-ui-foundation`)

1. `docs: record decisions for modules 03 and 05` (the brief and current-feature edits already made)
2. `feat(ui): add styles, tokens, helpers and the gallery shell` (5a)
3. `feat(ui): add action, form and feedback components` (5b)
4. `feat(ui): add layout and navigation components` (5c)
5. `feat(ui): add data display components and gallery checks` (5d)

## Notes

### Out of scope (do not build)

- Real screens and data fetching (later modules).

### Open questions

- Gallery tool: Storybook or a lightweight in-app route.

### Answers (recorded in the brief's "Decisions already made")

- Gallery: a dev-only Vite page inside packages/ui (`pnpm --filter @brewpoint/ui gallery`), each component in both themes beside its preview.html iframe.
- Styling: port bundle.css into Tailwind's `components` layer, using only token variables; components set bp- classes. Add a line to coding-standards.md.
- Visual check: by eye in the gallery while building, then Playwright screenshot baselines of the gallery in CI.

### Found while loading

- Built ahead of Module 03 by decision (see the 03 brief): the 03 sign-in screens need Button, Field, Numpad and PinPrompt. 05 depends only on 01, so the order still holds.
- packages/ui has only empty `accent/`, `components/` and `icons/` folders. No React test setup exists yet (Vitest runs only in server and shared).
- The type styles (display-xl to caption, amount-xl, amount-lg, amount, key) are in tokens.json but not in tokens.css.
- bundle.css loads fonts from Google Fonts. The POS must bundle them to work offline.
- ProductTile, CartLine, Receipt, AccentPicker and PermissionMatrix are in the design system but not in this brief's list. They belong to the modules that use them.
- PinPrompt's README says a lock lasts "until an online login"; Module 03 says 5 minutes. PinPrompt only displays the state, so this is settled in 03 and 04.

## History

2026-10-02 - 01 Project skeleton - pnpm and Turborepo monorepo: Fastify server with /health, .env check and `pnpm db:check`; Vite, React and Tailwind v4 placeholders for back-office, POS and console; `formatPeso` in packages/shared with tests; Playwright smoke test; GitHub Actions CI with a gitleaks scan. Decisions: Kysely, TypeScript 6.0, Neon PostgreSQL 18 for development, POS as a web app for now, hosting deferred.

---

2026-10-02 - 02 Database and tenant isolation - All 70 tables as 12 Kysely migrations (181 foreign keys, no cascades, `uuidv7()` defaults); row-level security forced on the 59 shop tables with a `tenant_isolation` policy on `app.tenant_id`; three roles from `pnpm db:roles` (`brewpoint_migrator` owns tables, `brewpoint_app` is the server's login, `brewpoint_platform` gets cross-shop access to the BrewPoint-run tables); `createDb` and `withTenant` in core/db; uuidv7 and the 42 permission codes in packages/shared; `pnpm db:seed` (permissions, three plans, demo shops Kape Davao and Brew Bros Cebu); generated `types.ts`; isolation, migration and seed tests on a separate Neon test branch and a PostgreSQL 18 CI service. Decisions: `tenant_id` added to 24 child tables, receipt and PO numbers unique per shop, append-only tables by grant, plain-text role password for Neon, four database URLs (owner direct and app pooled, per branch).

---
