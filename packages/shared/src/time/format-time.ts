const MANILA_TIME = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: 'Asia/Manila',
});

/**
 * A time of day as BrewPoint shows it: 12-hour, Asia/Manila ("3:05 PM").
 * ICU puts a narrow no-break space before AM/PM; this uses a plain space so text matches everywhere.
 */
export function formatTime(date: Date): string {
  return MANILA_TIME.format(date).replace(/\s/gu, ' ');
}
