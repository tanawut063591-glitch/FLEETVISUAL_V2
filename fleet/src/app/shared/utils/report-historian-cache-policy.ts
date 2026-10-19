/**
 * Caching policy for the legacy, single-tag logger path.
 *
 * Only completed calendar windows are retained. A current-day window must be
 * fetched again because new telemetry may still arrive; a future/malformed
 * boundary must never be mistaken for an immutable period. Dates are interpreted
 * in the browser's local timezone, like the existing historian date formatter.
 */
export function isCompletedHistorianWindow(
  startText: string,
  endText: string,
  now: Date = new Date(),
): boolean {
  const parse = (text: string): number | null => {
    const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(text.trim());
    if (!match) return null;
    const [, year, month, day, hour, minute, second] = match;
    const date = new Date(+year, +month - 1, +day, +hour, +minute, +(second || 0));
    if (
      date.getFullYear() !== +year || date.getMonth() !== +month - 1 ||
      date.getDate() !== +day || date.getHours() !== +hour ||
      date.getMinutes() !== +minute || date.getSeconds() !== +(second || 0)
    ) return null;
    return date.getTime();
  };
  const start = parse(startText);
  const end = parse(endText);
  if (start === null || end === null || !Number.isFinite(now.getTime()) || end <= start) return false;
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return end <= todayStart;
}

/** Successes are immutable historic samples; short negative TTL avoids hammering an empty tag. */
export const COMPLETED_TAG_SUCCESS_TTL_MS = 30 * 60_000;
export const COMPLETED_TAG_EMPTY_TTL_MS = 30_000;
/** Prevent minute-level arrays growing without limit on multi-vessel/month reports. */
export const COMPLETED_TAG_MAX_ENTRIES = 64;
