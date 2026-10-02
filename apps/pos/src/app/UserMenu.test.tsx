import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { UserMenu, type UserMenuItem } from './UserMenu';

function setup(onSelect: UserMenuItem['onSelect'] = () => Promise.resolve()) {
  const items: UserMenuItem[] = [
    { label: 'Switch user', busyLabel: 'Switching user…', onSelect },
    { label: 'Sign out', busyLabel: 'Signing out…', onSelect },
  ];
  render(
    <>
      <UserMenu firstName="Ana" fullName="Ana Cruz" role="Cashier" items={items} />
      <p>Below the bar</p>
    </>,
  );
  return { user: userEvent.setup(), button: screen.getByRole('button', { name: 'Ana, Cashier' }) };
}

describe('UserMenu', () => {
  it('opens a menu over the page with focus on the first item', async () => {
    const { user, button } = setup();
    expect(button).toHaveAttribute('aria-expanded', 'false');

    await user.click(button);

    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menu', { name: 'Ana, Cashier' })).toBeVisible();
    expect(screen.getByText('Ana Cruz')).toBeVisible();
    expect(screen.getByRole('menuitem', { name: 'Switch user' })).toHaveFocus();
  });

  it('moves between items with the arrow keys, Home and End', async () => {
    const { user, button } = setup();
    await user.click(button);
    const [switchUser, signOut] = screen.getAllByRole('menuitem');

    await user.keyboard('{ArrowDown}');
    expect(signOut).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(switchUser).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(signOut).toHaveFocus();
    await user.keyboard('{Home}');
    expect(switchUser).toHaveFocus();
    await user.keyboard('{End}');
    expect(signOut).toHaveFocus();
  });

  it('closes on Escape and returns focus to the button', async () => {
    const { user, button } = setup();
    await user.click(button);

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });

  it('closes on a press outside it, and on the button again', async () => {
    const { user, button } = setup();
    await user.click(button);
    await user.click(screen.getByText('Below the bar'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    await user.click(button);
    await user.click(button);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('shows the action running and runs it once', async () => {
    let finish = () => {};
    const onSelect = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    const { user, button } = setup(onSelect);
    await user.click(button);

    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }));
    const running = screen.getByRole('menuitem', { name: 'Signing out…' });
    expect(running).toHaveAttribute('aria-disabled', 'true');
    await user.click(running);
    await user.click(screen.getByRole('menuitem', { name: 'Switch user' }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    finish();
    expect(await screen.findByRole('menuitem', { name: 'Sign out' })).toBeVisible();
  });
});
