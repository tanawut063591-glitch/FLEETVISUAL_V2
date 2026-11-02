import { setBoundedReportCache } from './report-cache.util';

describe('Blank last-day report caching', () => {
  const blank = (date: Date) => ({
    periodStart: date,
    periodEnd: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59),
    coveragePercent: 0, totalFuelUsed: 0, tracking: { begin: null, end: null },
    hourly: [{ active: false }],
  });

  it('shortens a missing October 31 report to a two-minute retry interval', () => {
    const cache = new Map<string, { value: ReturnType<typeof blank>; expiresAt: number }>();
    const day = new Date(2026, 9, 31);
    const requestedExpiry = Date.now() + 60 * 60_000;
    setBoundedReportCache(cache, 'oct31', { value: blank(day), expiresAt: requestedExpiry });
    expect(cache.get('oct31')!.expiresAt).toBeLessThan(requestedExpiry);
    expect(cache.get('oct31')!.expiresAt).toBeGreaterThan(Date.now() + 60_000);
  });

  it('keeps the existing TTL for a measured report on October 31', () => {
    const cache = new Map<string, { value: ReturnType<typeof blank>; expiresAt: number }>();
    const report = { ...blank(new Date(2026, 9, 31)), coveragePercent: 80 };
    const expiry = Date.now() + 60 * 60_000;
    setBoundedReportCache(cache, 'measured', { value: report, expiresAt: expiry });
    expect(cache.get('measured')!.expiresAt).toBe(expiry);
  });

  it('does not modify ordinary day report caching', () => {
    const cache = new Map<string, { value: ReturnType<typeof blank>; expiresAt: number }>();
    const expiry = Date.now() + 60 * 60_000;
    setBoundedReportCache(cache, 'oct30', { value: blank(new Date(2026, 9, 30)), expiresAt: expiry });
    expect(cache.get('oct30')!.expiresAt).toBe(expiry);
  });
});
