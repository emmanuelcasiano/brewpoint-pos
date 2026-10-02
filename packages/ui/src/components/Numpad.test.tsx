import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AmountDisplay } from './AmountDisplay';
import { applyNumpadKey } from './numpad-keys';
import { Numpad } from './Numpad';
import { PinDots } from './PinDots';
import { QuickAmounts } from './QuickAmounts';

describe('Numpad', () => {
  it('keeps the fixed key order: 1-2-3 down to Clear, 0, Delete', () => {
    render(<Numpad onKey={vi.fn()} />);
    const names = screen
      .getAllByRole('button')
      .map((b) => b.getAttribute('aria-label') ?? b.textContent);

    expect(names).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Clear', '0', 'Delete']);
  });

  it('marks Clear as an action key and names the Delete icon key', () => {
    render(<Numpad onKey={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Clear' })).toHaveClass('bp-key', 'bp-key--action');
    expect(screen.getByRole('button', { name: 'Delete' }).querySelector('svg')).toHaveAttribute(
      'width',
      '26',
    );
  });

  it('reports each key', async () => {
    const onKey = vi.fn();
    render(<Numpad onKey={onKey} />);
    await userEvent.click(screen.getByRole('button', { name: '7' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));

    expect(onKey.mock.calls).toEqual([['7'], ['delete'], ['clear']]);
  });

  it('disables every key', async () => {
    const onKey = vi.fn();
    render(<Numpad onKey={onKey} disabled confirmLabel="Enter" />);
    await userEvent.click(screen.getByRole('button', { name: '1' }));

    for (const key of screen.getAllByRole('button')) expect(key).toBeDisabled();
    expect(onKey).not.toHaveBeenCalled();
  });

  it('adds a confirm key that can wait for a complete entry', async () => {
    const onKey = vi.fn();
    const { rerender } = render(<Numpad onKey={onKey} confirmLabel="Enter" confirmDisabled />);
    const confirm = screen.getByRole('button', { name: 'Enter' });

    expect(confirm).toHaveClass('bp-key--confirm');
    expect(confirm).toBeDisabled();
    rerender(<Numpad onKey={onKey} confirmLabel="Enter" />);
    await userEvent.click(confirm);
    expect(onKey).toHaveBeenCalledWith('confirm');
  });
});

describe('applyNumpadKey', () => {
  it('adds digits up to the length, deletes one, clears all', () => {
    expect(applyNumpadKey('27', '4', 4)).toBe('274');
    expect(applyNumpadKey('2741', '9', 4)).toBe('2741');
    expect(applyNumpadKey('274', 'delete', 4)).toBe('27');
    expect(applyNumpadKey('', 'delete', 4)).toBe('');
    expect(applyNumpadKey('274', 'clear', 4)).toBe('');
    expect(applyNumpadKey('274', 'confirm', 4)).toBe('274');
  });
});

describe('PinDots', () => {
  it('shows the count as dots with a spoken label', () => {
    const { container } = render(<PinDots filled={2} length={4} />);

    expect(screen.getByRole('img', { name: '2 of 4 digits entered' })).toHaveClass('bp-pin');
    expect(container.querySelectorAll('.bp-pin__dot')).toHaveLength(4);
    expect(container.querySelectorAll('.bp-pin__dot.is-filled')).toHaveLength(2);
  });

  it('shows the error state', () => {
    render(<PinDots filled={0} length={6} error />);
    expect(screen.getByRole('img', { name: '0 of 6 digits entered' })).toHaveClass('bp-pin--error');
  });
});

describe('AmountDisplay', () => {
  it('formats centavos as pesos', () => {
    const { container } = render(<AmountDisplay label="Amount" centavos={40000} />);

    expect(container.querySelector('.bp-display__label')).toHaveTextContent('Amount');
    expect(container.querySelector('.bp-display__value')).toHaveTextContent('₱400.00');
  });
});

describe('QuickAmounts', () => {
  it('sends the amount in centavos', async () => {
    const onSelect = vi.fn();
    render(
      <QuickAmounts
        amounts={[
          { label: 'Exact', centavos: 37350 },
          { label: '₱500', centavos: 50000 },
        ]}
        onSelect={onSelect}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: '₱500' }));

    expect(screen.getByRole('button', { name: 'Exact' })).toHaveClass('bp-btn', 'bp-btn--sm');
    expect(onSelect).toHaveBeenCalledWith(50000);
  });
});
