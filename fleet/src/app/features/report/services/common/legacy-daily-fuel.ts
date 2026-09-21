/**
 * Legacy PDF page-1 totalizer scan.
 *
 * The old SCReportingService does NOT calculate the official daily fuel total by
 * summing interpolated minute deltas. It scans the exact-minute dtRawData rows,
 * finds the first accepted totalizer value and the last accepted monotonic value,
 * and finally subtracts the return span from the supply span.
 *
 * Keep this helper independent from Angular so vessel services can reproduce their
 * own C# thresholds without hard-coding a report date or PDF number.
 */
export interface LegacyDailyFuelPoint {
  timestamp: Date;
  value: number;
}

export interface LegacyDailyFuelSideRule {
  totalRangeLimit: number;
  stepLimit: number;
  stepInclusive?: boolean;
  initialValueLimit?: number;
}

export interface LegacyDailyFuelRule {
  input: LegacyDailyFuelSideRule;
  output: LegacyDailyFuelSideRule;
  ignoredValues?: readonly number[];
  clampNegative?: boolean;
}

export function exactMinutePoints<T extends LegacyDailyFuelPoint>(
  points: readonly T[],
  startMs: number,
  endMs: number,
): T[] {
  // dtRawData has exactly one row per minute.  GetRawData writes matching logger
  // records into that row, so if the logger returns the same second more than once
  // the later record wins.  Reproduce that behavior here instead of scanning
  // duplicate points as separate totalizer transitions.
  const byMinute = new Map<number, T>();

  for (const point of points) {
    const time = point.timestamp.getTime();
    if (
      !Number.isFinite(time) ||
      time < startMs ||
      time > endMs ||
      point.timestamp.getSeconds() !== 0
    ) {
      continue;
    }

    const minute = new Date(
      point.timestamp.getFullYear(),
      point.timestamp.getMonth(),
      point.timestamp.getDate(),
      point.timestamp.getHours(),
      point.timestamp.getMinutes(),
      0,
      0,
    ).getTime();

    byMinute.set(minute, {
      ...point,
      timestamp: new Date(minute),
    });
  }

  return Array.from(byMinute.values())
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

function scanSide(
  points: readonly LegacyDailyFuelPoint[],
  rule: LegacyDailyFuelSideRule,
  ignoredValues: ReadonlySet<number>,
): { min: number; max: number } {
  const initialValueLimit = rule.initialValueLimit ?? 100_000_000;
  let min = 0;
  let max = 0;

  for (const point of points) {
    const value = Number(point.value);
    if (!Number.isFinite(value) || value <= 0 || ignoredValues.has(value)) continue;

    if (min === 0) {
      if (value < initialValueLimit) min = value;
      continue;
    }

    // C# checks `(value - min) < totalRangeLimit` (strictly less than).
    if (value - min >= rule.totalRangeLimit) continue;

    const base = max > 0 ? max : min;
    const step = value - base;
    if (step < 0) continue;

    const accepted = rule.stepInclusive === false
      ? step < rule.stepLimit
      : step <= rule.stepLimit;
    if (accepted) max = value;
  }

  return { min, max };
}

export function calculateLegacyDailyFuelTotal(
  inputPoints: readonly LegacyDailyFuelPoint[],
  outputPoints: readonly LegacyDailyFuelPoint[],
  rule: LegacyDailyFuelRule,
): number {
  const ignored = new Set(rule.ignoredValues ?? []);
  const input = scanSide(inputPoints, rule.input, ignored);
  const output = scanSide(outputPoints, rule.output, ignored);

  let total = (input.max - input.min) - (output.max - output.min);
  if (!Number.isFinite(total)) total = 0;
  if (rule.clampNegative && total < 0) total = 0;
  return total;
}
