const MS_PER_DAY = 86_400_000;
const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parses an ISO date ("2026-03-14") or datetime string.
 *
 * Date-only strings are read as *local* calendar days. `new Date("2026-03-14")`
 * would read them as UTC midnight, which shifts the day for users west of UTC.
 */
export function parseDate(value: string): Date {
  if (ISO_DATE_ONLY.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(value);
}

function toDate(value: Date | string): Date {
  return typeof value === 'string' ? parseDate(value) : value;
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Whole calendar days from `from` to `to`. Positive when `to` is later. */
export function diffInDays(from: Date | string, to: Date | string): number {
  const start = startOfDay(toDate(from)).getTime();
  const end = startOfDay(toDate(to)).getTime();
  // Rounding absorbs the 23/25-hour days around daylight-saving changes.
  return Math.round((end - start) / MS_PER_DAY);
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** Formats a Date as a local ISO date (yyyy-mm-dd). */
export function toISODate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
