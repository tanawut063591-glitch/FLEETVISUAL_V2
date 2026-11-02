/**
 * Report loading policy (pure; safe to unit-test without Angular).
 *
 * Multiple full daily bundles may overlap, but all single-tag historian HTTP
 * requests remain capped at TWO globally by NewHttpClientService. A two-day
 * pipeline lets PDF lookups / CPU aggregation run while the next day waits
 * for free historian slots. It does not increase the historian tag ceiling.
 */
export const REPORT_MAX_CONCURRENT_DAYS = 2;

export function reportDayConcurrency(dayCount: number): number {
  if (!Number.isFinite(dayCount) || dayCount <= 1) return 1;
  return Math.min(REPORT_MAX_CONCURRENT_DAYS, Math.max(1, Math.floor(dayCount)));
}


/** Cache only fully ended monthly windows longer than a generic date range.
 * Historical corrections can still be fetched with the existing force-refresh
 * button, and logout invalidates per-session report caches. */
export function reportPeriodCacheTtlMs(
  start: Date, end: Date, periodKind: string, nowMs = Date.now(),
): number {
  const ONE_HOUR = 60 * 60_000;
  const SIX_HOURS = 6 * ONE_HOUR;
  if (periodKind !== 'month' || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
    return ONE_HOUR;
  }
  // A monthly window only qualifies if the calendar month is fully in the past.
  const nextMonthStart = new Date(start.getFullYear(), start.getMonth() + 1, 1).getTime();
  return nextMonthStart <= nowMs && end.getTime() < nextMonthStart
    ? SIX_HOURS
    : ONE_HOUR;
}
