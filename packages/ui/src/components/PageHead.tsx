import type { ReactNode } from 'react';

export interface PageHeadProps {
  /** The page title in display-lg ("Inventory"). */
  title: string;
  /** The branch and date range, or a one-line summary ("Main branch. 38 items, 5 need attention"). */
  meta?: ReactNode;
  /** Right-aligned: the page's buttons, then the Bell (back-office) or UserButton (console). */
  children?: ReactNode;
}

/** The header that opens every back-office and console page. */
export function PageHead({ title, meta, children }: PageHeadProps) {
  return (
    <header className="bp-pagehead">
      <div>
        <h1 className="bp-pagehead__title">{title}</h1>
        {meta && <div className="bp-pagehead__meta">{meta}</div>}
      </div>
      <span className="bp-pagehead__spacer" />
      {children}
    </header>
  );
}
