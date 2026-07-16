import { HttpClient, HttpContext, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  Observable,
  catchError,
  defaultIfEmpty,
  filter,
  from,
  map,
  merge,
  of,
  shareReplay,
  switchMap,
  take,
  timeout,
} from 'rxjs';

import { SKIP_AUTH_REDIRECT } from '../../core/interceptors/http-context.tokens';
import { ResolvedDatabaseEndpoint } from '../models/database-api.model';
import { VesselSettingsRecord } from '../models/settings.model';
import { AuthService } from './auth.service';
import { DatabaseApiConfigService } from './database-api-config.service';
import { HttpClientService } from './http-client.service';
import { NewHttpClientService } from './http-client1.service';

interface LocalSettingsStore {
  records: VesselSettingsRecord[];
  deletedIds: string[];
}

@Injectable({ providedIn: 'root' })
export class SettingsDataService {
  private readonly storageKey = 'fleet-settings-vessels-v1';
  private backendVessels$?: Observable<VesselSettingsRecord[]>;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private backend: HttpClientService,
    private directBackend: NewHttpClientService,
    private databaseConfig: DatabaseApiConfigService,
  ) {}

  getVessels(forceRefresh = false): Observable<VesselSettingsRecord[]> {
    if (forceRefresh) this.backendVessels$ = undefined;

    if (!this.backendVessels$) {
      this.backendVessels$ = this.databaseConfig.config$.pipe(
        switchMap((config) => {
          if (config.vessels.enabled) {
            return this.loadDatabaseVessels(config.vessels).pipe(
              catchError(() =>
                config.fallback.vesselsToCurrentInfo ? this.loadCurrentInfoVessels() : of([]),
              ),
            );
          }
          return config.fallback.vesselsToCurrentInfo ? this.loadCurrentInfoVessels() : of([]);
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }

    return this.backendVessels$.pipe(map((rows) => this.mergeLocalChanges(rows)));
  }

  saveVessel(record: VesselSettingsRecord): void {
    const store = this.readStore();
    const normalized = { ...record, source: record.source || 'local' } as VesselSettingsRecord;
    const index = store.records.findIndex((item) => item.id === normalized.id);
    if (index >= 0) store.records[index] = normalized;
    else store.records.unshift(normalized);
    store.deletedIds = store.deletedIds.filter((id) => id !== normalized.id);
    this.writeStore(store);
  }

  deleteVessel(id: string): void {
    const store = this.readStore();
    store.records = store.records.filter((item) => item.id !== id);
    if (!store.deletedIds.includes(id)) store.deletedIds.push(id);
    this.writeStore(store);
  }

  resetLocalChanges(): void {
    localStorage.removeItem(this.storageKey);
  }

  private loadDatabaseVessels(
    endpoint: ResolvedDatabaseEndpoint,
  ): Observable<VesselSettingsRecord[]> {
    const context = new HttpContext().set(SKIP_AUTH_REDIRECT, true);
    const headers = this.getAuthHeaders();
    const request$ = endpoint.method === 'GET'
      ? this.http.get(endpoint.url, { context, headers })
      : this.http.post(endpoint.url, { page: 1, pageSize: 5000 }, { context, headers });

    return request$.pipe(
      timeout(endpoint.timeoutMs),
      map((response: any) =>
        this.extractArray(response).map((row, index) => this.normalize(row, index)),
      ),
    );
  }

  /**
   * The gateway and API2 vessel calls are started together. The first non-empty
   * response wins, removing the old worst-case 12 second sequential wait.
   */
  private loadCurrentInfoVessels(): Observable<VesselSettingsRecord[]> {
    const gateway$ = this.backend.getVesselInfo().pipe(
      timeout(4500),
      catchError(() => of([])),
    );
    const api2$ = from(this.directBackend.getVesselInfo2()).pipe(
      timeout(4500),
      catchError(() => of([])),
    );

    return merge(gateway$, api2$).pipe(
      map((rows: any) => this.extractArray(rows)),
      filter((rows) => rows.length > 0),
      take(1),
      defaultIfEmpty([]),
      map((rows) => rows.map((row, index) => this.normalize(row, index))),
    );
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return token ? new HttpHeaders({ Authorization: token }) : new HttpHeaders();
  }

  private mergeLocalChanges(backendRows: VesselSettingsRecord[]): VesselSettingsRecord[] {
    const store = this.readStore();
    const merged = new Map<string, VesselSettingsRecord>();
    backendRows
      .filter((row) => !store.deletedIds.includes(row.id))
      .forEach((row) => merged.set(row.id, row));
    store.records.forEach((row) => merged.set(row.id, row));
    return Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  private normalize(row: any, index: number): VesselSettingsRecord {
    const name = String(
      row?.name ?? row?.Name ?? row?.vesselName ?? row?.VesselName ?? `Vessel ${index + 1}`,
    );
    const prefix = String(row?.prefix ?? row?.Prefix ?? row?.fvPrefix ?? row?.code ?? '').trim();
    const id = String(row?.id ?? row?.Id ?? row?._id ?? row?.vesselId ?? prefix ?? name).trim();
    const statusText = String(row?.status ?? row?.Status ?? row?.state ?? '').toLowerCase();
    const status = /online|active|true|1|normal/.test(statusText)
      ? 'online'
      : /offline|inactive|false|0|down/.test(statusText)
        ? 'offline'
        : 'unknown';

    return {
      id: id || `vessel-${index + 1}`,
      name,
      prefix: prefix || id,
      image: String(row?.image ?? row?.Image ?? row?.imageUrl ?? row?.picture ?? ''),
      description: String(row?.description ?? row?.Description ?? ''),
      nationality: String(row?.nationality ?? row?.Nationality ?? row?.country ?? ''),
      customer: String(row?.customer ?? row?.Customer ?? ''),
      owner: String(row?.owner ?? row?.Owner ?? ''),
      agency: String(row?.agency ?? row?.Agency ?? ''),
      groups: this.toStringArray(row?.groups ?? row?.Groups ?? row?.group ?? row?.Group),
      engines: this.toStringArray(row?.engines ?? row?.Engines ?? row?.engine ?? row?.Engine),
      status,
      latitude: this.toNumber(row?.lat ?? row?.latitude ?? row?.Latitude),
      longitude: this.toNumber(row?.long ?? row?.lng ?? row?.longitude ?? row?.Longitude),
      source: 'backend',
      raw: row,
    };
  }

  private extractArray(value: any): any[] {
    if (Array.isArray(value)) return value;
    for (const candidate of [
      value?.data,
      value?.Data,
      value?.result,
      value?.Result,
      value?.vessels,
      value?.Vessels,
      value?.items,
      value?.Items,
      value?.rows,
      value?.Rows,
    ]) {
      if (Array.isArray(candidate)) return candidate;
    }
    return [];
  }

  private toStringArray(value: unknown): string[] {
    if (Array.isArray(value)) return value.map(String).filter(Boolean);
    if (typeof value === 'string') {
      return value.split(',').map((item) => item.trim()).filter(Boolean);
    }
    return [];
  }

  private toNumber(value: unknown): number | undefined {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private readStore(): LocalSettingsStore {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return { records: [], deletedIds: [] };
      const parsed = JSON.parse(raw);
      return {
        records: Array.isArray(parsed?.records) ? parsed.records : [],
        deletedIds: Array.isArray(parsed?.deletedIds) ? parsed.deletedIds : [],
      };
    } catch {
      return { records: [], deletedIds: [] };
    }
  }

  private writeStore(store: LocalSettingsStore): void {
    localStorage.setItem(this.storageKey, JSON.stringify(store));
  }
}
