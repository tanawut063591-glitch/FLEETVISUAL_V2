import { calculateLegacyDailyFuelTotal, exactMinutePoints } from './legacy-daily-fuel';

describe('legacy daily fuel total', () => {
  const p = (minute: number, value: number, seconds = 0, ms = 0) => ({
    timestamp: new Date(2026, 8, 18, 0, minute, seconds, ms),
    value,
  });

  it('keeps only exact-minute rows and uses the last duplicate like dtRawData', () => {
    const start = p(0, 0).timestamp.getTime();
    const end = p(3, 0).timestamp.getTime();
    const rows = exactMinutePoints([
      p(0, 1000),
      p(1, 1010, 23), // C# equality join does not put this into 00:01.
      p(2, 1020, 0, 100),
      p(2, 1025, 0, 200), // same PDF minute: last logger write wins.
      p(3, 1030),
    ], start, end);

    expect(rows.map((row) => row.value)).toEqual([1000, 1025, 1030]);
    expect(rows.every((row) => row.timestamp.getSeconds() === 0 && row.timestamp.getMilliseconds() === 0)).toBeTrue();
  });

  it('reproduces strict input and inclusive output step guards', () => {
    const rule = {
      input: { totalRangeLimit: 5000, stepLimit: 100, stepInclusive: false },
      output: { totalRangeLimit: 5000, stepLimit: 100, stepInclusive: true },
    } as const;
    const supply = [p(0, 1000), p(1, 1099), p(2, 1199), p(3, 1198)];
    const returns = [p(0, 500), p(1, 600), p(2, 700)];

    // supply accepts 1099 (+99), rejects 1199 (+100); return accepts both +100.
    expect(calculateLegacyDailyFuelTotal(supply, returns, rule)).toBe(-101);
  });

  it('preserves a negative official total when the legacy vessel does not clamp it', () => {
    const rule = {
      input: { totalRangeLimit: 21000, stepLimit: 300, stepInclusive: false },
      output: { totalRangeLimit: 20000, stepLimit: 300, stepInclusive: true },
      clampNegative: false,
    } as const;
    const supply = [p(0, 1000), p(1, 1100)];
    const returns = [p(0, 2000), p(1, 2300)];
    expect(calculateLegacyDailyFuelTotal(supply, returns, rule)).toBe(-200);
  });

  it('supports 999999 sentinel filtering and negative clamp used by numbered-A/E vessels', () => {
    const rule = {
      input: { totalRangeLimit: 26000, stepLimit: 20000, stepInclusive: false },
      output: { totalRangeLimit: 26000, stepLimit: 20000, stepInclusive: true },
      ignoredValues: [999999],
      clampNegative: true,
    } as const;
    const supply = [p(0, 1000), p(1, 999999), p(2, 1100)];
    const returns = [p(0, 2000), p(1, 2300)];
    expect(calculateLegacyDailyFuelTotal(supply, returns, rule)).toBe(0);
  });
});
