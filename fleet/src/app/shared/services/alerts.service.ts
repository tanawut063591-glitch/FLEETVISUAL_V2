import { HttpClient, HttpContext, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  Observable,
  catchError,
  concatMap,
  defaultIfEmpty,
  filter,
  from,
  map,
  of,
  shareReplay,
  switchMap,
  take,
  throwError,
  timeout,
} from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AlertEndpointConfig,
  AlertFetchResult,
  AlertQuery,
  AlertRecord,
  AlertSeverity,
  AlertState,
  AlertsRuntimeConfig,
} from '../models/alert.model';
import { AuthService } from './auth.service';
import { SKIP_AUTH_REDIRECT } from '../../core/interceptors/http-context.tokens';

interface EndpointAttempt {
  ok: boolean;
  endpoint?: AlertEndpointConfig;
  response?: unknown;
  error?: unknown;
}

interface PublicConfig {
  UrlApiNotification?: string;
}

@Injectable({ providedIn: 'root' })
export class AlertsService {
  private activeEndpointName = '';
  private lastError: unknown = null;

  private readonly runtimeConfig$ = this.loadRuntimeConfig().pipe(
    shareReplay({ bufferSize: 1, refCount: false })
  );

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  fetchAlerts(query: AlertQuery): Observable<AlertFetchResult> {
    return this.runtimeConfig$.pipe(
      switchMap((config) => {
        const endpoints = this.orderEndpoints(config.endpoints || []);

        if (endpoints.length === 0) {
          return throwError(() => new Error('No alerts backend endpoint is configured.'));
        }

        this.lastError = null;

        return from(endpoints).pipe(
          concatMap((endpoint) => this.requestEndpoint(endpoint, query)),
          filter((attempt) => attempt.ok),
          take(1),
          defaultIfEmpty(null),
          switchMap((attempt) => {
            if (!attempt?.endpoint) {
              const detail = this.describeError(this.lastError);
              return throwError(
                () => new Error(
                  detail
                    ? `Unable to load alerts from the backend. ${detail}`
                    : 'Unable to load alerts from the configured backend endpoints.'
                )
              );
            }

            this.activeEndpointName = attempt.endpoint.name;
            const rawRows = this.extractRows(attempt.response);
            const alerts = this.normalizeRows(rawRows);

            return of({
              alerts,
              endpoint: attempt.endpoint.url,
              fetchedAt: new Date().toISOString(),
              rawCount: rawRows.length,
            });
          })
        );
      })
    );
  }

  getRefreshSeconds(): Observable<number> {
    return this.runtimeConfig$.pipe(
      map((config) => {
        const seconds = Number(config.refreshSeconds ?? 30);
        return Number.isFinite(seconds) ? Math.min(300, Math.max(10, seconds)) : 30;
      })
    );
  }

  private loadRuntimeConfig(): Observable<AlertsRuntimeConfig> {
    const alertConfig$ = this.http
      .get<AlertsRuntimeConfig>('/alerts.config.json')
      .pipe(catchError(() => of({} as AlertsRuntimeConfig)));

    const publicConfig$ = this.http
      .get<PublicConfig>('/config.json')
      .pipe(catchError(() => of({} as PublicConfig)));

    return alertConfig$.pipe(
      switchMap((alertConfig) =>
        publicConfig$.pipe(
          map((publicConfig) => {
            const endpoints = (alertConfig.endpoints?.length
              ? alertConfig.endpoints
              : this.defaultEndpoints(publicConfig.UrlApiNotification)
            )
              .map((endpoint) => ({
                ...endpoint,
                url: this.resolveUrl(endpoint.url, publicConfig.UrlApiNotification),
              }))
              .filter((endpoint) => !!endpoint.url);

            return {
              refreshSeconds: alertConfig.refreshSeconds ?? 30,
              endpoints,
            };
          })
        )
      )
    );
  }

  private defaultEndpoints(notificationBase?: string): AlertEndpointConfig[] {
    const endpoints: AlertEndpointConfig[] = [];

    if (notificationBase) {
      endpoints.push(
        { name: 'notification-getalerts', url: '{NOTIFICATION_URL}/getalerts', method: 'POST' },
        { name: 'notification-alerts', url: '{NOTIFICATION_URL}/alerts', method: 'GET' }
      );
    }

    endpoints.push(
      { name: 'api2-getalerts', url: '{API2_URL}/getalerts', method: 'POST' },
      { name: 'api2-alerts', url: '{API2_URL}/alerts', method: 'GET' },
      { name: 'gateway-getalerts', url: '{API_URL}/api/vessels/getalerts', method: 'POST' },
      { name: 'gateway-alerts', url: '{API_URL}/api/alerts', method: 'GET' }
    );

    return endpoints;
  }

  private resolveUrl(template: string, notificationBase?: string): string {
    const trim = (value: string) => String(value || '').replace(/\/+$/, '');
    const apiUrl = trim(environment.API_URL || '');
    const api2Url = trim(environment.API2_URL || environment.API_URL || '');
    const notificationUrl = trim(notificationBase || '');

    const resolved = String(template || '')
      .replaceAll('{API_URL}', apiUrl)
      .replaceAll('{API2_URL}', api2Url)
      .replaceAll('{NOTIFICATION_URL}', notificationUrl)
      .replace(/([^:]\/)\/{2,}/g, '$1');

    return resolved.includes('{') ? '' : resolved;
  }

  private orderEndpoints(endpoints: AlertEndpointConfig[]): AlertEndpointConfig[] {
    if (!this.activeEndpointName) {
      return endpoints;
    }

    return [...endpoints].sort((a, b) => {
      if (a.name === this.activeEndpointName) return -1;
      if (b.name === this.activeEndpointName) return 1;
      return 0;
    });
  }

  private requestEndpoint(endpoint: AlertEndpointConfig, query: AlertQuery): Observable<EndpointAttempt> {
    const headers = this.getAuthHeaders();
    const body = this.buildRequestBody(query);
    const context = new HttpContext().set(SKIP_AUTH_REDIRECT, true);

    const request$ = endpoint.method === 'GET'
      ? this.http.get(endpoint.url, {
          headers,
          params: this.buildQueryParams(query),
          context,
        })
      : this.http.post(endpoint.url, body, { headers, context });

    return request$.pipe(
      timeout(8000),
      map((response) => ({ ok: true, endpoint, response } as EndpointAttempt)),
      catchError((error) => {
        this.lastError = error;
        return of({ ok: false, endpoint, error } as EndpointAttempt);
      })
    );
  }

  private buildRequestBody(query: AlertQuery): Record<string, unknown> {
    return {
      StartTime: query.startTime,
      EndTime: query.endTime,
      Vessel: query.vessel || '',
      VesselName: query.vessel || '',
      Prefix: query.vessel || '',
      Page: query.page || 1,
      PageSize: query.pageSize || 5000,
    };
  }

  private buildQueryParams(query: AlertQuery): HttpParams {
    let params = new HttpParams()
      .set('startTime', query.startTime)
      .set('endTime', query.endTime)
      .set('page', String(query.page || 1))
      .set('pageSize', String(query.pageSize || 5000));

    if (query.vessel) {
      params = params.set('vessel', query.vessel);
    }

    return params;
  }

  private getAuthHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${this.authService.getToken()}`,
    });
  }

  private extractRows(response: unknown, depth = 0): unknown[] {
    if (response === null || response === undefined || depth > 8) {
      return [];
    }

    if (typeof response === 'string') {
      const text = response.trim();
      if (!text) return [];

      try {
        return this.extractRows(JSON.parse(text), depth + 1);
      } catch {
        return [];
      }
    }

    if (Array.isArray(response)) {
      return response;
    }

    if (typeof response !== 'object') {
      return [];
    }

    const value = response as Record<string, unknown>;
    const keys = [
      'alerts', 'Alerts', 'alarms', 'Alarms', 'notifications', 'Notifications',
      'items', 'Items', 'rows', 'Rows', 'records', 'Records', 'data', 'Data',
      'result', 'Result', 'results', 'Results', 'value', 'Value',
    ];

    for (const key of keys) {
      if (key in value) {
        const rows = this.extractRows(value[key], depth + 1);
        if (rows.length > 0 || Array.isArray(value[key])) {
          return rows;
        }
      }
    }

    const looksLikeAlert = [
      'AlertID', 'AlarmID', 'Severity', 'Message', 'Description', 'TimeStamp', 'TagName',
    ].some((key) => key in value);

    return looksLikeAlert ? [value] : [];
  }

  private normalizeRows(rows: unknown[]): AlertRecord[] {
    const normalized = rows
      .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
      .map((row, index) => this.normalizeRow(row, index))
      .filter((alert) => !!alert.occurredAt || !!alert.title || !!alert.message);

    const unique = new Map<string, AlertRecord>();
    normalized.forEach((alert) => unique.set(alert.id, alert));

    return Array.from(unique.values()).sort((a, b) => {
      return this.toEpoch(b.occurredAt) - this.toEpoch(a.occurredAt);
    });
  }

  private normalizeRow(row: Record<string, unknown>, index: number): AlertRecord {
    const read = (...keys: string[]): unknown => {
      for (const key of keys) {
        const value = row[key];
        if (value !== undefined && value !== null && value !== '') return value;
      }
      return '';
    };

    const occurredAt = this.toIsoString(read(
      'OccurredAt', 'occurredAt', 'TimeStamp', 'Timestamp', 'timestamp',
      'AlarmTime', 'AlertTime', 'EventTime', 'DateTime', 'CreatedAt', 'createdAt', 'Time', 'time'
    ));

    const vesselName = String(read(
      'VesselName', 'vesselName', 'Vessel', 'vessel', 'FVName', 'fvName',
      'SiteName', 'siteName', 'PointSource', 'pointSource', 'Prefix', 'prefix'
    ) || 'Unknown vessel');

    const tagName = String(read('TagName', 'tagName', 'Tag', 'tag', 'Address', 'address') || '');
    const title = String(read('Title', 'title', 'AlarmName', 'alertName', 'Name', 'name') || tagName || 'Alert');
    const message = String(read('Message', 'message', 'Description', 'description', 'Detail', 'detail', 'Text', 'text') || title);
    const severity = this.normalizeSeverity(read('Severity', 'severity', 'Priority', 'priority', 'Level', 'level', 'AlarmLevel', 'alarmLevel'));
    const explicitState = read('State', 'state', 'Status', 'status', 'AlarmStatus', 'alertStatus', 'IsActive', 'isActive');
    const acknowledged = read('Acknowledged', 'acknowledged', 'IsAcknowledged', 'isAcknowledged', 'Ack', 'ack');
    let state = this.normalizeState(explicitState);

    if ((explicitState === '' || explicitState === undefined) && this.toBoolean(acknowledged)) {
      state = 'acknowledged';
    }

    const rawId = read('AlertID', 'alertId', 'AlarmID', 'alarmId', 'EventID', 'eventId', 'ID', 'Id', 'id', '_id');
    const fallbackId = `${vesselName}|${tagName}|${occurredAt}|${title}|${index}`;

    return {
      id: String(rawId || fallbackId),
      title,
      message,
      vesselName,
      vesselId: String(read('VesselID', 'vesselId', 'SiteID', 'siteId', 'Prefix', 'prefix') || vesselName),
      tagName,
      equipment: String(read('Equipment', 'equipment', 'Device', 'device', 'Group', 'group') || ''),
      severity,
      state,
      occurredAt,
      acknowledgedAt: this.toIsoString(read('AcknowledgedAt', 'acknowledgedAt', 'AckTime', 'ackTime')) || undefined,
      resolvedAt: this.toIsoString(read('ResolvedAt', 'resolvedAt', 'ClearTime', 'clearTime', 'EndTime', 'endTime')) || undefined,
      value: this.optionalValue(read('Value', 'value', 'ActualValue', 'actualValue')),
      unit: String(read('Unit', 'unit', 'UOM', 'uom') || '') || undefined,
      source: String(read('Source', 'source', 'PointSource', 'pointSource') || '') || undefined,
      raw: row,
    };
  }


  private optionalValue(value: unknown): string | number | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    return typeof value === 'number' ? value : String(value);
  }

  private toBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    return /^(true|1|yes|y|ack|acknowledged)$/i.test(String(value || '').trim());
  }

  private normalizeSeverity(value: unknown): AlertSeverity {
    if (typeof value === 'number' || /^\d+(\.\d+)?$/.test(String(value || '').trim())) {
      const numeric = Number(value);
      if (numeric >= 4) return 'critical';
      if (numeric === 3) return 'major';
      if (numeric === 2) return 'warning';
      if (numeric <= 1) return 'info';
    }

    const text = String(value || '').trim().toLowerCase();
    if (/(critical|emergency|fatal|very high|danger)/.test(text)) return 'critical';
    if (/(major|high|alarm)/.test(text)) return 'major';
    if (/(warning|warn|medium|minor)/.test(text)) return 'warning';
    if (/(info|information|notice|low|normal)/.test(text)) return 'info';
    return 'unknown';
  }

  private normalizeState(value: unknown): AlertState {
    if (typeof value === 'boolean') {
      return value ? 'active' : 'resolved';
    }

    const text = String(value || '').trim().toLowerCase();
    if (/(resolve|resolved|clear|cleared|close|closed|inactive|normal|ended)/.test(text)) {
      return 'resolved';
    }
    if (/(ack|acknowledged|accepted|confirm)/.test(text)) {
      return 'acknowledged';
    }
    return 'active';
  }

  private toIsoString(value: unknown): string {
    if (value === undefined || value === null || value === '') return '';

    const date = value instanceof Date ? value : new Date(String(value));
    return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
  }

  private toEpoch(value: string): number {
    const epoch = new Date(value).getTime();
    return Number.isFinite(epoch) ? epoch : 0;
  }

  private describeError(error: unknown): string {
    const candidate = error as any;
    const status = candidate?.status;
    const message = candidate?.error?.message || candidate?.message || '';

    if (status) {
      return `Backend returned HTTP ${status}${message ? `: ${message}` : '.'}`;
    }

    return message ? String(message) : '';
  }
}
