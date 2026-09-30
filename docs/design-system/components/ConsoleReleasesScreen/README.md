App releases and device health: which versions registers run, when old versions stop, and what errors devices report.

**Built from:** `bp-app` with `<nav data-adminnav="releases">`, `bp-pagehead`, StatTiles, and a `bp-dash--2` of the releases DataTable with minimum-version fields beside a device errors DataTable.

**The consumer provides** `app_releases` (version, date, notes, minimum and warn dates) with device counts from `devices.app_version`, and `device_error_reports` grouped by message and version.

- A minimum version is announced with two dates: warn from (an update banner on the POS) and required from (the device must update before it sells).
- Never force an update in the middle of a shift: a required update applies when the register is next opened.
- Errors are grouped by message and version with device and shop counts, so staff can see whether one shop or everyone is affected.
