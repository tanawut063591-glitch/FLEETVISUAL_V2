import { reportDayConcurrency, reportPeriodCacheTtlMs } from './report-load-policy';

describe('Report load and cache policy', () => {
  it('never exceeds two concurrently processed days', () => {
    expect(reportDayConcurrency(0)).toBe(1);
    expect(reportDayConcurrency(1)).toBe(1);
    expect(reportDayConcurrency(30)).toBe(2);
  });

  it('retains a fully completed historical month for six hours in the local session', () => {
    const now = new Date(2026, 9, 20).getTime();
    const from = new Date(2026, 8, 1);
    const to = new Date(2026, 8, 30, 23, 59);
    expect(reportPeriodCacheTtlMs(from, to, 'month', now)).toBe(6 * 60 * 60_000);
    expect(reportPeriodCacheTtlMs(from, to, 'range', now)).toBe(60 * 60_000);
  });

  it('does not extend caching for the current incomplete month', () => {
    const now = new Date(2026, 9, 20).getTime();
    const from = new Date(2026, 9, 1);
    const to = new Date(2026, 9, 31, 23, 59);
    expect(reportPeriodCacheTtlMs(from, to, 'month', now)).toBe(60 * 60_000);
  });
});
