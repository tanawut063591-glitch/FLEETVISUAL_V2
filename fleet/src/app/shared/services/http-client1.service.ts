import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';

import { Observable, firstValueFrom, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';

import { SecurityService } from './security.service';
import { AuthService } from './auth.service';

const URL2 = environment.API2_URL || environment.API_URL || '';

@Injectable({
  providedIn: 'root',
})
export class NewHttpClientService {
  public newVessel: string[] = ['SC_DUMMY', 'A02'];

  constructor(
    private http: HttpClient,
    private router: Router,
    private securityService: SecurityService,
    private authService: AuthService
  ) {}

  getJsonFile(path: string): Observable<any> {
    return this.http.get(path).pipe(
      catchError((err) => this.handleError<any>(err))
    );
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

              const accessible = list
                .filter((x: any) => x?.name && this.securityService.hasAccess(x.name))
                .sort(this.compare);

              // ถ้า user ไม่อยู่ใน permission list เดิม อย่าให้หน้าจอว่าง: แสดงข้อมูลที่ backend ส่งมาแทน
              return (accessible.length > 0 ? accessible : list).sort(this.compare);
            }),
            catchError((err) => {
              this.handleLoginRedirect(err);
              return of([]);
            })
          )
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

    return this.http.get(url).pipe(
      catchError((err) => this.handleError<any>(err))
    );
  }

  getPoints(prefix: string): Observable<any> {
    if (!prefix) {
      console.warn('GET POINTS: prefix is empty');
      return of([]);
    }

    const body = {
      prefix,
    };

    console.log('========== GET POINTS START ==========');
    console.log('GET POINTS URL:', `${URL2}/getpoints`);
    console.log('GET POINTS PREFIX:', prefix);
    console.log('GET POINTS BODY:', body);

    return this.http
      .post(`${URL2}/getpoints`, body, {
        headers: this.getAuthHeaders(),
      })
      .pipe(
        map((res: any) => {
          console.log('GET POINTS RESPONSE FROM BACKEND:', res);
          console.log('========== GET POINTS END ==========');
          return res;
        }),
        catchError((err) => {
          console.error('GET POINTS ERROR:', err);
          console.log('========== GET POINTS ERROR END ==========');
          return this.handleError<any>(err);
        })
      );
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

    console.log('========== GET RAW DATA START ==========');
    console.log('GET RAW DATA URL:', `${URL2}/loggergethistorianvalues`);
    console.log('GET RAW DATA BODY:', body);

    return this.http
      .post(`${URL2}/loggergethistorianvalues`, body, {
        headers: this.getAuthHeaders(),
      })
      .pipe(
        map((res: any) => {
          console.log('GET RAW DATA RESPONSE:', res);
          console.log('========== GET RAW DATA END ==========');
          return res;
        }),
        catchError((err) => {
          console.error('GET RAW DATA ERROR:', err);
          console.log('========== GET RAW DATA ERROR END ==========');
          return this.handleError<any>(err);
        })
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
        catchError((err) => this.handleError<any>(err))
      );
  }

  getReport(
    reportType: string,
    timestamp: string,
    fvName: string
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
      .post(`${URL2}/getreport`, body, {
        responseType: 'arraybuffer',
        headers: this.getAuthHeaders(),
      })
      .pipe(
        map((res: ArrayBuffer) => {
          return new Blob([res], { type: 'application/pdf' });
        }),
        catchError((err) => this.handleError<Blob>(err))
      );
  }

  getCurrentValues(tagNames: any[], name?: string): Observable<any> {
    const names = this.mapTagNames(tagNames);

    if (names.length === 0) {
      return of([]);
    }

    // _cacheBust ใช้กัน browser/backend คืนค่าค้าง ทำให้หน้า Realtime/Diagram อัปเดตจริงทุกรอบ
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
        catchError((err) => this.handleError<any>(err))
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
        catchError((err) => this.handleError<any>(err))
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

    // API2 เดิมของโปรเจกต์ Angular 5 ใช้ token แบบ raw ไม่ใช่ Bearer
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