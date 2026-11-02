import {
  monthlyAutoCacheKey,
  monthlyAutoCacheTtlMs,
} from './monthly-auto-snapshot-policy';

describe('automatic monthly cache policy', () => {
  it('keys by vessel and full period, not just month label', () => {
    const a = new Date(2027, 0, 1);
    const b = new Date(2027, 0, 31, 23, 59);
    expect(monthlyAutoCacheKey('SC BRAVE', a, b)).not.toBe(monthlyAutoCacheKey('SC GLORY 1', a, b));
    expect(monthlyAutoCacheKey('SC BRAVE', a, b)).not.toBe(monthlyAutoCacheKey('SC BRAVE', a, new Date(2027, 0, 30)));
  });
  it('supports November/December and following years with the same policy', () => {
    const now = new Date(2028, 0, 1).getTime();
    for (const [y, month, days] of [[2026, 10, 30], [2026, 11, 31], [2027, 0, 31]] as const) {
      expect(monthlyAutoCacheTtlMs(new Date(y, month, 1), new Date(y, month, days, 23, 59), now))
        .toBe(6 * 60 * 60_000);
    }
  });
  it('uses shorter cache TTL while the month is still changing', () => {
    expect(monthlyAutoCacheTtlMs(new Date(2026, 10, 1), new Date(2026, 10, 30, 23, 59),
      new Date(2026, 10, 2).getTime())).toBe(5 * 60_000);
  });
});
