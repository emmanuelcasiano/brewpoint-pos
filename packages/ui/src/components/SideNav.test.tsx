import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ConsoleNav } from './ConsoleNav';
import type { NavLinkProps } from './NavGroups';
import { SideNav } from './SideNav';

function hashLink<K extends string>({ destination, ...props }: NavLinkProps<K>) {
  return <a href={`#${destination}`} {...props} />;
}

function itemNames() {
  return screen.getAllByRole('link').map((link) => link.textContent);
}

describe('SideNav', () => {
  it('lists every destination in order under its group, on brand', () => {
    const { container } = render(<SideNav current="dashboard" renderLink={hashLink} />);

    expect(screen.getByRole('navigation', { name: 'Back-office' })).toHaveClass('bp-sidenav');
    expect(itemNames()).toEqual([
      'Dashboard',
      'Alerts',
      'Transactions',
      'Reports',
      'Register sessions',
      'Products',
      'Inventory',
      'Expiry tracking',
      'Purchase orders',
      'Suppliers',
      'Users and roles',
      'Devices',
      'Audit log',
      'Subscription',
      'Settings',
    ]);
    expect(
      Array.from(container.querySelectorAll('.bp-sidenav__group'), (g) => g.textContent),
    ).toEqual(['Sales', 'Menu and stock', 'Purchasing', 'People', 'Business']);
  });

  it('marks the current page and passes each destination to the router link', () => {
    render(<SideNav current="inventory" renderLink={hashLink} />);
    const current = screen.getByRole('link', { current: 'page' });

    expect(current).toHaveTextContent('Inventory');
    expect(current).toHaveAttribute('href', '#inventory');
    expect(current).toHaveClass('bp-sidenav__item');
    expect(screen.getAllByRole('link', { current: false })).toHaveLength(14);
  });

  it('puts badges only on Alerts and Inventory, labelled with what they count', () => {
    const { container } = render(
      <SideNav current="dashboard" counts={{ alerts: 1, inventory: 140 }} renderLink={hashLink} />,
    );
    const badges = container.querySelectorAll('.bp-sidenav__badge');

    expect(badges).toHaveLength(2);
    expect(
      within(screen.getByRole('link', { name: /^Alerts/ })).getByLabelText('1 unread alert'),
    ).toHaveTextContent('1');
    expect(
      within(screen.getByRole('link', { name: /^Inventory/ })).getByLabelText(
        '140 items need attention',
      ),
    ).toHaveTextContent('99+');
  });

  it('shows no badge for a zero count', () => {
    const { container } = render(
      <SideNav current="dashboard" counts={{ alerts: 0 }} renderLink={hashLink} />,
    );
    expect(container.querySelector('.bp-sidenav__badge')).toBeNull();
  });

  it('removes hidden destinations, and a group heading left with no items', () => {
    const { container } = render(
      <SideNav
        current="dashboard"
        hidden={['purchases', 'suppliers', 'audit']}
        renderLink={hashLink}
      />,
    );

    expect(itemNames()).not.toContain('Purchase orders');
    expect(itemNames()).not.toContain('Audit log');
    expect(itemNames()).toContain('Subscription');
    expect(container).not.toHaveTextContent('Purchasing');
  });
});

describe('ConsoleNav', () => {
  it('is the light staff navigation with the Staff console tag', () => {
    const { container } = render(<ConsoleNav current="shops" renderLink={hashLink} />);
    const nav = screen.getByRole('navigation', { name: 'Staff console' });

    expect(nav).toHaveClass('bp-sidenav', 'bp-sidenav--console');
    expect(container.querySelector('.bp-sidenav__brandname')).toHaveTextContent('BrewPoint');
    expect(container.querySelector('.bp-sidenav__env')).toHaveTextContent('Staff console');
    expect(screen.getByRole('link', { current: 'page' })).toHaveTextContent('Shops');
    expect(itemNames()).toHaveLength(12);
  });

  it('shows open counts on tickets, support access and data requests', () => {
    render(
      <ConsoleNav
        current="overview"
        counts={{ tickets: 4, datarequests: 1 }}
        renderLink={hashLink}
      />,
    );

    expect(screen.getByLabelText('4 open')).toHaveTextContent('4');
    expect(screen.getByLabelText('1 open')).toHaveTextContent('1');
    expect(screen.getByRole('link', { name: /^Support access/ })).not.toContainHTML(
      'bp-sidenav__badge',
    );
  });
});
