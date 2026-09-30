# Complete Action

1. Check before finishing:
    - Status is In Progress and every build step is ticked or "none"
    - Every change from test, iterate and review is committed
    - Type-check, lint, tests and build pass. If not, stop and fix
    - /feature review gave "ready"; if it has not run since the last change, run it
2. Update the docs:
    - Every decision from this session is in the brief's "Decisions already made"
    - Anything this module settled that later briefs need goes into their "Decisions already made"
    - If a column changed, schema.sql and the brief say so
3. Reset current-feature.md:
    - Change H1 back to `# Current Feature`
    - Put every section except History back to its placeholder comment
    - Add a summary to the END of History, as short as possible yet detailed enough. Format: Date - Title - Description - line separator
    - Do not remove anything from History
4. Show the ticked Definition of Done, the final commit message and the merge message, then ask once to approve the final commit, merge and push
5. On the feature branch, check `git status` (only this module's folders, migrations, briefs, schema.sql and current-feature.md should be there) and commit: `chore: complete module <nn> <name>`
6. Switch to main and run `git merge --no-ff feature/<brief file name>` with the message `Merge feature/<brief file name>: <module name>`
7. If a remote exists, push main once
8. Ask before deleting the feature branch; if approved, delete it locally and from origin if it was pushed
