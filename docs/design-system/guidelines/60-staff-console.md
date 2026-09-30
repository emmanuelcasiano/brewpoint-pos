# Staff console

The staff console is BrewPoint's own admin app for the team that runs the product (superadmin, support, billing, engineering). It is a separate app from any shop's back-office, with its own sign-in, its own navigation and its own audit log.

## How it looks different

- Navigation is light (`surface-raised` with a `border-strong` edge) with a "Staff console" tag under the name. A shop's back-office navigation is always `brand` brown. Staff should never wonder which one they are in.
- The page header shows the signed-in staff member and role at the right ("Emmanuel, Superadmin"), where a shop shows the alert bell.
- Built from the same parts as the back-office: page header, a toolbar of filters in one row, tables, detail drawers, StatTiles and Charts.

## Screens

| Navigation | Screen | Tables it reads |
| --- | --- | --- |
| Overview | ConsoleOverviewScreen | tenants, subscriptions, invoices, platform_audit_log |
| Shops | ConsoleShopsScreen, ConsoleShopDetailScreen | tenants, subscriptions, plan_prices, devices, tenant_events |
| Support access | ConsoleSupportAccessScreen | support_access_grants |
| Tickets (optional) | ConsoleTicketsScreen | support_tickets, support_ticket_messages |
| Billing | ConsoleBillingScreen | invoices, invoice_lines, payment_events, credit_notes, billing_customers, payment_methods |
| Plans and prices | ConsolePlansScreen | plans, plan_prices |
| Feature flags | ConsoleFlagsScreen | feature_flags, tenant_feature_overrides |
| App releases | ConsoleReleasesScreen | app_releases, device_error_reports, devices |
| Announcements | ConsoleAnnouncementsScreen | announcements, announcement_reads |
| Data requests | ConsoleDataRequestsScreen | data_requests |
| Staff audit log | ConsoleAuditScreen | platform_audit_log |
| Staff | ConsoleStaffScreen | platform_users, platform_roles, platform_permissions |

## Rules

- Staff see a shop's account (plan, billing, devices, users), never its sales, stock or customers, unless the owner has approved a support access grant. While a grant is active the shop sees a support bar on every page and can end it.
- Every staff action asks for a reason and is written to `platform_audit_log`. Actions that change a shop also write `tenant_events`.
- Billing is provider-neutral: each invoice and payment event names its provider (Stripe now). Shops that pay with GCash get a monthly invoice with a payment link.
- Prices are versioned in `plan_prices`; changing a price never changes what existing shops pay until they are moved, with 30 days' notice.
- Two-step sign-in is required for every staff account. Only a Superadmin manages staff and deletes shop data.
