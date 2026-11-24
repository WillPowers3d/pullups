/**
 * UTC calendar helpers. Engine dates are always `YYYY-MM-DD` in UTC.
 * Never use local timezone methods (`getDay`, `getFullYear`, …) on these.
 */

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseUtcDate(ymd: string): Date {
  const m = YMD.exec(ymd);
  if (!m) {
    throw new Error(`Invalid date: ${ymd}`);
  }
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

export function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function weekdayUtc(ymd: string): number {
  return parseUtcDate(ymd).getUTCDay();
}

/** Monday of the ISO-style training week that contains `ymd` (UTC). */
export function startOfWeekMonday(ymd: string): string {
  const date = parseUtcDate(ymd);
  const weekday = date.getUTCDay();
  const offset = weekday === 0 ? -6 : 1 - weekday;
  date.setUTCDate(date.getUTCDate() + offset);
  return formatUtcDate(date);
}

export function addDays(ymd: string, days: number): string {
  const date = parseUtcDate(ymd);
  date.setUTCDate(date.getUTCDate() + days);
  return formatUtcDate(date);
}

export function diffDays(from: string, to: string): number {
  const ms = parseUtcDate(to).getTime() - parseUtcDate(from).getTime();
  return Math.round(ms / 86_400_000);
}

/** The next Monday that is strictly after `ymd`. If `ymd` is Monday, returns a week later. */
export function nextMondayAfter(ymd: string): string {
  return addDays(startOfWeekMonday(ymd), 7);
}
