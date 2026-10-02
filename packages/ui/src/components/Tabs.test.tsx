import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Tabs } from './Tabs';

const TABS = [
  { key: 'open', label: 'Open', count: 5 },
  { key: 'snoozed', label: 'Snoozed', count: 1 },
  { key: 'resolved', label: 'Resolved', count: 1204 },
] as const;

function renderTabs(onChange = vi.fn()) {
  render(<Tabs label="Alert status" tabs={TABS} value="snoozed" onChange={onChange} />);
  return onChange;
}

describe('Tabs', () => {
  it('marks only the selected tab, and makes it the only Tab stop', () => {
    renderTabs();
    const tabs = screen.getAllByRole('tab');

    expect(screen.getByRole('tablist', { name: 'Alert status' })).toHaveClass('bp-tabs');
    expect(tabs.map((t) => t.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false']);
    expect(tabs.map((t) => t.tabIndex)).toEqual([-1, 0, -1]);
  });

  it('shows each count grouped, in the chip-count style', () => {
    renderTabs();
    const resolved = screen.getByRole('tab', { name: 'Resolved 1,204' });
    expect(resolved.querySelector('.bp-chip__count')).toHaveTextContent('1,204');
  });

  it('moves focus with the arrow keys, Home and End, wrapping at the ends', async () => {
    const onChange = renderTabs();
    const [open, snoozed, resolved] = screen.getAllByRole('tab');
    await userEvent.tab();
    expect(snoozed).toHaveFocus();

    await userEvent.keyboard('{ArrowRight}');
    expect(resolved).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(open).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(resolved).toHaveFocus();
    await userEvent.keyboard('{Home}');
    expect(open).toHaveFocus();
    await userEvent.keyboard('{End}');
    expect(resolved).toHaveFocus();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('selects a tab by click or by Enter on the focused tab', async () => {
    const onChange = renderTabs();
    await userEvent.click(screen.getByRole('tab', { name: 'Open 5' }));
    expect(onChange).toHaveBeenLastCalledWith('open');

    await userEvent.keyboard('{ArrowRight}{Enter}');
    expect(onChange).toHaveBeenLastCalledWith('snoozed');
  });
});
