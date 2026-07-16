import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, shareReplay } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  DatabaseApiConfig,
  DatabaseEndpointConfig,
  ResolvedDatabaseApiConfig,
  ResolvedDatabaseEndpoint,
} from '../models/database-api.model';

interface PublicConfig {
  UrlApi?: string;
  UrlApiAuthen?: string;
  DatabaseApiUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class DatabaseApiConfigService {
  readonly config$: Observable<ResolvedDatabaseApiConfig>;

  constructor(private http: HttpClient) {
    this.config$ = forkJoin({
      database: this.http
        .get<DatabaseApiConfig>('/database-api.config.json')
        .pipe(catchError(() => of({} as DatabaseApiConfig))),
      publicConfig: this.http
        .get<PublicConfig>('/config.json')
        .pipe(catchError(() => of({} as PublicConfig))),
    }).pipe(
      map(({ database, publicConfig }) => this.resolve(database, publicConfig)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
  }

  private resolve(config: DatabaseApiConfig, publicConfig: PublicConfig): ResolvedDatabaseApiConfig {
    const defaultTimeout = this.clamp(Number(config.timeoutMs) || 6000, 1500, 30000);
    const defaultCache = this.clamp(Number(config.cacheSeconds) || 15, 0, 300);
    const globallyEnabled = config.enabled === true;

    return {
      enabled: globallyEnabled,
      alerts: this.resolveEndpoint(config.alerts, globallyEnabled, defaultTimeout, defaultCache, publicConfig),
      activityLogs: this.resolveEndpoint(
        config.activityLogs,
        globallyEnabled,
        defaultTimeout,
        defaultCache,
        publicConfig,
      ),
      vessels: this.resolveEndpoint(config.vessels, globallyEnabled, defaultTimeout, 60, publicConfig),
      fallback: {
        alertsToTelemetry: config.fallback?.alertsToTelemetry !== false,
        logsToAlerts: config.fallback?.logsToAlerts !== false,
        vesselsToCurrentInfo: config.fallback?.vesselsToCurrentInfo !== false,
      },
    };
  }

  private resolveEndpoint(
    endpoint: DatabaseEndpointConfig | undefined,
    globallyEnabled: boolean,
    defaultTimeout: number,
    defaultCache: number,
    publicConfig: PublicConfig,
  ): ResolvedDatabaseEndpoint {
    const url = this.resolveUrl(String(endpoint?.url || ''), publicConfig);
    return {
      enabled: globallyEnabled && endpoint?.enabled !== false && !!url,
      url,
      method: endpoint?.method === 'GET' ? 'GET' : 'POST',
      timeoutMs: this.clamp(Number(endpoint?.timeoutMs) || defaultTimeout, 1500, 30000),
      cacheSeconds: this.clamp(Number(endpoint?.cacheSeconds) || defaultCache, 0, 300),
    };
  }

  private resolveUrl(template: string, config: PublicConfig): string {
    if (!template.trim()) return '';
    const trim = (value: string) => String(value || '').replace(/\/+$/, '');
    const apiUrl = trim(environment.API_URL || '');
    const api2Url = trim(environment.API2_URL || environment.API_URL || '');
    const publicApiUrl = trim(config.UrlApi || '');
    const databaseApiUrl = trim(config.DatabaseApiUrl || config.UrlApi || '');

    const resolved = template
      .replaceAll('{API_URL}', apiUrl)
      .replaceAll('{API2_URL}', api2Url)
      .replaceAll('{CONFIG_API_URL}', publicApiUrl)
      .replaceAll('{DATABASE_API_URL}', databaseApiUrl)
      .replace(/([^:]\/)\/{2,}/g, '$1');

    return resolved.includes('{') ? '' : resolved;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }
}
