# Module briefs

BrewPoint is built one module at a time, in this order. Each brief is the full context for one Claude Code session: what to build, what not to build, the rules, and how to know it is done.

## How to use a brief

1. Start a fresh Claude Code session in the project root.
2. Say: "Read CLAUDE.md and docs/modules/<file>. Ask me anything unclear, then write a plan. Do not write code yet."
3. Review the plan. Answer questions, and add the answers to the brief under **Decisions already made**.
4. Say: "Build step 1 (migration)." Review. Then server logic and tests, then API, then screens, stopping after each.
5. Finish with the Definition of Done in CLAUDE.md. Then update the next brief's **Decisions already made** with anything this module settled.

If Claude Code gets something wrong twice, the rule is missing from the brief or CLAUDE.md. Add it there.

## Order

| # | Module | Phase | Depends on |
|---|---|---|---|
| 01 | [Project skeleton](01-project-skeleton.md) | Foundations | none |
| 02 | [Database and tenant isolation](02-database-and-tenancy.md) | Foundations | 01 |
| 03 | [Sign-in and identity](03-auth-and-identity.md) | Foundations | 02 |
| 04 | [Permissions and audit](04-permissions-and-audit.md) | Foundations | 03 |
| 05 | [UI foundation](05-ui-foundation.md) | Foundations | 01 |
| 06 | [Offline sync engine](06-offline-sync.md) | Foundations | 02, 03, 04 |
| 07 | [Shop setup and onboarding](07-shop-setup.md) | Selling | 03, 04, 05, 06 |
| 08 | [Inventory core (items and ledger)](08-inventory-core.md) | Selling | 07 |
| 09 | [Menu (catalog)](09-menu-catalog.md) | Selling | 08 |
| 10 | [Register sessions and cash](10-register-sessions.md) | Selling | 06, 07 |
| 11 | [POS sale and checkout](11-pos-sale-checkout.md) | Selling | 08, 09, 10 |
| 12 | [Transactions, dashboard and reports](12-transactions-dashboard-reports.md) | Running the shop | 11 |
| 13 | [Inventory operations and expiry](13-inventory-operations.md) | Running the shop | 08, 11 |
| 14 | [Purchasing and receiving](14-purchasing.md) | Running the shop | 13 |
| 15 | [Stock alerts and notifications](15-alerts-notifications.md) | Running the shop | 13, 14 |
| 16 | [Shop management screens](16-shop-management.md) | Running the shop | 04, 07 |
| 17 | [Subscription billing](17-subscription-billing.md) | Business | 07, 16 |
| 18 | [Staff console core](18-staff-console-core.md) | Business | 03, 04, 17 |
| 19 | [Staff console extras](19-staff-console-extras.md) | Business | 18 |
| 20 | [Hardening](20-hardening.md) | Ongoing | all |

The first usable version for your own shop is modules 01 to 11. Modules 17 to 19 are needed before other shops pay you.
