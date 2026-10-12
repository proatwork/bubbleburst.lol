const LONG_DATE = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const SHORT_DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const TIME_UTC = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hour12: false });

function utcDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00Z`);
}

/** "Tuesday, 13 October 2026" */
export function formatLongDate(isoDate: string): string {
  return LONG_DATE.format(utcDate(isoDate));
}

/** "13 Oct 2026" */
export function formatShortDate(isoDate: string): string {
  return SHORT_DATE.format(utcDate(isoDate));
}

/** "13 Oct 2026, 06:00 UTC" */
export function formatTimestamp(isoDateTime: string): string {
  const d = new Date(isoDateTime);
  return `${SHORT_DATE.format(d)}, ${TIME_UTC.format(d)} UTC`;
}

/** "+4", "−3" or "±0" with a proper minus sign. */
export function formatSigned(value: number): string {
  if (value > 0) return `+${value}`;
  if (value < 0) return `−${Math.abs(value)}`;
  return '±0';
}
