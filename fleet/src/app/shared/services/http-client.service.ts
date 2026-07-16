import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';

import { Observable, from, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { environment } from '../../../environments/environment';

import { SecurityService } from './security.service';
import { AuthService } from './auth.service';

const URL = environment.API_URL || '';

@Injectable({
  providedIn: 'root',
})
export class HttpClientService {
  constructor(
    private http: HttpClient,
    private router: Router,
    private securityService: SecurityService,
    private authService: AuthService,
  ) {}

  // โหลดไฟล์ JSON เช่น dashboard.tag.json / overview.tag.json
  getJsonFile(path: string): Observable<any> {
    return this.http.get(path).pipe(catchError((err) => this.handleError<any>(err)));
  }

  // ดึงข้อมูลเรือทั้งหมด
  getVesselInfo(isRetry = false): Observable<any[]> {
    return this.http
      .post<any[]>(`${URL}/api/vessels/getvesselcurrentInfo`, null, {
        headers: this.getAuthHeaders().set('Cache-Control', 'no-cache').set('Pragma', 'no-cache'),
      })
      .pipe(
        map((res: any[]) => {
          if (!Array.isArray(res)) {
            return [];
          }

          return res
            .filter((x: any) => x?.name && this.securityService.hasAccess(x.name))
            .sort(this.compare);
        }),
        catchError((err) =>
          this.handleAuthError<any[]>(err, () => this.getVesselInfo(true), isRetry),
        ),
      );
  }

  // เรียงชื่อเรือ A-Z
  compare(a: any, b: any): number {
    const nameA = String(a?.name || '').toUpperCase();
    const nameB = String(b?.name || '').toUpperCase();

    return nameA.localeCompare(nameB);
  }

  // แปลงพิกัด lat/long เป็นที่อยู่ด้วย Google API
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

  // ดึงจุดพิกัด / เส้นทางของเรือ
  getPoints(prefix: string, isRetry = false): Observable<any> {
    if (!prefix) {
      return of([]);
    }

    return this.http
      .post(
        `${URL}/api/vessels/getpoints`,
        { prefix },
        {
          headers: this.getAuthHeaders(),
        },
      )
      .pipe(
        map((res: any) => res),
        catchError((err) =>
          this.handleAuthError<any>(err, () => this.getPoints(prefix, true), isRetry),
        ),
      );
  }

  // ขอ key สำหรับโหลดไฟล์ logger
  getLoggerKey(start: string, end: string, tags: string[], isRetry = false): Observable<any> {
    if (!start || !end || !Array.isArray(tags) || tags.length === 0) {
      return of(null);
    }

    const body = {
      StartTime: start,
      EndTime: end,
      TagNames: tags,
    };

    return this.http
      .post(`${URL}/api/vessels/GetLogggerKey`, body, {
        headers: this.getAuthHeaders(),
      })
      .pipe(
        map((res: any) => res),
        catchError((err) =>
          this.handleAuthError<any>(err, () => this.getLoggerKey(start, end, tags, true), isRetry),
        ),
      );
  }

  // เปิดไฟล์ logger
  loadFile(key: string, name: string): void {
    if (!key || !name) {
      return;
    }

    const safeKey = encodeURIComponent(key);
    const safeName = encodeURIComponent(name);

    window.open(`${URL}/api/vessels/GetLoggerFile/${safeKey}/${safeName}`, '_self');
  }

  // ดึงข้อมูลย้อนหลังแบบ raw data
  getRawData(start: string, end: string, tags: any[], isRetry = false): Observable<any> {
    if (!start || !end || !Array.isArray(tags) || tags.length === 0) {
      return of([]);
    }

    const body = {
      StartTime: start,
      EndTime: end,
      HistorianTag: tags,
    };

    return this.http
      .post(`${URL}/api/vessels/loggergethistorianvalues`, body, {
        headers: this.getAuthHeaders(),
      })
      .pipe(
        map((res: any) => res),
        catchError((err) =>
          this.handleAuthError<any>(err, () => this.getRawData(start, end, tags, true), isRetry),
        ),
      );
  }

  // ดึงข้อมูลย้อนหลังสำหรับกราฟ
  getChartRawData(start: string, end: string, tags: any[], isRetry = false): Observable<any> {
    if (!start || !end || !Array.isArray(tags) || tags.length === 0) {
      return of([]);
    }

    const body = {
      StartTime: start,
      EndTime: end,
      HistorianTag: tags,
    };

    return this.http
      .post(`${URL}/api/vessels/ChartGetHistorianValues`, body, {
        headers: this.getAuthHeaders(),
      })
      .pipe(
        map((res: any) => res),
        catchError((err) =>
          this.handleAuthError<any>(
            err,
            () => this.getChartRawData(start, end, tags, true),
            isRetry,
          ),
        ),
      );
  }

  // ดึงรายงาน PDF
  getReport(
    reportType: string,
    timestamp: string,
    fvName: string,
    isRetry = false,
  ): Observable<Blob> {
    if (!reportType || !timestamp || !fvName) {
      return of(new Blob([], { type: 'application/pdf' }));
    }

    const body = {
      reportType,
      timestamp,
      fvName,
    };

    return this.http
      .post(`${URL}/api/vessels/GetReport`, body, {
        responseType: 'arraybuffer',
        headers: this.getAuthHeaders(),
      })
      .pipe(
        map((res: ArrayBuffer) => {
          return new Blob([res], { type: 'application/pdf' });
        }),
        catchError((err) =>
          this.handleAuthError<Blob>(
            err,
            () => this.getReport(reportType, timestamp, fvName, true),
            isRetry,
          ),
        ),
      );
  }

  // ดึงค่าปัจจุบันของ Realtime tags
  getCurrentValues(tagNames: any[], isRetry = false): Observable<any> {
    if (!Array.isArray(tagNames) || tagNames.length === 0) {
      return of([]);
    }

    return this.http
      .post(`${URL}/api/vessels/getcurrentvalues`, tagNames, {
        headers: this.getAuthHeaders().set('Cache-Control', 'no-cache').set('Pragma', 'no-cache'),
      })
      .pipe(
        map((res: any) => res),
        catchError((err) =>
          this.handleAuthError<any>(err, () => this.getCurrentValues(tagNames, true), isRetry),
        ),
      );
  }

  // ดึงค่าปัจจุบันของ Overview หลายเรือ
  getOverviewCurrentsValues(tagNames: any[], isRetry = false): Observable<any> {
    const tags = this.flattenOverviewTags(tagNames);

    if (tags.length === 0) {
      return of([]);
    }

    return this.http
      .post(`${URL}/api/vessels/getcurrentvalues`, tags, {
        headers: this.getAuthHeaders(),
      })
      .pipe(
        map((res: any) => res),
        catchError((err) =>
          this.handleAuthError<any>(
            err,
            () => this.getOverviewCurrentsValues(tagNames, true),
            isRetry,
          ),
        ),
      );
  }

  // รวม tags จาก overviewDatas ให้เป็น array เดียว
  private flattenOverviewTags(tagNames: any[]): any[] {
    if (!Array.isArray(tagNames)) {
      return [];
    }

    const tags: any[] = [];

    tagNames.forEach((item: any) => {
      if (Array.isArray(item?.tags)) {
        tags.push(...item.tags);
      }
    });

    return tags;
  }

  // สร้าง Header พร้อม Token
  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();

    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  // จัดการ error ทั่วไป
  private handleError<T>(err: any): Observable<T> {
    return throwError(() => err);
  }

  // จัดการ error 401 รวมไว้ที่เดียว
  private handleAuthError<T>(
    err: any,
    retryFn: () => Observable<T>,
    isRetry: boolean,
  ): Observable<T> {
    if (err?.status === 401 && !isRetry) {
      return from(this.authService.tryLogin()).pipe(
        switchMap((success: any) => {
          if (this.isLoginSuccess(success)) {
            return retryFn();
          }

          this.forceLogout();
          return throwError(() => err);
        }),
        catchError(() => {
          this.forceLogout();
          return throwError(() => err);
        }),
      );
    }

    if (err?.status === 401) {
      this.forceLogout();
    }

    return throwError(() => err);
  }

  // เช็กผลลัพธ์จาก tryLogin()
  private isLoginSuccess(result: any): boolean {
    if (result === true) {
      return true;
    }

    if (result?.success === true) {
      return true;
    }

    if (result?.access_token) {
      return true;
    }

    if (result?.Access?.Token) {
      return true;
    }

    return false;
  }

  // logout และกลับหน้า login
  private forceLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
