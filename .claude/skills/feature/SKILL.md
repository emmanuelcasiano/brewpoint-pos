---
name: feature
description: Run the BrewPoint module workflow - load a brief, plan, build step by step, test, review, explain or complete
argument-hint: load|plan|start|test|review|explain|complete
---

# Feature Workflow

Takes one module brief from docs/modules/ from load to merge. CLAUDE.md, the brief and docs/architecture/file-structure.md are the source of truth; this skill only runs the steps.

## Working File

context/current-feature.md

### File Structure

- `# Current Feature` - H1 with the module when active (`# Current Feature: 10 Register sessions`)
- `## Status` - Not Started | Planning | Approved | In Progress | Complete
- `## Brief` - path to the module brief
- `## Goals` - the brief's acceptance criteria, as checkboxes
- `## Build steps` - Migration, Server logic and tests, API, Screens, as checkboxes ("none" where the module has no work)
- `## Plan` - the approved plan
- `## Notes` - out of scope, open questions and answers, other context
- `## History` - completed modules (append only)

## Task

Execute the requested action: $ARGUMENTS

| Action     | Description                                           |
| ---------- | ----------------------------------------------------- |
| `load`     | Load a module brief and ask its open questions        |
| `plan`     | Write the plan and wait for approval                  |
| `start`    | Create the branch, build the next step, then stop     |
| `test`     | Write and run tests for what was built                |
| `review`   | Check acceptance criteria, Definition of Done, scope  |
| `explain`  | Document what changed and why                         |
| `complete` | Verify, commit, merge, update briefs, reset           |

See [actions/](actions/) for detailed instructions.

If no action is given, show the current Status and explain the available options.
