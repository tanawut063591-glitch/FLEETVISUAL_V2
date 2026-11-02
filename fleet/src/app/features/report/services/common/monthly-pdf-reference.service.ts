import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { catchError, map, shareReplay, switchMap, timeout } from 'rxjs/operators';
import { OfficialPdfNetworkCoordinatorService } from './official-pdf-network-coordinator.service';
import { OfficialReportLibraryService } from '../../../../shared/services/official-report-library.service';
import { completePdfGeneratorModeDetails, completePdfMonthlyModeRows } from './official-monthly-mode-map';
import { parseMonthlyChartPage, mergeMonthlyChartSeries, officialDayFuel, MonthlyPdfChartValues } from './monthly-pdf-chart-reader';

/**
 * Official monthly PDF benchmark, not a replacement for C# historian aggregation.
 * All months use the same Historian first, optional backend PDF alignment policy.
 * Bundled reference JSON files are kept only for QA and are never silently loaded.
 */
export interface MonthlyPdfReference {
  sourceFile: string;
  period: string;
  /** Newer screenshots may supersede values in an older locally uploaded PDF. */
  sourceRevisionNote?: string;
  metrics: Record<string, Array<number | null>>;
  modeRows: Array<{
    label: string; fuelUsed: number | null; fuelPercent: number | null; runningHours: number | null;
    runningPercent: number | null; distanceNm: number | null; litresPerNm: number | null; litresPerHour: number | null;
  }>;
  pages: number;
  // Each displayed chart cell is captured verbatim from the corresponding C#
  // monthly PDF page. The legacy chart reserves 31 calendar slots in September.
  chartSeries?: Record<string, Array<number | null>>;
  chartAxis?: number[];
  chartPages?: number[];
  chartPeriodDays?: number;
  modeDetails?: Array<{
    label: string;
    page: number;
    metrics: Record<string, Array<number | null>>;
  }>;
  trackingReference?: {
    page: number; distanceNm: number | null;
    begin?: { timestamp: string; position: string; speed: number; heading: number };
    end?: { timestamp: string; position: string; speed: number; heading: number };
  } | null;
}

export interface MonthlyParityResult<T> {
  report: T;
  verified: boolean;
  sourceFile: string | null;
  alignedFields: number;
}

@Injectable({ providedIn: 'root' })
export class MonthlyPdfReferenceService {
  private readonly referenceCache = new Map<string, { until: number; source$: Observable<MonthlyPdfReference | null> }>();
  constructor(
    private readonly http: HttpClient,
    private readonly requests: OfficialPdfNetworkCoordinatorService,
    private readonly library: OfficialReportLibraryService,
  ) {}

  apply<T extends object>(vessel: string, period: string, original: T): Observable<MonthlyParityResult<T>> {
    const base: MonthlyParityResult<T> = { report: original, verified: false, sourceFile: null, alignedFields: 0 };
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period) || !String(vessel || '').trim()) return of(base);
    return this.getReference(vessel, period).pipe(
      map((reference) => reference ? this.overlay(original, reference) : base),
      catchError(() => of(base)),
    );
  }

  /** Same reference policy for every month: obtain the current official PDF
   * through the report backend. Bundled September/October JSON is retained for
   * QA and must not silently replace the live Historian-based monthly result.
   * PDF alignment is best-effort: if the PDF is unavailable, display the
   * Historian report without claiming it was PDF-verified.
   */
  private getReference(vessel: string, period: string): Observable<MonthlyPdfReference | null> {
    const key = `${this.slug(vessel)}|${period}`;
    const cached = this.referenceCache.get(key);
    if (cached && cached.until > Date.now()) return cached.source$;
    const source$ = this.loadOfficialMonthlyPdf(vessel, period).pipe(
      catchError(() => of(null)),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    if (this.referenceCache.size >= 36) this.referenceCache.delete(this.referenceCache.keys().next().value!);
    this.referenceCache.set(key, { source$, until: Date.now() + 5 * 60_000 });
    return source$;
  }

  private loadOfficialMonthlyPdf(vessel: string, period: string): Observable<MonthlyPdfReference | null> {
    const stamp = `${period}-01 00:00:00`;
    const parse = (blob$: Observable<Blob>) => blob$.pipe(
      timeout(20_000),
      switchMap((blob) => from(this.parseMonthlyPdf(blob, vessel, period))),
      switchMap((result) => result ? of(result) : from(Promise.reject(new Error('INVALID_MONTHLY_PDF')))),
    );
    const direct$ = parse(this.requests.getReport('direct', 'm', stamp, vessel)).pipe(
      catchError(() => parse(this.requests.getReport('gateway', 'm', stamp, vessel))),
    );
    return this.library.findReport('m', period, vessel).pipe(
      switchMap((entry) => entry
        ? parse(this.library.loadReport(entry)).pipe(catchError(() => direct$))
        : direct$),
      catchError(() => of(null)),
    );
  }

  /** Parse the official C# MONTHLY PDF page 1/2, never treat a Daily PDF as monthly.
   * Coordinate-grouped text avoids relying on PDF.js internal content ordering. */
  private async parseMonthlyPdf(blob: Blob, vessel: string, period: string): Promise<MonthlyPdfReference | null> {
    if (!(blob instanceof Blob) || blob.size < 100) return null;
    const bytes = new Uint8Array(await blob.arrayBuffer());
    if (new TextDecoder('ascii').decode(bytes.slice(0, 5)) !== '%PDF-') return null;
    const pdfjs: any = await import('pdfjs-dist/legacy/build/pdf.mjs');
    if (pdfjs?.GlobalWorkerOptions) pdfjs.GlobalWorkerOptions.workerSrc = 'assets/pdfjs/pdf.worker.min.mjs';
    const task = pdfjs.getDocument({ data: bytes });
    const document = await task.promise;
    try {
      if (document.numPages < 2) return null;
      const p1 = await document.getPage(1);
      const p2 = await document.getPage(2);
      const rows1 = this.pageRows((await p1.getTextContent()).items || [], p1.view[2]);
      const rows2 = this.pageRows((await p2.getTextContent()).items || [], p2.view[2]);
      const heading = rows1.map((row) => row.full).join(' ');
      // Reject a PDF of a DIFFERENT vessel before any field can be applied to
      // the Historian report. Compare whole slug tokens, not unsafe substrings
      // (SC GLORY 1 must never accidentally accept SC GLORY 11).
      const headerSlug = this.slug(rows1.slice(0, 6).map((row) => row.full).join(' '));
      const selectedSlug = this.slug(vessel);
      if (!selectedSlug || !(`-${headerSlug}-`).includes(`-${selectedSlug}-`)) return null;
      const month = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(period.slice(5, 7)) - 1];
      if (!heading.toUpperCase().includes('MONTHLY REPORT') ||
          !heading.includes(`${month}-${period.slice(2, 4)}`)) return null;
      const metrics: Record<string, Array<number | null>> = {};
      const numeric = String.raw`(?:NaN|[-+]?\d[\d,]*(?:\.\d+)?)`;
      const rx = new RegExp(String.raw`^(.*?\([^)]+\))\s+(${numeric}(?:\s+${numeric}){0,3})$`);
      for (const row of rows1) {
        for (const column of [row.left, row.right, row.full]) {
          const match = column.match(rx);
          if (!match) continue;
          const label = match[1].trim();
          const values = match[2].trim().split(/\s+/).map((token) => token === 'NaN' ? null : Number(token.replace(/,/g, '')));
          if (label && values.length && values.every((value) => value === null || Number.isFinite(value))) {
            // Separate L/R matches take precedence over whole-width duplicate lines.
            if (!(label in metrics)) metrics[label] = values;
          }
        }
      }
      if (!Number.isFinite(metrics['Total Fuel Used (L)']?.[0])) return null;
      const modeRows: MonthlyPdfReference['modeRows'] = [];
      const modeRx = new RegExp(String.raw`^(.+?)\s+(${numeric}(?:\s+${numeric}){6})$`);
      for (const row of rows2) {
        const match = row.full.match(modeRx);
        if (!match) continue;
        const values = match[2].split(/\s+/).map((n) => n === 'NaN' ? null : Number(n.replace(/,/g, '')));
        if (values.some((n) => n !== null && !Number.isFinite(n))) continue;
        const label = match[1].trim();
        if (!label || ['mode','total'].includes(label.toLowerCase())) continue;
        modeRows.push({ label, fuelUsed: values[0], fuelPercent: values[1], runningHours: values[2],
          runningPercent: values[3], distanceNm: values[4], litresPerNm: values[5], litresPerHour: values[6] });
      }
      if (!modeRows.length) return null;
      // Parse the *same live official PDF* for all months/vessels. Previously
      // this method returned only page 1/2, leaving the monthly chart as a
      // Historian approximation even after a successful "PDF verified" overlay.
      const chartSeries: MonthlyPdfChartValues = {};
      const modeDetails: NonNullable<MonthlyPdfReference['modeDetails']> = [];
      for (let pageNumber = 3; pageNumber <= document.numPages; pageNumber++) {
        const chartPage = await document.getPage(pageNumber);
        const pageItems = (await chartPage.getTextContent()).items || [];
        const cells = pageItems.map((item: any) => ({
          str: String(item?.str || '').trim(),
          x: Number(item?.transform?.[4]),
          y: Number(item?.transform?.[5]),
          width: Number(item?.width) || 0,
        })).filter((item: { x: number; y: number; str: string }) =>
          item.str && Number.isFinite(item.x) && Number.isFinite(item.y));
        mergeMonthlyChartSeries(chartSeries, parseMonthlyChartPage(cells));
        // Generator and machinery "Mode Summary" pages have independent
        // per-mode fuel/engine values. Never synthesize those from the main
        // Engine Summary or from a dominant Historian mode.
        const pageRows = this.pageRows(pageItems, chartPage.view[2]);
        const pageHeading = pageRows.map((row) => row.full).join(' ');
        const match = pageHeading.match(/Engine\s+["“]([^"”]+)["”]\s+Summary/i);
        if (match) {
          const detailMetrics: Record<string, Array<number | null>> = {};
          for (const row of pageRows) {
            for (const column of [row.left, row.right, row.full]) {
              const found = column.match(rx);
              if (!found || found[1] in detailMetrics) continue;
              const values = found[2].trim().split(/\s+/).map((token) =>
                token === 'NaN' ? null : Number(token.replace(/,/g, '')));
              if (values.length && values.every((value) => value === null || Number.isFinite(value))) {
                detailMetrics[found[1].trim()] = values;
              }
            }
          }
          if (Object.keys(detailMetrics).length) {
            modeDetails.push({ label: match[1].trim().replace(/\s+Mode$/i, ''), page: pageNumber, metrics: detailMetrics });
          }
        }
      }
      return { sourceFile: `Official Monthly PDF (${period})`, period, metrics, modeRows,
        modeDetails,
        chartSeries, chartAxis: Object.keys(chartSeries).length ? Array.from({ length: 31 }, (_, index) => index + 1) : undefined,
        chartPeriodDays: new Date(Number(period.slice(0, 4)), Number(period.slice(5, 7)), 0).getDate(),
        pages: document.numPages };
    } finally {
      await task.destroy().catch(() => undefined);
    }
  }

  private pageRows(items: readonly any[], width: number): Array<{ left: string; right: string; full: string }> {
    const lines: Array<{ y: number; parts: Array<{ x: number; str: string }> }> = [];
    for (const item of items) {
      const str = String(item?.str || '').trim();
      const x = Number(item?.transform?.[4]);
      const y = Number(item?.transform?.[5]);
      if (!str || !Number.isFinite(x) || !Number.isFinite(y)) continue;
      let line = lines.find((row) => Math.abs(row.y - y) < 2.2);
      if (!line) { line = { y, parts: [] }; lines.push(line); }
      line.parts.push({ x, str });
    }
    const joined = (parts: Array<{ x: number; str: string }>) => parts.map((p) => p.str).join(' ').replace(/\s+/g, ' ').trim();
    return lines.sort((a, b) => b.y - a.y).map((line) => {
      const parts = line.parts.sort((a, b) => a.x - b.x);
      return { left: joined(parts.filter((p) => p.x < width / 2)),
        right: joined(parts.filter((p) => p.x >= width / 2)), full: joined(parts) };
    });
  }

  private slug(vessel: string): string {
    const canonical = String(vessel || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (!canonical) return '';
    const normalized = canonical.replace(/^scena /, 'sc ').replace(/^bourbon liberty 233$/, 'bb liberty 233')
      .replace(/^sc cholruedee$/, 'sc choluedee');
    return normalized.replace(/\s+/g, '-');
  }

  private numeric(reference: MonthlyPdfReference, label: string, index = 0): number | null {
    const number = reference.metrics?.[label]?.[index];
    return typeof number === 'number' && Number.isFinite(number) ? number : null;
  }

  private overlay<T extends object>(original: T, ref: MonthlyPdfReference): MonthlyParityResult<T> {
    const raw: any = original;
    const get = (label: string, i = 0) => this.numeric(ref, label, i);
    const actual = (label: string) => Object.prototype.hasOwnProperty.call(ref?.metrics || {}, label);
    if (!ref?.metrics || !actual('Total Fuel Used (L)')) {
      return { report: original, verified: false, sourceFile: null, alignedFields: 0 };
    }
    let aligned = 0;
    const set = (obj: any, key: string, value: number | null) => {
      if (value !== null && obj && Object.prototype.hasOwnProperty.call(obj, key)) { obj[key] = value; aligned++; }
    };
    const referenceHasNull = (source: MonthlyPdfReference, label: string, index: number): boolean =>
      !!source.metrics?.[label] && index < source.metrics[label].length && source.metrics[label][index] === null;
    const equipment = (rows: any[], kind: 'engine' | 'shaft' | 'aux') =>
      (rows || []).map((originalRow: any) => {
        const row = { ...originalRow };
        const label = String(row.label || '');
        const rpmLabel = kind === 'shaft' ? `${label} Engine Speed (RPM)` : `${label} Engine Speed (RPM)`;
        // DG / EG report their generator load in place of RPM.
        const loadLabel = `${label} Engine Load (kW)`;
        const rpm = get(rpmLabel);
        const load = get(loadLabel);
        set(row, 'averageRpm', rpm ?? load);
        set(row, 'maximumRpm', get(rpmLabel, 1));
        if (referenceHasNull(ref, rpmLabel, 0)) { row.averageRpm = Number.NaN; aligned++; }
        if (referenceHasNull(ref, rpmLabel, 1)) { row.maximumRpm = Number.NaN; aligned++; }
        set(row, 'engineLoadKw', load);
        set(row, 'runningHours', get(`${label} Running Hour (Hour)`));
        set(row, 'fuelUsed', get(`${label} Total Fuel Used (L)`));
        return row;
      });
    const report: any = {
      ...raw,
      engineSummary: equipment(raw.engineSummary, 'engine'),
      shaftSummary: equipment(raw.shaftSummary, 'shaft'),
      auxSummary: equipment(raw.auxSummary, 'aux').map((row: any, index: number) => {
        const values = ref.metrics['DG/EG Engine Utilized (%)'];
        if (values && index < values.length) {
          row.utilizationPercent = values[index] === null ? Number.NaN : values[index];
          aligned++;
        }
        return row;
      }),
    };
    set(report, 'mainEngineFuelTotal', get('M/E Total Fuel Used (L)'));
    set(report, 'auxiliaryFuelTotal', get('A/E Total Fuel Used (L)'));
    // On DG-only and A/E-only vessel PDFs, the entire fuel sum is auxiliary.
    if (!actual('M/E Total Fuel Used (L)') && !actual('A/E Total Fuel Used (L)')) {
      const isAuxOnly = !report.engineSummary?.length;
      if (isAuxOnly) {
        set(report, 'mainEngineFuelTotal', 0);
        set(report, 'auxiliaryFuelTotal', get('Total Fuel Used (L)'));
      }
    }
    set(report, 'totalFuelUsed', get('Total Fuel Used (L)'));

    // PDF Mode page 2 has vessel-specific labels and row counts. Match labels,
    // never index positions, to prevent attributing fuel to the wrong mode.
    const normalize = (label: string) => String(label || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    // The monthly aggregator can omit per-mode objects entirely. Build the
    // page-2 catalog from the PDF, never from the number of original rows.
    // Preserve vessel profile keys by normalized label (including DP alias).
    report.modeSummary = ref.modeRows?.length
      ? completePdfMonthlyModeRows(ref.modeRows, raw.modeSummary || [])
      : (raw.modeSummary || []).map((row: any) => ({ ...row }));
    aligned += (ref.modeRows?.length || 0) * 7;
    const utilization = (raw.utilization || []).map((row: any) => ({ ...row }));
    for (const row of utilization) {
      const values = ref.metrics[row.label];
      if (!values) continue;
      const keys = values.length === 4 ? ['port', 'center', 'starboard', 'fourth']
        : values.length === 3 ? ['port', 'center', 'starboard'] : ['port', 'starboard'];
      keys.forEach((key, index) => set(row, key, values[index]));
    }
    report.utilization = utilization;

    // Mode-page values cannot be derived from the compact PDF page-2 mode row.
    // The mode page has independent per-engine aggregates (and even its total
    // sometimes differs from page 2). Preserve those *as printed*; never scale
    // them to make their sum look right.
    if (ref.modeDetails?.length &&
        !Object.prototype.hasOwnProperty.call(ref.metrics, 'M/E Total Fuel Used (L)') &&
        ['DG1', 'DG2', 'DG3', 'EG'].every((generator) =>
          Object.prototype.hasOwnProperty.call(ref.metrics, `${generator} Total Fuel Used (L)`))) {
      // Detect generator-only mode from the OFFICIAL PDF. The BAHTERA monthly
      // aggregator mistakenly synthesizes two 0-hour M/E rows, despite the
      // daily reports and the official monthly PDF having NO main engines.
      report.engineSummary = [];
      // BAHTERA INTAN's multi-day aggregator does not return `modeDetails`.
      // Using `raw.passageSummary` as a one-item substitute silently hid the
      // other 15 PDF pages. The PDF has 16 independent, complete mode pages.
      report.modeDetails = completePdfGeneratorModeDetails(ref.modeDetails, report.modeSummary);
      aligned += ref.modeDetails.reduce((count, page) =>
        count + Object.values(page.metrics).reduce((n, values) => n + values.length, 0), 0);
      // No need to overwrite passageSummary: all modes now use the per-mode card.
    } else if (ref.modeDetails?.length) {
      const originalDetails: any[] = raw.modeDetails?.length
        ? raw.modeDetails : [{key: 'passage', label: ref.modeDetails[0].label, summary: raw.passageSummary}];
      const byLabel = new Map(originalDetails.map((row: any) => [normalize(row.label), row]));
      report.modeDetails = ref.modeDetails.map((item, index) => {
        const originalRow = byLabel.get(normalize(item.label)) || originalDetails[index];
        if (!originalRow?.summary) return null;
        const src = item.metrics;
        const read = (label: string, i = 0): number | null | undefined => src[label]?.[i];
        const from = (label: string, old: any, i = 0): number => {
          if (!Object.prototype.hasOwnProperty.call(src, label)) return old;
          aligned++;
          const value = read(label, i);
          // Official PDF literally prints NaN for unavailable computed metrics.
          return value === null ? Number.NaN : value as number;
        };
        const clone = (row: any) => ({ ...row });
        const summary = originalRow.summary;
        const mainEngines = (summary.mainEngines || []).map((entry: any) => {
          const row = clone(entry); const key = row.label;
          row.averageRpm = from(`${key} Engine Speed (RPM)`, row.averageRpm);
          row.maximumRpm = from(`${key} Engine Speed (RPM)`, row.maximumRpm, 1);
          row.fuelUsed = from(`${key} Total Fuel Used (L)`, row.fuelUsed);
          row.engineLoad = from(`${key} Engine Load (%)`, row.engineLoad);
          return row;
        });
        const shafts = (summary.shafts || []).map((entry: any) => {
          const row = clone(entry); const key = row.label;
          row.averageRpm = from(`${key} Engine Speed (RPM)`, row.averageRpm);
          row.maximumRpm = from(`${key} Engine Speed (RPM)`, row.maximumRpm, 1);
          return row;
        });
        const auxFuel = (summary.auxFuel || []).map((entry: any, n: number) => {
          const row = clone(entry);
          const preferred = [row.label, row.label === 'DG4' ? 'EG' : 'DG4',
            row.label === 'EG' ? 'DG4' : 'EG',
            row.label?.replace('Stb.', 'Stb.'),
          ].filter(Boolean);
          const findKey = (suffix: string) => preferred.find((label: string) =>
            Object.prototype.hasOwnProperty.call(src, `${label} ${suffix}`));
          const fuelKey = findKey('Total Fuel Used (L)');
          const loadKey = findKey('Engine Load (kW)');
          const speedKey = findKey('Engine Speed (RPM)');
          if (fuelKey) row.fuelUsed = from(`${fuelKey} Total Fuel Used (L)`, row.fuelUsed);
          if (loadKey) row.engineLoadKw = from(`${loadKey} Engine Load (kW)`, row.engineLoadKw);
          if (speedKey) {
            row.averageRpm = from(`${speedKey} Engine Speed (RPM)`, row.averageRpm);
            row.maximumRpm = from(`${speedKey} Engine Speed (RPM)`, row.maximumRpm, 1);
          }
          // DG/EG utilization on mode pages is independent of the overall
          // monthly utilization printed on PDF page 1.
          const util = src['DG/EG Engine Utilized (%)'];
          if (util && n < util.length) { row.utilizationPercent = util[n]; aligned++; }
          return row;
        });
        for (const [index, entry] of mainEngines.entries()) {
          const utilization = src['M/E Engine Utilized (%)'];
          if (utilization && index < utilization.length) { entry.utilizationPercent = utilization[index]; aligned++; }
        }
        for (const [index, entry] of shafts.entries()) {
          const utilized = src['Shaft Utilized (%)'];
          const perMain = src['Shaft per M/E Engine Utilized (%)'];
          if (utilized && index < utilized.length) { entry.utilizationPercent = utilized[index]; aligned++; }
          if (perMain && index < perMain.length) { entry.perMainUtilizationPercent = perMain[index]; aligned++; }
        }
        const isGenerator = !!src['DG/EG Engine Utilized (%)'];
        const allFuelIsAuxiliary = !!src['Total Fuel Used (L)'] && !src['M/E Total Fuel Used (L)'];
        const modeSummary = {
          ...summary, mainEngines, shafts, auxFuel,
          mainEngineFuelTotal: from('M/E Total Fuel Used (L)', summary.mainEngineFuelTotal),
          auxiliaryFuelTotal: from(allFuelIsAuxiliary ? 'Total Fuel Used (L)' : 'A/E Total Fuel Used (L)', summary.auxiliaryFuelTotal),
          averageSpeed: from('Average Speed (Knots)', summary.averageSpeed),
          distanceNm: from('Travel Distance (NM)', summary.distanceNm),
        };
        return {...originalRow, label: item.label, summary: modeSummary, officialPage: item.page,
          officialMetrics: Object.keys(src)};
      }).filter(Boolean);
      // The simpler 1-mode vessel layout reads from passageSummary rather
      // than the all-mode component. It must receive that same official record.
      const selected = report.modeDetails.find((d: any) =>
        normalize(d.label) === normalize(raw.passageSummary?.label)) || report.modeDetails[0];
      if (selected?.summary && ref.modeDetails.length === 1) report.passageSummary = selected.summary;
    }

    // The PDF chart X-axis is DAY 1..31, not the 24 CLOCK HOURS of the
    // historian web aggregation. Feeding those 24 buckets into the monthly
    // chart was the main root cause of the reported 6,945 L @ 02:00 mismatch.
    const charts = ref.chartSeries || {};
    const series = (name: string): Array<number | null> | undefined => charts[name];
    const present = (name: string, index: number): number | null => {
      const value = series(name)?.[index];
      return typeof value === 'number' && Number.isFinite(value) ? value : null;
    };
    const first = (codes: string[], index: number): number | null => {
      for (const code of codes) {
        if (series(code)) return present(code, index);
      }
      return null;
    };
    if (ref.chartAxis?.length === 31 && Object.keys(charts).length > 0) {
      const calendarDays = ref.chartPeriodDays || new Date(Number(ref.period.slice(0, 4)), Number(ref.period.slice(5, 7)), 0).getDate();
      const rows = ref.chartAxis.map((day, index) => ({
        hour: day, active: day <= calendarDays,
        distanceNm: first(['V.D.'], index), speedKnots: first(['V.S.'], index),
        mainFuel: first(['ME..F.'], index),
        auxFuel: first(['DG..F.', 'AE..F.'], index),
        portMainFuel: first(['PM..F.'], index),
        centerMainFuel: first(['CM..F.'], index),
        starboardMainFuel: first(['SM..F.'], index),
        portAuxFuel: first(['DG1..F.', 'AE1..F.', 'PA..F.'], index),
        centerAuxFuel: first(['DG2..F.', 'AE2..F.', 'CA..F.'], index),
        starboardAuxFuel: first(['DG3..F.', 'AE3..F.', 'SA..F.'], index),
        fourthAuxFuel: first(['EG..F.', 'AE4..F.', 'DG4..F.'], index),
        portMainRunningHours: first(['PM..RH', 'PM..RH.'], index),
        centerMainRunningHours: first(['CM..RH'], index),
        starboardMainRunningHours: first(['SM..RH'], index),
        portAuxRunningHours: first(['DG1..RH', 'AE1..RH', 'PA..RH'], index),
        centerAuxRunningHours: first(['DG2..RH', 'AE2..RH', 'CA..RH'], index),
        starboardAuxRunningHours: first(['DG3..RH', 'AE3..RH', 'SA..RH'], index),
        fourthAuxRunningHours: first(['DG4..RH', 'AE4..RH', 'EG..RH'], index),
        portMainEngineLoad: first(['PM..EL'], index),
        centerMainEngineLoad: first(['CM..EL'], index),
        starboardMainEngineLoad: first(['SM..EL'], index),
        portAuxEngineLoad: first(['DG1..EL'], index),
        centerAuxEngineLoad: first(['DG2..EL'], index),
        starboardAuxEngineLoad: first(['DG3..EL'], index),
        fourthAuxEngineLoad: first(['DG4..EL'], index),
        portShaftRunningHours: first(['PS..RH'], index),
        centerShaftRunningHours: first(['CS..RH'], index),
        starboardShaftRunningHours: first(['SS..RH'], index),
        portShaftRpm: first(['PS..ES'], index),
        centerShaftRpm: first(['CS..ES'], index),
        starboardShaftRpm: first(['SS..ES'], index),
        totalFuel: officialDayFuel(charts, index),
      }));
      // chart day 31 is an explicit all-zero placeholder in 30-day PDFs.
      // Keep it exactly as printed in the PDF graph/table.
      report.hourly = rows;
      report.officialPdfChartCodes = Object.keys(charts);
      report.officialPdfChartDays = true;
      aligned += rows.length * Object.keys(charts).length;
      // Daily Trend is also rendered from the same official chart day cells;
      // using the 24-hour histogram here makes both displays disagree.
      const originalDays: any[] = raw.dailyTrend || [];
      report.dailyTrend = originalDays.map((old: any, index: number) => ({
        ...old,
        totalFuelUsed: officialDayFuel(charts, index) ?? old.totalFuelUsed,
        mainEngineFuelTotal: first(['ME..F.'], index) ?? (series('DG..F.') || series('AE..F.') ? 0 : old.mainEngineFuelTotal),
        auxiliaryFuelTotal: first(['DG..F.', 'AE..F.'], index) ?? old.auxiliaryFuelTotal,
        distanceNm: first(['V.D.'], index) ?? old.distanceNm,
      }));
    }
    if (ref.trackingReference?.distanceNm != null && report.tracking) {
      report.tracking = { ...report.tracking, distanceNm: ref.trackingReference.distanceNm };
      aligned++;
    }
    if (ref.trackingReference?.begin && ref.trackingReference?.end) {
      report.officialTracking = ref.trackingReference;
    }
    return { report: report as T, verified: true, sourceFile: ref.sourceFile, alignedFields: aligned };
  }
}
