/** Joins the class names that are set, skipping false, null, undefined and empty strings. */
export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
