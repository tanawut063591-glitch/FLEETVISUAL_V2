/**
 * Convert the per-day historian reports already fetched by each vessel adapter
 * into 31 DAILY chart slots. Monthly chart axes represent calendar days, not
 * the 24 clock-hour buckets that were previously aggregated across the month.
 *
 * This does NOT trigger new network requests or infer source measurements.
 * Missing readings remain null; non-existent days are inactive slots so the
 * monthly chart/table always maintains the same 1..31 reference axis.
 */
export function buildMonthlyDailySlots<T extends { hour: number; active: boolean }>(
  reports: readonly { periodStart: Date; hourly: readonly T[] }[],
  monthStart: Date,
): T[] {
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = new Map<number, readonly T[]>();
  const keys = new Set<string>();

  for (const report of reports) {
    for (const row of report.hourly || []) {
      Object.keys(row).forEach((key) => {
        if (key !== 'hour' && key !== 'active') keys.add(key);
      });
    }
    const date = report.periodStart;
    if (date.getFullYear() === year && date.getMonth() === month &&
        date.getDate() >= 1 && date.getDate() <= daysInMonth) {
      days.set(date.getDate(), report.hourly);
    }
  }

  return Array.from({ length: 31 }, (_, i) => {
    const day = i + 1;
    const readings = (days.get(day) || []).filter((row) => row.active);
    const slot: Record<string, unknown> = { hour: day, active: day <= daysInMonth && readings.length > 0 };

    for (const key of keys) {
      const available = readings
        .map((row) => (row as unknown as Record<string, unknown>)[key])
        .filter((n): n is number => typeof n === 'number' && Number.isFinite(n));
      if (!available.length) {
        slot[key] = null;
      } else if (/rpm|speed|load|average|percent|utiliz/i.test(key)) {
        // Rate / speed fields are daily means, NOT summed across the 24 hours.
        slot[key] = available.reduce((sum, n) => sum + n, 0) / available.length;
      } else {
        // Fuel, distance and running-hour fields are additive per day.
        slot[key] = available.reduce((sum, n) => sum + n, 0);
      }
    }
    return slot as unknown as T;
  });
}
