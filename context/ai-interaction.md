# AI Interaction Guidelines

## Communication

- Be concise and direct
- Explain non-obvious decisions briefly
- Ask before large refactors or architectural changes
- Don't add features not in the module brief; never build anything under its "Out of scope"
- Never delete files without clarification

## Workflow

Every module goes through the `/feature` skill. One session works on one module brief.

1. **Load** - `/feature load <brief>`: read CLAUDE.md, the brief and every file under its "Read before planning". Fill in @context/current-feature.md. Ask the brief's open questions and anything unclear.
2. **Plan** - `/feature plan`: write the plan (files, migrations, endpoints, components, tests) into current-feature.md and wait for approval. No code before the plan is approved.
3. **Branch and build** - `/feature start`: create the branch, build one step, and stop for review. Once the step is approved, commit it and push the branch. Run it again for the next step. The order is always migration → server logic and tests → API → screens, skipping steps the module has no work for.
4. **Test** - `/feature test`: write or update tests, then run type-check, lint and tests. For screens, compare with preview.html in both themes. Fix any errors. Commit new tests as `test(<scope>)` once approved.
5. **Iterate** - Change things if needed. Commit each fix as `fix(<scope>)` once approved.
6. **Review** - `/feature review`: check the acceptance criteria, the Definition of Done in CLAUDE.md, the brief's "Out of scope" and the file-structure rules
7. **Complete** - `/feature complete`: update the briefs, reset current-feature.md and add to History, then merge to main as one merge commit and push

When a decision is made during the session, add it to the brief's "Decisions already made" right away.

Do NOT commit without permission, and not until type-check, lint and tests pass. Do not merge to main until the build passes too. If anything fails, fix it first.

## Branching and pushing

- Never commit directly to main. All work, even housekeeping, goes through a branch
- Name branches **feature/<brief-file-name>** (for example `feature/01-project-skeleton`) or **fix/<short-name>**
- Push the branch after every commit
- Merge to main with `git merge --no-ff`: one merge commit per module, only after all checks pass
- Never rewrite history that has been pushed. Never force-push main; on your own branch use `--force-with-lease` only
- Ask before deleting a branch once merged

## Commits

- Ask before committing. Approving a reviewed build step, test or fix counts as approval to commit it
- One build step, test addition or fix per commit; one merge commit per module
- Every commit passes type-check, lint and tests
- Use Conventional Commits: `type(scope): summary`, in the imperative, under 72 characters. The scope is the module (`auth`, `sales`, `inventory`). Types: feat, fix, test, docs, chore
- No AI attribution of any kind: no "Generated With Claude" text and no "Co-Authored-By: Claude" line, in commits or pull request descriptions
- Never commit secrets, `.env` files or build output

## When Stuck

- If something isn't working after 2-3 attempts, stop and explain the issue
- Don't keep trying random fixes
- Ask for clarification if requirements are unclear

## Code Changes

- Make minimal changes to accomplish the task
- Don't refactor unrelated code unless asked
- Don't add "nice to have" features
- Preserve existing patterns in the codebase
- Don't change tables owned by another module without asking

## Code Review

Review AI-generated code periodically, especially for:

- Security (permission checks on the server, tenant isolation, input validation, staff access only with an active grant)
- Performance (unnecessary re-renders, N+1 queries)
- Logic errors (edge cases, money in centavos, FEFO, offline changes applied exactly once)
- Patterns (matches file-structure.md and the modules already built)
