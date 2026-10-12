/** Protect CSV exports consumed by Excel/Sheets from formula injection.
 * Preserve numeric values including negative GPS coordinates.
 * A leading apostrophe forces text semantics for formula-like user/server labels.
 */
export function escapeSpreadsheetCsv(value: unknown): string {
  const raw = String(value ?? '');
  const trimmed = raw.trimStart();
  const numeric = trimmed !== '' && Number.isFinite(Number(trimmed));
  const formulaLike = /^[=+@\-]/.test(trimmed) && !numeric;
  const controlPrefix = /^[\t\r\n]/.test(raw);
  const safe = formulaLike || controlPrefix ? `\'${raw}` : raw;
  return /[",\r\n\t]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
