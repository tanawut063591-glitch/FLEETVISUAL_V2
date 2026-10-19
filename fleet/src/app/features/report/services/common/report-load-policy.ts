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

