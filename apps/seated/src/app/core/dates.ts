const DAY = 24 * 60 * 60 * 1000;

/** Whole calendar days from `now` to an ISO date (local time). Negative once the date has passed. */
export function daysUntil(isoDate: string, now: Date): number {
  const [y, m, d] = isoDate.split('-').map(Number) as [number, number, number];
  const target = Date.UTC(y, m - 1, d);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / DAY);
}

/** Parse an ISO date as a local date (no timezone shift). */
export function localDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}
