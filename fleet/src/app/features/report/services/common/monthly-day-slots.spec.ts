import { buildMonthlyDailySlots } from './monthly-day-slots';

interface TestRow { hour: number; active: boolean; totalFuel: number | null; speedKnots: number | null; }
const period = (year: number, monthIndex: number, day: number, totalFuel: number) => ({
  periodStart: new Date(year, monthIndex, day),
  hourly: Array.from({length: 24}, (_, hour): TestRow => ({
    hour,
    active: hour < 2,
    totalFuel: hour < 2 ? totalFuel : null,
    speedKnots: hour < 2 ? 10 + hour : null,
  })),
});

describe('Monthly 31-day chart timeline', () => {
  it('aggregates October into calendar days rather than 24 clock-hour groups', () => {
    const rows = buildMonthlyDailySlots([
      period(2026, 9, 1, 7), period(2026, 9, 2, 11),
    ], new Date(2026, 9, 1));
    expect(rows.length).toBe(31);
    expect(rows.map(row => row.hour)).toEqual(Array.from({length: 31}, (_, i) => i + 1));
    expect(rows[0].totalFuel).toBe(14);
    expect(rows[1].totalFuel).toBe(22);
    expect(rows[0].speedKnots).toBe(10.5);
    expect(rows[2].totalFuel).toBeNull();
    expect(rows[2].active).toBeFalse();
  });

  it('keeps an empty day 31 in September, and never invents day 31 fuel', () => {
    const rows = buildMonthlyDailySlots([period(2026, 8, 30, 3)], new Date(2026, 8, 1));
    expect(rows.length).toBe(31);
    expect(rows[29].active).toBeTrue();
    expect(rows[30].active).toBeFalse();
    expect(rows[30].totalFuel).toBeNull();
  });

  it('supports February leap years and preserves real zero measurements', () => {
    const rows = buildMonthlyDailySlots([period(2024, 1, 29, 0)], new Date(2024, 1, 1));
    expect(rows.length).toBe(31);
    expect(rows[28].active).toBeTrue();
    expect(rows[28].totalFuel).toBe(0);
    expect(rows[29].active).toBeFalse();
  });
});
