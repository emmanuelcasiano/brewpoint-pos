# Plan Action

1. Read current-feature.md and the brief. If Brief and Goals are empty, error: "Run /feature load first"
2. If an open question marked "decide before planning" has no answer, ask it first
3. Write the plan under ## Plan:
    - Files to add or change, placed as in docs/architecture/file-structure.md
    - Migrations, and any schema.sql change (ask first if the table belongs to another module)
    - Endpoints, each with its permission code
    - Audit sentences
    - Components and screens, with the preview.html each matches and its states
    - Tests, mapped to the brief's acceptance criteria and test cases
4. Fill ## Build steps, marking "none" on a step with no work
5. Set Status to "Planning", show the plan, and wait. Do not write code.
6. On approval, set Status to "Approved". If changes are asked for, update the plan and ask again.
