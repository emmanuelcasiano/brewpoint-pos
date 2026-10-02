import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Segmented } from './Segmented';

const PERIODS = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7 days' },
  { key: 'custom', label: 'Custom', icon: 'calendar' },
] as const;

describe('Segmented', () => {
  it('sets aria-pressed on the selected option only', () => {
    render(<Segmented label="Period" options={PERIODS} value="today" onChange={vi.fn()} />);

    expect(screen.getByRole('group', { name: 'Period' })).toHaveClass('bp-segmented');
    expect(screen.getByRole('button', { name: 'Today' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '7 days' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('puts a 16px icon before the label', () => {
    render(<Segmented label="Period" options={PERIODS} value="today" onChange={vi.fn()} />);
    const custom = screen.getByRole('button', { name: 'Custom' });
    expect(custom.firstElementChild).toHaveAttribute('width', '16');
  });

  it('reports the chosen option', async () => {
    const onChange = vi.fn();
    render(<Segmented label="Period" options={PERIODS} value="today" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: '7 days' }));
    expect(onChange).toHaveBeenCalledWith('7d');
  });
});
