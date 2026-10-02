import { Fragment, type ReactNode } from 'react';
import { Icon } from '../icons/Icon';
import { formatBadge } from './format-count';
import type { NavGroup } from './nav-destinations';

/** What a navigation item hands to the app's router link. Spread it onto an `<a>` or `<Link>`. */
export interface NavLinkProps<K extends string> {
  destination: K;
  className: 'bp-sidenav__item';
  'aria-current': 'page' | undefined;
  children: ReactNode;
}

export type RenderNavLink<K extends string> = (link: NavLinkProps<K>) => ReactNode;

export interface NavBadge {
  count: number;
  /** What is counted, for the badge's aria-label ("5 unread alerts"). */
  label: string;
}

interface NavGroupsProps<K extends string> {
  groups: readonly NavGroup<K>[];
  current: K;
  hidden: readonly K[];
  badges: Partial<Record<K, NavBadge>>;
  renderLink: RenderNavLink<K>;
}

/**
 * The groups and items shared by SideNav and ConsoleNav. Hidden destinations are removed, and a
 * group left with no items loses its heading too.
 */
export function NavGroups<K extends string>({
  groups,
  current,
  hidden,
  badges,
  renderLink,
}: NavGroupsProps<K>) {
  return groups.map((group, index) => {
    const items = group.items.filter((item) => !hidden.includes(item.key));
    if (items.length === 0) return null;
    return (
      <Fragment key={group.heading ?? index}>
        {group.heading && <div className="bp-sidenav__group">{group.heading}</div>}
        {items.map((item) => {
          const badge = badges[item.key];
          return (
            <Fragment key={item.key}>
              {renderLink({
                destination: item.key,
                className: 'bp-sidenav__item',
                'aria-current': item.key === current ? 'page' : undefined,
                children: (
                  <>
                    <Icon name={item.icon} />
                    {item.label}
                    {badge && (
                      <span className="bp-sidenav__badge" aria-label={badge.label}>
                        {formatBadge(badge.count)}
                      </span>
                    )}
                  </>
                ),
              })}
            </Fragment>
          );
        })}
      </Fragment>
    );
  });
}
