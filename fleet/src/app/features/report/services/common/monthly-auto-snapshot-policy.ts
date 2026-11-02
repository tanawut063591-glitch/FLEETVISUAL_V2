/**
 * Monthly report auto-cache: calendar-only policy. No source values are changed.
 * Cached results belong only to the currently authenticated SPA session.
 */
export const MONTHLY_AUTO_CACHE_VERSION = 'monthly-ui-v2-uniform-historian';
export const MONTHLY_AUTO_CACHE_MAX_ENTRIES = 32;

/** Read exact report period boundaries, not just a month label, into the key. */
export function monthlyAutoCacheKey(vesselIdentity: string, start: Date, end: Date): string {
  return [
    MONTHLY_AUTO_CACHE_VERSION,
    vesselIdentity.trim(),
    start.getTime(),
    end.getTime(),
  ].join('|');
}

/** Completed months: 6h. Current/partial windows: only 5min.
 * Neither period is persisted to browser storage. Refresh always bypasses cache.
 */
export function monthlyAutoCacheTtlMs(start: Date, end: Date, nowMs = Date.now()): number {
  const nextMonth = new Date(start.getFullYear(), start.getMonth() + 1, 1).getTime();
  const isComplete = start.getDate() === 1 && start.getHours() === 0 &&
    start.getMinutes() === 0 && Number.isFinite(end.getTime()) &&
    end.getTime() < nextMonth && nextMonth <= nowMs;
  return isComplete ? 6 * 60 * 60_000 : 5 * 60_000;
}
