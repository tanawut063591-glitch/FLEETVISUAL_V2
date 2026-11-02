/**
 * PDF monthly mode pages are authoritative for the selected archived period.
 * These helpers deliberately do NOT derive a generator's monthly fuel / load
 * values from a dominant historian mode or distribute a total between modes.
 */
export interface PdfMonthlyModeRow {
  label: string;
  fuelUsed: number | null;
  fuelPercent: number | null;
  runningHours: number | null;
  runningPercent: number | null;
  distanceNm: number | null;
  litresPerNm: number | null;
  litresPerHour: number | null;
}

export interface PdfMonthlyModeDetail {
  label: string;
  page: number;
  metrics: Record<string, Array<number | null>>;
}

export function normalizedMonthlyMode(label: string): string {
  return String(label || '')
    .toLowerCase()
    .replace(/\(dp\)/g, '')
    .replace(/\bfor transferring operation\b/g, 'for transferring')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Keep every mode in the PDF, including zero-use modes, in PDF page-2 order. */
export function completePdfMonthlyModeRows<T extends { key?: string; label: string }>(
  officialRows: PdfMonthlyModeRow[],
  originalRows: T[] = [],
): Array<T & PdfMonthlyModeRow> {
  const oldByLabel = new Map(originalRows.map((row) => [normalizedMonthlyMode(row.label), row]));
  return officialRows.map((official) => {
    const old = oldByLabel.get(normalizedMonthlyMode(official.label));
    return {
      ...(old || ({} as T)),
      ...official,
      key: old?.key || normalizedMonthlyMode(official.label).replace(/\s+/g, '-'),
      // Preserve literal PDF NaN for EVERY mode column; do not turn null into 0.
      fuelUsed: official.fuelUsed === null ? Number.NaN : official.fuelUsed,
      fuelPercent: official.fuelPercent === null ? Number.NaN : official.fuelPercent,
      runningHours: official.runningHours === null ? Number.NaN : official.runningHours,
      runningPercent: official.runningPercent === null ? Number.NaN : official.runningPercent,
      distanceNm: official.distanceNm === null ? Number.NaN : official.distanceNm,
      litresPerNm: official.litresPerNm === null ? Number.NaN : official.litresPerNm,
      litresPerHour: official.litresPerHour === null ? Number.NaN : official.litresPerHour,
    } as T & PdfMonthlyModeRow;
  });
}

/**
 * Reconstruct every generator-only mode from its OWN PDF page (not the
 * historical `passageSummary`, which may contain only one dominant mode).
 * The source PDFs for BAHTERA INTAN, LAZURIT, ZAMRUD and BOURBON LIBERTY 233
 * all use DG1, DG2, DG3, EG. This helper is only called for that PDF contract.
 */
export function completePdfGeneratorModeDetails(
  officialPages: PdfMonthlyModeDetail[],
  modeRows: Array<{ label: string; key?: string }>,
): Array<{
  key: string; label: string; officialPage: number; officialMetrics: string[];
  summary: {
    mainEngines: never[]; shafts: never[];
    auxFuel: Array<{
      key: string; label: string; runningHours: number | null;
      fuelUsed: number; engineLoadKw: number; utilizationPercent: number;
    }>;
    mainEngineFuelTotal: number;
    auxiliaryFuelTotal: number;
    averageSpeed: number;
    distanceNm: number;
  };
}> {
  const byLabel = new Map(modeRows.map((row) => [normalizedMonthlyMode(row.label), row]));
  return officialPages.map((page) => {
    const metrics = page.metrics;
    const read = (label: string, at = 0): number => {
      const values = metrics[label];
      if (!values || at >= values.length || values[at] === null) return Number.NaN;
      return values[at] as number;
    };
    const auxiliary = ['DG1', 'DG2', 'DG3', 'EG'].map((label, index) => ({
      key: label.toLowerCase() === 'eg' ? 'fourth' : ['port', 'center', 'starboard'][index],
      label,
      // Monthly mode pages do not print per-generator running hours: DO NOT
      // turn the whole-period running-hour metric into a mode-specific hour.
      runningHours: null,
      fuelUsed: read(`${label} Total Fuel Used (L)`),
      engineLoadKw: read(`${label} Engine Load (kW)`),
      utilizationPercent: read('DG/EG Engine Utilized (%)', index),
    }));
    const key = byLabel.get(normalizedMonthlyMode(page.label))?.key ||
      normalizedMonthlyMode(page.label).replace(/\s+/g, '-');
    return {
      key, label: page.label, officialPage: page.page,
      officialMetrics: Object.keys(metrics),
      summary: {
        mainEngines: [] as never[], shafts: [] as never[],
        auxFuel: auxiliary,
        mainEngineFuelTotal: 0,
        auxiliaryFuelTotal: read('Total Fuel Used (L)'),
        averageSpeed: read('Average Speed (Knots)'),
        distanceNm: read('Travel Distance (NM)'),
      },
    };
  });
}
