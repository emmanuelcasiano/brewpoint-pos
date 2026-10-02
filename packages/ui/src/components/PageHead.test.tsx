import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Bell } from './Bell';
import { Button } from './Button';
import { PageHead } from './PageHead';

describe('PageHead', () => {
  it('shows the title, the meta line, then the actions after the spacer', () => {
    const { container } = render(
      <PageHead title="Inventory" meta="Main branch. 38 items, 5 need attention">
        <Button size="sm">Count stock</Button>
      </PageHead>,
    );
    const head = container.firstElementChild;

    expect(head?.tagName).toBe('HEADER');
    expect(screen.getByRole('heading', { level: 1, name: 'Inventory' })).toHaveClass(
      'bp-pagehead__title',
    );
    expect(head?.querySelector('.bp-pagehead__meta')).toHaveTextContent('38 items');
    expect(head?.querySelector('.bp-pagehead__spacer + .bp-btn')).toHaveTextContent('Count stock');
  });

  it('has no meta line without meta', () => {
    const { container } = render(<PageHead title="Settings" />);
    expect(container.querySelector('.bp-pagehead__meta')).toBeNull();
  });
});

describe('Bell', () => {
  it('names the unread count and says whether the panel is open', async () => {
    const onClick = vi.fn();
    render(<Bell count={5} expanded={false} onClick={onClick} />);
    const bell = screen.getByRole('button', { name: 'Alerts, 5 unread' });
    await userEvent.click(bell);

    expect(bell).toHaveClass('bp-bell');
    expect(bell).toHaveAttribute('aria-expanded', 'false');
    expect(bell.querySelector('.bp-bell__count')).toHaveTextContent('5');
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('caps the shown count at 99+ but keeps the real number in its name', () => {
    render(<Bell count={120} expanded />);
    const bell = screen.getByRole('button', { name: 'Alerts, 120 unread' });

    expect(bell).toHaveAttribute('aria-expanded', 'true');
    expect(bell.querySelector('.bp-bell__count')).toHaveTextContent('99+');
  });

  it('shows no count when nothing is unread', () => {
    render(<Bell count={0} expanded={false} />);
    const bell = screen.getByRole('button', { name: 'Alerts, none unread' });
    expect(bell.querySelector('.bp-bell__count')).toBeNull();
  });
});
