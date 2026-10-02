import type { ReactNode } from 'react';
import { cx } from './cx';

export interface ToolbarProps {
  /** Filter chips or Tabs, then a ToolbarSpacer, then selects and the SearchInput. */
  children: ReactNode;
  className?: string;
}

/** The row of filters above a back-office table. */
export function Toolbar({ children, className }: ToolbarProps) {
  return <div className={cx('bp-toolbar', className)}>{children}</div>;
}

/** Pushes what follows it to the right end of the toolbar. */
export function ToolbarSpacer() {
  return <span className="bp-toolbar__spacer" />;
}
