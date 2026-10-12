import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';

import {
  Observable,
  Subscription,
  defer,
  concat,
  defaultIfEmpty,
  filter,
  firstValueFrom,
  from,
  of,
  take,
  throwError,
} from 'rxjs';
import { catchError, concatMap, finalize, map, mergeMap, tap, timeout, toArray } from 'rxjs/operators';

import { environment } from '../../../environments/environment';

import { SecurityService } from './security.service';
import { AuthService } from './auth.service';

const URL = environment.API_URL || '';
const URL2 = environment.API2_URL || environment.API_URL || '';

// REPORT_API_URL is optional. Some environment files may not define it yet.
type AppEnvironment = typeof environment & { REPORT_API_URL?: string };
const REPORT_URL =
  (environment as AppEnvironment).REPORT_API_URL || environment.API2_URL || environment.API_URL || '';

type HistorianStrategy = 'api2-chart' | 'api2-logger' | 'gateway-chart' | 'gateway-logger';

@Injectable({
  providedIn: 'root',
})
export class NewHttpClientService {
  private historianStrategy: HistorianStrategy | null = null;

  // The legacy PDF historian is optional from the browser.  Probe it once and
  // remember failures for a short cooldown so a dead/CORS-blocked 14.41 host
  // does not make every single-tag ZAMRUD request wait for a network timeout.
  private reportHistorianState: 'unknown' | 'available' | 'unavailable' = 'unknown';
  private reportHistorianRetryAfter = 0;
  private static readonly REPORT_HISTORIAN_PROBE_TIMEOUT_MS = 8000;
  private static readonly REPORT_HISTORIAN_REQUEST_TIMEOUT_MS = 15_000;
  private static readonly REPORT_HISTORIAN_COOLDOWN_MS = 2 * 60_000;
  // Two tag requests at a time is a deliberate safety ceiling. A completed Daily
  // report becomes noticeably faster than strict serial loading, while long range/
  // month views are limited to one day bundle at a time by the vessel services.
  private static readonly REPORT_TAG_CONCURRENCY = 2;
  // Concurrency applies to the entire SPA, not to each individual report/day.
  // Navigating between vessels while requests are in flight must not multiply
  // the number of simultaneous historian single-tag POSTs.
  private activeReportTagRequests = 0;
  private readonly waitingReportTagRequests: Array<() => void> = [];

  public newVessel: string[] = ['SC_DUMMY', 'A02'];

  constructor(
    private http: HttpClient,
    private router: Router,
    private securityService: SecurityService,
    private authService: AuthService,
  ) {}

  getJsonFile(path: string): Observable<any> {
    return this.http.get(path).pipe(catchError((err) => this.handleError<any>(err)));
  }

  mergeUnique(arr1: any[], arr2: any[]): any[] {
    const firstArray = Array.isArray(arr1) ? arr1 : [];
    const secondArray = Array.isArray(arr2) ? arr2 : [];

    const result = [...firstArray];

    secondArray.forEach((item: any) => {
      const itemName = item?.name || item;

      const exists = result.some((current: any) => {
        const currentName = current?.name || current;
        return currentName === itemName;
      });

      if (!exists) {
        result.push(item);
      }
    });

    return result;
  }

  async getVesselInfo2(): Promise<any[]> {
    try {
      const result = await firstValueFrom(
        this.http
          .get<any>(`${URL2}/getvesselcurrentInfo`, {
            headers: this.getAuthHeaders(),
          })
          .pipe(
            map((res: any) => {
              const list = this.extractArray(res);

              if (list.length === 0) {
                return [];
              }

              const activeVessels = list.filter(
                (x: any) =>
                  x?.name &&
                  !this.securityService.isExcludedVessel(x.name) &&
                  !this.securityService.isExcludedVessel(x?.prefix || x?.id || ''),
              );

              const accessible = activeVessels
                .filter((x: any) => this.securityService.hasAccess(x.name))
                .sort(this.compare);

              // A legacy account with an explicit vessel allow-list must not
              // see the entire roster merely because none of its vessels match
              // the API response. Users not in the legacy list are governed by
              // the current backend/user-access configuration as before.
              const explicitLegacyList = this.securityService.getAccessibleVessels();
              return (explicitLegacyList.length > 0 ? accessible : activeVessels).sort(this.compare);
            }),
            catchError((err) => {
              this.handleLoginRedirect(err);
              return of([]);
            }),
          ),
      );

      return result;
    } catch {
      return [];
    }
  }

  compare(a: any, b: any): number {
    const nameA = String(a?.name || '').toUpperCase();
    const nameB = String(b?.name || '').toUpperCase();

    return nameA.localeCompare(nameB);
  }

  tryLogin(): boolean {
    return this.authService.isLoggedIn();
  }

  getAddress(lat: string, long: string, apiKey: string): Observable<any> {
    if (!lat || !long || !apiKey) {
      return of(null);
    }

    const url =
      `https://maps.googleapis.com/maps/api/geocode/json` +
      `?latlng=${encodeURIComponent(lat)},${encodeURIComponent(long)}` +
      `&key=${encodeURIComponent(apiKey)}`;

    return this.http.get(url).pipe(catchError((err) => this.handleError<any>(err)));
  }

  getPoints(prefix: string): Observable<any> {
    if (!prefix) {
      console.warn('GET POINTS: prefix is empty');
      return of([]);
    }

    const body = {
      prefix,
    };

    return this.http
      .post(`${URL2}/getpoints`, body, {
        headers: this.getAuthHeaders(),
      })
      .pipe(
        map((res: any) => res),
        catchError((err) => this.handleError<any>(err)),
      );
  }

  getHistorianValues(start: string, end: string, tags: any[]): Observable<any> {
    const tagNames = this.mapTagNames(tags);

    if (!start || !end || tagNames.length === 0) {
      return of([]);
    }

    const normalizedTags = tags.map((tag: any) => {
      const tagName =
        typeof tag === 'string'
          ? tag
          : tag?.tagName || tag?.TagName || tag?.name || tag?.Name || '';

      return typeof tag === 'string'
        ? { name: tagName, tagName }
        : { ...tag, name: tag?.name || tagName, tagName };
    });

    const directPayload = {
      StartTime: start,
      EndTime: end,
      Tags: tagNames,
    };

    const gatewayPayload = {
      StartTime: start,
      EndTime: end,
      HistorianTag: normalizedTags,
    };

    if (this.historianStrategy) {
      return this.requestHistorianByStrategy(this.historianStrategy, directPayload, gatewayPayload);
    }

    const attempts: Observable<any>[] = [
      this.requestHistorianByStrategy('api2-chart', directPayload, gatewayPayload),
      this.requestHistorianByStrategy('api2-logger', directPayload, gatewayPayload),
    ];

    if (URL && this.normalizeBaseUrl(URL) !== this.normalizeBaseUrl(URL2)) {
      attempts.push(
        this.requestHistorianByStrategy('gateway-chart', directPayload, gatewayPayload),
        this.requestHistorianByStrategy('gateway-logger', directPayload, gatewayPayload),
      );
    }

    return concat(...attempts).pipe(
      filter((result: any) => this.hasHistorianData(result)),
      take(1),
      defaultIfEmpty([]),
    );
  }

  /**
   * Logger-only historian path for legacy PDF parity.
   *
   * The original SCReportingService daily reports call loggergethistorianvalues
   * directly (one point/tag at a time). They do not use ChartGetHistorianValues.
   * Report adapters that must reproduce those PDFs should use this method so a
   * cached chart strategy from another screen cannot silently change sampling.
   */
  getLoggerHistorianValues(start: string, end: string, tags: any[]): Observable<any> {
    const tagNames = this.mapTagNames(tags);

    if (!start || !end || tagNames.length === 0) {
      return of([]);
    }

    const normalizedTags = tags.map((tag: any) => {
      const tagName =
        typeof tag === 'string'
          ? tag
          : tag?.tagName || tag?.TagName || tag?.name || tag?.Name || '';

      return typeof tag === 'string'
        ? { name: tagName, tagName }
        : { ...tag, name: tag?.name || tagName, tagName };
    });

    const directPayload = {
      StartTime: start,
      EndTime: end,
      Tags: tagNames,
    };

    const gatewayPayload = {
      StartTime: start,
      EndTime: end,
      HistorianTag: normalizedTags,
    };

    const attempts: Observable<any>[] = [
      this.requestHistorianByStrategy('api2-logger', directPayload, gatewayPayload, false),
    ];

    if (URL && this.normalizeBaseUrl(URL) !== this.normalizeBaseUrl(URL2)) {
      attempts.push(
        this.requestHistorianByStrategy('gateway-logger', directPayload, gatewayPayload, false),
      );
    }

    return concat(...attempts).pipe(
      filter((result: any) => this.hasHistorianData(result)),
      take(1),
      defaultIfEmpty([]),
    );
  }


  /**
   * Fast historian availability probe used by heavy PDF-parity reports.
   *
   * Important: the legacy logger endpoint is most reliable with ONE tag per
   * request.  A multi-tag preflight can return an empty payload even when each
   * individual tag has valid history, which previously made ZAMRUD/LIBERTY
   * render as an all-zero report.  Probe candidate tags one-by-one and stop at
   * the first usable response.
   */
  probeLoggerHistorianValues(
    start: string,
    end: string,
    tags: any[],
    preferPdfHistorian = false,
    timeoutMs = 6500,
  ): Observable<boolean> {
    const tagNames = this.mapTagNames(tags);
    if (!start || !end || tagNames.length === 0) return of(false);

    const attempts = tagNames.map((tagName) => {
      const oneTag = [{ name: tagName, tagName }];
      const source$ = preferPdfHistorian
        ? this.getPdfParityLoggerHistorianValues(start, end, oneTag)
        : this.getLoggerHistorianValues(start, end, oneTag);
      return source$.pipe(
        map((response: any) => this.hasHistorianData(response)),
        catchError(() => of(false)),
      );
    });

    return concat(...attempts).pipe(
      filter((hasData: boolean) => hasData),
      take(1),
      map(() => true),
      defaultIfEmpty(false),
      // A single preferred-host probe can legitimately consume ~2.5 s before
      // falling back.  Give the candidate list enough aggregate time that a
      // later valid DG tag is not skipped merely because GPS/mode are empty.
      timeout(Math.max(1500, timeoutMs, Math.min(15000, tagNames.length * 2200))),
      catchError(() => of(false)),
    );
  }


  /**
   * Strict PDF historian request used by SC GLORY 1 completed Daily reports.
   *
   * This method does not fall back to API2. The caller decides whether to retry
   * the entire report through API2, preventing mixed-source reports.
   */
  getStrictPdfParityLoggerHistorianValues(
    start: string,
    end: string,
    tags: any[],
  ): Observable<any> {
    const tagNames = this.mapTagNames(tags);
    if (!start || !end || tagNames.length === 0) {
      return of([]);
    }

    const preferredBase = this.normalizeBaseUrl(REPORT_URL);
    if (!preferredBase || preferredBase === this.normalizeBaseUrl(URL2)) {
      return throwError(() => new Error('REPORT_HISTORIAN_NOT_CONFIGURED'));
    }

    const payload = {
      StartTime: start,
      EndTime: end,
      Tags: tagNames,
    };

    return this.http
      .post(
        `${String(REPORT_URL).replace(/\/+$/, '')}/loggergethistorianvalues`,
        payload,
        { headers: this.getAuthHeaders() },
      )
      .pipe(
        timeout(NewHttpClientService.REPORT_HISTORIAN_REQUEST_TIMEOUT_MS),
        map((response: any) => this.parseJsonResponse(response)),
      );
  }


  /**
   * Strict source-consistent PDF historian request.
   *
   * Loads every requested tag from REPORT_URL only with a strict two-request
   * concurrency ceiling, and never falls back to API2.  Callers such as SC WINTER use this to determine
   * whether the verified reporting historian is reachable before explicitly
   * restarting the complete request through the source-consistent fallback.
   */
  getStrictConsistentPdfParityHistorianValues(
    start: string,
    end: string,
    tags: any[],
  ): Observable<any[]> {
    const tagNames = this.mapTagNames(tags);
    if (!start || !end || tagNames.length === 0) return of([]);

    const preferredBase = this.normalizeBaseUrl(REPORT_URL);
    const api2Base = this.normalizeBaseUrl(URL2);
    if (!preferredBase || preferredBase === api2Base) {
      return throwError(() => new Error('REPORT_HISTORIAN_NOT_CONFIGURED'));
    }

    return this.loadConsistentLoggerSeries('report', start, end, tagNames).pipe(
      mergeMap((series) => {
        const recordCount = series.reduce((sum, item: any) => {
          const records = Array.isArray(item?.Records) ? item.Records : [];
          return sum + records.length;
        }, 0);

        if (recordCount <= 0) {
          return throwError(() => new Error('REPORT_HISTORIAN_EMPTY'));
        }

        this.reportHistorianState = 'available';
        this.reportHistorianRetryAfter = 0;
        return of(series);
      }),
      catchError((error: any) => {
        this.reportHistorianState = 'unavailable';
        this.reportHistorianRetryAfter =
          Date.now() + NewHttpClientService.REPORT_HISTORIAN_COOLDOWN_MS;
        return throwError(() => error);
      }),
    );
  }

  /**
   * Source-consistent historian bundle for legacy PDF-parity calculations.
   *
   * Every SCReportingService vessel class reads the legacy logger endpoint from
   * the reporting historian (14.41 in the office network), one tag per request.
   * The web app previously mixed Chart/API2/report-historian responses depending
   * on cached strategy or per-tag fallback. That can preserve total fuel while
   * moving minute fuel into a different Mode.
   *
   * Policy:
   *  1) Prefer REPORT_URL for the ENTIRE request.
   *  2) Request each tag independently with a hard concurrency ceiling of 2,
   *     then restore the original tag order before calculation.
   *  3) If the preferred host fails at any point, discard the partial bundle and
   *     restart ALL tags through API2 logger. Never mix sources in one report.
   *  4) Normalize single-tag DataLogger records to a common series shape and make
   *     timezone-less logger timestamps explicit UTC. In a +07 browser this is
   *     equivalent to the legacy C# record.TimeStamp.AddHours(7) alignment.
   */
  getConsistentPdfParityHistorianValues(
    start: string,
    end: string,
    tags: any[],
  ): Observable<any[]> {
    const tagNames = this.mapTagNames(tags);
    if (!start || !end || tagNames.length === 0) return of([]);

    const loadFrom = (source: 'report' | 'api2'): Observable<any[]> =>
      this.loadConsistentLoggerSeries(source, start, end, tagNames);

    const preferredBase = this.normalizeBaseUrl(REPORT_URL);
    const api2Base = this.normalizeBaseUrl(URL2);
    const canUseReport = !!preferredBase && preferredBase !== api2Base;

    if (!canUseReport) return loadFrom('api2');

    // Keep HOME/REMOTE use responsive: after one confirmed report-host failure,
    // skip the office-only source for a short cooldown instead of waiting again
    // on every vessel/date selection.
    if (
      this.reportHistorianState === 'unavailable' &&
      Date.now() < this.reportHistorianRetryAfter
    ) {
      return loadFrom('api2');
    }

    if (this.reportHistorianState === 'unavailable') {
      this.reportHistorianState = 'unknown';
    }

    return loadFrom('report').pipe(
      // Reject an HTTP-200 empty report source just like a network failure.
      // The catchError below is upstream of the API2 fallback: a failing API2
      // request must not trigger an expensive SECOND entire API2 bundle.
      mergeMap((series) => {
        const recordCount = series.reduce((sum, item: any) => {
          const records = Array.isArray(item?.Records) ? item.Records : [];
          return sum + records.length;
        }, 0);
        if (recordCount === 0) {
          return throwError(() => new Error('REPORT_HISTORIAN_EMPTY'));
        }
        this.reportHistorianState = 'available';
        this.reportHistorianRetryAfter = 0;
        return of(series);
      }),
      catchError((error: any) => {
        this.reportHistorianState = 'unavailable';
        this.reportHistorianRetryAfter =
          Date.now() + NewHttpClientService.REPORT_HISTORIAN_COOLDOWN_MS;
        console.warn(
          '[Historian][PDF parity] legacy source unavailable; retrying the WHOLE request through API2 once. ' +
            'Mode values may differ from the legacy PDF if historian stores disagree.',
          { status: error?.status, message: error?.message || error?.name },
        );
        return loadFrom('api2');
      }),
    );
  }

  /**
   * Loads independent historian tags with a hard concurrency ceiling and restores
   * the caller's original tag order before returning the normalized bundle.
   *
   * Completed historical data is immutable, so two independent tag reads can run
   * safely in parallel.  Keeping the ceiling at 2 prevents the browser from
   * flooding the historian while cutting the round-trip portion of Daily reports.
   */
  private loadConsistentLoggerSeries(
    source: 'report' | 'api2',
    start: string,
    end: string,
    tagNames: readonly string[],
  ): Observable<any[]> {
    const indexedTags = tagNames.map((tagName, index) => ({ tagName, index }));

    return from(indexedTags).pipe(
      mergeMap(
        ({ tagName, index }) =>
          this.queueReportTagRequest(() =>
            this.requestSingleLoggerFromSource(source, start, end, tagName),
          ).pipe(
            map((response) => ({
              index,
              series: this.normalizeSingleTagLoggerSeries(tagName, response),
            })),
          ),
        NewHttpClientService.REPORT_TAG_CONCURRENCY,
      ),
      toArray(),
      map((items) =>
        items
          .sort((a, b) => a.index - b.index)
          .map((item) => item.series),
      ),
    );
  }

  /**
   * Global two-request limiter for PDF-parity historian POSTs. A per-report
   * mergeMap(2) alone can send many simultaneous requests when multiple
   * reports are mounted or a user navigates rapidly. Queued work is removed
   * on unsubscribe; in-flight HTTP is cancelled and releases its slot.
   */
  private queueReportTagRequest(factory: () => Observable<any>): Observable<any> {
    return new Observable<any>((observer) => {
      let started = false;
      let cancelled = false;
      let requestSub: Subscription | null = null;
      const begin = (): void => {
        if (cancelled) return;
        started = true;
        this.activeReportTagRequests += 1;
        requestSub = defer(factory).pipe(
          finalize(() => {
            this.activeReportTagRequests -= 1;
            const next = this.waitingReportTagRequests.shift();
            next?.();
          }),
        ).subscribe(observer);
      };

      if (this.activeReportTagRequests < NewHttpClientService.REPORT_TAG_CONCURRENCY) {
        begin();
      } else {
        this.waitingReportTagRequests.push(begin);
      }

      return () => {
        cancelled = true;
        if (!started) {
          const index = this.waitingReportTagRequests.indexOf(begin);
          if (index !== -1) this.waitingReportTagRequests.splice(index, 1);
        }
        requestSub?.unsubscribe();
      };
    });
  }

  private requestSingleLoggerFromSource(
    source: 'report' | 'api2',
    start: string,
    end: string,
    tagName: string,
  ): Observable<any> {
    const base = source === 'report' ? REPORT_URL : URL2;
    if (!base) return throwError(() => new Error(`${source.toUpperCase()}_HISTORIAN_NOT_CONFIGURED`));

    const body = {
      StartTime: start,
      EndTime: end,
      Tags: [tagName],
    };

    const requestTimeout =
      source === 'report' && this.reportHistorianState !== 'available'
        ? NewHttpClientService.REPORT_HISTORIAN_PROBE_TIMEOUT_MS
        : NewHttpClientService.REPORT_HISTORIAN_REQUEST_TIMEOUT_MS;

    return this.http
      .post(`${String(base).replace(/\/+$/, '')}/loggergethistorianvalues`, body, {
        headers: this.getAuthHeaders(),
      })
      .pipe(
        timeout(requestTimeout),
        map((response: any) => this.parseJsonResponse(response)),
      );
  }

  private normalizeSingleTagLoggerSeries(tagName: string, response: any): any {
    const source = this.parseJsonResponse(response);
    const records = this.findLoggerRecords(source);

    return {
      TagName: tagName,
      Records: records
        .map((record: any) => {
          const timestamp = this.getLoggerRecordTimestamp(record);
          const value = this.getLoggerRecordSingleValue(record);
          if (timestamp === null || timestamp === undefined || value === null || value === undefined) {
            return null;
          }
          return {
            TimeStamp: this.normalizeLegacyLoggerTimestamp(timestamp),
            Value: value,
          };
        })
        .filter((record: any) => record !== null),
    };
  }

  private findLoggerRecords(source: any, depth = 0): any[] {
    if (source === null || source === undefined || depth > 7) return [];

    if (Array.isArray(source)) {
      if (source.length === 0) return [];
      const first = source[0];
      if (this.getLoggerRecordTimestamp(first) !== null) return source;
      for (const item of source) {
        const nested = this.findLoggerRecords(item, depth + 1);
        if (nested.length > 0) return nested;
      }
      return [];
    }

    if (typeof source !== 'object') return [];

    for (const key of [
      'Records', 'records', 'Data', 'data', 'Result', 'result', 'Results', 'results',
      'Items', 'items', 'HistorianValues', 'historianValues', 'History', 'history',
      'Payload', 'payload',
    ]) {
      if ((source as any)[key] !== undefined) {
        const nested = this.findLoggerRecords((source as any)[key], depth + 1);
        if (nested.length > 0 || Array.isArray((source as any)[key])) return nested;
      }
    }

    return [];
  }

  private getLoggerRecordTimestamp(record: any): any {
    if (!record || typeof record !== 'object') return null;
    return (
      record.TimeStamp ?? record.timestamp ?? record.Timestamp ?? record.DateTime ??
      record.dateTime ?? record.time ?? record.Time ?? null
    );
  }

  private getLoggerRecordSingleValue(record: any): any {
    if (!record || typeof record !== 'object') return record;
    const direct =
      record.Value ?? record.value ?? record.Val ?? record.val ??
      record.NumericValue ?? record.numericValue ?? record.IValue ?? record.iValue;
    if (direct !== undefined && direct !== null) return direct;

    const values = record.Values ?? record.values;
    if (Array.isArray(values) && values.length > 0) {
      const first = values[0];
      if (first && typeof first === 'object') {
        return (
          first.Value ?? first.value ?? first.Val ?? first.val ??
          first.NumericValue ?? first.numericValue ?? first.IValue ?? first.iValue ?? null
        );
      }
      return first;
    }
    return null;
  }

  private normalizeLegacyLoggerTimestamp(value: any): any {
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? value : value.toISOString();
    }
    if (typeof value !== 'string') return value;

    const text = value.trim();
    if (!text || /\/Date\(/.test(text) || /[zZ]$|[+-]\d{2}:?\d{2}$/.test(text)) {
      return value;
    }

    const naive = /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,7}))?)?$/.exec(text);
    if (!naive) return value;

    const fraction = naive[7] ? `.${naive[7]}` : '';
    return `${naive[1]}-${naive[2]}-${naive[3]}T${naive[4]}:${naive[5]}:${naive[6] || '00'}${fraction}Z`;
  }

  /**
   * Historian path for legacy PDF-parity reports.
   *
   * SCReportingService generates the BAHTERA/BOURBON PDFs from the reporting
   * historian host (14.41 in the on-vessel/development network), while the web
   * application's normal API2 host is 14.11.  Those stores can disagree for raw
   * totalizer/load tags even when GPS looks identical.  Prefer the same report
   * historian used by SCReportingService, but fail closed to the normal API path
   * if the preferred host is unavailable/CORS-blocked or does not accept the
   * current user token.  No service credentials are embedded in the browser.
   */
  getPdfParityLoggerHistorianValues(start: string, end: string, tags: any[]): Observable<any> {
    const tagNames = this.mapTagNames(tags);
    if (!start || !end || tagNames.length === 0) {
      return of([]);
    }

    const fallback$ = this.getLoggerHistorianValues(start, end, tags);
    const preferredBase = this.normalizeBaseUrl(REPORT_URL);
    if (!preferredBase || preferredBase === this.normalizeBaseUrl(URL2)) {
      return fallback$;
    }

    // Circuit breaker: when the reporting historian is unreachable/CORS blocked,
    // do not retry it for every one of the 17 sequential ZAMRUD tags.  The old
    // behaviour could turn one failed host into minutes of spinner time.
    if (this.reportHistorianState === 'unavailable') {
      if (Date.now() < this.reportHistorianRetryAfter) {
        return fallback$;
      }
      this.reportHistorianState = 'unknown';
    }

    const payload = {
      StartTime: start,
      EndTime: end,
      Tags: tagNames,
    };

    const requestTimeout =
      this.reportHistorianState === 'available'
        ? NewHttpClientService.REPORT_HISTORIAN_REQUEST_TIMEOUT_MS
        : NewHttpClientService.REPORT_HISTORIAN_PROBE_TIMEOUT_MS;

    const preferred$ = this.http
      .post(`${String(REPORT_URL).replace(/\/+$/, '')}/loggergethistorianvalues`, payload, {
        headers: this.getAuthHeaders(),
      })
      .pipe(
        timeout(requestTimeout),
        map((response: any) => this.parseJsonResponse(response)),
        tap((response: any) => {
          if (this.hasHistorianData(response)) {
            this.reportHistorianState = 'available';
            this.reportHistorianRetryAfter = 0;
          }
        }),
        catchError((error: any) => {
          // Do not redirect/logout here: this is an optional parity source and the
          // authenticated web API remains the supported fallback.  Remember the
          // failure so the rest of this report goes straight to API2.
          this.reportHistorianState = 'unavailable';
          this.reportHistorianRetryAfter =
            Date.now() + NewHttpClientService.REPORT_HISTORIAN_COOLDOWN_MS;
          console.warn('[Historian] PDF-parity report source unavailable; falling back to API2', {
            status: error?.status,
            message: error?.message || error?.name,
            retryAfter: new Date(this.reportHistorianRetryAfter).toISOString(),
          });
          return of(null);
        }),
      );

    return concat(preferred$, fallback$).pipe(
      filter((result: any) => this.hasHistorianData(result)),
      take(1),
      defaultIfEmpty([]),
    );
  }

  private requestHistorianByStrategy(
    strategy: HistorianStrategy,
    directPayload: any,
    gatewayPayload: any,
    rememberStrategy = true,
  ): Observable<any> {
    let url = '';
    let payload: any = directPayload;

    switch (strategy) {
      case 'api2-chart':
        url = `${URL2}/ChartGetHistorianValues`;
        break;
      case 'api2-logger':
        url = `${URL2}/loggergethistorianvalues`;
        break;
      case 'gateway-chart':
        url = `${URL}/api/vessels/ChartGetHistorianValues`;
        payload = gatewayPayload;
        break;
      case 'gateway-logger':
        url = `${URL}/api/vessels/loggergethistorianvalues`;
        payload = gatewayPayload;
        break;
    }

    return this.http.post(url, payload, { headers: this.getAuthHeaders() }).pipe(
      map((response: any) => {
        const parsed = this.parseJsonResponse(response);

        if (this.hasHistorianData(parsed)) {
          if (rememberStrategy) {
            this.historianStrategy = strategy;
            console.info(`[Historian] Active API strategy: ${strategy}`);
          }
        } else {
          console.warn(`[Historian] Empty response from ${strategy}`, parsed);
        }

        return parsed;
      }),
      catchError((error: any) => {
        if (error?.status === 401) {
          this.handleLoginRedirect(error);
          return throwError(() => error);
        }

        console.warn(`[Historian] ${strategy} request failed`, {
          url,
          status: error?.status,
          message: error?.message,
          error: error?.error,
        });

        return of(null);
      }),
    );
  }

  private parseJsonResponse(response: any): any {
    if (typeof response !== 'string') {
      return response;
    }

    const text = response.trim();
    if (!text) {
      return [];
    }

    try {
      return JSON.parse(text);
    } catch {
      return response;
    }
  }

  private hasHistorianData(value: any, depth = 0): boolean {
    if (value === null || value === undefined || depth > 8) {
      return false;
    }

    if (typeof value === 'string') {
      const parsed = this.parseJsonResponse(value);
      return parsed !== value && this.hasHistorianData(parsed, depth + 1);
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return false;
      }

      return value.some((item: any) => this.hasHistorianData(item, depth + 1));
    }

    if (typeof value !== 'object') {
      return false;
    }

    const hasTime = [
      'TimeStamp',
      'Timestamp',
      'timeStamp',
      'timestamp',
      'Time',
      'time',
      'DateTime',
      'datetime',
      'Date',
      'date',
      'x',
    ].some((key: string) => value[key] !== undefined && value[key] !== null && value[key] !== '');

    const hasValue = [
      'Value',
      'value',
      'Data',
      'data',
      'Val',
      'val',
      'NumericValue',
      'numericValue',
      'y',
    ].some((key: string) => value[key] !== undefined && value[key] !== null && value[key] !== '');

    // SCReportingService loggergethistorianvalues returns rows in the legacy
    // DataRecord shape: { TimeStamp: ..., Values: [...] }.  The previous
    // detector only recognised scalar Value/Data fields, so a perfectly valid
    // logger response was filtered out and report adapters received [].  That
    // made PDF-parity reports (BAHTERA ZAMRUD and BB LIBERTY 233) render as all 0.00 even
    // though historian data was present.
    const hasValuesArray = ['Values', 'values'].some((key: string) => {
      const values = value[key];
      return (
        Array.isArray(values) &&
        values.some((item: any) => item !== undefined && item !== null && item !== '')
      );
    });

    if (hasTime && (hasValue || hasValuesArray)) {
      return true;
    }

    const preferredKeys = [
      'records',
      'Records',
      'values',
      'Values',
      'Value',
      'data',
      'Data',
      'result',
      'Result',
      'results',
      'Results',
      'items',
      'Items',
      'HistorianValues',
      'historianValues',
      'History',
      'history',
      'ValueList',
      'valueList',
      'Points',
      'points',
    ];

    for (const key of preferredKeys) {
      if (value[key] !== undefined && this.hasHistorianData(value[key], depth + 1)) {
        return true;
      }
    }

    return Object.keys(value).some(
      (key: string) => !preferredKeys.includes(key) && this.hasHistorianData(value[key], depth + 1),
    );
  }

  private normalizeBaseUrl(value: string): string {
    return String(value || '')
      .replace(/\/+$/, '')
      .toLowerCase();
  }

  getRawData(start: string, end: string, tags: any[]): Observable<any> {
    const tagNames = this.mapTagNames(tags);

    if (!start || !end || tagNames.length === 0) {
      console.warn('GET RAW DATA: missing start/end/tags', {
        start,
        end,
        tags,
        tagNames,
      });

      return of([]);
    }

    const body = {
      StartTime: start,
      EndTime: end,
      Tags: tagNames,
    };

    return this.http
      .post(`${URL2}/loggergethistorianvalues`, body, {
        headers: this.getAuthHeaders(),
      })
      .pipe(
        map((res: any) => res),
        catchError((err) => this.handleError<any>(err)),
      );
  }

  getChartRawData(start: string, end: string, tags: any[]): Observable<any> {
    const tagNames = this.mapTagNames(tags);

    if (!start || !end || tagNames.length === 0) {
      return of([]);
    }

    const body = {
      StartTime: start,
      EndTime: end,
      Tags: tagNames,
    };

    return this.http
      .post(`${URL2}/ChartGetHistorianValues`, body, {
        headers: this.getAuthHeaders(),
      })
      .pipe(
        map((res: any) => res),
        catchError((err) => this.handleError<any>(err)),
      );
  }

  getReport(reportType: string, timestamp: string, fvName: string): Observable<Blob> {
    if (!reportType || !timestamp || !fvName) {
      return of(new Blob([], { type: 'application/pdf' }));
    }

    const body = {
      reportType,
      timestamp,
      fvName,
    };

    return this.http
      .post(`${URL2}/getreport`, body, {
        responseType: 'arraybuffer',
        headers: this.getAuthHeaders(),
      })
      .pipe(
        map((res: ArrayBuffer) => {
          return new Blob([res], { type: 'application/pdf' });
        }),
        catchError((err) => this.handleError<Blob>(err)),
      );
  }

  getCurrentValues(tagNames: any[], name?: string): Observable<any> {
    const names = this.mapTagNames(tagNames);

    if (names.length === 0) {
      return of([]);
    }

    const request = {
      Name: names,
      VesselName: name || '',
      _cacheBust: Date.now(),
    };

    const headers = this.getAuthHeaders()
      .set('Cache-Control', 'no-cache')
      .set('Pragma', 'no-cache')
      .set('Expires', '0');

    return this.http
      .post(`${URL2}/getcurrentvalues`, request, {
        headers,
      })
      .pipe(
        map((res: any) => res),
        catchError((err) => this.handleError<any>(err)),
      );
  }

  getOverviewCurrentsValues(tagNames: any): Observable<any> {
    if (!tagNames) {
      return of([]);
    }

    if (Array.isArray(tagNames) && tagNames.length === 0) {
      return of([]);
    }

    return this.http
      .post(`${URL2}/getcurrentvalues`, tagNames, {
        headers: this.getAuthHeaders(),
      })
      .pipe(
        map((res: any) => res),
        catchError((err) => this.handleError<any>(err)),
      );
  }

  private extractArray(response: any): any[] {
    if (Array.isArray(response)) {
      return response;
    }

    const candidates = [
      response?.data,
      response?.Data,
      response?.result,
      response?.Result,
      response?.results,
      response?.Results,
      response?.vessels,
      response?.Vessels,
      response?.items,
      response?.Items,
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate;
      }
    }

    return [];
  }

  private mapTagNames(tags: any[]): string[] {
    if (!Array.isArray(tags)) {
      return [];
    }

    return tags
      .map((tag: any) => {
        if (!tag) {
          return '';
        }

        if (typeof tag === 'string') {
          return tag;
        }

        return tag.tagName || tag.TagName || tag.name || tag.Name || '';
      })
      .filter((tagName: string) => tagName.length > 0);
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();

    return new HttpHeaders({
      Authorization: token,
    });
  }

  private handleError<T>(err: any): Observable<T> {
    this.handleLoginRedirect(err);
    return throwError(() => err);
  }

  private handleLoginRedirect(err: any): void {
    if (err?.status === 401) {
      this.authService.logout();
      this.router.navigate(['/login']);
    }
  }
}
