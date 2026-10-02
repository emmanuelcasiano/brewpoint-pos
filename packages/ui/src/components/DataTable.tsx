import type { KeyboardEvent, ReactNode } from 'react';
import { cx } from './cx';

export interface DataTableColumn<Row> {
  key: string;
  header: ReactNode;
  /** Right-aligned with tabular figures and never wrapped, for every number and money column. */
  numeric?: boolean;
  cell: (row: Row) => ReactNode;
  /** A secondary line under the cell, such as the base unit under a pack quantity ("4,750 ml"). */
  sub?: (row: Row) => ReactNode;
  /** Extra classes on each body cell, such as `bp-nowrap` or `bp-table__actions`. */
  className?: string;
}

export interface DataTableProps<Row> {
  /** Read by screen readers only ("Inventory at Main branch"). */
  caption: string;
  columns: readonly DataTableColumn<Row>[];
  rows: readonly Row[];
  rowKey: (row: Row) => string;
  /** The row shown in the drawer beside the table. */
  selectedKey?: string | null;
  /** Makes each row open its record: by click, or by Enter or Space when the row has focus. */
  onRowClick?: (row: Row) => void;
  /** Tighter side padding, for a table beside a drawer. */
  compact?: boolean;
  className?: string;
}

/** Clickable rows take focus; the ring sits inside the row so the wrapper never clips it. */
const ROW_FOCUS =
  'focus-visible:outline-2 focus-visible:outline-focus focus-visible:-outline-offset-2';

/** Browsers make a sideways-scrolling wrapper a tab stop; it gets the same ring as a control. */
const WRAP_FOCUS =
  'focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2';

/** The back-office table. Numbers right-aligned, status chip last, scrolls sideways when narrow. */
export function DataTable<Row>({
  caption,
  columns,
  rows,
  rowKey,
  selectedKey,
  onRowClick,
  compact = false,
  className,
}: DataTableProps<Row>) {
  function handleKeyDown(event: KeyboardEvent<HTMLTableRowElement>, row: Row) {
    if (event.target !== event.currentTarget) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onRowClick?.(row);
  }

  return (
    <div className={cx('bp-tablewrap', WRAP_FOCUS, className)}>
      <table className={cx('bp-table', compact && 'bp-table--compact')}>
        <caption className="bp-sr">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" className={column.numeric ? 'num' : undefined}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const key = rowKey(row);
            const selected = key === selectedKey;
            return (
              <tr
                key={key}
                className={cx(
                  onRowClick && 'is-link',
                  onRowClick && ROW_FOCUS,
                  selected && 'is-selected',
                )}
                aria-current={selected || undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={onRowClick && (() => onRowClick(row))}
                onKeyDown={onRowClick && ((event) => handleKeyDown(event, row))}
              >
                {columns.map((column) => {
                  const sub = column.sub?.(row);
                  return (
                    <td
                      key={column.key}
                      className={
                        cx(column.numeric && 'num bp-nowrap', column.className) || undefined
                      }
                    >
                      {column.cell(row)}
                      {sub != null && <span className="bp-table__sub">{sub}</span>}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** A record code in a cell or sub-line, in mono ("B-0921", "sale.void.approve"). */
export function TableCode({ children }: { children: ReactNode }) {
  return <span className="bp-table__code">{children}</span>;
}
