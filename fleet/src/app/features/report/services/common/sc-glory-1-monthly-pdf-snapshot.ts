/**
 * SC GLORY 1 only — a faithful *display snapshot* for the supplied September
 * 2026 official C# PDF.  This is NOT a historian formula for other months.
 * The monthly C# service consumes daily data_YYYYMMDD.json files which the
 * PDF alone does not contain.  Do not manufacture those raw samples.
 */
import type { ScGlory1PeriodUiReport, ScGlory1HourlyRow, ScGlory1ModeSummaryRow } from '../vessels/sc-glory-1/sc-glory-1-report.service';
import type { MonthlyPdfReference } from './monthly-pdf-reference.service';

const ENGINE_NAMES = [
  { key: 'port' as const, main: 'Port M/E', shaft: 'Port Shaft' },
  { key: 'center' as const, main: 'Ctr. M/E', shaft: 'Ctr. Shaft' },
  { key: 'starboard' as const, main: 'Stb. M/E', shaft: 'Stb. Shaft' },
];
const AUX_NAMES = [
  { key: 'port' as const, name: 'Port A/E' },
  { key: 'starboard' as const, name: 'Stb. A/E' },
];

const MODE_KEYS: Record<string, string> = {
  'Standby': 'standby',
  'Cargo Operation': 'cargo-operation',
  'Manoeuvring': 'manoeuvring',
  'Sea Passage Economics': 'sea-passage-economics',
  'Passage': 'passage',
};

/** Do not coerce the PDF's NaN to 0: the C# PDF explicitly shows NaN. */
function metric(metrics: Record<string, Array<number | null>>, label: string, at = 0): number {
  const list = metrics[label];
  if (!list || at >= list.length) throw new Error(`SC_GLORY_1_PDF_MISSING_METRIC:${label}[${at}]`);
  const value = list[at];
  if (value === null) return Number.NaN;
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`SC_GLORY_1_PDF_INVALID_METRIC:${label}`);
  return value;
}

function chart(reference: MonthlyPdfReference, key: string, index: number): number | null {
  const points = reference.chartSeries?.[key];
  if (!points) return null;
  const value = points[index];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Parse only the DMS text printed in this PDF; do not guess missing positions. */
function pdfDmsToDecimal(coord: string, direction: 'N' | 'S' | 'E' | 'W'): number {
  const expression = new RegExp(String.raw`(\d+)\?\s*(\d+)'\s*([\d.]+)''\s*${direction}`);
  const m = coord.match(expression);
  if (!m) return Number.NaN;
  const value = Number(m[1]) + Number(m[2]) / 60 + Number(m[3]) / 3600;
  return direction === 'S' || direction === 'W' ? -value : value;
}

export interface Glory1OfficialMonthlySnapshot extends ScGlory1PeriodUiReport {
  officialPdfSnapshot: true;
  officialPdfChartCodes: string[];
  officialPdfChartDays: true;
  officialTracking: NonNullable<MonthlyPdfReference['trackingReference']>;
  /** The full PDF's day table uses 31 slots; Sep-26 calendar has 30 days. */
  officialPdfCalendarDays: number;
}

/**
 * Values are read by PDF label and PDF day code, never reallocated to make
 * totals agree.  C# chart cells are rounded to 1 decimal while page 1 totals
 * are rounded to 2 decimals; sums therefore MAY differ by rounding.
 */
export function buildScGlory1MonthlyPdfSnapshot(
  reference: MonthlyPdfReference, start: Date, end: Date,
): Glory1OfficialMonthlySnapshot {
  if (reference.period !== '2026-09' ||
      reference.sourceFile !== 'SC-GLORY-1-Monthly-Report-2026-09.pdf' ||
      reference.pages !== 14 ||
      start.getFullYear() !== 2026 || start.getMonth() !== 8 ||
      end.getFullYear() !== 2026 || end.getMonth() !== 8) {
    throw new Error('SC_GLORY_1_PDF_REFERENCE_PERIOD_MISMATCH');
  }
  const expectedChartCodes = [
    'V.D.', 'V.S.', 'ME..F.', 'AE..F.', 'PM..F.', 'SM..F.', 'CM..F.',
    'PM..RH', 'PS..RH', 'PS..ES', 'SM..RH', 'SS..RH', 'SS..ES',
    'CM..RH', 'CS..RH', 'CS..ES', 'PA..F.', 'SA..F.', 'PA..RH', 'SA..RH', 'T.F.U.',
  ];
  if (reference.chartAxis?.length !== 31 ||
      reference.chartPeriodDays !== 30 ||
      expectedChartCodes.some((key) => reference.chartSeries?.[key]?.length !== 31) ||
      reference.modeRows?.length !== 5 ||
      reference.modeDetails?.length !== 1 ||
      reference.modeDetails[0].label !== 'Passage' ||
      !reference.trackingReference || reference.trackingReference.distanceNm === null) {
    throw new Error('SC_GLORY_1_PDF_REFERENCE_INCOMPLETE');
  }
  const m = reference.metrics;
  const passage = reference.modeDetails[0].metrics;
  const engineSummary = ENGINE_NAMES.map(({ key, main }) => ({
    key, label: main,
    averageRpm: metric(m, `${main} Engine Speed (RPM)`),
    maximumRpm: metric(m, `${main} Engine Speed (RPM)`, 1),
    runningHours: metric(m, `${main} Running Hour (Hour)`),
    fuelUsed: metric(m, `${main} Total Fuel Used (L)`),
  }));
  const shaftSummary = ENGINE_NAMES.map(({ key, shaft }) => ({
    key, label: shaft,
    averageRpm: metric(m, `${shaft} Engine Speed (RPM)`),
    maximumRpm: metric(m, `${shaft} Engine Speed (RPM)`, 1),
    runningHours: metric(m, `${shaft} Running Hour (Hour)`),
  }));
  const auxSummary = AUX_NAMES.map(({ key, name }) => ({
    key, label: name,
    runningHours: metric(m, `${name} Running Hour (Hour)`),
    fuelUsed: metric(m, `${name} Total Fuel Used (L)`),
  }));
  const utilLabels = ['M/E Engine Utilized (%)', 'Shaft Utilized (%)', 'Shaft per M/E Engine Utilized (%)'];
  const utilization = utilLabels.map((label) => ({
    label,
    port: metric(m, label, 0), center: metric(m, label, 1), starboard: metric(m, label, 2),
  }));
  // The reference JSON deliberately preserves a missing/NaN PDF cell as null.
  // The legacy UI report contract uses `number` for these five fields.
  // Represent unavailable PDF measurements as NaN (NOT 0): this is both
  // type-safe under strictNullChecks and faithful to the printed report.
  const modeSummary: ScGlory1ModeSummaryRow[] = reference.modeRows.map((row) => ({
    key: MODE_KEYS[row.label] || row.label.toLowerCase().replace(/\W+/g, '-'),
    label: row.label,
    fuelUsed: row.fuelUsed ?? Number.NaN,
    fuelPercent: row.fuelPercent ?? Number.NaN,
    runningHours: row.runningHours ?? Number.NaN,
    runningPercent: row.runningPercent ?? Number.NaN,
    distanceNm: row.distanceNm ?? Number.NaN,
    // These two values are explicitly nullable in ScGlory1ModeSummaryRow.
    litresPerNm: row.litresPerNm,
    litresPerHour: row.litresPerHour,
  }));

  // The original legacy report's page 3 is explicitly **Passage**, not ECO.
  // It may have different values from page 2, by design of the C# report.
  const PASSAGE_AUX_NAMES = [AUX_NAMES[0], { key: 'center' as const, name: 'Ctr. A/E' }, AUX_NAMES[1]];
  const passageSummary = {
    mainEngines: ENGINE_NAMES.map(({ key, main }) => ({
      key, label: main,
      averageRpm: metric(passage, `${main} Engine Speed (RPM)`),
      maximumRpm: metric(passage, `${main} Engine Speed (RPM)`, 1),
      runningHours: 0, // No per-engine running hours on PDF page 3: hide them in the UI.
      fuelUsed: metric(passage, `${main} Total Fuel Used (L)`),
    })),
    shafts: ENGINE_NAMES.map(({ key, shaft }) => ({
      key, label: shaft,
      averageRpm: metric(passage, `${shaft} Engine Speed (RPM)`),
      maximumRpm: metric(passage, `${shaft} Engine Speed (RPM)`, 1),
      runningHours: 0,
    })),
    auxFuel: PASSAGE_AUX_NAMES.map(({ key, name }) => ({
      key, label: name,
      runningHours: 0,
      fuelUsed: metric(passage, `${name} Total Fuel Used (L)`),
    })),
    mainEngineFuelTotal: metric(passage, 'M/E Total Fuel Used (L)'),
    auxiliaryFuelTotal: metric(passage, 'A/E Total Fuel Used (L)'),
    averageSpeed: metric(passage, 'Average Speed (Knots)'),
    distanceNm: metric(passage, 'Travel Distance (NM)'),
  };
  const tr = reference.trackingReference;
  const parsePoint = (point?: {timestamp: string; position: string; speed: number; heading: number}) => {
    if (!point) return null;
    const date = new Date(point.timestamp.replace(/^(\d\d)-(\w{3})-(\d\d)/, (_full, day: string, month: string, year: string) =>
      `${day} ${month} 20${year}`));
    const north = pdfDmsToDecimal(point.position, 'N');
    const south = pdfDmsToDecimal(point.position, 'S');
    const east = pdfDmsToDecimal(point.position, 'E');
    const west = pdfDmsToDecimal(point.position, 'W');
    return {
      timestamp: date, latitude: Number.isFinite(north) ? north : south,
      longitude: Number.isFinite(east) ? east : west,
      speed: point.speed, heading: point.heading,
    };
  };
  const begin = parsePoint(tr.begin), ending = parsePoint(tr.end);
  const tracking = { begin, end: ending, distanceNm: tr.distanceNm!, route: [] };

  const hourly = reference.chartAxis.map((day, index): ScGlory1HourlyRow => ({
    hour: day, active: true,
    distanceNm: chart(reference, 'V.D.', index), speedKnots: chart(reference, 'V.S.', index),
    mainFuel: chart(reference, 'ME..F.', index), auxFuel: chart(reference, 'AE..F.', index),
    portMainFuel: chart(reference, 'PM..F.', index), centerMainFuel: chart(reference, 'CM..F.', index),
    starboardMainFuel: chart(reference, 'SM..F.', index),
    portAuxFuel: chart(reference, 'PA..F.', index), starboardAuxFuel: chart(reference, 'SA..F.', index),
    portMainRunningHours: chart(reference, 'PM..RH', index),
    centerMainRunningHours: chart(reference, 'CM..RH', index),
    starboardMainRunningHours: chart(reference, 'SM..RH', index),
    portAuxRunningHours: chart(reference, 'PA..RH', index),
    starboardAuxRunningHours: chart(reference, 'SA..RH', index),
    portShaftRunningHours: chart(reference, 'PS..RH', index),
    centerShaftRunningHours: chart(reference, 'CS..RH', index),
    starboardShaftRunningHours: chart(reference, 'SS..RH', index),
    portShaftRpm: chart(reference, 'PS..ES', index),
    centerShaftRpm: chart(reference, 'CS..ES', index),
    starboardShaftRpm: chart(reference, 'SS..ES', index),
    totalFuel: chart(reference, 'T.F.U.', index),
  }));
  const dailyTrend = hourly.filter((row) => row.hour <= 30).map((row) => ({
    date: new Date(2026, 8, row.hour),
    totalFuelUsed: row.totalFuel!, mainEngineFuelTotal: row.mainFuel!,
    auxiliaryFuelTotal: row.auxFuel!, distanceNm: row.distanceNm!,
    // Coverage and mode-hour aggregates are NOT printed on the PDF's daily
    // chart page. NaN = unavailable, not zero or an invented 100%.
    coveragePercent: Number.NaN, modeRunningHours: Number.NaN,
  }));
  const speedSeries = dailyTrend.map(({ date }, index) => ({
    timestamp: date, speed: chart(reference, 'V.S.', index)!,
  }));
  return {
    periodStart: start, periodEnd: end, loadedAt: new Date(),
    periodKind: 'month', dayCount: 30,
    coveragePercent: Number.NaN,
    averageSpeed: null, maximumSpeed: null, // no month-wide values in the supplied PDF
    engineSummary, shaftSummary, auxSummary, utilization,
    mainEngineFuelTotal: metric(m, 'M/E Total Fuel Used (L)'),
    auxiliaryFuelTotal: metric(m, 'A/E Total Fuel Used (L)'),
    totalFuelUsed: metric(m, 'Total Fuel Used (L)'),
    modeSummary, passageSummary,
    tracking, hourly, speedSeries, dailyTrend,
    officialPdfSnapshot: true,
    officialPdfChartCodes: expectedChartCodes,
    officialPdfChartDays: true,
    officialTracking: tr,
    officialPdfCalendarDays: 30,
  };
}
