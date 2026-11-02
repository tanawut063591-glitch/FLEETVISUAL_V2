/**
 * PDF-first read-only display for archived MONTHLY reports supplied by the user.
 * Unlike a historian aggregation, it never manufactures samples that do not
 * appear in the source PDF. All 31 chart positions are read from printed cells.
 */
import type { ScGlory1PeriodUiReport } from '../vessels/sc-glory-1/sc-glory-1-report.service';
import type { MonthlyPdfReference } from './monthly-pdf-reference.service';
import { completePdfMonthlyModeRows, normalizedMonthlyMode } from './official-monthly-mode-map';

const MAIN = [
  { label: 'Port M/E', key: 'port' },
  { label: 'Ctr. M/E', key: 'center' },
  { label: 'Stb. M/E', key: 'starboard' },
];
const SHAFT = [
  { label: 'Port Shaft', key: 'port' },
  { label: 'Ctr. Shaft', key: 'center' },
  { label: 'Stb. Shaft', key: 'starboard' },
];
const AUX = [
  { label: 'Port A/E', key: 'port' },
  { label: 'Ctr. A/E', key: 'center' },
  { label: 'Stb. A/E', key: 'starboard' },
  { label: 'Thruster A/E', key: 'fourth' },
  { label: 'A/E1', key: 'port' }, { label: 'A/E2', key: 'center' },
  { label: 'A/E3', key: 'starboard' }, { label: 'A/E4', key: 'fourth' },
  { label: 'DG1', key: 'port' }, { label: 'DG2', key: 'center' },
  { label: 'DG3', key: 'starboard' }, { label: 'EG', key: 'fourth' },
];

const has = (m: MonthlyPdfReference['metrics'], key: string) => Object.prototype.hasOwnProperty.call(m, key);
const value = (m: MonthlyPdfReference['metrics'], label: string, at = 0): number => {
  if (!has(m, label) || at >= m[label].length) return Number.NaN;
  return m[label][at] === null ? Number.NaN : m[label][at] as number;
};
const chart = (ref: MonthlyPdfReference, labels: readonly string[], i: number): number | null => {
  for (const label of labels) {
    if (ref.chartSeries && Object.prototype.hasOwnProperty.call(ref.chartSeries, label)) {
      const found = ref.chartSeries[label]?.[i];
      return typeof found === 'number' && Number.isFinite(found) ? found : null;
    }
  }
  return null;
};

const monthNameToNumber: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};
function parsePrintedTimestamp(raw: string): Date {
  const m = String(raw).match(/^(\d{2})-([A-Z][a-z]{2})-(\d{2})\s+(\d{2}):(\d{2})$/);
  return m && monthNameToNumber[m[2]] !== undefined
    ? new Date(2000 + Number(m[3]), monthNameToNumber[m[2]], Number(m[1]), Number(m[4]), Number(m[5]))
    : new Date(Number.NaN);
}
function coordinate(raw: string, axis: 'lat' | 'long'): number {
  const directions = axis === 'lat' ? '[NS]' : '[EW]';
  const m = String(raw).match(new RegExp(String.raw`(\d+)\?\s*(\d+)'\s*([\d.]+)''\s*(${directions})`));
  if (!m) return Number.NaN;
  const result = Number(m[1]) + Number(m[2]) / 60 + Number(m[3]) / 3600;
  return m[4] === 'S' || m[4] === 'W' ? -result : result;
}

function equipment(m: MonthlyPdfReference['metrics'], labels: { label: string; key: string }[], kind: 'main' | 'shaft' | 'aux') {
  return labels.filter(({label}) => [
    `${label} Engine Speed (RPM)`, `${label} Running Hour (Hour)`,
    `${label} Total Fuel Used (L)`, `${label} Engine Load (kW)`,
  ].some((name) => has(m, name))).map(({ label, key }) => {
    const speedLabel = `${label} Engine Speed (RPM)`;
    const speed = has(m, speedLabel);
    const engineLoadLabel = `${label} Engine Load (kW)`;
    return {
      key, label,
      averageRpm: speed ? value(m, speedLabel) : null,
      maximumRpm: speed ? value(m, speedLabel, 1) : null,
      runningHours: has(m, `${label} Running Hour (Hour)`) ? value(m, `${label} Running Hour (Hour)`) : null,
      fuelUsed: has(m, `${label} Total Fuel Used (L)`) ? value(m, `${label} Total Fuel Used (L)`) : null,
      ...(has(m, engineLoadLabel) ? {engineLoadKw: value(m, engineLoadLabel)} : {}),
      ...(has(m, `${label} Engine Load (%)`) ? {engineLoad: value(m, `${label} Engine Load (%)`)} : {}),
    };
  });
}

/** Throws on missing/mismatched PDF, rather than silently displaying a 24-hour chart. */
export function buildOfficialMonthlyPdfSnapshot(
  ref: MonthlyPdfReference, start: Date, end: Date,
): ScGlory1PeriodUiReport {
  const period = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
  const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  if (ref.period !== period || start.getDate() !== 1 ||
      end.getMonth() !== start.getMonth() || end.getFullYear() !== start.getFullYear() ||
      ref.chartAxis?.length !== 31 || ref.chartAxis.some((day, i) => day !== i + 1) ||
      !Object.keys(ref.chartSeries || {}).length ||
      Object.values(ref.chartSeries || {}).some((values) => values.length !== 31) ||
      !ref.modeRows?.length || !ref.sourceFile || !has(ref.metrics, 'Total Fuel Used (L)') ||
      Object.keys(ref.metrics || {}).some((key) => !/\([^)]+\)$/.test(key)) ||
      ((ref.modeDetails || []).length > 1 && (ref.modeDetails || []).some((detail) =>
        !ref.modeRows.some((row) => normalizedMonthlyMode(row.label) === normalizedMonthlyMode(detail.label)))) ||
      !Number.isFinite(value(ref.metrics, 'Total Fuel Used (L)'))) {
    throw new Error('OFFICIAL_MONTHLY_PDF_REFERENCE_INCOMPLETE_OR_PERIOD_MISMATCH');
  }
  const m = ref.metrics;
  const engineSummary = equipment(m, MAIN, 'main');
  const shaftSummary = equipment(m, SHAFT, 'shaft');
  const auxSummary = equipment(m, AUX, 'aux').map((row, i) => ({
    ...row,
    utilizationPercent: has(m, 'DG/EG Engine Utilized (%)') ? value(m, 'DG/EG Engine Utilized (%)', i) : null,
  }));
  const isAuxOnly = !has(m, 'M/E Total Fuel Used (L)') && !has(m, 'A/E Total Fuel Used (L)');
  const auxFuelTotal = isAuxOnly ? value(m, 'Total Fuel Used (L)') : value(m, 'A/E Total Fuel Used (L)');
  const mainFuelTotal = isAuxOnly ? 0 : value(m, 'M/E Total Fuel Used (L)');
  const utilization = ['M/E Engine Utilized (%)', 'Shaft Utilized (%)',
    'Shaft per M/E Engine Utilized (%)', 'DG/EG Engine Utilized (%)']
    .filter((name) => has(m, name)).map((label) => ({
      label, port: value(m, label),
      ...(m[label].length === 4 || m[label].length === 3 ? {
        center: value(m, label, 1), starboard: value(m, label, 2),
        ...(m[label].length === 4 ? { fourth: value(m, label, 3) } : {}),
      } : { starboard: value(m, label, 1) }),
    }));
  const modeSummary = completePdfMonthlyModeRows(ref.modeRows).map((row) => ({
    ...row, key: normalizedMonthlyMode(row.label).replace(/\s+/g, '-'),
    // All seven columns were already normalized by completePdfMonthlyModeRows.
    // They must stay NaN when the *source PDF* printed NaN, not become 0.
  }));
  const modeDetails = (ref.modeDetails || []).map((page) => {
    const p = page.metrics;
    // Mode-specific utilization is PRINTED on its own PDF page. Do not
    // recalculate a percent from running hours / 24: that is wrong for a
    // monthly mode summary and disagrees with the PDF source.
    const modeUtilization = (metric: string, key: string): number => {
      const printed = p[metric];
      if (!printed) return Number.NaN;
      const slot = printed.length === 2
        ? (key === 'starboard' ? 1 : 0)
        : ({ port: 0, center: 1, starboard: 2, fourth: 3 } as Record<string, number>)[key];
      return value(p, metric, slot);
    };
    const pm = equipment(p, MAIN, 'main').map((row) => ({
      ...row, ...(has(p, 'M/E Engine Utilized (%)')
        ? { utilizationPercent: modeUtilization('M/E Engine Utilized (%)', row.key) } : {}),
    }));
    const ps = equipment(p, SHAFT, 'shaft').map((row) => ({
      ...row, ...(has(p, 'Shaft Utilized (%)')
        ? { utilizationPercent: modeUtilization('Shaft Utilized (%)', row.key) } : {}),
      ...(has(p, 'Shaft per M/E Engine Utilized (%)')
        ? { perMainUtilizationPercent: modeUtilization('Shaft per M/E Engine Utilized (%)', row.key) } : {}),
    }));
    const pa = equipment(p, AUX, 'aux').map((aux, index) => ({
      ...aux,
      utilizationPercent: has(p, 'DG/EG Engine Utilized (%)')
        ? value(p, 'DG/EG Engine Utilized (%)', index) : null,
    }));
    const main = has(p, 'M/E Total Fuel Used (L)') ? value(p, 'M/E Total Fuel Used (L)') : 0;
    const auxiliary = has(p, 'A/E Total Fuel Used (L)') ? value(p, 'A/E Total Fuel Used (L)')
      : value(p, 'Total Fuel Used (L)');
    return {
      key: normalizedMonthlyMode(page.label).replace(/\s+/g, '-'), label: page.label,
      officialPage: page.page, officialMetrics: Object.keys(p),
      summary: {
        mainEngines: pm, shafts: ps, auxFuel: pa,
        mainEngineFuelTotal: main, auxiliaryFuelTotal: auxiliary,
        averageSpeed: value(p, 'Average Speed (Knots)'),
        distanceNm: value(p, 'Travel Distance (NM)'),
      },
    };
  });
  const read = (keys: readonly string[], idx: number) => chart(ref, keys, idx);
  const rows = ref.chartAxis.map((day, i) => ({
    hour: day, active: day <= daysInMonth,
    distanceNm: read(['V.D.'],i), speedKnots: read(['V.S.'],i),
    mainFuel: read(['ME..F.'],i), auxFuel: read(['DG..F.','AE..F.'],i),
    totalFuel: read(['T.F.U.', ...(isAuxOnly ? ['DG..F.','AE..F.'] : [])],i),
    portMainFuel: read(['PM..F.'],i), centerMainFuel: read(['CM..F.'],i),
    starboardMainFuel: read(['SM..F.'],i),
    portAuxFuel: read(['DG1..F.','AE1..F.','PA..F.'],i),
    centerAuxFuel: read(['DG2..F.','AE2..F.','CA..F.'],i),
    starboardAuxFuel: read(['DG3..F.','AE3..F.','SA..F.'],i),
    fourthAuxFuel: read(['DG4..F.','AE4..F.','EG..F.'],i),
    portMainRunningHours: read(['PM..RH','PM..RH.'],i),
    centerMainRunningHours: read(['CM..RH'],i),
    starboardMainRunningHours: read(['SM..RH','RM..RH'],i),
    portAuxRunningHours: read(['DG1..RH','AE1..RH','PA..RH'],i),
    centerAuxRunningHours: read(['DG2..RH','AE2..RH','CA..RH'],i),
    starboardAuxRunningHours: read(['DG3..RH','AE3..RH','SA..RH'],i),
    fourthAuxRunningHours: read(['DG4..RH','AE4..RH','EG..RH'],i),
    portMainEngineLoad: read(['PM..EL'],i),
    centerMainEngineLoad: read(['CM..EL'],i),
    starboardMainEngineLoad: read(['SM..EL'],i),
    portAuxEngineLoad: read(['DG1..EL'],i),
    centerAuxEngineLoad: read(['DG2..EL'],i),
    starboardAuxEngineLoad: read(['DG3..EL'],i),
    fourthAuxEngineLoad: read(['DG4..EL'],i),
    portShaftRunningHours: read(['PS..RH'],i),
    centerShaftRunningHours: read(['CS..RH'],i),
    starboardShaftRunningHours: read(['SS..RH'],i),
    portShaftRpm: read(['PS..ES'],i),
    centerShaftRpm: read(['CS..ES'],i),
    starboardShaftRpm: read(['SS..ES'],i),
  }));
  // A missing PDF chart cell remains unavailable; do not convert it to zero.
  const dailyTrend = rows.filter((r) => r.hour <= daysInMonth).map((r) => ({
    date: new Date(start.getFullYear(), start.getMonth(), r.hour),
    totalFuelUsed: r.totalFuel ?? Number.NaN,
    mainEngineFuelTotal: r.mainFuel ?? Number.NaN,
    auxiliaryFuelTotal: r.auxFuel ?? Number.NaN,
    distanceNm: r.distanceNm ?? Number.NaN,
    coveragePercent: Number.NaN, modeRunningHours: Number.NaN,
  }));
  const tr = ref.trackingReference;
  const point = (v?: {timestamp: string; position: string; speed: number; heading: number}) => v ? {
    timestamp: parsePrintedTimestamp(v.timestamp),
    latitude: coordinate(v.position, 'lat'), longitude: coordinate(v.position, 'long'),
    speed: v.speed, heading: v.heading,
  } : null;
  const tracking = {begin: point(tr?.begin), end: point(tr?.end),
    distanceNm: tr?.distanceNm ?? Number.NaN, route: []};
  return {
    periodStart: start, periodEnd: end, loadedAt: new Date(), periodKind: 'month',
    dayCount: daysInMonth, coveragePercent: Number.NaN,
    averageSpeed: null, maximumSpeed: null,
    engineSummary, shaftSummary, auxSummary, utilization,
    mainEngineFuelTotal: mainFuelTotal, auxiliaryFuelTotal: auxFuelTotal,
    totalFuelUsed: value(m, 'Total Fuel Used (L)'),
    modeSummary, passageSummary: modeDetails.find((d) => normalizedMonthlyMode(d.label)==='passage')?.summary ||
      modeDetails[0]?.summary || {mainEngines:[],shafts:[],auxFuel:[],mainEngineFuelTotal:Number.NaN,
      auxiliaryFuelTotal:Number.NaN,averageSpeed:null,distanceNm:Number.NaN},
    tracking, hourly: rows,
    speedSeries: rows.filter((r) => r.hour <= daysInMonth && r.speedKnots !== null).map((r) => ({
      timestamp: new Date(start.getFullYear(), start.getMonth(), r.hour), speed: r.speedKnots!,
    })), dailyTrend,
    modeDetails,
    officialPdfRaw: {
      sourceFile: ref.sourceFile, period: ref.period,
      sourceRevisionNote: ref.sourceRevisionNote || null,
      overviewMetrics: Object.entries(ref.metrics).map(([label, values]) => ({label, values})),
      modeRows: ref.modeRows,
      modePages: (ref.modeDetails || []).map((p) => ({
        label: p.label, page: p.page,
        metrics: Object.entries(p.metrics).map(([label, values]) => ({label, values})),
      })),
      chartRows: Object.entries(ref.chartSeries || {}).map(([code, values]) => ({code, values})),
      chartAxis: ref.chartAxis,
    },
    officialPdfSnapshot: true,
    officialPdfChartCodes: Object.keys(ref.chartSeries || {}), officialPdfChartDays: true,
    officialTracking: ref.trackingReference, officialPdfCalendarDays: daysInMonth,
  } as unknown as ScGlory1PeriodUiReport;
}
