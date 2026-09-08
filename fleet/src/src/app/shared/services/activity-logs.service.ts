import { HttpClient, HttpContext, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  Observable,
  catchError,
  combineLatest,
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
  ActivityLogFetchResult,
  ActivityLogQuery,
  ActivityLogRecord,
  ActivityLogSeverity,
  SystemStatusItem,
} from '../models/activity-log.model';
import { AlertRecord } from '../models/alert.model';
import { ResolvedDatabaseEndpoint } from '../models/database-api.model';
import { AlertsService } from './alerts.service';
import { AuthService } from './auth.service';
import { DatabaseApiConfigService } from './database-api-config.service';
import { TelemetryAlertsService } from './telemetry-alerts.service';

interface CacheEntry {
  expiresAt: number;
  value: ActivityLogFetchResult;
}

@Injectable({ providedIn: 'root' })
export class ActivityLogsService {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly inFlight = new Map<string, Observable<ActivityLogFetchResult>>();

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private alerts: AlertsService,
    private telemetry: TelemetryAlertsService,
    private databaseConfig: DatabaseApiConfigService,
  ) {}

  fetch(query: ActivityLogQuery, forceRefresh = false): Observable<ActivityLogFetchResult> {
    const normalizedQuery = this.normalizeQuery(query);
    const key = JSON.stringify(normalizedQuery);

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
        const source$ = config.activityLogs.enabled
          ? this.requestDatabase(config.activityLogs, normalizedQuery).pipe(
              catchError((error) => {
                if (!config.fallback.logsToAlerts) return throwError(() => error);
                return this.fetchFallback(normalizedQuery, forceRefresh);
              }),
            )
          : config.fallback.logsToAlerts
            ? this.fetchFallback(normalizedQuery, forceRefresh)
            : throwError(
                () =>
                  new Error(
                    'Database Activity Logs API is not configured. Set public/database-api.config.json.',
                  ),
              );

        return source$.pipe(
          map((result) => ({
            result,
            ttl:
              result.sourceType === 'database'
                ? config.activityLogs.cacheSeconds
                : Math.min(15, config.activityLogs.cacheSeconds || 15),
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

  clearCache(): void {
    this.cache.clear();
  }

  private requestDatabase(
    endpoint: ResolvedDatabaseEndpoint,
    query: ActivityLogQuery,
  ): Observable<ActivityLogFetchResult> {
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
        const logs = this.normalizeRows(rawRows);
        return {
          logs,
          statuses: this.buildDatabaseStatuses(logs),
          fetchedAt: new Date().toISOString(),
          source: `${endpoint.url} · database activity records`,
          backendConnected: true,
          total: this.extractTotal(response, rawRows.length),
          sourceType: 'database' as const,
        };
      }),
      catchError((error) =>
        throwError(() => new Error(this.describeDatabaseError(error, endpoint.url))),
      ),
    );
  }

  private fetchFallback(
    query: ActivityLogQuery,
    forceRefresh: boolean,
  ): Observable<ActivityLogFetchResult> {
    const alertRequest$ = this.alerts
      .fetchAlerts(
        {
          startTime: query.startTime,
          endTime: query.endTime,
          page: 1,
          pageSize: Math.min(2000, query.pageSize || 1000),
        },
        forceRefresh,
      )
      .pipe(
        map((result) => ({ ok: true as const, result, error: null })),
        catchError((error) => of({ ok: false as const, error, result: null })),
      );

    const vesselRequest$ = this.telemetry.getVessels(forceRefresh).pipe(
      map((vessels) => ({ ok: true as const, vessels, error: null })),
      catchError((error) => of({ ok: false as const, error, vessels: [] as any[] })),
    );

    return combineLatest({ alertResponse: alertRequest$, vesselResponse: vesselRequest$ }).pipe(
      map(({ alertResponse, vesselResponse }) => {
        if (!alertResponse.ok && !vesselResponse.ok) {
          const reason = alertResponse.error?.message || vesselResponse.error?.message;
          throw new Error(reason || 'The live server did not return alert or vessel data.');
        }

        const fetchedAt = alertResponse.ok
          ? alertResponse.result.fetchedAt
          : new Date().toISOString();
        const alertRows = alertResponse.ok ? alertResponse.result.alerts : [];
        const vessels = vesselResponse.ok ? vesselResponse.vessels : [];
        const start = new Date(query.startTime).getTime();
        const end = new Date(query.endTime).getTime();

        const logs = alertRows
          .map((alert) => this.fromAlert(alert))
          .filter((row) => {
            const time = new Date(row.timestamp).getTime();
            return !Number.isFinite(time) || (time >= start && time <= end);
          })
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        return {
          logs,
          statuses: this.buildStatuses(alertResponse.ok, vesselResponse.ok, alertRows, vessels),
          fetchedAt,
          source: alertResponse.ok
            ? `${alertResponse.result.endpoint} · verified server fallback`
            : 'FleetVisual live vessel status API',
          backendConnected: alertResponse.ok || vesselResponse.ok,
          total: logs.length,
          sourceType: 'alert-fallback' as const,
        };
      }),
    );
  }

  private normalizeQuery(query: ActivityLogQuery): ActivityLogQuery {
    return {
      startTime: query.startTime,
      endTime: query.endTime,
      search: query.search || '',
      severity: query.severity || 'all',
      category: query.category || '',
      page: Math.max(1, Number(query.page) || 1),
      pageSize: Math.min(5000, Math.max(1, Number(query.pageSize) || 1000)),
    };
  }

  private buildRequestBody(query: ActivityLogQuery): Record<string, unknown> {
    return {
      startTime: query.startTime,
      endTime: query.endTime,
      search: query.search || null,
      severity: query.severity === 'all' ? null : query.severity,
      category: query.category || null,
      page: query.page || 1,
      pageSize: query.pageSize || 1000,
      StartTime: query.startTime,
      EndTime: query.endTime,
      Search: query.search || null,
      Severity: query.severity === 'all' ? null : query.severity,
      Category: query.category || null,
      Page: query.page || 1,
      PageSize: query.pageSize || 1000,
    };
  }

  private buildQueryParams(query: ActivityLogQuery): HttpParams {
    let params = new HttpParams()
      .set('startTime', query.startTime)
      .set('endTime', query.endTime)
      .set('page', String(query.page || 1))
      .set('pageSize', String(query.pageSize || 1000));
    if (query.search) params = params.set('search', query.search);
    if (query.severity && query.severity !== 'all') params = params.set('severity', query.severity);
    if (query.category) params = params.set('category', query.category);
    return params;
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return token ? new HttpHeaders({ Authorization: token }) : new HttpHeaders();
  }

  private extractRows(response: unknown, depth = 0): unknown[] {
    if (response === null || response === undefined || depth > 8) return [];
    if (typeof response === 'string') {
      try {
        return this.extractRows(JSON.parse(response), depth + 1);
      } catch {
        return [];
      }
    }
    if (Array.isArray(response)) return response;
    if (typeof response !== 'object') return [];

    const record = response as Record<string, unknown>;
    for (const key of [
      'logs',
      'Logs',
      'activityLogs',
      'ActivityLogs',
      'auditLogs',
      'AuditLogs',
      'events',
      'Events',
      'records',
      'Records',
      'items',
      'Items',
      'rows',
      'Rows',
      'data',
      'Data',
      'result',
      'Result',
      'payload',
      'Payload',
    ]) {
      if (key in record) {
        const rows = this.extractRows(record[key], depth + 1);
        if (rows.length || Array.isArray(record[key])) return rows;
      }
    }

    const keys = Object.keys(record).map((key) => key.toLowerCase());
    return ['message', 'action', 'timestamp', 'createdat', 'eventtype'].some((key) =>
      keys.includes(key),
    )
      ? [record]
      : [];
  }

  private normalizeRows(rows: unknown[]): ActivityLogRecord[] {
    const unique = new Map<string, ActivityLogRecord>();
    rows
      .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
      .forEach((row, index) => {
        const normalized = this.normalizeRow(row, index);
        unique.set(normalized.id, normalized);
      });
    return Array.from(unique.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }

  private normalizeRow(row: Record<string, unknown>, index: number): ActivityLogRecord {
    const lookup = new Map<string, unknown>();
    const visit = (value: unknown, depth: number): void => {
      if (!value || typeof value !== 'object' || depth > 3) return;
      for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        const normalized = key.toLowerCase();
        if (!lookup.has(normalized) && child !== null && child !== undefined && child !== '') {
          lookup.set(normalized, child);
        }
        if (child && typeof child === 'object' && !Array.isArray(child)) visit(child, depth + 1);
      }
    };
    visit(row, 0);
    const read = (...keys: string[]): unknown => {
      for (const key of keys) {
        const value = row[key] ?? lookup.get(key.toLowerCase());
        if (value !== null && value !== undefined && value !== '') return value;
      }
      return '';
    };

    const timestamp = this.toIsoString(
      read('Timestamp', 'TimeStamp', 'CreatedAt', 'CreatedDate', 'DateTime', 'EventTime', 'Time'),
    );
    const message = String(
      read('Message', 'Action', 'EventName', 'Title', 'Description', 'Detail') || 'Activity event',
    );
    const rawId = read('LogID', 'AuditID', 'EventID', 'ID', 'Id', '_id');
    const category = String(
      read('Category', 'EventType', 'Type', 'ActionType', 'Module') || 'System',
    );

    return {
      id: String(rawId || `${timestamp}|${message}|${index}`),
      timestamp,
      severity: this.normalizeSeverity(read('Severity', 'Level', 'Priority', 'Status', 'Result')),
      category,
      message,
      detail: String(read('Detail', 'Description', 'Remark', 'Metadata', 'ResultMessage') || ''),
      vesselName: String(read('VesselName', 'Vessel', 'ShipName', 'FVName', 'Prefix') || ''),
      user: String(read('UserName', 'Username', 'User', 'Actor', 'CreatedBy', 'Operator') || ''),
      module: String(read('Module', 'System', 'Service', 'Controller', 'Source') || category),
      source: String(read('Source', 'Origin', 'Application', 'Service') || 'Database activity log'),
      raw: row,
    };
  }

  private normalizeSeverity(value: unknown): ActivityLogSeverity {
    const text = String(value || '')
      .trim()
      .toLowerCase();
    if (/(critical|fatal|error|failed|failure|danger)/.test(text)) return 'critical';
    if (/(warning|warn|partial)/.test(text)) return 'warning';
    if (/(success|successful|completed|resolved|ok)/.test(text)) return 'success';
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      if (numeric >= 4) return 'critical';
      if (numeric === 3) return 'warning';
      if (numeric <= 1) return 'success';
    }
    return 'info';
  }

  private toIsoString(value: unknown): string {
    if (value === null || value === undefined || value === '') return new Date(0).toISOString();
    if (typeof value === 'number') {
      const epoch = value < 10_000_000_000 ? value * 1000 : value;
      const date = new Date(epoch);
      return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
    }
    const text = String(value);
    const dotNet = /\/Date\((\d+)(?:[+-]\d+)?\)\//.exec(text);
    const date = dotNet ? new Date(Number(dotNet[1])) : new Date(text);
    return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
  }

  private extractTotal(response: unknown, fallback: number): number {
    if (!response || typeof response !== 'object') return fallback;
    const value = response as Record<string, any>;
    for (const candidate of [
      value['total'],
      value['Total'],
      value['totalCount'],
      value['TotalCount'],
      value['count'],
      value['Count'],
      value['meta']?.total,
      value['pagination']?.total,
    ]) {
      const total = Number(candidate);
      if (Number.isFinite(total) && total >= 0) return total;
    }
    return fallback;
  }

  private buildDatabaseStatuses(logs: ActivityLogRecord[]): SystemStatusItem[] {
    const critical = logs.filter((row) => row.severity === 'critical').length;
    const warnings = logs.filter((row) => row.severity === 'warning').length;
    return [
      {
        label: 'Database',
        state: 'normal',
        detail: `${logs.length} activity records loaded`,
        icon: 'fa fa-database',
      },
      {
        label: 'Activity Logs',
        state: critical ? 'critical' : warnings ? 'warning' : 'normal',
        detail: `${critical} critical · ${warnings} warnings`,
        icon: 'fa fa-list-alt',
      },
      {
        label: 'API',
        state: 'normal',
        detail: 'Database API connected',
        icon: 'fa fa-server',
      },
      {
        label: 'Data Integrity',
        state: 'normal',
        detail: 'Persisted server records only',
        icon: 'fa fa-shield',
      },
      {
        label: 'Audit Trail',
        state: logs.length ? 'normal' : 'warning',
        detail: logs.length ? 'Records available' : 'No records in selected range',
        icon: 'fa fa-history',
      },
      {
        label: 'System',
        state: 'normal',
        detail: 'Application operational',
        icon: 'fa fa-cog',
      },
    ];
  }

  private fromAlert(alert: AlertRecord): ActivityLogRecord {
    return {
      id: `server-alert:${alert.id}:${alert.occurredAt}`,
      timestamp: alert.resolvedAt || alert.occurredAt,
      severity: this.mapAlertSeverity(alert),
      category: alert.equipment || 'Alerts',
      message: alert.message || alert.title,
      detail: `${alert.state.toUpperCase()} · ${alert.tagName || 'Server telemetry'}`,
      vesselName: alert.vesselName,
      user: '',
      module: alert.equipment || 'Alerts Center',
      source: alert.source || 'Live server telemetry',
      raw: alert.raw,
    };
  }

  private buildStatuses(
    alertsOk: boolean,
    vesselsOk: boolean,
    alerts: AlertRecord[],
    vessels: any[],
  ): SystemStatusItem[] {
    const critical = alerts.filter(
      (alert) =>
        alert.state !== 'resolved' && (alert.severity === 'critical' || alert.severity === 'major'),
    ).length;
    const warnings = alerts.filter(
      (alert) => alert.state !== 'resolved' && alert.severity === 'warning',
    ).length;
    const offlineVessels = vessels.filter((vessel) => this.isVesselOffline(vessel)).length;

    return [
      {
        label: 'Realtime',
        state: !vesselsOk ? 'offline' : offlineVessels > 0 ? 'warning' : 'normal',
        detail: !vesselsOk
          ? 'Live vessel API unavailable'
          : `${Math.max(0, vessels.length - offlineVessels)}/${vessels.length} vessels reporting`,
        icon: 'fa fa-clock-o',
      },
      {
        label: 'Alerts Center',
        state: !alertsOk
          ? 'offline'
          : critical > 0
            ? 'critical'
            : warnings > 0
              ? 'warning'
              : 'normal',
        detail: !alertsOk
          ? 'Live alert source unavailable'
          : `${critical + warnings} active events`,
        icon: 'fa fa-bell-o',
      },
      {
        label: 'Vessel Data',
        state: !vesselsOk ? 'offline' : vessels.length > 0 ? 'normal' : 'warning',
        detail: vesselsOk ? `${vessels.length} server records loaded` : 'No server response',
        icon: 'fa fa-ship',
      },
      {
        label: 'Backend API',
        state: alertsOk && vesselsOk ? 'normal' : alertsOk || vesselsOk ? 'warning' : 'critical',
        detail: alertsOk && vesselsOk ? 'Live checks passed' : 'Partial server connectivity',
        icon: 'fa fa-server',
      },
      {
        label: 'Data Integrity',
        state: alertsOk ? 'normal' : 'offline',
        detail: alertsOk ? 'No mock or browser history used' : 'Unable to verify live feed',
        icon: 'fa fa-shield',
      },
      {
        label: 'System',
        state: alertsOk || vesselsOk ? 'normal' : 'critical',
        detail: alertsOk || vesselsOk ? 'Application operational' : 'No live server response',
        icon: 'fa fa-cog',
      },
    ];
  }

  private isVesselOffline(vessel: any): boolean {
    const status = String(
      vessel?.status ?? vessel?.Status ?? vessel?.state ?? vessel?.State ?? '',
    ).toLowerCase();
    const timestamp = this.readTimestamp(vessel);
    const stale = timestamp ? Date.now() - new Date(timestamp).getTime() >= 10 * 60_000 : false;
    return /(offline|disconnect|inactive|down|false|0)/i.test(status) || stale;
  }

  private mapAlertSeverity(alert: AlertRecord): ActivityLogSeverity {
    if (alert.state === 'resolved') return 'success';
    if (alert.severity === 'critical' || alert.severity === 'major') return 'critical';
    if (alert.severity === 'warning') return 'warning';
    return 'info';
  }

  private readTimestamp(item: any): string {
    const raw =
      item?.timestamp ??
      item?.TimeStamp ??
      item?.Timestamp ??
      item?.lastUpdate ??
      item?.lastSeenAt ??
      item?.updatedAt ??
      item?.dateTime ??
      item?.DateTime ??
      '';
    const date = raw ? new Date(raw) : null;
    return date && !Number.isNaN(date.getTime()) ? date.toISOString() : '';
  }

  private describeDatabaseError(error: any, endpoint: string): string {
    if (error?.name === 'TimeoutError') return `Database Activity Logs API timed out: ${endpoint}`;
    const status = Number(error?.status);
    const detail = error?.error?.message || error?.message || '';
    return status
      ? `Database Activity Logs API returned HTTP ${status}${detail ? `: ${detail}` : ''}`
      : `Unable to reach Database Activity Logs API${detail ? `: ${detail}` : ''}`;
  }

  private pruneCache(): void {
    if (this.cache.size <= 30) return;
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (entry.expiresAt <= now) this.cache.delete(key);
    }
    while (this.cache.size > 30) {
      const first = this.cache.keys().next().value;
      if (!first) break;
      this.cache.delete(first);
    }
  }
}
