// ============================================================
// Date Utilities — iOS-safe, deterministic date handling
// Uses Intl.DateTimeFormat (proven pattern from existing codebase)
// ============================================================

const TIMEZONE = 'Asia/Kolkata';

/**
 * Returns today's date as YYYY-MM-DD string in the app's timezone.
 * iOS-safe: uses Intl.DateTimeFormat instead of toLocaleString → new Date().
 */
export function getLocalDateString(d: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(d);
  const y = parts.find(p => p.type === 'year')!.value;
  const m = parts.find(p => p.type === 'month')!.value;
  const dNum = parts.find(p => p.type === 'day')!.value;
  return y + '-' + m + '-' + dNum;
}

/**
 * Parses a YYYY-MM-DD string into a Date object safely.
 * Does NOT use new Date(dateString) which fails on iOS for certain formats.
 */
export function parseLogDate(dateStr: string): Date {
  const parts = dateStr.split('-');
  return new Date(
    parseInt(parts[0], 10),
    parseInt(parts[1], 10) - 1,
    parseInt(parts[2], 10)
  );
}

/**
 * Returns the YYYY-MM-DD string for N days ago from today.
 */
export function daysAgoDateString(n: number): string {
  const now = new Date();
  now.setDate(now.getDate() - n);
  return getLocalDateString(now);
}

/**
 * Returns integer number of days between two YYYY-MM-DD date strings.
 * Always returns a non-negative value.
 */
export function daysBetween(dateA: string, dateB: string): number {
  const a = parseLogDate(dateA);
  const b = parseLogDate(dateB);
  const msInDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs(a.getTime() - b.getTime()) / msInDay);
}

/**
 * Filters an array of objects with a date field to those within the last N days.
 * dateExtractor should return the YYYY-MM-DD string from the object.
 */
export function filterLastNDays<T>(
  items: T[],
  n: number,
  dateExtractor: (item: T) => string
): T[] {
  const today = getLocalDateString();
  const todayMs = parseLogDate(today).getTime();
  const msInDay = 24 * 60 * 60 * 1000;
  const cutoffMs = todayMs - ((n - 1) * msInDay);
  return items.filter(item => {
    const itemMs = parseLogDate(dateExtractor(item)).getTime();
    return itemMs >= cutoffMs;
  });
}
