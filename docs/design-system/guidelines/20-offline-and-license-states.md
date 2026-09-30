# Offline, sync and license states

BrewPoint sells with no internet. The interface has to make that feel normal and still show the cashier what needs attention. Each state below has one component and one place on screen.

| State | Where | Component | Copy |
|---|---|---|---|
| Online, nothing waiting | Top bar, right | `bp-chip--success` action chip | "Synced" |
| Syncing | Top bar, right | `bp-chip--info` action chip, spinning refresh icon | "Syncing 3 sales" |
| Offline | Full-width banner under the top bar, and the top bar chip | `bp-banner--offline` and a neutral action chip | "You are offline. Sales are saved on this device and will sync when you reconnect." Chip: "Offline, 2 sales waiting" |
| Server rejected an item | Top bar chip, opens the needs-attention list | `bp-chip--warning` action chip | "1 needs attention" |
| Offline license ending | Warning banner and a top bar chip | `bp-banner--warning`, `bp-chip--warning` | "Offline license ends in 2 days. Connect to the internet to renew it." |
| License expired or tenant suspended | Danger banner; the POS is locked | `bp-banner--danger` | "Selling is paused. This device could not verify your subscription. Connect to the internet to continue." |
| Trial ending | Info banner in the back-office and POS | `bp-banner` | "Your trial ends in 9 days. Add a plan to keep selling after Oct 6." |
| Payment failed (grace period) | Warning banner | `bp-banner--warning` | "Payment failed. Update your card within 3 days to keep selling." |

## Rules

- Never block a sale because the connection is down. Offline is shown, not enforced, until the license says otherwise.
- Never use red for offline. Red means a person must act; offline needs no action.
- Decide "offline" from real request failures, not from the browser's online flag alone, and show the same state everywhere at once.
- Count waiting sales in the chip. A cashier should see at a glance that nothing has been lost.
- Keep rejected items visible in the needs-attention list until someone resolves them. Never drop them silently.
- When the license lock is active, keep three things available: closing the register, viewing data, and syncing the queue that already exists. Say so on the lock screen.
- Approvals given offline are marked in the audit log; the approval prompt itself looks the same online and offline.
- Show every state in both themes; the banners keep their meaning without color alone because each carries an icon and a sentence.
