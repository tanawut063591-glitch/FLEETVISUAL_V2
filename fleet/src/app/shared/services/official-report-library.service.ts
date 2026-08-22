import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';

export type OfficialArchiveReportType = 'd' | 'm';

export interface OfficialReportArchiveEntry {
  id: string;
  vesselName: string;
  vesselAliases: string[];
  reportType: OfficialArchiveReportType;
  period: string;
  title: string;
  fileName: string;
  fileUrl: string;
  pageCount: number | null;
  generatedAt: string | null;
  source: string;
}

interface OfficialReportArchiveManifest {
  version: number;
  reports: OfficialReportArchiveEntry[];
}

@Injectable({ providedIn: 'root' })
export class OfficialReportLibraryService {
  private readonly manifestUrl = 'official-reports/manifest.json';
  private readonly reports$: Observable<OfficialReportArchiveEntry[]>;

  constructor(private readonly http: HttpClient) {
    this.reports$ = this.http.get<OfficialReportArchiveManifest>(this.manifestUrl).pipe(
      map((manifest) => (Array.isArray(manifest?.reports) ? manifest.reports : [])),
      map((reports) => reports.filter((entry) => this.isValidEntry(entry))),
      catchError((error) => {
        console.warn('[OfficialReportLibraryService] Local archive manifest unavailable.', error);
        return of([]);
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
  }

  findReport(
    reportType: OfficialArchiveReportType,
    period: string,
    vesselName: string,
  ): Observable<OfficialReportArchiveEntry | null> {
    const normalizedPeriod = String(period || '').trim();
    const normalizedVessel = this.normalize(vesselName);

    return this.reports$.pipe(
      map(
        (reports) =>
          reports.find((entry) => {
            if (entry.reportType !== reportType || entry.period !== normalizedPeriod) {
              return false;
            }

            return this.matchesVessel(entry, normalizedVessel);
          }) || null,
      ),
    );
  }

  listReports(
    vesselName: string,
    reportType?: OfficialArchiveReportType,
  ): Observable<OfficialReportArchiveEntry[]> {
    const normalizedVessel = this.normalize(vesselName);

    if (!normalizedVessel) {
      return of([]);
    }

    return this.reports$.pipe(
      map((reports) =>
        reports
          .filter(
            (entry) =>
              (!reportType || entry.reportType === reportType) &&
              this.matchesVessel(entry, normalizedVessel),
          )
          .sort((left, right) => right.period.localeCompare(left.period)),
      ),
    );
  }

  loadReport(entry: OfficialReportArchiveEntry): Observable<Blob> {
    return this.http.get(entry.fileUrl, { responseType: 'blob' });
  }

  private matchesVessel(entry: OfficialReportArchiveEntry, normalizedVessel: string): boolean {
    const aliases = [entry.vesselName, ...(entry.vesselAliases || [])];
    return aliases.some((alias) => this.normalize(alias) === normalizedVessel);
  }

  private isValidEntry(entry: OfficialReportArchiveEntry): boolean {
    if (!entry || (entry.reportType !== 'd' && entry.reportType !== 'm')) {
      return false;
    }

    const period = String(entry.period || '');
    const periodIsValid =
      entry.reportType === 'd'
        ? /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/.test(period)
        : /^\d{4}-(?:0[1-9]|1[0-2])$/.test(period);

    const fileName = String(entry.fileName || '').trim();
    const fileUrl = String(entry.fileUrl || '').trim();
    const normalizedUrl = fileUrl.replace(/\\/g, '/');
    const localArchiveUrlIsSafe =
      normalizedUrl.startsWith('official-reports/') &&
      !normalizedUrl.includes('..') &&
      !normalizedUrl.includes('://') &&
      !normalizedUrl.startsWith('//') &&
      normalizedUrl.toLowerCase().endsWith('.pdf');

    return !!(
      String(entry.id || '').trim() &&
      String(entry.vesselName || '').trim() &&
      periodIsValid &&
      fileName.toLowerCase().endsWith('.pdf') &&
      localArchiveUrlIsSafe
    );
  }

  private normalize(value: unknown): string {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }
}
