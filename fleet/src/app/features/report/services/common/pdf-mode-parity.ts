export interface PdfParityModeProfile {
  key: string;
  label: string;
}

export interface PdfParityModeSummaryRow {
  key: string;
  label: string;
  fuelUsed: number;
  fuelPercent: number;
  runningHours: number;
  runningPercent: number;
  distanceNm: number;
  litresPerNm: number | null;
  litresPerHour: number | null;
}

export interface PdfParityModeResult {
  modeSummary: PdfParityModeSummaryRow[];
  minuteKeysByMode: Map<string, number[]>;
  scaledFuelByMode: Map<string, number>;
}

export interface GpsPdfParityOptions {
  modes: readonly PdfParityModeProfile[];
  minuteStart: number;
  dataEnd: number;
  completedDaily: boolean;
  minuteMs: number;
  officialTotalFuel: number;
  gpsSpeed: ReadonlyMap<number, number>;
  minuteFuelAt: (minute: number) => number;
  resolveModeLabel: (speed: number) => string | null;
  resolveModeKey: (modeLabel: string) => string;
  standbyLabel?: string;
  /** Reproduce System.Single arithmetic used by the legacy C# mode DataTable. */
  legacySinglePrecision?: boolean;
  /**
   * Legacy vessels are not all normalized back to the Page-1 official fuel total.
   * Keep the default true; SC WINTER explicitly uses raw by-Mode fuel in the legacy PDF.
   */
  scaleFuelToOfficialTotal?: boolean;
}

/**
 * Equivalent to C# Convert.ToInt32(double): round to the nearest Int32,
 * with midpoint values rounded to the nearest even integer.
 *
 * This is intentionally used for explicit VES-MODE historian tags only.
 * GPS-speed-derived modes must keep the raw speed precision used by the PDF.
 */
export function legacyConvertToInt32(value: number): number | null {
  if (!Number.isFinite(value)) return null;

  const lower = Math.floor(value);
  const fraction = value - lower;
  let rounded: number;

  if (fraction < 0.5) {
    rounded = lower;
  } else if (fraction > 0.5) {
    rounded = lower + 1;
  } else {
    rounded = lower % 2 === 0 ? lower : lower + 1;
  }

  return rounded >= -2_147_483_648 && rounded <= 2_147_483_647 ? rounded : null;
}

/**
 * Builds the same sparse exact-minute lookup used by SCReportingService's
 * fixed minute DataTable. A sample such as 10:15:23 must not be floored into 10:15.
 */
export function buildExactMinuteValueMap(
  points: readonly LegacyFuelPoint[],
  minuteMs = 60_000,
): Map<number, number> {
  const result = new Map<number, number>();
  for (const point of points) {
    const timestamp = point?.timestamp;
    if (!(timestamp instanceof Date) || !Number.isFinite(point.value)) continue;
    const time = timestamp.getTime();
    if (!Number.isFinite(time) || timestamp.getSeconds() !== 0) continue;

    // Legacy DataTable.Select compares at whole-second precision. A :00.xxx
    // logger sample belongs to the :00 row; an off-second sample does not.
    const normalized = new Date(time);
    normalized.setMilliseconds(0);
    const bucket = normalized.getTime();
    if (bucket % minuteMs !== 0) continue;
    result.set(bucket, point.value);
  }
  return result;
}

export function roundPdf2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function isCompletedDailyWindow(start: Date, end: Date, minuteMs = 60_000): boolean {
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return false;
  if (start.getHours() !== 0 || start.getMinutes() !== 0) return false;
  if (end.getHours() !== 23 || end.getMinutes() !== 59) return false;
  return end.getTime() - start.getTime() >= 24 * 60 * minuteMs - minuteMs;
}

/**
 * Shared SC GLORY 3 / legacy PDF mode calculation.
 *
 * Completed daily reports intentionally model minute 00:00 through next-day 00:00
 * (1,441 rows) exactly like the verified SC GLORY 3 Excel/PDF calculation.
 * Missing GPS speed is treated as 0 kn, therefore it belongs to the vessel's
 * lowest-speed/Standby band. Non-Standby running hours and percentages are
 * independently rounded to 2 decimals; Standby is the residual to 24.00 h / 100%.
 * Mode fuel is first accumulated at minute precision, then normalized to the
 * official daily total fuel before display rounding. Distance and L/NM/LPH keep
 * full scaled fuel precision internally and only round the displayed result.
 */
export function buildGpsPdfParityModeSummary(options: GpsPdfParityOptions): PdfParityModeResult {
  type Bucket = {
    key: string;
    label: string;
    samples: number;
    rawFuel: number;
    speedSum: number;
  };

  const buckets = new Map<string, Bucket>();
  const minuteKeysByMode = new Map<string, number[]>();
  for (const mode of options.modes) {
    buckets.set(mode.key, {
      key: mode.key,
      label: mode.label,
      samples: 0,
      rawFuel: 0,
      speedSum: 0,
    });
    minuteKeysByMode.set(mode.key, []);
  }

  let totalRows = 0;
  let totalRawFuel = 0;
  for (
    let minute = options.minuteStart;
    minute <= options.dataEnd;
    minute += options.minuteMs
  ) {
    const rawSpeed = options.gpsSpeed.get(minute);
    const speed = rawSpeed !== undefined && Number.isFinite(rawSpeed) ? rawSpeed : 0;
    const modeLabel = options.resolveModeLabel(speed) || options.standbyLabel || 'Standby';
    const modeKey = options.resolveModeKey(modeLabel);
    const bucket = buckets.get(modeKey);
    if (!bucket) continue;

    const rawMinuteFuel = options.minuteFuelAt(minute);
    const minuteFuel = Number.isFinite(rawMinuteFuel) ? rawMinuteFuel : 0;

    bucket.samples += 1;
    bucket.rawFuel += minuteFuel;
    bucket.speedSum = options.legacySinglePrecision
      ? Math.fround(Math.fround(bucket.speedSum) + Math.fround(speed))
      : bucket.speedSum + speed;
    minuteKeysByMode.get(modeKey)?.push(minute);
    totalRows += 1;
    totalRawFuel += minuteFuel;
  }

  const standbyKey = options.resolveModeKey(options.standbyLabel || 'Standby');
  const runningHours = new Map<string, number>();
  const runningPercent = new Map<string, number>();
  const fuelPercent = new Map<string, number>();
  const scaledFuelByMode = new Map<string, number>();
  const runningPercentDenominator = options.completedDaily ? 1441 : totalRows;
  const reportHours = options.completedDaily ? 24 : Math.max(0, totalRows / 60);

  let otherRunningHours = 0;
  let otherRunningPercent = 0;
  let otherFuelPercent = 0;

  for (const mode of options.modes) {
    if (mode.key === standbyKey) continue;
    const bucket = buckets.get(mode.key)!;
    const rawHours = options.legacySinglePrecision
      ? Math.fround(Math.fround(bucket.samples) / Math.fround(60))
      : bucket.samples / 60;
    const hours = roundPdf2(rawHours);
    const rawRunPercent = runningPercentDenominator > 0
      ? options.legacySinglePrecision
        ? Math.fround(
            Math.fround(Math.fround(bucket.samples) / Math.fround(runningPercentDenominator)) *
              Math.fround(100),
          )
        : (bucket.samples / runningPercentDenominator) * 100
      : 0;
    const runPercent = runningPercentDenominator > 0 ? roundPdf2(rawRunPercent) : 0;
    // C# casts each mode raw fuel to Single before calculating the displayed %.
    const rawFuelForPercent = options.legacySinglePrecision
      ? Math.fround(bucket.rawFuel)
      : bucket.rawFuel;
    const modeFuelPercent =
      totalRawFuel !== 0 ? roundPdf2((rawFuelForPercent / totalRawFuel) * 100) : 0;

    runningHours.set(mode.key, hours);
    runningPercent.set(mode.key, runPercent);
    fuelPercent.set(mode.key, modeFuelPercent);
    otherRunningHours += hours;
    otherRunningPercent += runPercent;
    otherFuelPercent += modeFuelPercent;
  }

  if (buckets.has(standbyKey)) {
    runningHours.set(standbyKey, roundPdf2(Math.max(0, reportHours - otherRunningHours)));
    runningPercent.set(standbyKey, roundPdf2(Math.max(0, 100 - otherRunningPercent)));
    fuelPercent.set(standbyKey, roundPdf2(Math.max(0, 100 - otherFuelPercent)));
  }

  const fuelScale =
    options.scaleFuelToOfficialTotal === false
      ? 1
      : totalRawFuel !== 0
        ? options.officialTotalFuel / totalRawFuel
        : 0;
  const modeSummary = options.modes.map((mode): PdfParityModeSummaryRow => {
    const bucket = buckets.get(mode.key)!;
    const hours = runningHours.get(mode.key) ?? roundPdf2(bucket.samples / 60);
    const runPercent =
      runningPercent.get(mode.key) ??
      (runningPercentDenominator > 0
        ? roundPdf2((bucket.samples / runningPercentDenominator) * 100)
        : 0);
    const directFuelPercent =
      fuelPercent.get(mode.key) ??
      (totalRawFuel !== 0 ? roundPdf2((bucket.rawFuel / totalRawFuel) * 100) : 0);
    const fuelFull = bucket.rawFuel * fuelScale;
    const averageGpsSpeed = bucket.samples > 0
      ? options.legacySinglePrecision
        ? Math.fround(Math.fround(bucket.speedSum) / Math.fround(bucket.samples))
        : bucket.speedSum / bucket.samples
      : 0;
    // The C# report parses the already displayed 2-decimal Run Hrs back to
    // System.Single, multiplies by the Single average speed, and stores Distance
    // in a Single DataColumn before calculating L/NM.
    const distanceFull = options.legacySinglePrecision
      ? Math.fround(Math.fround(averageGpsSpeed) * Math.fround(hours))
      : averageGpsSpeed * hours;
    const lphHours = options.legacySinglePrecision ? Math.fround(hours) : hours;
    scaledFuelByMode.set(mode.key, fuelFull);

    return {
      key: mode.key,
      label: mode.label,
      fuelUsed: roundPdf2(fuelFull),
      fuelPercent: directFuelPercent,
      runningHours: hours,
      runningPercent: runPercent,
      distanceNm: roundPdf2(distanceFull),
      litresPerNm: distanceFull !== 0 ? roundPdf2(fuelFull / distanceFull) : null,
      litresPerHour: lphHours !== 0 ? roundPdf2(fuelFull / lphHours) : null,
    };
  });

  return { modeSummary, minuteKeysByMode, scaledFuelByMode };
}

/**
 * Keeps explicit mode-code vessels on their own classification logic while
 * applying the same SC GLORY 3 fuel precision rules to their completed rows.
 */
export function normalizeModeFuelToOfficialTotal<T extends PdfParityModeSummaryRow>(
  rows: readonly T[],
  officialTotalFuel: number,
): T[] {
  const rawFuelTotal = rows.reduce((sum, row) => sum + (Number.isFinite(row.fuelUsed) ? row.fuelUsed : 0), 0);
  const scale = rawFuelTotal !== 0 ? officialTotalFuel / rawFuelTotal : 0;

  return rows.map((row) => {
    const rawFuel = Number.isFinite(row.fuelUsed) ? row.fuelUsed : 0;
    const fuelFull = rawFuel * scale;
    const fuelPercent = rawFuelTotal !== 0 ? roundPdf2((rawFuel / rawFuelTotal) * 100) : 0;
    const distanceFull = Number.isFinite(row.distanceNm) ? row.distanceNm : 0;
    const displayedHours = roundPdf2(Number.isFinite(row.runningHours) ? row.runningHours : 0);
    return {
      ...row,
      fuelUsed: roundPdf2(fuelFull),
      fuelPercent,
      runningHours: displayedHours,
      runningPercent: roundPdf2(row.runningPercent),
      distanceNm: roundPdf2(distanceFull),
      // PDF keeps full distance precision for L/NM but uses displayed running hours for LPH.
      litresPerNm: distanceFull !== 0 ? roundPdf2(fuelFull / distanceFull) : null,
      litresPerHour: displayedHours !== 0 ? roundPdf2(fuelFull / displayedHours) : null,
    };
  });
}


/**
 * Reconciles a per-mode machinery detail fuel split with the already-normalized
 * Page-2 mode fuel total. Legacy PDFs calculate the mode headline total first,
 * then display equipment contributions that must add back to that same total.
 *
 * Signed totals are preserved (SC EMERALD can legitimately report negative
 * legacy totalizer results). No per-date calibration is involved.
 */
export function scaleModeDetailFuelToTarget<
  T extends {
    mainEngines: Array<{ fuelUsed: number }>;
    auxFuel: Array<{ fuelUsed: number }>;
    mainEngineFuelTotal: number;
    auxiliaryFuelTotal: number;
  },
>(summary: T, targetFuelUsed: number): T {
  if (!Number.isFinite(targetFuelUsed)) return summary;

  const rawMain = summary.mainEngines.reduce(
    (sum, row) => sum + (Number.isFinite(row.fuelUsed) ? row.fuelUsed : 0),
    0,
  );
  const rawAux = summary.auxFuel.reduce(
    (sum, row) => sum + (Number.isFinite(row.fuelUsed) ? row.fuelUsed : 0),
    0,
  );
  const rawTotal = rawMain + rawAux;

  if (!Number.isFinite(rawTotal) || Math.abs(rawTotal) < 1e-9) {
    if (Math.abs(targetFuelUsed) < 1e-9) {
      return {
        ...summary,
        mainEngines: summary.mainEngines.map((row) => ({ ...row, fuelUsed: 0 })),
        auxFuel: summary.auxFuel.map((row) => ({ ...row, fuelUsed: 0 })),
        mainEngineFuelTotal: 0,
        auxiliaryFuelTotal: 0,
      } as T;
    }
    // There is no defensible equipment split when every raw equipment delta is
    // zero but the mode headline is non-zero. Keep the raw detail rather than
    // inventing fuel allocation; the runtime data-quality diagnostics can flag it.
    return summary;
  }

  const scale = targetFuelUsed / rawTotal;
  const mainEngines = summary.mainEngines.map((row) => ({
    ...row,
    fuelUsed: row.fuelUsed * scale,
  }));
  const auxFuel = summary.auxFuel.map((row) => ({
    ...row,
    fuelUsed: row.fuelUsed * scale,
  }));

  return {
    ...summary,
    mainEngines,
    auxFuel,
    mainEngineFuelTotal: mainEngines.reduce((sum, row) => sum + row.fuelUsed, 0),
    auxiliaryFuelTotal: auxFuel.reduce((sum, row) => sum + row.fuelUsed, 0),
  } as T;
}

export interface LegacyFuelPoint {
  timestamp: Date;
  value: number;
}

export interface LegacyFuelDeltaOptions {
  supplyMaxDelta: number;
  returnMaxDelta: number;
  recoverAfterRejectedJump?: boolean;
  resetFloor?: number;
  resetCeiling?: number;
  minuteMs?: number;
}

/**
 * Reproduces SCReportingService's raw totalizer delta calculation for the
 * completed Daily PDF. It intentionally does NOT interpolate gaps: the C#
 * generator processes each logger row independently and assigns the delta to
 * that row's exact minute. This distinction materially changes Mode fuel when
 * historian samples are missing or rejected.
 */
export function buildLegacyPdfFuelDeltaMap(
  supplyPoints: readonly LegacyFuelPoint[],
  returnPoints: readonly LegacyFuelPoint[],
  options: LegacyFuelDeltaOptions,
): Map<number, number> {
  const minuteMs = options.minuteMs ?? 60_000;
  const supply = buildLegacyPdfTotalizerDeltaMap(
    supplyPoints,
    options.supplyMaxDelta,
    options.recoverAfterRejectedJump ?? true,
    options.resetFloor ?? 500,
    options.resetCeiling ?? 20_000,
    minuteMs,
  );
  const returned = buildLegacyPdfTotalizerDeltaMap(
    returnPoints,
    options.returnMaxDelta,
    options.recoverAfterRejectedJump ?? true,
    options.resetFloor ?? 500,
    options.resetCeiling ?? 20_000,
    minuteMs,
  );

  const buckets = new Set<number>([...supply.keys(), ...returned.keys()]);
  const result = new Map<number, number>();
  for (const bucket of buckets) {
    // Keep the signed difference just like the legacy PDF mode model. The
    // official daily total is applied later as a scale factor.
    result.set(bucket, (supply.get(bucket) || 0) - (returned.get(bucket) || 0));
  }
  return result;
}

function buildLegacyPdfTotalizerDeltaMap(
  points: readonly LegacyFuelPoint[],
  maximumDelta: number,
  recoverAfterRejectedJump: boolean,
  resetFloor: number,
  resetCeiling: number,
  minuteMs: number,
): Map<number, number> {
  const result = new Map<number, number>();
  // IMPORTANT: legacy SCReportingService first joins logger rows to a 1-minute
  // DataTable with exact DateTime equality. Rows that are not exactly on the
  // minute never enter dtRawData and therefore must not affect `previous`.
  // Filtering here BEFORE delta calculation is essential for day-to-day PDF parity.
  const sorted = [...points]
    .filter((point) => {
      const time = point.timestamp.getTime();
      return Number.isFinite(time) && time % minuteMs === 0;
    })
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  let nonZeroIndex = 0;
  let previous = 0;
  let previousAfterLost = 0;

  for (const point of sorted) {
    const value = point.value;
    if (!Number.isFinite(value) || value <= 0) continue;

    if (nonZeroIndex === 0) {
      previous = value;
      nonZeroIndex += 1;
      continue;
    }

    const bucket = point.timestamp.getTime();
    if (value > previous) {
      const delta = value - previous;
      if (delta <= maximumDelta) {
        result.set(bucket, delta);
        previous = value;
        previousAfterLost = 0;
      } else if (recoverAfterRejectedJump) {
        if (previousAfterLost !== 0 && previousAfterLost < value) {
          result.set(bucket, value - previousAfterLost);
          previous = value;
          previousAfterLost = 0;
        }
        previousAfterLost = value;
      }
    } else if (nonZeroIndex === 1) {
      previous = value;
    } else if (value >= resetFloor && value <= resetCeiling) {
      previous = value;
    }

    nonZeroIndex += 1;
  }

  return result;
}
