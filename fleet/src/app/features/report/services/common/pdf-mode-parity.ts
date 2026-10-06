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
   * Legacy SC GLORY 1/2/3/7 calculate distance from average speed multiplied by
   * the already displayed 2dp running hours. SC GLORY 6 is different: Service1.cs
   * stores distance as SumSpd / 60. Keep the default for the normal GLORY family
   * and opt in to the SC GLORY 6 rule only for that vessel.
   */
  distanceStrategy?: 'average-times-displayed-hours' | 'speed-sum-over-60';
  /**
   * Legacy vessels are not all normalized back to the Page-1 official fuel total.
   * Keep the default true; SC WINTER explicitly uses raw by-Mode fuel in the legacy PDF.
   */
  scaleFuelToOfficialTotal?: boolean;
  /** Preserve legacy DevExpress/.NET 0/0 => NaN fuel-percentage display. */
  legacyNaNPercentWhenZeroFuelTotal?: boolean;
  /**
   * Some legacy PDFs calculate Standby fuel % as the residual 100 - sum(other modes)
   * after each non-Standby percentage has already been rounded. That residual can be
   * negative (SC WINTER is a verified example), so allow opting out of the default
   * non-negative clamp without changing the behavior of every other vessel.
   */
  allowNegativeResidualFuelPercent?: boolean;
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

/**
 * Same exact-minute join as buildExactMinuteValueMap(), but writes the GPS value
 * through System.Single first. The original SC GLORY C# DataTables declare
 * GPSSpd as typeof(float), so threshold comparisons happen on float32 values.
 */
export function buildExactMinuteSingleValueMap(
  points: readonly LegacyFuelPoint[],
  minuteMs = 60_000,
): Map<number, number> {
  const exact = buildExactMinuteValueMap(points, minuteMs);
  const result = new Map<number, number>();
  for (const [minute, value] of exact) {
    result.set(minute, Math.fround(value));
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
      totalRawFuel !== 0
        ? roundPdf2((rawFuelForPercent / totalRawFuel) * 100)
        : options.legacyNaNPercentWhenZeroFuelTotal
          ? Number.NaN
          : 0;

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
    const standbyFuelPercentResidual = 100 - otherFuelPercent;
    fuelPercent.set(
      standbyKey,
      roundPdf2(
        options.allowNegativeResidualFuelPercent
          ? standbyFuelPercentResidual
          : Math.max(0, standbyFuelPercentResidual),
      ),
    );
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
      (totalRawFuel !== 0
        ? roundPdf2((bucket.rawFuel / totalRawFuel) * 100)
        : options.legacyNaNPercentWhenZeroFuelTotal
          ? Number.NaN
          : 0);
    const fuelFull = bucket.rawFuel * fuelScale;
    const averageGpsSpeed = bucket.samples > 0
      ? options.legacySinglePrecision
        ? Math.fround(Math.fround(bucket.speedSum) / Math.fround(bucket.samples))
        : bucket.speedSum / bucket.samples
      : 0;
    // SC GLORY 1/2/3/7 parse the already displayed 2dp Run Hrs back to
    // System.Single and multiply by average GPS speed. SC GLORY 6 (Service1.cs)
    // is a genuine exception and writes Distance = SumSpd / 60.0 directly.
    const distanceFull =
      options.distanceStrategy === 'speed-sum-over-60'
        ? options.legacySinglePrecision
          ? Math.fround(Math.fround(bucket.speedSum) / Math.fround(60))
          : bucket.speedSum / 60
        : options.legacySinglePrecision
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
      litresPerNm: Math.abs(distanceFull) >= 0.01 ? roundPdf2(fuelFull / distanceFull) : 0,
      litresPerHour: lphHours !== 0 ? roundPdf2(fuelFull / lphHours) : 0,
    };
  });

  return { modeSummary, minuteKeysByMode, scaledFuelByMode };
}

/**
 * Keeps explicit mode-code vessels on their own classification logic while
 * applying the same SC GLORY 3 fuel precision rules to their completed rows.
 */
export interface ExplicitModePdfParityOptions {
  /**
   * Legacy reports often force one standby row to be the residual after every
   * other row has already been rounded for display.
   */
  residualModeKey?: string;
  residualFuelPercent?: boolean;
  residualRunningHours?: boolean;
  residualRunningPercent?: boolean;
  reportHours?: number;
  /**
   * SCEmerald/SCBongkot/SCRaja/SCSultan calculate distance as:
   *   average GPS speed for the raw mode samples × displayed (2dp) running hours.
   * Bahtera generator reports instead keep sum(speed)/60, so they do not use this.
   */
  distanceFromDisplayedHours?: boolean;
  /** Reproduce the System.Single intermediate arithmetic in the legacy C# report. */
  legacySinglePrecision?: boolean;
}

/**
 * Normalize direct-mode rows to the Page-1 official total while preserving the
 * legacy C# presentation semantics.  In particular, the old reports calculate
 * percentages/hours in display order and some vessel families use a residual
 * standby row.  Distance, L/NM and LPH also use the *displayed* 2dp running
 * hours on several direct-mode reports.
 */
export function normalizeModeFuelToOfficialTotal<T extends PdfParityModeSummaryRow>(
  rows: readonly T[],
  officialTotalFuel: number,
  options: ExplicitModePdfParityOptions = {},
): T[] {
  const rawFuelTotal = rows.reduce(
    (sum, row) => sum + (Number.isFinite(row.fuelUsed) ? row.fuelUsed : 0),
    0,
  );
  const rawRunningHoursTotal = rows.reduce(
    (sum, row) => sum + (Number.isFinite(row.runningHours) ? Math.max(0, row.runningHours) : 0),
    0,
  );
  // Direct-mode legacy reports count one row per minute. Recover that integer
  // sample denominator so System.Single percentage math is not polluted by the
  // repeated JS 1/60 additions used by the UI accumulator.
  const rawRunningMinuteTotal = Math.max(0, Math.round(rawRunningHoursTotal * 60));
  const scale = rawFuelTotal !== 0 ? officialTotalFuel / rawFuelTotal : 0;
  const reportHours = options.reportHours ?? 24;
  const residualKey = options.residualModeKey;

  const fuelPercentByKey = new Map<string, number>();
  const runningHoursByKey = new Map<string, number>();
  const runningPercentByKey = new Map<string, number>();

  let otherFuelPercent = 0;
  let otherRunningHours = 0;
  let otherRunningPercent = 0;

  for (const row of rows) {
    if (residualKey && row.key === residualKey) continue;
    const rawFuel = Number.isFinite(row.fuelUsed) ? row.fuelUsed : 0;
    const rawHours = Number.isFinite(row.runningHours) ? Math.max(0, row.runningHours) : 0;
    const rawMinutes = Math.max(0, Math.round(rawHours * 60));
    const fuelPercentSource = options.legacySinglePrecision
      ? (Math.fround(rawFuel) / rawFuelTotal) * 100
      : (rawFuel / rawFuelTotal) * 100;
    const fuelPercent = rawFuelTotal !== 0 ? roundPdf2(fuelPercentSource) : 0;
    const hoursSource = options.legacySinglePrecision
      ? Math.fround(Math.fround(rawMinutes) / Math.fround(60))
      : rawHours;
    const displayedHours = roundPdf2(hoursSource);
    let runningPercentSource = 0;
    if (rawRunningMinuteTotal > 0) {
      runningPercentSource = options.legacySinglePrecision
        ? Math.fround(
            Math.fround(Math.fround(rawMinutes) / Math.fround(rawRunningMinuteTotal)) *
              Math.fround(100),
          )
        : (rawMinutes / rawRunningMinuteTotal) * 100;
    }
    const runningPercent = roundPdf2(runningPercentSource);

    fuelPercentByKey.set(row.key, fuelPercent);
    runningHoursByKey.set(row.key, displayedHours);
    runningPercentByKey.set(row.key, runningPercent);
    if (options.legacySinglePrecision) {
      otherFuelPercent = Math.fround(Math.fround(otherFuelPercent) + Math.fround(fuelPercent));
      otherRunningHours = Math.fround(Math.fround(otherRunningHours) + Math.fround(displayedHours));
      otherRunningPercent = Math.fround(Math.fround(otherRunningPercent) + Math.fround(runningPercent));
    } else {
      otherFuelPercent += fuelPercent;
      otherRunningHours += displayedHours;
      otherRunningPercent += runningPercent;
    }
  }

  if (residualKey) {
    const residualRow = rows.find((row) => row.key === residualKey);
    const residualRawHours = residualRow && Number.isFinite(residualRow.runningHours)
      ? Math.max(0, residualRow.runningHours)
      : 0;
    const residualRawFuel = residualRow && Number.isFinite(residualRow.fuelUsed)
      ? residualRow.fuelUsed
      : 0;

    fuelPercentByKey.set(
      residualKey,
      options.residualFuelPercent
        ? rawFuelTotal !== 0 && otherFuelPercent < 100
          ? roundPdf2(100 - otherFuelPercent)
          : 0
        : rawFuelTotal !== 0
          ? roundPdf2(
              ((options.legacySinglePrecision ? Math.fround(residualRawFuel) : residualRawFuel) / rawFuelTotal) * 100,
            )
          : 0,
    );

    runningHoursByKey.set(
      residualKey,
      options.residualRunningHours
        ? rawRunningHoursTotal > 0 && otherRunningHours < reportHours
          ? roundPdf2(reportHours - otherRunningHours)
          : 0
        : roundPdf2(residualRawHours),
    );

    runningPercentByKey.set(
      residualKey,
      options.residualRunningPercent
        ? rawRunningHoursTotal > 0 && otherRunningPercent < 100
          ? roundPdf2(100 - otherRunningPercent)
          : 0
        : rawRunningMinuteTotal > 0
          ? roundPdf2(
              options.legacySinglePrecision
                ? Math.fround(
                    Math.fround(
                      Math.fround(Math.round(residualRawHours * 60)) / Math.fround(rawRunningMinuteTotal),
                    ) * Math.fround(100),
                  )
                : (Math.round(residualRawHours * 60) / rawRunningMinuteTotal) * 100,
            )
          : 0,
    );
  }

  return rows.map((row) => {
    const rawFuel = Number.isFinite(row.fuelUsed) ? row.fuelUsed : 0;
    const rawHours = Number.isFinite(row.runningHours) ? Math.max(0, row.runningHours) : 0;
    const rawDistance = Number.isFinite(row.distanceNm) ? row.distanceNm : 0;
    const fuelFull = rawFuel * scale;
    const displayedHours = runningHoursByKey.get(row.key) ?? roundPdf2(rawHours);

    let distanceFull = rawDistance;
    if (options.distanceFromDisplayedHours && rawHours > 0) {
      if (options.legacySinglePrecision) {
        const rawMinutes = Math.max(0, Math.round(rawHours * 60));
        // dtMode.SumSpd is a Single. rawDistance is the UI accumulator's
        // sum(speed/60), so reconstruct the speed sum before the Single divide.
        const speedSum = Math.fround(rawDistance * 60);
        const averageSpeed = rawMinutes > 0
          ? Math.fround(speedSum / Math.fround(rawMinutes))
          : 0;
        distanceFull = Math.fround(Math.fround(averageSpeed) * Math.fround(displayedHours));
      } else {
        const averageSpeed = rawDistance / rawHours;
        distanceFull = averageSpeed * displayedHours;
      }
    }

    // C# checks the raw mode sample count first. If a non-zero raw duration
    // rounds to 0.00 h, dividing the fuel by the displayed value intentionally
    // produces +Infinity; DevExpress renders that as the infinity glyph.
    let litresPerHour = 0;
    if (rawHours > 0) {
      const legacyDisplayedHours = options.legacySinglePrecision ? Math.fround(displayedHours) : displayedHours;
      litresPerHour = legacyDisplayedHours === 0
        ? (fuelFull === 0 ? Number.NaN : Math.sign(fuelFull) * Number.POSITIVE_INFINITY)
        : fuelFull / legacyDisplayedHours;
    }

    const litresPerNm = Math.abs(distanceFull) >= 0.01 ? fuelFull / distanceFull : 0;

    return {
      ...row,
      fuelUsed: roundPdf2(fuelFull),
      fuelPercent:
        fuelPercentByKey.get(row.key) ??
        (rawFuelTotal !== 0 ? roundPdf2((rawFuel / rawFuelTotal) * 100) : 0),
      runningHours: displayedHours,
      runningPercent:
        runningPercentByKey.get(row.key) ??
        (rawRunningHoursTotal > 0 ? roundPdf2((rawHours / rawRunningHoursTotal) * 100) : 0),
      distanceNm: roundPdf2(distanceFull),
      litresPerNm: Number.isFinite(litresPerNm) ? roundPdf2(litresPerNm) : litresPerNm,
      litresPerHour: Number.isFinite(litresPerHour) ? roundPdf2(litresPerHour) : litresPerHour,
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
  /**
   * Legacy C# checks `value != 0`; when enabled, preserve negative non-zero
   * samples in the totalizer state machine instead of discarding every value <= 0.
   */
  skipOnlyExactZero?: boolean;
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
    options.skipOnlyExactZero ?? false,
  );
  const returned = buildLegacyPdfTotalizerDeltaMap(
    returnPoints,
    options.returnMaxDelta,
    options.recoverAfterRejectedJump ?? true,
    options.resetFloor ?? 500,
    options.resetCeiling ?? 20_000,
    minuteMs,
    options.skipOnlyExactZero ?? false,
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
  skipOnlyExactZero: boolean,
): Map<number, number> {
  const result = new Map<number, number>();
  // IMPORTANT: legacy SCReportingService first joins logger rows to a fixed
  // 1-minute DataTable. DateTime.ToString() keeps whole seconds but not fractional
  // seconds, so 10:15:00.123 can hit the 10:15:00 row while 10:15:23 cannot.
  // Normalize only :00.xxx rows and let the final record for that legacy second win.
  const exactByMinute = new Map<number, LegacyFuelPoint>();
  for (const point of points) {
    const timestamp = point?.timestamp;
    if (!(timestamp instanceof Date) || !Number.isFinite(timestamp.getTime())) continue;
    if (timestamp.getSeconds() !== 0) continue;

    const normalized = new Date(timestamp.getTime());
    normalized.setMilliseconds(0);
    const bucket = normalized.getTime();
    if (!Number.isFinite(bucket) || bucket % minuteMs !== 0) continue;

    exactByMinute.set(bucket, { timestamp: normalized, value: point.value });
  }
  const sorted = Array.from(exactByMinute.values()).sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
  );
  let nonZeroIndex = 0;
  let previous = 0;
  let previousAfterLost = 0;

  for (const point of sorted) {
    const value = point.value;
    if (!Number.isFinite(value) || (skipOnlyExactZero ? value === 0 : value <= 0)) continue;

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
