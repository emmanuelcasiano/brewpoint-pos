const COUNT = new Intl.NumberFormat('en-PH');

/** Counts in tabs and filter chips: grouped ("1,204"), never shortened. */
export function formatCount(n: number): string {
  return COUNT.format(n);
}

/** Counts in the bell and side-navigation badges, capped at "99+". */
export function formatBadge(n: number): string {
  return n > 99 ? '99+' : String(n);
}
