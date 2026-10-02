import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ChipButton } from './ChipButton';
import { StatusChip } from './StatusChip';
import { TopBar } from './TopBar';
import { UserButton } from './UserButton';

describe('TopBar', () => {
  it('keeps the fixed order: shop, register, license, spacer, sync, user', () => {
    const { container } = render(
      <TopBar
        shopName="Kape Davao"
        meta="Main branch, device T1"
        user={<UserButton name="Ana" role="Cashier" />}
        sync={
          <ChipButton tone="success" icon="check">
            Synced
          </ChipButton>
        }
        license={
          <StatusChip tone="warning" icon="clock">
            License: 2 days offline left
          </StatusChip>
        }
        register={<StatusChip icon="check">Register open</StatusChip>}
      />,
    );
    const bar = container.firstElementChild;
    const order = Array.from(bar?.children ?? [], (el) => el.textContent || el.className);

    expect(bar).toHaveClass('bp-topbar');
    expect(order).toEqual([
      'Kape DavaoMain branch, device T1',
      'Register open',
      'License: 2 days offline left',
      'bp-topbar__spacer',
      'Synced',
      'Ana, Cashier',
    ]);
    expect(screen.getByRole('heading', { level: 1, name: 'Kape Davao' })).toHaveClass(
      'bp-topbar__name',
    );
  });

  it('leaves out the license chip when it is not due', () => {
    const { container } = render(
      <TopBar
        shopName="Kape Davao"
        meta="Main branch, device T1"
        register={<StatusChip icon="lock">Register closed</StatusChip>}
        sync={<ChipButton icon="wifi-off">Offline, 2 sales waiting</ChipButton>}
        user={<UserButton name="Maria" role="Manager" />}
      />,
    );
    expect(container.querySelectorAll('.bp-chip')).toHaveLength(2);
  });
});

describe('UserButton', () => {
  it('names the person and their role, with an 18px icon', () => {
    render(<UserButton name="Ana" role="Cashier" aria-expanded={false} />);
    const user = screen.getByRole('button', { name: 'Ana, Cashier' });

    expect(user).toHaveClass('bp-user');
    expect(user).toHaveAttribute('aria-expanded', 'false');
    expect(user.querySelector('svg')).toHaveAttribute('width', '18');
  });
});
