const LONG_DATE = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const SHORT_DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const TIME_UTC = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hour12: false });

/** Accepts "2026-10-13" (treated as midnight UTC) or a full ISO timestamp. */
function utcDate(iso: string): Date {
  return new Date(iso.includes('T') ? iso : `${iso}T00:00:00Z`);
}

/** "Tuesday, 13 October 2026" */
export function formatLongDate(iso: string): string {
  return LONG_DATE.format(utcDate(iso));
}

/** "13 Oct 2026" */
export function formatShortDate(iso: string): string {
  return SHORT_DATE.format(utcDate(iso));
}

/** "13 Oct 2026, 06:05 UTC" */
export function formatTimestamp(iso: string): string {
  const d = utcDate(iso);
  return `${SHORT_DATE.format(d)}, ${TIME_UTC.format(d)} UTC`;
}

/** "Tuesday, 13 October 2026, 06:05 UTC" */
export function formatLongTimestamp(iso: string): string {
  const d = utcDate(iso);
  return `${LONG_DATE.format(d)}, ${TIME_UTC.format(d)} UTC`;
}

/** "+4", "−3" or "±0" with a proper minus sign. */
export function formatSigned(value: number): string {
  if (value > 0) return `+${value}`;
  if (value < 0) return `\u2212${Math.abs(value)}`;
  return '\u00B10';
}
