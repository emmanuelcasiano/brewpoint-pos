The Devices page: each register's sync and license state, and how to pair or revoke one.

**Built from:** `bp-app` with `<nav data-sidenav="devices">`, `bp-pagehead`, a `bp-devices` grid of `bp-device` cards (`bp-device__name`, a status chip, a `bp-kv`), a `bp-device--empty` card with a `bp-code` pairing code, an info banner, and a DataTable of revoked devices.

**The consumer provides** devices with model, branch, signed-in user, last sync, unsynced sale count, license lease, app version and printer; a one-time pairing code with its expiry; and the plan's device limit.

- Status chip: "Online, synced 3:05 PM" (`success`), "Offline since 2:33 PM" (neutral, wifi-off; offline is normal), "Syncing 3 sales" (`info`). A license with 3 days or fewer left turns `warning` in the card and on the device's top bar.
- The pairing code is 6 digits, shown large in mono with a space in the middle, valid 10 minutes, and read out by screen readers digit by digit.
- Revoke asks for confirmation and signs the device out at its next sync; unsynced sales on it still upload. Revoked devices stay listed for the record.
- At the plan limit, the empty card explains the limit and links to Subscription instead of showing a code.
