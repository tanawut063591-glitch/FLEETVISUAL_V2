/**
 * Reads the printed 31-column C# Monthly PDF chart tables from PDF.js text items.
 * Keeps the source numbers (including negative counter deltas) unrounded.
 * The view can round them to one decimal without modifying totals.
 *
 * A single damaged row is never partially applied. The caller may fall back to
 * Historian for that row, but must not label it as verified against the PDF.
 */
export type MonthlyPdfChartValues = Record<string, Array<number | null>>;

export interface PdfTextCell {
  str: string;
  x: number;
  y: number;
  width: number;
}

const CODE = /^(?:V\.D\.|V\.S\.|T\.F\.U\.|(?:ME|AE|DG|PM|CM|SM|PS|CS|SS|PA|CA|SA|DG[1-4]|AE[1-4]|EG)\.\.(?:F\.|RH\.?|ES|EL))$/;
const VALUE = /^(?:NaN|[-+]?\d[\d,]*(?:\.\d+)?|[-+]?\d+\.)$/;
const COMPLETE_VALUE = /^(?:NaN|[-+]?\d[\d,]*(?:\.\d+)?)$/;

function midpoint(part: PdfTextCell): number {
  return part.x + part.width / 2;
}

/** Returns complete, individually checked 31-day series for one PDF page. */
export function parseMonthlyChartPage(items: readonly PdfTextCell[]): MonthlyPdfChartValues {
  const output: MonthlyPdfChartValues = {};
  const headers = items.filter((part) => part.str === 'Day' && part.x < 75);
  for (const header of headers) {
    const days = items
      .filter((part) => part.x > 34 && Math.abs(part.y - header.y) < 3 && /^\d{1,2}$/.test(part.str))
      .filter((part) => Number(part.str) >= 1 && Number(part.str) <= 31)
      .sort((a, b) => a.x - b.x);
    if (days.length !== 31 || days.some((part, index) => Number(part.str) !== index + 1)) continue;
    const centers = days.map(midpoint);
    const labels = items.filter((part) => CODE.test(part.str) && part.x < 75 &&
      header.y - part.y > 6 && header.y - part.y < 130);
    const selected = new Map<string, PdfTextCell>();
    for (const label of labels) {
      const old = selected.get(label.str);
      if (!old || label.y > old.y) selected.set(label.str, label);
    }
    for (const [code, label] of selected) {
      const fragments: PdfTextCell[][] = Array.from({ length: 31 }, () => []);
      for (const part of items) {
        if (part.x < 34 || Math.abs(part.y - label.y) > 9 || !VALUE.test(part.str)) continue;
        const x = midpoint(part);
        let nearest = 0;
        for (let i = 1; i < centers.length; i++) {
          if (Math.abs(x - centers[i]) < Math.abs(x - centers[nearest])) nearest = i;
        }
        if (Math.abs(x - centers[nearest]) <= 12.5) fragments[nearest].push(part);
      }
      const values: Array<number | null> = [];
      let valid = true;
      for (const cell of fragments) {
        // PDF.js coordinates increase upwards. In a wrapped number, the upper
        // part precedes the lower part (e.g. 10039. + 0 => 10039.0).
        const token = [...cell].sort((a, b) => b.y - a.y).map((part) => part.str).join('');
        if (!COMPLETE_VALUE.test(token)) { valid = false; break; }
        const value = token === 'NaN' ? null : Number(token.replace(/,/g, ''));
        if (value !== null && !Number.isFinite(value)) { valid = false; break; }
        values.push(value);
      }
      if (valid && values.length === 31) output[code] = values;
    }
    // A valid page contains only one Day header; don't allow the legend or a
    // second header to replace already parsed source rows.
    break;
  }
  return output;
}

export function mergeMonthlyChartSeries(
  target: MonthlyPdfChartValues,
  candidate: MonthlyPdfChartValues,
): void {
  for (const [code, values] of Object.entries(candidate)) {
    if (!target[code]) { target[code] = values; continue; }
    // If the SAME PDF prints contradictory copies, do not silently pick one.
    // The affected chart stays unavailable for PDF alignment.
    const prior = target[code];
    if (prior.length !== values.length || prior.some((v, i) => v !== values[i])) {
      delete target[code];
    }
  }
}

export function officialDayFuel(
  charts: MonthlyPdfChartValues,
  index: number,
): number | null {
  const value = (key: string) => {
    const raw = charts[key]?.[index];
    return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
  };
  const explicit = value('T.F.U.');
  if (explicit !== null) return explicit;
  const main = value('ME..F.');
  const aux = value('DG..F.') ?? value('AE..F.');
  if (main !== null && aux !== null) return main + aux;
  if (main === null && aux !== null) return aux; // DG/EG-only vessels
  return null; // Never report auxiliary fuel as TOTAL for a main-engine vessel.
}
