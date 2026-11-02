import {
  historianMonthEndRecovery,
  isExcludedMonthEndBoundary,
  shouldRecoverHistorianMonthEnd,
} from './historian-month-end-recovery';

describe('Historian daily report at a calendar-month boundary', () => {
  it('recovers October 31 without skipping directly to November 1', () => {
    expect(historianMonthEndRecovery('2026-10-31 00:00:00', '2026-11-01 00:00:00'))
      .toEqual({ alternateEnd: '2026-10-31 23:59:00', excludeNextMidnight: false, nextMidnight: '2026-11-01 00:00:00' });
    expect(historianMonthEndRecovery('2026-10-31 00:00:00', '2026-10-31 23:59:00'))
      .toEqual({ alternateEnd: '2026-11-01 00:00:00', excludeNextMidnight: true, nextMidnight: '2026-11-01 00:00:00' });
  });

  it('handles 28/29/30/31-day months and the December to January rollover', () => {
    for (const [lastDay, nextDay] of [
      ['2026-02-28', '2026-03-01'],
      ['2028-02-29', '2028-03-01'],
      ['2026-04-30', '2026-05-01'],
      ['2026-10-31', '2026-11-01'],
      ['2026-12-31', '2027-01-01'],
    ]) {
      expect(historianMonthEndRecovery(`${lastDay} 00:00:00`, `${nextDay} 00:00:00`)?.alternateEnd)
        .toBe(`${lastDay} 23:59:00`);
    }
  });

  it('never changes normal dates or invalid calendar dates', () => {
    expect(historianMonthEndRecovery('2026-10-30 00:00:00', '2026-10-31 00:00:00')).toBeNull();
    expect(historianMonthEndRecovery('2026-11-01 00:00:00', '2026-11-02 00:00:00')).toBeNull();
    expect(historianMonthEndRecovery('2026-10-31 10:00:00', '2026-11-01 00:00:00')).toBeNull();
    expect(historianMonthEndRecovery('2026-02-30 00:00:00', '2026-03-01 00:00:00')).toBeNull();
  });

  it('retains normal series and retries only empty or next-month-only series', () => {
    expect(shouldRecoverHistorianMonthEnd([], '2026-10-31 00:00:00')).toBeTrue();
    expect(shouldRecoverHistorianMonthEnd([
      { TimeStamp: '2026-11-01T00:00:00Z' },
      { TimeStamp: '2026-11-01T00:01:00Z' },
    ], '2026-10-31 00:00:00')).toBeTrue();
    expect(shouldRecoverHistorianMonthEnd([
      { TimeStamp: '2026-10-31T09:00:00Z' },
      { TimeStamp: '2026-10-31T10:00:00Z' },
    ], '2026-10-31 00:00:00')).toBeFalse();
  });

  it('does not add November 1 midnight to PDFs that end October 31 at 23:59', () => {
    expect(isExcludedMonthEndBoundary('2026-11-01T00:00:00Z', '2026-11-01 00:00:00')).toBeTrue();
    expect(isExcludedMonthEndBoundary('2026-10-31T23:59:00Z', '2026-11-01 00:00:00')).toBeFalse();
    expect(isExcludedMonthEndBoundary(new Date(2026, 10, 1).toISOString(), '2026-11-01 00:00:00')).toBeTrue();
    expect(isExcludedMonthEndBoundary('2026-11-01T00:01:00Z', '2026-11-01 00:00:00')).toBeFalse();
  });
});
