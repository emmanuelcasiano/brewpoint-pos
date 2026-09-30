# Start Action

1. Read current-feature.md. If Status is not Approved or In Progress, error: "Run /feature plan and approve the plan first"
2. On the first run only: set Status to "In Progress", then create and check out `feature/<brief file name>` (or `fix/<short-name>`)
3. Take the first unticked build step, in this order: migration → server logic and tests → API → screens
4. Build only that step, following the plan
5. Run type-check, lint and tests for the packages touched, and fix any failures
6. Tick the step, summarize what was built, propose a commit message (`feat(<scope>): <summary>`), and stop for review
7. When the step is approved, commit it and push the branch if a remote exists. The next `/feature start` builds the next step
