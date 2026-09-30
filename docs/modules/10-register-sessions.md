# Module 10: Register sessions and cash

## Goal
A cashier opens a register with a float, records cash in and out, and closes with a counted amount. A manager reviews and approves variances.

## Depends on (already built)
- Modules 06 (sync) and 07 (shop, branches, devices). Uses 03 (PIN) and 04 (permissions, approvals).

## Read before planning
- CLAUDE.md
- docs/design-system/components/RegisterSessionsScreen/README.md and preview.html
- docs/design-system/components/Numpad/README.md, PinPrompt/README.md
- docs/design-system/guidelines/10-layout-and-touch.md (Open register and Close register rows)
- docs/design-system/guidelines/20-offline-and-license-states.md

## Data
- Owns: register_sessions, cash_counts, cash_movements
- Reads only: devices, users, branches, sales (cash totals only; sales arrive in Module 11)
- Schema changes: none

## In scope
- POS: open register (float entered by numpad), cash in and cash out with reason, close register (count by bill and coin, expected against counted, note).
- Back-office: RegisterSessionsScreen (list, close-out drawer, approve variance, add note).

## Out of scope (do not build)
- Selling, payments, receipts (Module 11). Cash reports (Module 12).

## Business rules
- One open session per device at a time.
- Expected cash = opening float + cash sales − cash out + cash in.
- Variance = counted − expected, shown as "Balanced", "Short ₱100.00" or "Over ₱50.00".
- A variance of ₱500.00 or less needs register.variance.approve; above that, register.variance.approve_large. Both ask for a PIN.
- A session with any variance is Needs review until approved.
- A closed session cannot be edited; corrections are a note plus approval.
- Denominations: ₱1,000, ₱500, ₱200, ₱100, ₱50, ₱20, and coins as one total.

## Permissions
- Open and close: register.open, register.close. Cash in or out: cash.move; above ₱1,000.00 needs cash.move.approve. See all registers: register.view_all.

## Audit
- "Opened register T1 with a ₱2,000.00 float", "Cash out ₱500.00 on T1: milk delivery", "Approved a short of ₱100.00 on T1, Sep 27. Reason: …" (sensitive).

## Offline behaviour
- Open, cash moves and close work offline and sync later with the device's ids and times. Approval happens in the back-office after sync.

## Screens
- POS: Open register, Cash in/out sheet, Close register (normal, offline, variance states).
- Back-office: RegisterSessionsScreen per its README.

## Acceptance criteria
- [ ] A second open session on the same device is refused: "T1 already has an open register. Close it first."
- [ ] Expected cash matches the formula for a session with sales and cash moves.
- [ ] A ₱600.00 short cannot be approved by a user with only register.variance.approve.
- [ ] Closing offline and reconnecting syncs the session exactly once.
- [ ] Every approval writes one audit_log row with the reason.

## Test cases
- Given float ₱2,000, cash sales ₱15,920, cash out ₱500 and counted ₱17,320, then variance is short ₱100.00 and status is needs_review.
- Given the same close sent twice by sync, then one session row exists.

## Decisions already made
- Denominations as listed above.

## Open questions
- Blind close (cashier does not see expected before counting): on or off by default. Recommendation: on.

## How to work
1. Read the files above. Ask about anything unclear before planning.
2. Write a plan: files to add or change, migrations, endpoints, components, tests. Wait for approval.
3. Build in this order, stopping after each step for review: migration → server logic and tests → API → screens.
4. Finish with the Definition of Done checklist from CLAUDE.md, ticked.
