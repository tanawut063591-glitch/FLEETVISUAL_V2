/**
 * Pure, framework-independent chart mathematics shared by every vessel report.
 * Do not round raw measurements here: rounding belongs at the presentation edge.
 */
export interface ReportChartAxis {
  max: number;
  ticks: number[];
}

export interface HourlyReferenceStats {
  max: number;
  avg: number;
  min: number;
}

export function buildReportChartAxis(maxValue: number, tickCount = 4): ReportChartAxis {
  const safeMax = Number.isFinite(maxValue) && maxValue > 0 ? maxValue : 1;
  const count = Number.isFinite(tickCount) ? Math.max(1, Math.floor(tickCount)) : 4;
  const rawStep = safeMax / count;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const fraction = rawStep / magnitude;
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  const step = niceFraction * magnitude;
  const axisMax = Math.max(step * count, Math.ceil(safeMax / step) * step);
  return {
    max: axisMax,
    ticks: Array.from({ length: count + 1 }, (_, i) => Math.max(0, axisMax - i * (axisMax / count))),
  };
}

export function chartBarPercent(value: number | null | undefined, maxValue: number): number {
  if (value == null || !Number.isFinite(value) || !Number.isFinite(maxValue) || maxValue <= 0) return 0;
  return Math.max(0, Math.min(100, (value / maxValue) * 100));
}

/** SVG overlay points use the *same* hourly cell centers as the HTML bars/table. */
export function hourlyPolyline<T>(
  rows: readonly T[],
  selector: (row: T) => number | null | undefined,
  maxValue: number,
): string {
  return rows.map((row, index) => {
    const x = index * 100 + 50;
    const y = 100 - chartBarPercent(selector(row), maxValue);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

/** Null/missing measurements are not zeros in the averages or reference lines. */
export function summarizeHourlyValues<T>(
  rows: readonly T[],
  selector: (row: T) => number | null | undefined,
): HourlyReferenceStats {
  let max = Number.NEGATIVE_INFINITY;
  let min = Number.POSITIVE_INFINITY;
  let sum = 0;
  let count = 0;
  for (const row of rows) {
    const value = selector(row);
    if (value == null || !Number.isFinite(value)) continue;
    const safe = Math.max(0, value);
    sum += safe;
    count++;
    max = Math.max(max, safe);
    min = Math.min(min, safe);
  }
  return count ? { max, avg: sum / count, min } : { max: 0, avg: 0, min: 0 };
}

export function maxActiveValue<T>(
  rows: readonly T[],
  selector: (row: T) => number | null | undefined,
): number {
  let max = 1;
  for (const row of rows) {
    const value = selector(row);
    if (value != null && Number.isFinite(value)) max = Math.max(max, value);
  }
  return max;
}
