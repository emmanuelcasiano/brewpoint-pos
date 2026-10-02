import { Icon } from '../icons/Icon';
import { NavGroups, type NavBadge, type RenderNavLink } from './NavGroups';
import { CONSOLE_NAV, type ConsoleDestination } from './nav-destinations';

export interface ConsoleNavCounts {
  tickets?: number;
  support?: number;
  datarequests?: number;
}

export interface ConsoleNavProps {
  current: ConsoleDestination;
  /** Open items: tickets, support access requests and data requests. */
  counts?: ConsoleNavCounts;
  /** Destinations the staff member's role cannot open. They are removed, never disabled. */
  hidden?: readonly ConsoleDestination[];
  /** Renders each item as the app router's link, spreading the given props onto it. */
  renderLink: RenderNavLink<ConsoleDestination>;
}

/**
 * The staff console navigation. It is light (surface-raised with a border) and carries the
 * "Staff console" tag, never brand brown, so staff always know they are not in a shop.
 */
export function ConsoleNav({ current, counts = {}, hidden = [], renderLink }: ConsoleNavProps) {
  const badges: Partial<Record<ConsoleDestination, NavBadge>> = {};
  for (const key of ['tickets', 'support', 'datarequests'] as const) {
    const count = counts[key];
    if (count) badges[key] = { count, label: `${count} open` };
  }

  return (
    <nav className="bp-sidenav bp-sidenav--console" aria-label="Staff console">
      <div className="bp-sidenav__brand">
        <span className="bp-sidenav__brandname">BrewPoint</span>
        <span className="bp-sidenav__env">
          <Icon name="shield" size={16} />
          Staff console
        </span>
      </div>
      <NavGroups
        groups={CONSOLE_NAV}
        current={current}
        hidden={hidden}
        badges={badges}
        renderLink={renderLink}
      />
    </nav>
  );
}
