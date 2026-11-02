/**
 * Preserve ALL 16 generator-vessel operating-mode detail sections when daily
 * historian reports are rolled up to a monthly report.  The old period adapter
 * aggregated the mode summary, but dropped modeDetails completely, so the UI
 * fell back to a single (daily-dominant) mode panel.
 *
 * Additive counters are summed; loads and speeds are weighted by their observed
 * running hours.  These are historian-derived monthly estimates, NOT certified
 * C# PDF values.  No mode reading or fuel counter is fabricated for absent days.
 */

interface GeneratorAuxRow {
  key: string;
  label: string;
  runningHours: number;
  fuelUsed: number;
  averageRpm: number | null;
  maximumRpm: number | null;
  engineLoadKw?: number | null;
  utilizationPercent?: number | null;
}

export interface GeneratorModeDetail {
  key: string;
  label: string;
  summary: {
    mainEngines: unknown[];
    shafts: unknown[];
    auxFuel: GeneratorAuxRow[];
    mainEngineFuelTotal: number;
    auxiliaryFuelTotal: number;
    averageSpeed: number | null;
    distanceNm: number;
  };
}

interface GeneratorDailyPeriod<T extends GeneratorModeDetail> {
  modeDetails?: T[];
  modeSummary: Array<{ key: string; runningHours: number }>;
}

/** Return one complete detail section per configured mode, in PDF profile order. */
export function aggregateGeneratorModeDetails<T extends GeneratorModeDetail>(
  modes: readonly { key: string; label: string }[],
  dailyReports: readonly GeneratorDailyPeriod<T>[],
  periodHours: number,
): T[] {
  if (!dailyReports.length || !dailyReports.some((report) => report.modeDetails?.length)) return [];
  const valid = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
  const total = (values: number[]): number => values.reduce((s, n) => s + n, 0);
  const weighted = (data: Array<{ value: number; weight: number }>): number | null => {
    const samples = data.filter((r) => valid(r.value) && valid(r.weight) && r.weight > 0);
    const weightSum = total(samples.map((r) => r.weight));
    return weightSum > 0 ? total(samples.map((r) => r.value * r.weight)) / weightSum : null;
  };
  // These four slots are described by all three BAHTERA/BB generator profiles.
  const keys = ['port', 'center', 'starboard', 'fourth'];
  return modes.map((mode) => {
    const pages = dailyReports
      .map((report) => ({
        detail: report.modeDetails?.find((detail) => detail.key === mode.key),
        modeHours: report.modeSummary.find((row) => row.key === mode.key)?.runningHours || 0,
      }))
      .filter((entry): entry is { detail: T; modeHours: number } => !!entry.detail);
    const auxFuel: GeneratorAuxRow[] = keys.map((key) => {
      const rows = pages.map(({ detail }) => detail.summary.auxFuel.find((row) => row.key === key))
        .filter((row): row is GeneratorAuxRow => !!row);
      const fuelUsed = total(rows.map((row) => valid(row.fuelUsed) ? row.fuelUsed : 0));
      const runningHours = total(rows.map((row) => valid(row.runningHours) ? row.runningHours : 0));
      const load = weighted(rows.map((row) => ({
        value: row.engineLoadKw ?? row.averageRpm ?? NaN,
        weight: row.runningHours,
      })));
      const shouldUtilize = fuelUsed >= (key === 'port' ? 0.01 : 0.005);
      return {
        key,
        label: rows[0]?.label || (key === 'port' ? 'DG1' : key === 'center' ? 'DG2' : key === 'starboard' ? 'DG3' : 'EG'),
        runningHours,
        fuelUsed,
        averageRpm: load,
        maximumRpm: null,
        engineLoadKw: load,
        utilizationPercent: shouldUtilize && periodHours > 0
          ? Math.round((runningHours / periodHours) * 1000) / 10 : 0,
      };
    });
    const available = pages.filter(({ detail }) => valid(detail.summary.auxiliaryFuelTotal));
    const summary = {
      mainEngines: [],
      shafts: [],
      auxFuel,
      mainEngineFuelTotal: 0,
      // Keep the signed-total treatment from per-mode PDF source rather than
      // recomputing this total from nonnegative displayed generator rows.
      auxiliaryFuelTotal: total(available.map(({ detail }) => detail.summary.auxiliaryFuelTotal)),
      averageSpeed: weighted(pages.map(({ detail, modeHours }) => ({
        value: detail.summary.averageSpeed ?? NaN,
        weight: modeHours,
      }))),
      distanceNm: total(pages.map(({ detail }) => valid(detail.summary.distanceNm) ? detail.summary.distanceNm : 0)),
    };
    return { key: mode.key, label: mode.label, summary } as unknown as T;
  });
}
