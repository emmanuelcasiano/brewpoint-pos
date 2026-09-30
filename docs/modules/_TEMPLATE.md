# Module <number>: <name>

## Goal
One or two sentences: who uses this, and what they can do when it is finished.

## Depends on (already built)
- <modules>

## Read before planning
- CLAUDE.md
- <design-system READMEs, previews, guidelines, schema tables>

## Data
- Owns (creates, writes): <tables>
- Reads only: <tables>
- Schema changes: none / <exact change and why>

## In scope
- <each user action, one line each>

## Out of scope (do not build)
- <things that belong to later modules>

## Business rules
- <each rule as one testable sentence, with real numbers>

## Permissions
- <action> needs <permission code>. Checked on the server.

## Audit
- <which actions write audit_log, and the sentence each writes>

## Offline behaviour (if it touches the POS)
- What works offline, what waits for sync, what shows on screen.

## Screens
- <Screen>: states to build (empty, loading, normal, error, offline)

## Acceptance criteria
- [ ] <observable result a person or test can check>

## Test cases
- <given / when / then, including edge and failure cases>

## Decisions already made
- <answers to earlier questions>

## Open questions
- <things to decide before or during planning>

## How to work
1. Read the files above. Ask about anything unclear before planning.
2. Write a plan: files to add or change, migrations, endpoints, components, tests. Wait for approval.
3. Build in this order, stopping after each step for review: migration → server logic and tests → API → screens.
4. Finish with the Definition of Done checklist from CLAUDE.md, ticked.
