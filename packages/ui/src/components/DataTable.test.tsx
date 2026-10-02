import { formatPeso } from '@brewpoint/shared';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DataTable, TableCode, type DataTableColumn } from './DataTable';
import { Pager } from './Pager';

interface Item {
  id: string;
  name: string;
  pack: string;
  onHand: string;
  base?: string;
  value: number;
}

const ITEMS: Item[] = [
  {
    id: 'milk',
    name: 'Fresh milk',
    pack: '1 L box',
    onHand: '4.75 boxes',
    base: '4,750 ml',
    value: 42750,
  },
  { id: 'oat', name: 'Oat milk', pack: '1 L box', onHand: '0.5 box', base: '500 ml', value: 9000 },
  { id: 'water', name: 'Bottled Water', pack: 'piece', onHand: '0 pcs', value: 0 },
];

const COLUMNS: DataTableColumn<Item>[] = [
  { key: 'item', header: 'Item', cell: (r) => r.name, sub: (r) => r.pack },
  { key: 'onhand', header: 'On hand', numeric: true, cell: (r) => r.onHand, sub: (r) => r.base },
  { key: 'value', header: 'Stock value', numeric: true, cell: (r) => formatPeso(r.value) },
  {
    key: 'batch',
    header: 'Batch',
    cell: (r) => <TableCode>B-{r.id}</TableCode>,
    className: 'bp-nowrap',
  },
];

function renderTable(props: Partial<Parameters<typeof DataTable<Item>>[0]> = {}) {
  return render(
    <DataTable
      caption="Inventory at Main branch"
      columns={COLUMNS}
      rows={ITEMS}
      rowKey={(r) => r.id}
      {...props}
    />,
  );
}

describe('DataTable', () => {
  it('has a hidden caption and column headers with scope="col"', () => {
    const { container } = renderTable();
    const table = screen.getByRole('table', { name: 'Inventory at Main branch' });

    expect(container.firstElementChild).toHaveClass('bp-tablewrap');
    expect(table).toHaveClass('bp-table');
    expect(table.querySelector('caption')).toHaveClass('bp-sr');
    for (const header of screen.getAllByRole('columnheader')) {
      expect(header).toHaveAttribute('scope', 'col');
    }
  });

  it('right-aligns numeric columns without wrapping, and adds a sub-line only when there is one', () => {
    renderTable();
    const [milk, , water] = screen.getAllByRole('row').slice(1);
    const milkCells = within(milk!).getAllByRole('cell');
    const waterCells = within(water!).getAllByRole('cell');

    expect(screen.getByRole('columnheader', { name: 'On hand' })).toHaveClass('num');
    expect(screen.getByRole('columnheader', { name: 'Item' })).not.toHaveClass('num');
    expect(milkCells[1]).toHaveClass('num', 'bp-nowrap');
    expect(milkCells[0]).not.toHaveClass('bp-nowrap');
    expect(milkCells[1]!.querySelector('.bp-table__sub')).toHaveTextContent('4,750 ml');
    expect(milkCells[2]).toHaveTextContent('₱427.50');
    expect(waterCells[1]!.querySelector('.bp-table__sub')).toBeNull();
    expect(milkCells[3]).toHaveClass('bp-nowrap');
    expect(milkCells[3]!.querySelector('.bp-table__code')).toHaveTextContent('B-milk');
  });

  it('uses the compact class when asked', () => {
    renderTable({ compact: true });
    expect(screen.getByRole('table')).toHaveClass('bp-table', 'bp-table--compact');
  });

  it('marks the selected row', () => {
    renderTable({ selectedKey: 'oat' });
    const rows = screen.getAllByRole('row').slice(1);

    expect(rows[1]).toHaveClass('is-selected');
    expect(rows[1]).toHaveAttribute('aria-current', 'true');
    expect(rows[0]).not.toHaveClass('is-selected');
  });

  it('leaves rows plain and out of the Tab order when they do nothing', () => {
    renderTable();
    const row = screen.getAllByRole('row')[1];
    expect(row).not.toHaveClass('is-link');
    expect(row).not.toHaveAttribute('tabindex');
  });

  it('opens a clickable row by click, or by Enter or Space when focused', async () => {
    const onRowClick = vi.fn();
    renderTable({ onRowClick });
    const rows = screen.getAllByRole('row').slice(1);

    expect(rows[0]).toHaveClass('is-link');
    await userEvent.tab();
    expect(rows[0]).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(onRowClick).toHaveBeenLastCalledWith(ITEMS[0]);
    await userEvent.tab();
    await userEvent.keyboard(' ');
    expect(onRowClick).toHaveBeenLastCalledWith(ITEMS[1]);

    await userEvent.click(within(rows[2]!).getByText('Bottled Water'));
    expect(onRowClick).toHaveBeenLastCalledWith(ITEMS[2]);
    expect(onRowClick).toHaveBeenCalledTimes(3);
  });
});

describe('Pager', () => {
  it('shows the summary and disables the button at each end', async () => {
    const onPrevious = vi.fn();
    const onNext = vi.fn();
    const { container } = render(
      <Pager
        summary="Showing 1 to 8 of 312 transactions today"
        hasPrevious={false}
        hasNext
        onPrevious={onPrevious}
        onNext={onNext}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(container.firstElementChild).toHaveClass('bp-pager');
    expect(container).toHaveTextContent('Showing 1 to 8 of 312 transactions today');
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(onNext).toHaveBeenCalledOnce();
  });

  it('takes the log labels Newer and Older', () => {
    render(
      <Pager
        summary="Showing 9 of 348 entries today."
        hasPrevious
        hasNext={false}
        onPrevious={vi.fn()}
        onNext={vi.fn()}
        previousLabel="Newer"
        nextLabel="Older"
      />,
    );
    expect(screen.getByRole('button', { name: 'Newer' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Older' })).toBeDisabled();
  });
});
