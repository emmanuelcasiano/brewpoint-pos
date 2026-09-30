# Load Action

1. Check $ARGUMENTS (after "load"):
    - A number or file name (`10`, `10-register-sessions`): find `docs/modules/<arg>*.md`. If none or several match, list the briefs and stop
    - Several words: a fix or small change, not a module. Use it as the description, write the goals, and set Brief to "none"
    - Empty: error - "load needs a module brief, for example /feature load 10"
2. If another module is Planning, Approved or In Progress, stop and ask. One module per session.
3. Read CLAUDE.md, the brief, and every file under its "Read before planning". Check "Depends on" against History and warn about anything missing.
4. Update current-feature.md:
    - H1: `# Current Feature: <number> <module name>`
    - Status: Not Started
    - Brief: the path
    - Goals: the brief's acceptance criteria, word for word, as checkboxes
    - Notes: the brief's "Out of scope" and "Open questions"
5. Show a short summary, then ask the open questions and anything unclear. Write each answer into the brief's "Decisions already made".
