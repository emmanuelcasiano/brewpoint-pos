# Test Action

1. Read current-feature.md and the brief's Acceptance criteria and Test cases
2. Find the code added or changed for this module
3. Check which criteria and test cases already have tests
4. Write the missing ones next to the code they test:
   - Server: service rules with the brief's real numbers, the permission check on each write route, audit sentences, the module's tables in the row-level security test
   - Shared: pure helpers (money, units, ids)
   - UI: component states (disabled, selected, error, loading) and screen states (empty, loading, error, offline on the POS)
   - Happy path and failure cases. Do not write tests just to write them
5. Run type-check, lint and tests (commands from Module 01) and fix any failures
6. Report which acceptance criteria have tests and which need a manual check (for example comparing a screen with its preview.html in both themes)
