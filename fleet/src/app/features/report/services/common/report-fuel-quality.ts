/** Presentation-only reconciliation checks. Never change historian or PDF values. */
export type FuelQualitySeverity = 'ok' | 'warning' | 'error';

export interface ReportFuelQualityNotice {
  severity: FuelQualitySeverity;
  headline: string;
  source: string;
  details: string[];
}

export interface FuelQualitySnapshot {
  mainEngineFuelTotal: number;
  auxiliaryFuelTotal: number;
  totalFuelUsed: number;
  auxSummary?: readonly { fuelUsed: number; label?: string }[];
  quality?: {
    historianSource?: 'report' | 'api2' | 'live' | 'mixed';
    pdfParityVerified?: boolean;
    warnings?: readonly string[];
  };
}

const FUEL_TOLERANCE_L = 0.11; // Allows rounding of two-decimal printed reports.

function liters(value: number): string {
  return Number.isFinite(value) ? `${value.toFixed(2)} L` : 'unavailable';
}

/**
 * Report view-only QA. A match between reported subtotals does NOT prove the
 * underlying historian source matches the official PDF (SC WINTER 201 L case).
 * Only the vessel adapter/PDF-checker can make that assertion.
 */
export function buildFuelQualityNotice(
  snapshot: FuelQualitySnapshot,
  isScWinter = false,
): ReportFuelQualityNotice | null {
  const quality = snapshot.quality;
  const total = snapshot.totalFuelUsed;
  const main = snapshot.mainEngineFuelTotal;
  const aux = snapshot.auxiliaryFuelTotal;
  const details: string[] = [];
  let inconsistent = false;

  if ([main, aux, total].every(Number.isFinite)) {
    const computed = main + aux;
    if (Math.abs(computed - total) > FUEL_TOLERANCE_L) {
      inconsistent = true;
      details.push(`Fuel summary mismatch: M/E + A/E = ${liters(computed)}, displayed total = ${liters(total)}.`);
    }
  } else if (isScWinter) {
    details.push('Fuel totals include missing or non-finite measurements; verify source data.');
  }

  // Four auxiliary engines are explicit in SC WINTER's official report.
  if (isScWinter && snapshot.auxSummary?.length === 4) {
    const components = snapshot.auxSummary.map((item) => item.fuelUsed);
    if (components.every(Number.isFinite) && Number.isFinite(aux)) {
      const sum = components.reduce((result, value) => result + value, 0);
      if (Math.abs(sum - aux) > FUEL_TOLERANCE_L) {
        inconsistent = true;
        details.push(`A/E1–A/E4 sum = ${liters(sum)} but A/E summary = ${liters(aux)}.`);
      }
    }
  }

  const messages = (quality?.warnings ?? []).filter((value) => typeof value === 'string' && value.trim());
  details.push(...new Set(messages));
  if (!isScWinter && !inconsistent) return null;

  const sources: Record<string, string> = {
    report: 'Reporting Historian', api2: 'API2 fallback',
    live: 'Live telemetry', mixed: 'Mixed historian sources',
  };
  const source = sources[quality?.historianSource ?? ''] ?? 'Historian source not specified';
  const pdfValuesApplied = messages.some((message) => /PDF page-1 fuel totals replaced/i.test(message));

  if (inconsistent) {
    return { severity: 'error', headline: 'Fuel totals require review', source, details };
  }
  if (pdfValuesApplied) {
    return { severity: 'warning', headline: 'Official PDF fuel totals applied — historian differs', source, details };
  }
  if (quality?.pdfParityVerified === true && details.length === 0) {
    return { severity: 'ok', headline: 'Historian fuel parity checks passed', source, details };
  }
  return {
    severity: 'warning',
    headline: isScWinter ? 'Fuel values require source verification' : 'Fuel data warning',
    source,
    details: details.length ? details : ['Official PDF parity has not been independently confirmed for this report period.'],
  };
}
