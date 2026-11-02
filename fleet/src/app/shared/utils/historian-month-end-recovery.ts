/**
 * Legacy historian endpoints sometimes return no records when a completed daily
 * request includes the first minute of the following calendar month.  Keep the
 * PDF's normal request window unchanged and use this alternate window ONLY
 * when the original tag response has no usable measurements for the day.
 *
 * The calculations and the PDF parity endpoint remain unchanged. This helper
 * handles all calendar month lengths (28, 29, 30 and 31) and year rollover.
 */
export interface HistorianMonthEndRecovery {
  alternateEnd: string;
  /** Exclude next month's boundary sample when the PDF requests only to 23:59. */
  excludeNextMidnight: boolean;
  nextMidnight: string;
}

const HISTORIAN_TIME = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/;

export function historianMonthEndRecovery(
  start: string,
  end: string,
): HistorianMonthEndRecovery | null {
  const first = HISTORIAN_TIME.exec(start.trim());
  const last = HISTORIAN_TIME.exec(end.trim());
  if (!first || !last || first[4] !== '00' || first[5] !== '00' || first[6] !== '00') {
    return null;
  }
  const year = Number(first[1]);
  const month = Number(first[2]);
  const day = Number(first[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  const tomorrow = new Date(Date.UTC(year, month - 1, day + 1));
  if (tomorrow.getUTCDate() !== 1) return null;
  const ymd = `${first[1]}-${first[2]}-${first[3]}`;
  const nextMidnight = `${tomorrow.getUTCFullYear()}-${String(tomorrow.getUTCMonth() + 1).padStart(2, '0')}-01 00:00:00`;
  if (end === nextMidnight) {
    return {
      alternateEnd: `${ymd} 23:59:00`,
      excludeNextMidnight: false,
      nextMidnight,
    };
  }
  if (end === `${ymd} 23:59:00`) {
    return {
      alternateEnd: nextMidnight,
      excludeNextMidnight: true,
      nextMidnight,
    };
  }
  return null;
}

/** No timestamps, or a response containing just the following month's boundary,
 * do not prove that the selected day has any data. */
export function shouldRecoverHistorianMonthEnd(
  records: readonly { TimeStamp?: unknown }[],
  dayText: string,
): boolean {
  if (records.length < 2) return true;
  // The response may carry UTC data, where part of the local day is dated the
  // preceding UTC date. Accept either the wall-clock day or the UTC date.
  const requestedDay = dayText.slice(0, 10);
  for (const record of records) {
    const value = record.TimeStamp;
    if (typeof value !== 'string') return false; // unknown format: don't discard data
    if (value.slice(0, 10) === requestedDay) return false;
    const instant = new Date(value);
    if (Number.isFinite(instant.getTime())) {
      const day = `${instant.getFullYear()}-${String(instant.getMonth() + 1).padStart(2, '0')}-${String(instant.getDate()).padStart(2, '0')}`;
      if (day === requestedDay) return false;
    }
  }
  return true;
}

/** A PDF ending at 23:59 must never consume a newly fetched 00:00 sample. */
export function isExcludedMonthEndBoundary(
  timestamp: unknown,
  nextMidnight: string,
): boolean {
  if (typeof timestamp !== 'string') return false;
  const canonical = timestamp.replace('T', ' ').replace(/Z$/i, '');
  // Some loggers return UTC ISO strings, others return local wall-clock strings.
  // A next-day 00:00 sample is the same instant as previous-day 17:00Z in
  // Thailand. Exclude BOTH representations for 23:59-only PDF reports.
  if (canonical === nextMidnight || canonical.startsWith(`${nextMidnight}.`)) return true;
  const boundary = HISTORIAN_TIME.exec(nextMidnight);
  if (!boundary) return false;
  const localMidnight = new Date(
    Number(boundary[1]), Number(boundary[2]) - 1, Number(boundary[3]), 0, 0, 0,
  );
  const timestampInstant = new Date(timestamp);
  return Number.isFinite(timestampInstant.getTime()) &&
    timestampInstant.getTime() === localMidnight.getTime();
}
