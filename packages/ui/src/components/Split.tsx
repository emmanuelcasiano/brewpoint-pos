import type { ReactNode } from 'react';
import { cx } from './cx';

export interface SplitProps {
  /** A 420px side column instead of 376px, for an editor drawer. */
  wide?: boolean;
  /** The main content first (usually a DataTable), then the Drawer. */
  children: ReactNode;
  className?: string;
}

/** A list beside its detail: the main column and a fixed-width drawer column. */
export function Split({ wide = false, children, className }: SplitProps) {
  return <div className={cx('bp-split', wide && 'bp-split--wide', className)}>{children}</div>;
}
