# Coding Standards

These apply to every module. When this file disagrees with CLAUDE.md, docs/architecture/file-structure.md or the module brief, those win.

## TypeScript

- Strict mode in every package
- No `any` - use proper types or `unknown`
- Define interfaces for props, request and response contracts, and data models
- Request and response types live in `packages/shared/src/contracts/`, one file per module, used by the server and the apps
- Use type inference where obvious, explicit types where helpful

## React

- Function components only (no class components)
- Hooks for state and side effects
- One job per component
- Reusable logic goes in custom hooks (`use-<feature>.ts`)
- Design-system components live in `packages/ui`, keep the `bp-` class names and states from their README, and have no data fetching or business rules

## Styling

- Tailwind for all styling, with colors, spacing, radii, shadows and fonts mapped to the CSS variables in `tokens.css`
- `bp-` components get their styles from packages/ui's `components.css`, a verbatim port of the design system's `bundle.css` in Tailwind's `components` layer; screens use Tailwind utilities for layout. Tailwind's default palette and spacing are off, so only token values exist
- Never a hex value in a component; only tokens
- No inline styles. The exceptions: `applyAccent` sets the accent CSS variables at runtime, and packages/ui components set runtime geometry no token can hold (a meter's fill width, a chart tooltip's position) or a token reference such as `--key: var(--chart-1)`
- The Tailwind version and where its configuration lives are decided in Module 01 and recorded in that brief

## File organization

Follow docs/architecture/file-structure.md exactly. In short:

- Server: `apps/server/src/modules/<module>/` with `routes.ts`, `service.ts`, `repository.ts`, `schemas.ts` and `<module>.test.ts`
- Shared server rules: `apps/server/src/core/` (tenant transaction, auth, permissions, audit, sync, stock, money, errors)
- Migrations in `apps/server/src/db/migrations/`, seed data in `apps/server/src/db/seed/`
- Screens: `apps/<app>/src/features/<module>/` with `<Name>Page.tsx`, its parts, `use-<module>.ts` and tests
- Shared code moves to `core/` or `packages/` only when two or more modules need it
- A module never imports another module's `repository.ts`; it calls that module's service

## Naming

- File and folder names: kebab-case
- React components and their files: PascalCase (`ProductTile.tsx`)
- Functions and variables: camelCase
- Constants: SCREAMING_SNAKE_CASE
- Types and interfaces: PascalCase, no prefix

## Database

- docs/database/schema.sql is the source of truth. A column change updates it and the module brief
- One ordered migration file per change
- Every tenant query goes through `core/db/tenant-transaction.ts`; no direct database calls anywhere else
- Stock changes only through `core/stock/record-movement.ts`
- Money is `bigint` centavos in the database and `number` in TypeScript; the database library must return it as a number
- The migration tool and database library are decided in Module 01. They must support row-level security and running migrations back one step

## Server and data flow

- Apps call the server only through `lib/api-client.ts`, typed with the shared contracts
- The POS writes to its local store and outbox first and syncs afterwards; it never needs the network to sell
- Every write route declares its permission code and checks it on the server
- Validate every endpoint input with the module's `schemas.ts`

## Errors

- The server returns plain-language errors from `core/errors.ts`
- An error says what happened and what to do next ("Wrong PIN. 3 tries left on this device."), never "Something went wrong"
- Show an error where the person is looking: under the field for input errors, a Banner for a page or state problem, a Toast for the result of a background action. On the POS, changes the server rejects go to the Needs attention list
- Offline is a normal state, not an error: a neutral banner, never red

## Testing

- Tests sit next to the code they test: `*.test.ts` for server and shared code, `*.test.tsx` for components and screens
- Server: the service's business rules, every acceptance criterion and test case in the brief, the permission check on each write route, the audit sentence, and the module's tables in the row-level security test
- UI: component states (disabled, selected, error, loading) and screen states (empty, loading, error, and offline on the POS)
- Test the happy path and failure cases; don't write a test just to have one
- The test runner and commands are decided in Module 01

## Code quality

- No commented-out code
- No unused imports or variables
- Keep functions under 50 lines when possible
