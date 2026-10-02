import type { ReactNode } from 'react';
import { Button } from './Button';

export interface PagerProps {
  /** Where the reader is ("Showing 1 to 8 of 312 transactions today"). */
  summary: ReactNode;
  onPrevious: () => void;
  onNext: () => void;
  /** False on the first page; the button is disabled. */
  hasPrevious: boolean;
  /** False on the last page; the button is disabled. */
  hasNext: boolean;
  /** "Previous" by default; logs use "Newer". */
  previousLabel?: string;
  /** "Next" by default; logs use "Older". */
  nextLabel?: string;
}

/** The line under a DataTable: what is shown, and the previous and next page buttons. */
export function Pager({
  summary,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  previousLabel = 'Previous',
  nextLabel = 'Next',
}: PagerProps) {
  return (
    <div className="bp-pager">
      <span>{summary}</span>
      <div className="bp-row gap-2">
        <Button size="sm" disabled={!hasPrevious} onClick={onPrevious}>
          {previousLabel}
        </Button>
        <Button size="sm" disabled={!hasNext} onClick={onNext}>
          {nextLabel}
        </Button>
      </div>
    </div>
  );
}
