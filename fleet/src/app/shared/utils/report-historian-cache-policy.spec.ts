import {
  COMPLETED_TAG_EMPTY_TTL_MS,
  COMPLETED_TAG_MAX_ENTRIES,
  COMPLETED_TAG_SUCCESS_TTL_MS,
  isCompletedHistorianWindow,
} from './report-historian-cache-policy';

describe('Report historian cache policy', () => {
  const now = new Date(2026, 9, 19, 13, 30, 0);

  it('caches only complete earlier-day windows, including yesterday ending at midnight', () => {
    expect(isCompletedHistorianWindow('2026-10-18 00:00:00', '2026-10-19 00:00:00', now)).toBeTrue();
    expect(isCompletedHistorianWindow('2026-10-17 00:00:00', '2026-10-18 23:59:00', now)).toBeTrue();
  });

  it('does not cache today, the future, or malformed/invalid ranges', () => {
    expect(isCompletedHistorianWindow('2026-10-19 00:00:00', '2026-10-19 08:00:00', now)).toBeFalse();
    expect(isCompletedHistorianWindow('2026-10-20 00:00:00', '2026-10-20 23:59:00', now)).toBeFalse();
    expect(isCompletedHistorianWindow('2026-10-18 12:00:00', '2026-10-17 08:00:00', now)).toBeFalse();
    expect(isCompletedHistorianWindow('2026-02-30 00:00:00', '2026-03-01 00:00:00', now)).toBeFalse();
    expect(isCompletedHistorianWindow('invalid', '2026-10-18 00:00:00', now)).toBeFalse();
  });

  it('bounds cache memory and limits caching of empty tags', () => {
    expect(COMPLETED_TAG_MAX_ENTRIES).toBeLessThanOrEqual(64);
    expect(COMPLETED_TAG_EMPTY_TTL_MS).toBeLessThan(COMPLETED_TAG_SUCCESS_TTL_MS);
  });
});
