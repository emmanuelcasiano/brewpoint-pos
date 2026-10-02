import { NavGroups, type NavBadge, type RenderNavLink } from './NavGroups';
import { BACK_OFFICE_NAV, type BackOfficeDestination } from './nav-destinations';

export interface SideNavCounts {
  /** Unread stock alerts. */
  alerts?: number;
  /** Items in any stock alert: low, out, expired or expiring. */
  inventory?: number;
}

export interface SideNavProps {
  current: BackOfficeDestination;
  /** Badges appear only on Alerts and Inventory, and only above zero. */
  counts?: SideNavCounts;
  /** Destinations the user has no permission for. They are removed, never disabled. */
  hidden?: readonly BackOfficeDestination[];
  /** Renders each item as the app router's link, spreading the given props onto it. */
  renderLink: RenderNavLink<BackOfficeDestination>;
}

/** What each badge counts, for its aria-label: [one, many]. */
const COUNTED: Record<keyof SideNavCounts, [string, string]> = {
  alerts: ['unread alert', 'unread alerts'],
  inventory: ['item needs attention', 'items need attention'],
};

/**
 * The back-office side navigation on brand brown: the same destinations in the same order on
 * every page, with the current one filled in the shop accent.
 */
export function SideNav({ current, counts = {}, hidden = [], renderLink }: SideNavProps) {
  const badges: Partial<Record<BackOfficeDestination, NavBadge>> = {};
  for (const key of ['alerts', 'inventory'] as const) {
    const count = counts[key];
    const [one, many] = COUNTED[key];
    if (count) badges[key] = { count, label: `${count} ${count === 1 ? one : many}` };
  }

  return (
    <nav className="bp-sidenav" aria-label="Back-office">
      <NavGroups
        groups={BACK_OFFICE_NAV}
        current={current}
        hidden={hidden}
        badges={badges}
        renderLink={renderLink}
      />
    </nav>
  );
}
