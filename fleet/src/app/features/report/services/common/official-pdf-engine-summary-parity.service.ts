import { Injectable } from '@angular/core';
import { Observable, from, of, throwError } from 'rxjs';
import { catchError, shareReplay, switchMap, tap, timeout } from 'rxjs/operators';

import { setBoundedReportCache } from './report-cache.util';
import { OfficialPdfNetworkCoordinatorService } from './official-pdf-network-coordinator.service';
import { OfficialReportLibraryService } from '../../../../shared/services/official-report-library.service';

export interface OfficialPdfEngineFuelSummary {
  portMain: number;
  centerMain: number;
  starboardMain: number;
  portAux: number;
  starboardAux: number;
  mainEngineFuelTotal: number;
  auxiliaryFuelTotal: number;
  totalFuelUsed: number;
}

/**
 * Reads the page-1 Engine Summary fuel values from the official Daily PDF.
 *
 * SC GLORY 6 is a special legacy case: the PDF page-1 summary can contain the
 * correct whole-day fuel totals even when the minute/hourly fuel pages are 0.00.
 * The customer-facing PDF is therefore the final source of truth for completed
 * Daily summary fuel values.
 *
 * This service never hard-codes a date or a fuel number. It opens the official
 * PDF for the selected vessel/day and parses the values printed on page 1.
 */
@Injectable({ providedIn: 'root' })
export class OfficialPdfEngineSummaryParityService {
  private readonly cache = new Map<string, { value: Observable<OfficialPdfEngineFuelSummary | null>; expiresAt: number }>();
  private static readonly SUCCESS_TTL_MS = 6 * 60 * 60_000;
  private static readonly FAILURE_RETRY_MS = 90_000;
  private static readonly MAX_CACHED_DAYS = 48;
  private pdfJsConfigured = false;

  constructor(
    private readonly pdfRequests: OfficialPdfNetworkCoordinatorService,
    private readonly officialLibrary: OfficialReportLibraryService,
  ) {}

  getDailyFuelSummary(
    vesselName: string,
    day: Date,
  ): Observable<OfficialPdfEngineFuelSummary | null> {
    const dateKey = this.formatDate(day);
    const vessel = String(vesselName || '').trim();
    if (!vessel || !dateKey) return of(null);

    const key = `${vessel.toLowerCase()}|${dateKey}`;
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    if (cached) this.cache.delete(key);

    const timestamp = `${dateKey} 00:00:00`;

    const parseSource = (source$: Observable<Blob>, sourceName: string) =>
      source$.pipe(
        switchMap((blob) => from(this.parseDailyEnginePage(blob, vessel, dateKey))),
        switchMap((summary) =>
          summary
            ? of(summary)
            : throwError(() => new Error(`INVALID_ENGINE_SUMMARY_PDF_${sourceName}`)),
        ),
      );

    const gatewayPdf$ = parseSource(
      this.pdfRequests.getReport('gateway', 'd', timestamp, vessel).pipe(timeout(20_000)),
      'GATEWAY',
    );

    const directPdf$ = parseSource(
      this.pdfRequests.getReport('direct', 'd', timestamp, vessel).pipe(timeout(15_000)),
      'DIRECT',
    ).pipe(
      catchError((directError) => {
        console.warn('[Engine PDF parity] direct official PDF failed; trying gateway.', {
          vessel,
          date: dateKey,
          status: (directError as any)?.status,
          message: (directError as any)?.message || String(directError),
        });
        return gatewayPdf$;
      }),
    );

    const request$ = this.officialLibrary.findReport('d', dateKey, vessel).pipe(
      switchMap((entry) =>
        entry
          ? parseSource(
              this.officialLibrary.loadReport(entry).pipe(timeout(8_000)),
              'LOCAL_ARCHIVE',
            ).pipe(
              catchError((archiveError) => {
                console.warn('[Engine PDF parity] local official PDF failed; using report API.', {
                  vessel,
                  date: dateKey,
                  message: (archiveError as any)?.message || String(archiveError),
                });
                return directPdf$;
              }),
            )
          : directPdf$,
      ),
      catchError((error) => {
        console.warn('[Engine PDF parity] official page-1 fuel summary unavailable.', {
          vessel,
          date: dateKey,
          message: (error as any)?.message || String(error),
        });
        return of(null);
      }),
      tap((value) => {
        const entry = this.cache.get(key);
        if (entry?.value === request$) {
          entry.expiresAt = Date.now() + (value ? OfficialPdfEngineSummaryParityService.SUCCESS_TTL_MS : OfficialPdfEngineSummaryParityService.FAILURE_RETRY_MS);
        }
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    setBoundedReportCache(this.cache, key, {
      value: request$,
      expiresAt: Date.now() + OfficialPdfEngineSummaryParityService.FAILURE_RETRY_MS,
    }, OfficialPdfEngineSummaryParityService.MAX_CACHED_DAYS);
    return request$;
  }

  clear(): void {
    this.cache.clear();
  }

  private async parseDailyEnginePage(
    blob: Blob,
    vesselName: string,
    dateKey: string,
  ): Promise<OfficialPdfEngineFuelSummary | null> {
    if (!(blob instanceof Blob) || blob.size < 100) return null;

    const arrayBuffer = await blob.arrayBuffer();
    const header = new TextDecoder('ascii').decode(new Uint8Array(arrayBuffer.slice(0, 5)));
    if (header !== '%PDF-') return null;

    const pdfjs: any = await import('pdfjs-dist/legacy/build/pdf.mjs');
    if (!this.pdfJsConfigured && pdfjs?.GlobalWorkerOptions) {
      pdfjs.GlobalWorkerOptions.workerSrc = 'assets/pdfjs/pdf.worker.min.mjs';
      this.pdfJsConfigured = true;
    }

    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
    const document = await loadingTask.promise;
    try {
      if (!document || document.numPages < 1) return null;
      const page = await document.getPage(1);
      const textContent = await page.getTextContent();
      const text = this.buildPageText(textContent?.items || []);
      const summary = this.parseEngineFuelSummary(text);
      if (!summary) {
        throw new Error('ENGINE_FUEL_SUMMARY_NOT_FOUND');
      }

      console.info('[Engine PDF parity] official Daily PDF page-1 fuel summary applied.', {
        vessel: vesselName,
        date: dateKey,
        totalFuelUsed: summary.totalFuelUsed,
      });
      return summary;
    } finally {
      try {
        await loadingTask.destroy();
      } catch {
        // Parsed values are already detached; cleanup failure is non-fatal.
      }
    }
  }

  private buildPageText(items: readonly any[]): string {
    type PositionedPart = { x: number; y: number; text: string };
    const positioned: PositionedPart[] = [];
    const fallback: string[] = [];

    for (const item of items || []) {
      const text = String(item?.str ?? '').trim();
      if (!text) continue;
      fallback.push(text);

      const transform = item?.transform;
      const x = Array.isArray(transform) ? Number(transform[4]) : Number.NaN;
      const y = Array.isArray(transform) ? Number(transform[5]) : Number.NaN;
      if (Number.isFinite(x) && Number.isFinite(y)) positioned.push({ x, y, text });
    }

    if (positioned.length < Math.max(5, Math.floor(fallback.length * 0.5))) {
      return fallback.join(' ').replace(/\s+/g, ' ').trim();
    }

    const lines: Array<{ y: number; parts: Array<{ x: number; text: string }> }> = [];
    const yTolerance = 2;

    for (const part of positioned.sort((a, b) => b.y - a.y || a.x - b.x)) {
      let line = lines.find((candidate) => Math.abs(candidate.y - part.y) <= yTolerance);
      if (!line) {
        line = { y: part.y, parts: [] };
        lines.push(line);
      }
      line.parts.push({ x: part.x, text: part.text });
    }

    return lines
      .sort((a, b) => b.y - a.y)
      .map((line) =>
        line.parts
          .sort((a, b) => a.x - b.x)
          .map((part) => part.text)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim(),
      )
      .filter(Boolean)
      .join('\n');
  }

  private parseEngineFuelSummary(text: string): OfficialPdfEngineFuelSummary | null {
    const numberToken = '[-+]?\\d[\\d,]*(?:\\.\\d+)?';
    const read = (label: string): number | null => {
      const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const expression = new RegExp(`${escaped}\\s+(${numberToken})`, 'gi');
      let match: RegExpExecArray | null;
      let selected: RegExpExecArray | null = null;
      while ((match = expression.exec(text)) !== null) selected = match;
      return selected ? this.parsePdfNumber(selected[1]) : null;
    };

    const portMain = read('Port M/E Total Fuel Used (L)');
    const centerMain = read('Ctr. M/E Total Fuel Used (L)');
    const starboardMain = read('Stb. M/E Total Fuel Used (L)');
    const portAux = read('Port A/E Total Fuel Used (L)');
    const starboardAux = read('Stb. A/E Total Fuel Used (L)');

    // Summary labels are substrings of the per-engine labels, so parse them with
    // negative look-behind to reject "Port/Ctr./Stb. M/E" and "Port/Stb. A/E".
    const readSummary = (kind: 'M/E' | 'A/E'): number | null => {
      const expression = new RegExp(
        `(?<!Port )(?<!Ctr\\. )(?<!Stb\\. )${kind.replace('/', '\\/')} Total Fuel Used \\(L\\)\\s+(${numberToken})`,
        'gi',
      );
      let match: RegExpExecArray | null;
      let selected: RegExpExecArray | null = null;
      while ((match = expression.exec(text)) !== null) selected = match;
      return selected ? this.parsePdfNumber(selected[1]) : null;
    };

    const mainEngineFuelTotal = readSummary('M/E');
    const auxiliaryFuelTotal = readSummary('A/E');

    const totalExpression = new RegExp(
      `(?<!M\\/E )(?<!A\\/E )(?<!Port )(?<!Ctr\\. )(?<!Stb\\. )Total Fuel Used \\(L\\)\\s+(${numberToken})`,
      'gi',
    );
    let totalMatch: RegExpExecArray | null;
    let selectedTotal: RegExpExecArray | null = null;
    while ((totalMatch = totalExpression.exec(text)) !== null) selectedTotal = totalMatch;
    const totalFuelUsed = selectedTotal ? this.parsePdfNumber(selectedTotal[1]) : null;

    const values = [
      portMain,
      centerMain,
      starboardMain,
      portAux,
      starboardAux,
      mainEngineFuelTotal,
      auxiliaryFuelTotal,
      totalFuelUsed,
    ];
    if (values.some((value) => value === null || !Number.isFinite(value) || value < 0)) {
      return null;
    }

    const summary: OfficialPdfEngineFuelSummary = {
      portMain: portMain!,
      centerMain: centerMain!,
      starboardMain: starboardMain!,
      portAux: portAux!,
      starboardAux: starboardAux!,
      mainEngineFuelTotal: mainEngineFuelTotal!,
      auxiliaryFuelTotal: auxiliaryFuelTotal!,
      totalFuelUsed: totalFuelUsed!,
    };

    // Reject a false regex hit rather than putting a suspicious number on the UI.
    const epsilon = 0.11;
    const mainFromComponents = summary.portMain + summary.centerMain + summary.starboardMain;
    const auxFromComponents = summary.portAux + summary.starboardAux;
    if (
      Math.abs(mainFromComponents - summary.mainEngineFuelTotal) > epsilon ||
      Math.abs(auxFromComponents - summary.auxiliaryFuelTotal) > epsilon ||
      Math.abs(summary.mainEngineFuelTotal + summary.auxiliaryFuelTotal - summary.totalFuelUsed) > epsilon
    ) {
      return null;
    }

    return summary;
  }

  private parsePdfNumber(value: string): number {
    const parsed = Number(String(value || '').replace(/,/g, '').trim());
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }

  private formatDate(value: Date): string {
    if (!(value instanceof Date) || !Number.isFinite(value.getTime())) return '';
    const pad = (part: number): string => String(part).padStart(2, '0');
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
}
