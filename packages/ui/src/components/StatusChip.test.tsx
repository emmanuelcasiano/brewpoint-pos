import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ChipButton } from './ChipButton';
import { StatusChip } from './StatusChip';

describe('StatusChip', () => {
  it('always shows the icon and the word', () => {
    const { container } = render(
      <StatusChip tone="warning" icon="alert">
        Low, 3 left
      </StatusChip>,
    );
    const chip = container.firstElementChild;

    expect(chip).toHaveClass('bp-chip', 'bp-chip--warning');
    expect(chip).toHaveTextContent('Low, 3 left');
    expect(chip?.querySelector('svg')).toHaveAttribute('width', '16');
  });

  it('is neutral without a tone, as offline and closed states are', () => {
    const { container } = render(<StatusChip icon="lock">Register closed</StatusChip>);
    expect(container.firstElementChild).toHaveAttribute('class', 'bp-chip');
  });
});

describe('ChipButton', () => {
  it('is a 44px action chip with an 18px icon', async () => {
    const onClick = vi.fn();
    render(
      <ChipButton tone="success" icon="check" onClick={onClick}>
        Synced
      </ChipButton>,
    );
    const chip = screen.getByRole('button', { name: 'Synced' });
    await userEvent.click(chip);

    expect(chip).toHaveClass('bp-chip', 'bp-chip--action', 'bp-chip--success');
    expect(chip.querySelector('svg')).toHaveAttribute('width', '18');
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('spins its icon while syncing', () => {
    render(
      <ChipButton tone="info" icon="refresh" spin>
        Syncing 3 sales
      </ChipButton>,
    );
    expect(screen.getByRole('button').querySelector('svg')).toHaveClass('bp-icon', 'is-spin');
  });

  it('shows the pressed state only when it toggles', () => {
    render(
      <>
        <ChipButton icon="alert" pressed>
          Sensitive only
        </ChipButton>
        <ChipButton icon="wifi-off">Offline, 2 sales waiting</ChipButton>
      </>,
    );
    expect(screen.getByRole('button', { name: 'Sensitive only' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Offline, 2 sales waiting' })).not.toHaveAttribute(
      'aria-pressed',
    );
  });
});
