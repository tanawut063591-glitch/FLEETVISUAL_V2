import { setBoundedReportCache as setSharedBoundedReportCache } from '../../../../shared/utils/bounded-cache.util';

/**
 * Keep normally completed reports fast. A genuinely blank month-end day must not
 * remain frozen for an hour if the historian finishes indexing late or a
 * rollover-window request recovers after the initial attempt.
 *
 * This applies ONLY to a completed, single-calendar-day, last-of-month report
 * with no data evidence. It does not change any measurement, PDF calculation,
 * successful report TTL, or monthly aggregation logic.
 */
export function setBoundedReportCache<K, V extends { expiresAt: number }>(
  cache: Map<K, V>, key: K, entry: V, maxEntries = 16,
): void {
  const payload = (entry as { value?: unknown }).value;
  const report = payload as {
    periodStart?: unknown;
    periodEnd?: unknown;
    coveragePercent?: unknown;
    totalFuelUsed?: unknown;
    tracking?: { begin?: unknown; end?: unknown };
    hourly?: Array<{ active?: boolean }>;
  } | null;
  let expiry = entry.expiresAt;

  if (report && report.periodStart instanceof Date && report.periodEnd instanceof Date &&
      Array.isArray(report.hourly) && report.hourly.length > 0) {
    const first = report.periodStart;
    const last = report.periodEnd;
    const isMonthEndDay = first.getDate() ===
      new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const singleDay = first.getFullYear() === last.getFullYear() &&
      first.getMonth() === last.getMonth() && first.getDate() === last.getDate();
    const hasNoData = !(Number(report.coveragePercent) > 0) &&
      !(Number(report.totalFuelUsed) > 0) &&
      !report.tracking?.begin && !report.tracking?.end &&
      !report.hourly.some((row) => !!row.active);
    if (isMonthEndDay && singleDay && hasNoData) {
      expiry = Math.min(expiry, Date.now() + 2 * 60_000);
    }
  }

  setSharedBoundedReportCache(cache, key,
    expiry === entry.expiresAt ? entry : { ...entry, expiresAt: expiry }, maxEntries);
}

/**
 * A service may live longer than a login session. Invalidate expensive in-memory
 * report values and in-flight lookups if the authenticated operator changes.
 * No token is written to disk or added to a request/cache key; the token is held
 * only by the service's ephemeral session marker for equality checks.
 * Call before reading either daily or period cache in each vessel adapter.
 */
export function resetReportCacheForAuthChange(
  marker: { token: string | null },
  ...caches: Array<{ clear(): void }>
): void {
  let token = '';
  if (typeof localStorage !== 'undefined') {
    try {
      token = localStorage.getItem('vesselToken2') || localStorage.getItem('vesselToken') || '';
    } catch {
      token = '';
    }
  }
  if (marker.token === token) return;
  marker.token = token;
  for (const cache of caches) cache.clear();
}
