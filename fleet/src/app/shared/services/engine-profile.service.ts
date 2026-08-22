import { HttpClient, HttpContext, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, shareReplay, switchMap, take, tap, timeout } from 'rxjs';

import { SKIP_AUTH_REDIRECT } from '../../core/interceptors/http-context.tokens';
import {
  ENGINE_PROFILE_STORAGE_KEY,
  EngineFormulaPresetId,
  EngineProfileCategory,
  EngineProfileRecord,
  EngineTelemetryMapping,
  SettingsPersistenceTarget,
} from '../models/settings.model';
import { AuthService } from './auth.service';
import { DatabaseApiConfigService } from './database-api-config.service';

interface LocalEngineProfileStore {
  records: EngineProfileRecord[];
  deletedSeedIds: string[];
}

@Injectable({ providedIn: 'root' })
export class EngineProfileService {
  private profiles$?: Observable<EngineProfileRecord[]>;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private databaseConfig: DatabaseApiConfigService,
  ) {}

  getProfiles(forceRefresh = false): Observable<EngineProfileRecord[]> {
    if (forceRefresh) this.profiles$ = undefined;

    if (!this.profiles$) {
      const seed$ = this.http.get<unknown>('/engine-profiles.json').pipe(
        map((response) =>
          this.extractArray(response).map((row, index) => this.normalize(row, index, 'seed')),
        ),
        catchError((error) => {
          console.warn('[EngineProfileService] seed profile file unavailable:', error);
          return of([] as EngineProfileRecord[]);
        }),
      );

      this.profiles$ = this.databaseConfig.config$.pipe(
        switchMap((config) => {
          if (!config.engineProfiles.enabled) {
            return seed$.pipe(map((seed) => this.mergeLocal(seed)));
          }

          return this.loadBackend(
            config.engineProfiles.url,
            config.engineProfiles.method,
            config.engineProfiles.timeoutMs,
          ).pipe(
            switchMap((backendRows) => {
              if (backendRows.length) return of(this.mergeLocal(backendRows));
              return seed$.pipe(map((seed) => this.mergeLocal(seed)));
            }),
            catchError((error) => {
              console.warn(
                '[EngineProfileService] backend unavailable; using local profile library:',
                error,
              );
              return seed$.pipe(map((seed) => this.mergeLocal(seed)));
            }),
          );
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }

    return this.profiles$;
  }

  saveProfile(record: EngineProfileRecord): Observable<SettingsPersistenceTarget> {
    const normalized = this.normalize(record, 0, record.source === 'backend' ? 'backend' : 'local');
    return this.databaseConfig.config$.pipe(
      take(1),
      switchMap((config) => {
        if (!config.engineProfiles.enabled) {
          this.upsertLocal(normalized);
          this.profiles$ = undefined;
          return of('browser' as const);
        }

        const url = `${this.trimUrl(config.engineProfiles.url)}/${encodeURIComponent(normalized.id)}`;
        const context = new HttpContext().set(SKIP_AUTH_REDIRECT, true);
        return this.http.put(url, normalized, { context, headers: this.getAuthHeaders() }).pipe(
          timeout(config.engineProfiles.timeoutMs),
          tap(() => {
            this.upsertLocal({ ...normalized, source: 'backend' });
            this.profiles$ = undefined;
          }),
          map(() => 'database' as const),
          catchError((error) => {
            console.warn('[EngineProfileService] save fell back to browser:', error);
            this.upsertLocal(normalized);
            this.profiles$ = undefined;
            return of('browser' as const);
          }),
        );
      }),
    );
  }

  deleteProfile(id: string): Observable<SettingsPersistenceTarget> {
    return this.databaseConfig.config$.pipe(
      take(1),
      switchMap((config) => {
        if (!config.engineProfiles.enabled) {
          this.deleteLocal(id);
          this.profiles$ = undefined;
          return of('browser' as const);
        }

        const url = `${this.trimUrl(config.engineProfiles.url)}/${encodeURIComponent(id)}`;
        const context = new HttpContext().set(SKIP_AUTH_REDIRECT, true);
        return this.http.delete(url, { context, headers: this.getAuthHeaders() }).pipe(
          timeout(config.engineProfiles.timeoutMs),
          tap(() => {
            this.deleteLocal(id);
            this.profiles$ = undefined;
          }),
          map(() => 'database' as const),
          catchError((error) => {
            console.warn('[EngineProfileService] delete fell back to browser:', error);
            this.deleteLocal(id);
            this.profiles$ = undefined;
            return of('browser' as const);
          }),
        );
      }),
    );
  }

  createEmptyProfile(): EngineProfileRecord {
    const now = new Date().toISOString();
    return {
      id: '',
      name: '',
      manufacturer: '',
      model: '',
      category: 'main',
      fuelType: 'Marine Diesel Oil',
      ratedPowerKw: null,
      ratedRpm: null,
      cylinders: null,
      formulaPresetId: 'main-diesel-standard-v1',
      telemetryMapping: this.emptyTelemetryMapping(),
      description: '',
      createdAt: now,
      updatedAt: now,
      source: 'local',
    };
  }

  createProfileId(name: string): string {
    const slug =
      name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'engine-profile';
    return `${slug}-${Date.now().toString(36)}`;
  }

  private loadBackend(
    url: string,
    method: 'GET' | 'POST',
    timeoutMs: number,
  ): Observable<EngineProfileRecord[]> {
    const context = new HttpContext().set(SKIP_AUTH_REDIRECT, true);
    const headers = this.getAuthHeaders();
    const request$ =
      method === 'GET'
        ? this.http.get(url, { context, headers })
        : this.http.post(url, { page: 1, pageSize: 1000 }, { context, headers });

    return request$.pipe(
      timeout(timeoutMs),
      map((response) =>
        this.extractArray(response).map((row, index) => this.normalize(row, index, 'backend')),
      ),
    );
  }

  private normalize(
    row: any,
    index: number,
    source: EngineProfileRecord['source'],
  ): EngineProfileRecord {
    const name = String(row?.name ?? row?.Name ?? `Engine Profile ${index + 1}`).trim();
    const category = this.normalizeCategory(
      row?.category ?? row?.Category ?? row?.type ?? row?.Type,
    );
    const formulaPresetId = this.normalizeFormulaPreset(
      row?.formulaPresetId ?? row?.FormulaPresetId ?? row?.formula ?? row?.Formula,
      category,
    );
    const mapping = row?.telemetryMapping ?? row?.TelemetryMapping ?? {};
    const createdAt = this.toIsoDate(row?.createdAt ?? row?.CreatedAt) || new Date().toISOString();

    return {
      id: String(row?.id ?? row?.Id ?? row?._id ?? this.slug(name) ?? `engine-${index + 1}`).trim(),
      name,
      manufacturer: String(
        row?.manufacturer ?? row?.Manufacturer ?? row?.brand ?? row?.Brand ?? '',
      ).trim(),
      model: String(row?.model ?? row?.Model ?? '').trim(),
      category,
      fuelType: String(row?.fuelType ?? row?.FuelType ?? row?.fuel ?? row?.Fuel ?? '').trim(),
      ratedPowerKw: this.toNullablePositiveNumber(
        row?.ratedPowerKw ?? row?.RatedPowerKw ?? row?.ratedPower,
      ),
      ratedRpm: this.toNullablePositiveNumber(row?.ratedRpm ?? row?.RatedRpm ?? row?.rpm),
      cylinders: this.toNullablePositiveInteger(row?.cylinders ?? row?.Cylinders),
      formulaPresetId,
      telemetryMapping: {
        powerKwTag: String(mapping?.powerKwTag ?? mapping?.PowerKwTag ?? '').trim(),
        rpmTag: String(mapping?.rpmTag ?? mapping?.RpmTag ?? '').trim(),
        fuelRateKgPerHourTag: String(
          mapping?.fuelRateKgPerHourTag ?? mapping?.FuelRateKgPerHourTag ?? '',
        ).trim(),
        runningHoursTag: String(mapping?.runningHoursTag ?? mapping?.RunningHoursTag ?? '').trim(),
        statusTag: String(mapping?.statusTag ?? mapping?.StatusTag ?? '').trim(),
      },
      description: String(row?.description ?? row?.Description ?? '').trim(),
      createdAt,
      updatedAt: this.toIsoDate(row?.updatedAt ?? row?.UpdatedAt) || createdAt,
      source,
      raw: source === 'local' ? undefined : row,
    };
  }

  private mergeLocal(base: EngineProfileRecord[]): EngineProfileRecord[] {
    const store = this.readStore();
    const merged = new Map<string, EngineProfileRecord>();
    base
      .filter((profile) => !store.deletedSeedIds.includes(profile.id))
      .forEach((profile) => merged.set(profile.id, profile));
    store.records.forEach((profile) => merged.set(profile.id, profile));
    return Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  private upsertLocal(profile: EngineProfileRecord): void {
    const store = this.readStore();
    const { raw: _raw, ...serializable } = profile;
    const normalized = {
      ...serializable,
      source: 'local' as const,
      updatedAt: new Date().toISOString(),
    };
    const records = store.records.filter((item) => item.id !== normalized.id);
    records.push(normalized);
    this.writeStore({
      records,
      deletedSeedIds: store.deletedSeedIds.filter((id) => id !== normalized.id),
    });
  }

  private deleteLocal(id: string): void {
    const store = this.readStore();
    const seedIds = new Set([
      'generic-main-diesel',
      'generic-generator-engine',
      'telemetry-only-engine',
    ]);
    this.writeStore({
      records: store.records.filter((item) => item.id !== id),
      deletedSeedIds: seedIds.has(id)
        ? Array.from(new Set([...store.deletedSeedIds, id]))
        : store.deletedSeedIds,
    });
  }

  private readStore(): LocalEngineProfileStore {
    try {
      const parsed = JSON.parse(localStorage.getItem(ENGINE_PROFILE_STORAGE_KEY) || '{}');
      return {
        records: Array.isArray(parsed?.records)
          ? parsed.records.map((row: unknown, index: number) => this.normalize(row, index, 'local'))
          : [],
        deletedSeedIds: Array.isArray(parsed?.deletedSeedIds)
          ? parsed.deletedSeedIds.map((id: unknown) => String(id))
          : [],
      };
    } catch {
      return { records: [], deletedSeedIds: [] };
    }
  }

  private writeStore(store: LocalEngineProfileStore): void {
    localStorage.setItem(ENGINE_PROFILE_STORAGE_KEY, JSON.stringify(store));
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return token ? this.authService.getAuthHeaders() : new HttpHeaders();
  }

  private extractArray(response: any): any[] {
    if (Array.isArray(response)) return response;
    const candidates = [
      response?.data,
      response?.items,
      response?.rows,
      response?.result,
      response?.records,
    ];
    return candidates.find(Array.isArray) || [];
  }

  private normalizeCategory(value: unknown): EngineProfileCategory {
    const category = String(value ?? '')
      .trim()
      .toLowerCase();
    if (category.includes('aux')) return 'auxiliary';
    if (category.includes('gen')) return 'generator';
    if (category.includes('main') || category.includes('propulsion')) return 'main';
    return 'other';
  }

  private normalizeFormulaPreset(
    value: unknown,
    category: EngineProfileCategory,
  ): EngineFormulaPresetId {
    const preset = String(value ?? '')
      .trim()
      .toLowerCase();
    if (preset === 'main-diesel-standard-v1') return preset;
    if (preset === 'generator-standard-v1') return preset;
    if (preset === 'telemetry-only-v1') return preset;
    if (preset === 'custom-v1') return preset;
    if (category === 'generator' || category === 'auxiliary') return 'generator-standard-v1';
    if (category === 'main') return 'main-diesel-standard-v1';
    return 'telemetry-only-v1';
  }

  private emptyTelemetryMapping(): EngineTelemetryMapping {
    return {
      powerKwTag: '',
      rpmTag: '',
      fuelRateKgPerHourTag: '',
      runningHoursTag: '',
      statusTag: '',
    };
  }

  private toNullablePositiveNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : null;
  }

  private toNullablePositiveInteger(value: unknown): number | null {
    const number = this.toNullablePositiveNumber(value);
    return number === null ? null : Math.round(number);
  }

  private toIsoDate(value: unknown): string | undefined {
    if (!value) return undefined;
    const date = new Date(String(value));
    return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
  }

  private trimUrl(value: string): string {
    return String(value || '').replace(/\/+$/, '');
  }

  private slug(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
