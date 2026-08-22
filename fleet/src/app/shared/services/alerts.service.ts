import { HttpClient, HttpContext, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  Observable,
  catchError,
  finalize,
  map,
  of,
  shareReplay,
  switchMap,
  tap,
  throwError,
  timeout,
} from 'rxjs';

import { SKIP_AUTH_REDIRECT } from '../../core/interceptors/http-context.tokens';
import {
  AlertFetchResult,
  AlertQuery,
  AlertRecord,
  AlertSeverity,
  AlertState,
  AlertsRuntimeConfig,
} from '../models/alert.model';
import { ResolvedDatabaseEndpoint } from '../models/database-api.model';
import { AuthService } from './auth.service';
import { DatabaseApiConfigService } from './database-api-config.service';
import { TelemetryAlertsService } from './telemetry-alerts.service';

interface CacheEntry {
  expiresAt: number;
  value: AlertFetchResult;
}

@Injectable({ providedIn: 'root' })
export class AlertsService {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly inFlight = new Map<string, Observable<AlertFetchResult>>();
  private readonly runtimeConfig$: Observable<AlertsRuntimeConfig>;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private telemetryAlerts: TelemetryAlertsService,
    private databaseConfig: DatabaseApiConfigService,
  ) {
    this.runtimeConfig$ = this.http.get<AlertsRuntimeConfig>('/alerts.config.json').pipe(
      catchError(() => of({ refreshSeconds: 60, cacheSeconds: 60 } as AlertsRuntimeConfig)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
  }

  fetchAlerts(query: AlertQuery, forceRefresh = false): Observable<AlertFetchResult> {
    const normalizedQuery = this.normalizeQuery(query);
    const key = this.queryKey(normalizedQuery);

    if (!forceRefresh) {
      const cached = this.cache.get(key);
      if (cached && cached.expiresAt > Date.now()) return of(cached.value);
      const running = this.inFlight.get(key);
      if (running) return running;
    } else {
      this.cache.delete(key);
    }

    const request$ = this.databaseConfig.config$.pipe(
      switchMap((config) => {
        const source$ = config.alerts.enabled
          ? this.requestDatabase(config.alerts, normalizedQuery).pipe(
              catchError((error) => {
                if (!config.fallback.alertsToTelemetry) return throwError(() => error);
                return this.telemetryAlerts
                  .fetch(normalizedQuery, forceRefresh)
                  .pipe(map((result) => ({ ...result, sourceType: 'telemetry' as const })));
              }),
            )
          : config.fallback.alertsToTelemetry
            ? this.telemetryAlerts
                .fetch(normalizedQuery, forceRefresh)
                .pipe(map((result) => ({ ...result, sourceType: 'telemetry' as const })))
            : throwError(
                () =>
                  new Error(
                    'Database Alerts API is not configured. Set public/database-api.config.json or enable the telemetry fallback.',
                  ),
              );

        return source$.pipe(
          map((result) => ({
            result,
            ttl:
              result.sourceType === 'database'
                ? config.alerts.cacheSeconds
                : Math.max(60, config.alerts.cacheSeconds || 60),
          })),
        );
      }),
      tap(({ result, ttl }) => {
        this.cache.set(key, { expiresAt: Date.now() + ttl * 1000, value: result });
        this.pruneCache();
      }),
      map(({ result }) => result),
      finalize(() => this.inFlight.delete(key)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    this.inFlight.set(key, request$);
    return request$;
  }

  getRefreshSeconds(): Observable<number> {
    return this.runtimeConfig$.pipe(
      map((config) => {
        const preference = Number(localStorage.getItem('fleet-alert-refresh-seconds'));
        const configured = Number(config.refreshSeconds ?? 60);
        const seconds = Number.isFinite(preference) && preference > 0 ? preference : configured;
        return Number.isFinite(seconds) ? Math.min(300, Math.max(60, seconds)) : 60;
      }),
    );
  }

  clearCache(): void {
    this.cache.clear();
  }

  private requestDatabase(
    endpoint: ResolvedDatabaseEndpoint,
    query: AlertQuery,
  ): Observable<AlertFetchResult> {
    const context = new HttpContext().set(SKIP_AUTH_REDIRECT, true);
    const headers = this.getAuthHeaders();
    const request$ =
      endpoint.method === 'GET'
        ? this.http.get(endpoint.url, {
            context,
            headers,
            params: this.buildQueryParams(query),
          })
        : this.http.post(endpoint.url, this.buildRequestBody(query), { context, headers });

    return request$.pipe(
      timeout(endpoint.timeoutMs),
      map((response) => {
        const rawRows = this.extractRows(response);
        return {
          alerts: this.normalizeRows(rawRows),
          endpoint: endpoint.url,
          fetchedAt: new Date().toISOString(),
          rawCount: rawRows.length,
          total: this.extractTotal(response, rawRows.length),
          sourceType: 'database' as const,
        };
      }),
      catchError((error) =>
        throwError(() => new Error(this.describeDatabaseError(error, endpoint.url))),
      ),
    );
  }

  private normalizeQuery(query: AlertQuery): AlertQuery {
    return {
      startTime: query.startTime,
      endTime: query.endTime,
      vessel: query.vessel || '',
      search: query.search || '',
      severity: query.severity || 'all',
      state: query.state || 'all',
      module: query.module || '',
      page: Math.max(1, Number(query.page) || 1),
      pageSize: Math.min(5000, Math.max(1, Number(query.pageSize) || 500)),
    };
  }

  private queryKey(query: AlertQuery): string {
    return JSON.stringify(query);
  }

  private buildRequestBody(query: AlertQuery): Record<string, unknown> {
    return {
      startTime: query.startTime,
      endTime: query.endTime,
      vessel: query.vessel || null,
      search: query.search || null,
      severity: query.severity === 'all' ? null : query.severity,
      status: query.state === 'all' ? null : query.state,
      module: query.module || null,
      page: query.page || 1,
      pageSize: query.pageSize || 500,

      StartTime: query.startTime,
      EndTime: query.endTime,
      Vessel: query.vessel || null,
      Search: query.search || null,
      Severity: query.severity === 'all' ? null : query.severity,
      Status: query.state === 'all' ? null : query.state,
      Module: query.module || null,
      Page: query.page || 1,
      PageSize: query.pageSize || 500,
    };
  }

  private buildQueryParams(query: AlertQuery): HttpParams {
    let params = new HttpParams()
      .set('startTime', query.startTime)
      .set('endTime', query.endTime)
      .set('page', String(query.page || 1))
      .set('pageSize', String(query.pageSize || 500));

    if (query.vessel) params = params.set('vessel', query.vessel);
    if (query.search) params = params.set('search', query.search);
    if (query.severity && query.severity !== 'all') params = params.set('severity', query.severity);
    if (query.state && query.state !== 'all') params = params.set('status', query.state);
    if (query.module) params = params.set('module', query.module);
    return params;
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return token ? new HttpHeaders({ Authorization: token }) : new HttpHeaders();
  }

  private extractTotal(response: unknown, fallback: number): number {
    if (!response || typeof response !== 'object') return fallback;
    const value = response as Record<string, any>;
    const candidates = [
      value['total'],
      value['Total'],
      value['totalCount'],
      value['TotalCount'],
      value['count'],
      value['Count'],
      value['meta']?.total,
      value['pagination']?.total,
    ];
    for (const candidate of candidates) {
      const total = Number(candidate);
      if (Number.isFinite(total) && total >= 0) return total;
    }
    return fallback;
  }

  private describeDatabaseError(error: any, endpoint: string): string {
    if (error?.name === 'TimeoutError') {
      return `Database Alerts API timed out: ${endpoint}`;
    }
    const status = Number(error?.status);
    const detail = error?.error?.message || error?.message || '';
    return status
      ? `Database Alerts API returned HTTP ${status}${detail ? `: ${detail}` : ''}`
      : `Unable to reach Database Alerts API${detail ? `: ${detail}` : ''}`;
  }

  private pruneCache(): void {
    if (this.cache.size <= 40) return;
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (entry.expiresAt <= now) this.cache.delete(key);
    }
    while (this.cache.size > 40) {
      const first = this.cache.keys().next().value;
      if (!first) break;
      this.cache.delete(first);
    }
  }

  private extractRows(response: unknown, depth = 0): unknown[] {
    if (response === null || response === undefined || depth > 10) return [];

    if (typeof response === 'string') {
      const text = response.trim();
      if (!text) return [];

      try {
        return this.extractRows(JSON.parse(text), depth + 1);
      } catch {
        return [];
      }
    }

    if (Array.isArray(response)) return response;
    if (typeof response !== 'object') return [];

    const value = response as Record<string, unknown>;
    const keys = [
      'alerts',
      'Alerts',
      'alarms',
      'Alarms',
      'notifications',
      'Notifications',
      'events',
      'Events',
      'items',
      'Items',
      'rows',
      'Rows',
      'records',
      'Records',
      'data',
      'Data',
      'result',
      'Result',
      'results',
      'Results',
      'value',
      'Value',
      'payload',
      'Payload',
    ];

    for (const key of keys) {
      if (key in value) {
        const rows = this.extractRows(value[key], depth + 1);
        if (rows.length > 0 || Array.isArray(value[key])) return rows;
      }
    }

    const lowerKeys = Object.keys(value).map((key) => key.toLowerCase());
    const looksLikeAlert = [
      'alertid',
      'alarmid',
      'severity',
      'message',
      'description',
      'timestamp',
      'tagname',
      'alarmname',
    ].some((key) => lowerKeys.includes(key));

    return looksLikeAlert ? [value] : [];
  }

  private normalizeRows(rows: unknown[]): AlertRecord[] {
    const normalized = rows
      .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
      .map((row, index) => this.normalizeRow(row, index))
      .filter((alert) => !!alert.occurredAt || !!alert.title || !!alert.message);

    const unique = new Map<string, AlertRecord>();
    normalized.forEach((alert) => unique.set(alert.id, alert));

    return Array.from(unique.values()).sort(
      (a, b) => this.toEpoch(b.occurredAt) - this.toEpoch(a.occurredAt),
    );
  }

  private normalizeRow(row: Record<string, unknown>, index: number): AlertRecord {
    const lookup = this.buildLookup(row);
    const read = (...keys: string[]): unknown => {
      for (const key of keys) {
        const direct = row[key];
        if (direct !== undefined && direct !== null && direct !== '') return direct;

        const value = lookup.get(key.toLowerCase());
        if (value !== undefined && value !== null && value !== '') return value;
      }
      return '';
    };

    const occurredAt = this.toIsoString(
      read(
        'OccurredAt',
        'TimeStamp',
        'Timestamp',
        'AlarmTime',
        'AlertTime',
        'EventTime',
        'DateTime',
        'CreatedAt',
        'CreatedDate',
        'StartTime',
        'Time',
      ),
    );

    const vesselName = String(
      read('VesselName', 'Vessel', 'FVName', 'SiteName', 'ShipName', 'PointSource', 'Prefix') ||
        'Unknown vessel',
    );

    const tagName = String(
      read('TagName', 'Tag', 'PointName', 'Address', 'SignalName', 'ParameterName') || '',
    );
    const title = String(
      read('Title', 'AlarmName', 'AlertName', 'EventName', 'Name', 'Subject') || tagName || 'Alert',
    );
    const message = String(
      read('Message', 'Description', 'Detail', 'Text', 'Remark', 'AlarmMessage') || title,
    );
    const severity = this.normalizeSeverity(
      read('Severity', 'Priority', 'Level', 'AlarmLevel', 'AlertLevel', 'Class'),
    );
    const explicitState = read(
      'State',
      'Status',
      'AlarmStatus',
      'AlertStatus',
      'EventStatus',
      'IsActive',
    );
    const acknowledged = read('Acknowledged', 'IsAcknowledged', 'Ack', 'AckStatus');
    const clearedAt = this.toIsoString(
      read('ResolvedAt', 'ClearTime', 'ClearedAt', 'EndTime', 'ClosedAt'),
    );

    let state = this.normalizeState(explicitState);
    if ((explicitState === '' || explicitState === undefined) && clearedAt) state = 'resolved';
    if ((explicitState === '' || explicitState === undefined) && this.toBoolean(acknowledged)) {
      state = 'acknowledged';
    }

    const rawId = read(
      'AlertID',
      'AlarmID',
      'EventID',
      'NotificationID',
      'RecordID',
      'ID',
      'Id',
      '_id',
    );
    const fallbackId = `${vesselName}|${tagName}|${occurredAt}|${title}|${index}`;

    return {
      id: String(rawId || fallbackId),
      title,
      message,
      vesselName,
      vesselId: String(read('VesselID', 'ShipID', 'SiteID', 'Prefix') || vesselName),
      tagName,
      equipment: String(
        read('Equipment', 'Module', 'System', 'Device', 'Group', 'Category', 'Subsystem') || '',
      ),
      severity,
      state,
      occurredAt,
      acknowledgedAt:
        this.toIsoString(read('AcknowledgedAt', 'AckTime', 'AcceptedAt')) || undefined,
      resolvedAt: clearedAt || undefined,
      value: this.optionalValue(
        read('Value', 'ActualValue', 'CurrentValue', 'TriggerValue', 'AlarmValue'),
      ),
      unit: String(read('Unit', 'UOM', 'EngineeringUnit') || '') || undefined,
      source:
        String(read('Source', 'PointSource', 'Service', 'Origin', 'SystemName') || '') || undefined,
      raw: row,
    };
  }

  private buildLookup(source: unknown): Map<string, unknown> {
    const lookup = new Map<string, unknown>();

    const visit = (value: unknown, depth: number): void => {
      if (!value || typeof value !== 'object' || depth > 4) return;

      Object.entries(value as Record<string, unknown>).forEach(([key, child]) => {
        const normalized = key.toLowerCase();
        if (!lookup.has(normalized) && child !== undefined && child !== null && child !== '') {
          lookup.set(normalized, child);
        }

        if (child && typeof child === 'object' && !Array.isArray(child)) {
          visit(child, depth + 1);
        }
      });
    };

    visit(source, 0);
    return lookup;
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

    const text = String(value || '')
      .trim()
      .toLowerCase();
    if (/(critical|emergency|fatal|very high|danger|trip)/.test(text)) return 'critical';
    if (/(major|high|alarm)/.test(text)) return 'major';
    if (/(warning|warn|medium|minor)/.test(text)) return 'warning';
    if (/(info|information|notice|low|normal|event)/.test(text)) return 'info';
    return 'unknown';
  }

  private normalizeState(value: unknown): AlertState {
    if (typeof value === 'boolean') return value ? 'active' : 'resolved';

    const text = String(value || '')
      .trim()
      .toLowerCase();
    if (/(resolve|resolved|clear|cleared|close|closed|inactive|normal|ended|complete)/.test(text)) {
      return 'resolved';
    }
    if (/(ack|acknowledged|accepted|confirm)/.test(text)) return 'acknowledged';
    return 'active';
  }

  private toIsoString(value: unknown): string {
    if (value === undefined || value === null || value === '') return '';

    if (typeof value === 'number') {
      const epoch = value < 10_000_000_000 ? value * 1000 : value;
      const numericDate = new Date(epoch);
      return Number.isNaN(numericDate.getTime()) ? String(value) : numericDate.toISOString();
    }

    const text = String(value).trim();
    const dotNetMatch = /\/Date\((\d+)(?:[+-]\d+)?\)\//.exec(text);
    if (dotNetMatch) {
      const dotNetDate = new Date(Number(dotNetMatch[1]));
      return Number.isNaN(dotNetDate.getTime()) ? text : dotNetDate.toISOString();
    }

    const date = value instanceof Date ? value : new Date(text);
    return Number.isNaN(date.getTime()) ? text : date.toISOString();
  }

  private toEpoch(value: string): number {
    const epoch = new Date(value).getTime();
    return Number.isFinite(epoch) ? epoch : 0;
  }
}
