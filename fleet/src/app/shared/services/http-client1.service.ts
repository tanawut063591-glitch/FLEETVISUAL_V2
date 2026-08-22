import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';

import {
  Observable,
  concat,
  defaultIfEmpty,
  filter,
  firstValueFrom,
  of,
  take,
  throwError,
} from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';

import { SecurityService } from './security.service';
import { AuthService } from './auth.service';

const URL = environment.API_URL || '';
const URL2 = environment.API2_URL || environment.API_URL || '';

type HistorianStrategy = 'api2-chart' | 'api2-logger' | 'gateway-chart' | 'gateway-logger';

@Injectable({
  providedIn: 'root',
})
export class NewHttpClientService {
  private historianStrategy: HistorianStrategy | null = null;

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

              return (accessible.length > 0 ? accessible : activeVessels).sort(this.compare);
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

  private requestHistorianByStrategy(
    strategy: HistorianStrategy,
    directPayload: any,
    gatewayPayload: any,
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
          this.historianStrategy = strategy;
          console.info(`[Historian] Active API strategy: ${strategy}`);
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

    if (hasTime && hasValue) {
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
