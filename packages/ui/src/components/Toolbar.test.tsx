import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FilterChip } from './FilterChip';
import { SearchInput } from './SearchInput';
import { Toolbar, ToolbarSpacer } from './Toolbar';

describe('Toolbar', () => {
  it('lays out its children with a spacer', () => {
    const { container } = render(
      <Toolbar>
        <FilterChip pressed>All items</FilterChip>
        <ToolbarSpacer />
        <SearchInput label="Search inventory" />
      </Toolbar>,
    );
    expect(container.firstElementChild).toHaveClass('bp-toolbar');
    expect(container.querySelector('.bp-toolbar__spacer')).toBeInTheDocument();
  });
});

describe('SearchInput', () => {
  it('has a label for screen readers and a decorative icon', async () => {
    const onChange = vi.fn();
    render(<SearchInput label="Search inventory" placeholder="Search items" onChange={onChange} />);
    const input = screen.getByRole('textbox', { name: 'Search inventory' });
    await userEvent.type(input, 'oat');

    expect(input).toHaveClass('bp-input');
    expect(input.closest('label')).toHaveClass('bp-search');
    expect(input.closest('label')?.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(onChange).toHaveBeenCalledTimes(3);
  });
});

describe('FilterChip', () => {
  it('is a toggle with its count after the label', async () => {
    const onClick = vi.fn();
    render(
      <FilterChip pressed={false} icon="alert" count={5} onClick={onClick}>
        Needs attention
      </FilterChip>,
    );
    const chip = screen.getByRole('button', { name: 'Needs attention 5' });
    await userEvent.click(chip);

    expect(chip).toHaveClass('bp-chip', 'bp-chip--action');
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    expect(chip.querySelector('svg')).toHaveAttribute('width', '16');
    expect(chip.querySelector('.bp-chip__count')).toHaveTextContent('5');
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('shows the pressed state, with no icon or count unless given', () => {
    render(<FilterChip pressed>All items</FilterChip>);
    const chip = screen.getByRole('button', { name: 'All items' });

    expect(chip).toHaveAttribute('aria-pressed', 'true');
    expect(chip.querySelector('svg, .bp-chip__count')).toBeNull();
  });
});
