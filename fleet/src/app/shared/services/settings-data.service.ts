import { HttpClient, HttpContext, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  Observable,
  catchError,
  concat,
  defaultIfEmpty,
  filter,
  forkJoin,
  from,
  map,
  merge,
  of,
  shareReplay,
  switchMap,
  take,
  tap,
  timeout,
} from 'rxjs';

import { SKIP_AUTH_REDIRECT } from '../../core/interceptors/http-context.tokens';
import { ResolvedDatabaseEndpoint } from '../models/database-api.model';
import {
  ENGINE_PROFILE_STORAGE_KEY,
  FleetModuleKey,
  SettingsPersistenceTarget,
  USER_ACCESS_STORAGE_KEY,
  UserAccessRecord,
  UserAccessRole,
  UserModulePermissionMap,
  UserPresenceStatus,
  UserSessionRecord,
  VESSEL_GROUP_STORAGE_KEY,
  VesselGroupRecord,
  VesselEngineAssignment,
  VesselSettingsRecord,
  VesselSettingsStatus,
} from '../models/settings.model';
import {
  getVesselStatusFromLastSeenLabel,
  getVesselStatusFromTimestamp,
} from '../utils/vessel-status.util';
import { AuthService } from './auth.service';
import { DatabaseApiConfigService } from './database-api-config.service';
import { HttpClientService } from './http-client.service';
import { NewHttpClientService } from './http-client1.service';
import { FleetVesselDataService } from './fleet-vessel-data.service';

interface LocalSettingsStore {
  records: VesselSettingsRecord[];
  deletedIds: string[];
}

@Injectable({ providedIn: 'root' })
export class SettingsDataService {
  private readonly storageKey = 'fleet-settings-vessels-v1';
  private readonly groupStorageKey = VESSEL_GROUP_STORAGE_KEY;
  private readonly userAccessStorageKey = USER_ACCESS_STORAGE_KEY;
  private backendVessels$?: Observable<VesselSettingsRecord[]>;
  private vesselGroups$?: Observable<VesselGroupRecord[]>;
  private userSessions$?: Observable<UserSessionRecord[]>;
  private userAccess$?: Observable<UserAccessRecord[]>;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private backend: HttpClientService,
    private directBackend: NewHttpClientService,
    private databaseConfig: DatabaseApiConfigService,
    private fleetVesselData: FleetVesselDataService,
  ) {}





  getVessels(forceRefresh = false): Observable<VesselSettingsRecord[]> {
    if (forceRefresh) this.backendVessels$ = undefined;

    if (!this.backendVessels$) {
      const cachedRows = this.getCachedOverviewVessels();
      const backendRows$ = this.databaseConfig.config$.pipe(
        switchMap((config) => {
          const live$ = config.fallback.vesselsToCurrentInfo
            ? this.loadCurrentInfoVessels().pipe(catchError(() => of([])))
            : of([] as VesselSettingsRecord[]);

          if (!config.vessels.enabled) return live$;

          const metadata$ = this.migrateLocalVessels(config.vessels).pipe(
            switchMap(() => this.loadDatabaseVessels(config.vessels)),
            catchError((error) => {
              console.warn('[SettingsDataService] admin vessel database unavailable:', error);
              return of([] as VesselSettingsRecord[]);
            }),
          );

          return forkJoin({ live: live$, metadata: metadata$ }).pipe(
            map(({ live, metadata }) => this.mergeBackendMetadata(live, metadata)),
          );
        }),
      );




      this.backendVessels$ = (cachedRows.length
        ? concat(of(cachedRows), backendRows$)
        : backendRows$
      ).pipe(shareReplay({ bufferSize: 1, refCount: false }));
    }

    return this.backendVessels$.pipe(map((rows) => this.mergeLocalChanges(rows)));
  }

  saveVessel(record: VesselSettingsRecord): Observable<SettingsPersistenceTarget> {
    const normalized: VesselSettingsRecord = {
      ...record,
      id: record.id.trim(),
      name: record.name.trim(),
      prefix: record.prefix.trim(),
      nationality: record.nationality.trim(),
      customer: record.customer.trim(),
      owner: record.owner.trim(),
      agency: record.agency.trim(),
      description: record.description.trim(),
      groups: this.uniqueStrings(record.groups),
      engines: this.uniqueStrings(record.engines),
      engineAssignments: this.normalizeEngineAssignments(record.engineAssignments, record.engines),
    };

    return this.databaseConfig.config$.pipe(
      take(1),
      switchMap((config) => {
        if (!config.vessels.enabled) {
          this.saveVesselLocally(normalized);
          return of('browser' as const);
        }

        const context = new HttpContext().set(SKIP_AUTH_REDIRECT, true);
        const url = `${this.trimUrl(config.vessels.url)}/${encodeURIComponent(normalized.id)}`;
        return this.http.put(url, normalized, { context, headers: this.getAuthHeaders() }).pipe(
          timeout(config.vessels.timeoutMs),
          tap(() => {
            this.removeLocalVesselOverride(normalized.id);
            this.backendVessels$ = undefined;
            this.vesselGroups$ = undefined;
          }),
          map(() => 'database' as const),
          catchError((error) => {
            console.warn('[SettingsDataService] save vessel fell back to browser:', error);
            this.saveVesselLocally(normalized);
            return of('browser' as const);
          }),
        );
      }),
    );
  }

  deleteVessel(id: string): Observable<SettingsPersistenceTarget> {
    return this.databaseConfig.config$.pipe(
      take(1),
      switchMap((config) => {
        if (!config.vessels.enabled) {
          this.deleteVesselLocally(id);
          return of('browser' as const);
        }

        const context = new HttpContext().set(SKIP_AUTH_REDIRECT, true);
        const url = `${this.trimUrl(config.vessels.url)}/${encodeURIComponent(id)}`;
        return this.http.delete(url, { context, headers: this.getAuthHeaders() }).pipe(
          timeout(config.vessels.timeoutMs),
          tap(() => {
            this.removeLocalVesselOverride(id);
            this.backendVessels$ = undefined;
            this.vesselGroups$ = undefined;
          }),
          map(() => 'database' as const),
          catchError((error) => {
            console.warn('[SettingsDataService] delete vessel fell back to browser:', error);
            this.deleteVesselLocally(id);
            return of('browser' as const);
          }),
        );
      }),
    );
  }

  getVesselGroups(forceRefresh = false): Observable<VesselGroupRecord[]> {
    if (forceRefresh) this.vesselGroups$ = undefined;

    if (!this.vesselGroups$) {
      this.vesselGroups$ = this.databaseConfig.config$.pipe(
        switchMap((config) => {
          if (!config.vesselGroups.enabled) return of(this.readLocalGroups());
          return this.loadDatabaseVesselGroups(config.vesselGroups).pipe(
            switchMap((groups) => {
              if (groups.length) {
                this.writeLocalGroups(groups);
                return of(groups);
              }

              const localGroups = this.readLocalGroups();
              if (!localGroups.length) return of(groups);
              return this.migrateLocalGroups(config.vesselGroups, localGroups).pipe(
                tap((migrated) => this.writeLocalGroups(migrated)),
                catchError(() => of(localGroups)),
              );
            }),
            catchError((error) => {
              console.warn('[SettingsDataService] vessel group database unavailable:', error);
              return of(this.readLocalGroups());
            }),
          );
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }

    return this.vesselGroups$;
  }

  saveVesselGroup(group: VesselGroupRecord): Observable<SettingsPersistenceTarget> {
    const normalized: VesselGroupRecord = {
      ...group,
      id: group.id.trim(),
      name: group.name.trim(),
      description: group.description.trim(),
      vesselIds: this.uniqueStrings(group.vesselIds),
      createdAt: group.createdAt || new Date().toISOString(),
      source: group.source || 'local',
    };

    return this.databaseConfig.config$.pipe(
      take(1),
      switchMap((config) => {
        if (!config.vesselGroups.enabled) {
          this.upsertLocalGroup(normalized);
          return of('browser' as const);
        }

        const context = new HttpContext().set(SKIP_AUTH_REDIRECT, true);
        const url = `${this.trimUrl(config.vesselGroups.url)}/${encodeURIComponent(normalized.id)}`;
        return this.http.put(url, normalized, { context, headers: this.getAuthHeaders() }).pipe(
          timeout(config.vesselGroups.timeoutMs),
          tap(() => {
            this.upsertLocalGroup({ ...normalized, source: 'backend' });
            this.vesselGroups$ = undefined;
            this.backendVessels$ = undefined;
          }),
          map(() => 'database' as const),
          catchError((error) => {
            console.warn('[SettingsDataService] save group fell back to browser:', error);
            this.upsertLocalGroup(normalized);
            return of('browser' as const);
          }),
        );
      }),
    );
  }

  deleteVesselGroup(id: string): Observable<SettingsPersistenceTarget> {
    return this.databaseConfig.config$.pipe(
      take(1),
      switchMap((config) => {
        if (!config.vesselGroups.enabled) {
          this.removeLocalGroup(id);
          return of('browser' as const);
        }

        const context = new HttpContext().set(SKIP_AUTH_REDIRECT, true);
        const url = `${this.trimUrl(config.vesselGroups.url)}/${encodeURIComponent(id)}`;
        return this.http.delete(url, { context, headers: this.getAuthHeaders() }).pipe(
          timeout(config.vesselGroups.timeoutMs),
          tap(() => {
            this.removeLocalGroup(id);
            this.vesselGroups$ = undefined;
            this.backendVessels$ = undefined;
          }),
          map(() => 'database' as const),
          catchError((error) => {
            console.warn('[SettingsDataService] delete group fell back to browser:', error);
            this.removeLocalGroup(id);
            return of('browser' as const);
          }),
        );
      }),
    );
  }






  getUserSessions(forceRefresh = false): Observable<UserSessionRecord[]> {
    if (forceRefresh) this.userSessions$ = undefined;

    if (!this.userSessions$) {
      this.userSessions$ = this.databaseConfig.config$.pipe(
        switchMap((config) => {
          if (!config.userSessions.enabled) return of([this.currentSessionRecord()]);
          return this.loadDatabaseUserSessions(config.userSessions).pipe(
            map((rows) => (rows.length ? rows : [this.currentSessionRecord()])),
            catchError(() => of([this.currentSessionRecord()])),
          );
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }

    return this.userSessions$;
  }


  getUserAccessRecords(forceRefresh = false): Observable<UserAccessRecord[]> {
    if (forceRefresh) this.userAccess$ = undefined;

    if (!this.userAccess$) {
      this.userAccess$ = this.databaseConfig.config$.pipe(
        switchMap((config) => {
          const localRecords = this.ensureCurrentAdministrator(this.readLocalUserAccessRecords());
          if (!config.userAccess.enabled) return of(localRecords);
          return this.loadDatabaseUserAccess(config.userAccess).pipe(
            map((rows) => {
              const resolved = rows.length ? rows : localRecords;
              this.writeLocalUserAccessRecords(resolved);
              return resolved;
            }),
            catchError((error) => {
              console.warn('[SettingsDataService] user access database unavailable:', error);
              return of(localRecords);
            }),
          );
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }

    return this.userAccess$;
  }

  saveUserAccess(record: UserAccessRecord): Observable<SettingsPersistenceTarget> {
    const normalized = this.normalizeUserAccess(record, 0, 'local');
    return this.databaseConfig.config$.pipe(
      take(1),
      switchMap((config) => {
        if (!config.userAccess.enabled) {
          this.upsertLocalUserAccess(normalized);
          this.userAccess$ = undefined;
          return of('browser' as const);
        }

        const context = new HttpContext().set(SKIP_AUTH_REDIRECT, true);
        const url = `${this.trimUrl(config.userAccess.url)}/${encodeURIComponent(normalized.id)}`;
        return this.http.put(url, normalized, { context, headers: this.getAuthHeaders() }).pipe(
          timeout(config.userAccess.timeoutMs),
          tap(() => {
            this.upsertLocalUserAccess({ ...normalized, source: 'backend' });
            this.userAccess$ = undefined;
          }),
          map(() => 'database' as const),
          catchError((error) => {
            console.warn('[SettingsDataService] save user access fell back to browser:', error);
            this.upsertLocalUserAccess(normalized);
            this.userAccess$ = undefined;
            return of('browser' as const);
          }),
        );
      }),
    );
  }

  deleteUserAccess(id: string): Observable<SettingsPersistenceTarget> {
    return this.databaseConfig.config$.pipe(
      take(1),
      switchMap((config) => {
        if (!config.userAccess.enabled) {
          this.removeLocalUserAccess(id);
          this.userAccess$ = undefined;
          return of('browser' as const);
        }

        const context = new HttpContext().set(SKIP_AUTH_REDIRECT, true);
        const url = `${this.trimUrl(config.userAccess.url)}/${encodeURIComponent(id)}`;
        return this.http.delete(url, { context, headers: this.getAuthHeaders() }).pipe(
          timeout(config.userAccess.timeoutMs),
          tap(() => {
            this.removeLocalUserAccess(id);
            this.userAccess$ = undefined;
          }),
          map(() => 'database' as const),
          catchError((error) => {
            console.warn('[SettingsDataService] delete user access fell back to browser:', error);
            this.removeLocalUserAccess(id);
            this.userAccess$ = undefined;
            return of('browser' as const);
          }),
        );
      }),
    );
  }

  resetLocalChanges(): void {
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(this.groupStorageKey);
    localStorage.removeItem(this.userAccessStorageKey);
    localStorage.removeItem(ENGINE_PROFILE_STORAGE_KEY);
    this.backendVessels$ = undefined;
    this.vesselGroups$ = undefined;
    this.userAccess$ = undefined;
  }

  private migrateLocalVessels(endpoint: ResolvedDatabaseEndpoint): Observable<void> {
    const store = this.readStore();
    if (!store.records.length) return of(undefined);

    const context = new HttpContext().set(SKIP_AUTH_REDIRECT, true);
    const headers = this.getAuthHeaders();
    const requests = store.records.map((record) => {
      const url = `${this.trimUrl(endpoint.url)}/${encodeURIComponent(record.id)}`;
      return this.http.put(url, record, { context, headers }).pipe(timeout(endpoint.timeoutMs));
    });

    return forkJoin(requests).pipe(
      tap(() => {
        this.writeStore({ records: [], deletedIds: store.deletedIds });
      }),
      map(() => undefined),
    );
  }

  private migrateLocalGroups(
    endpoint: ResolvedDatabaseEndpoint,
    groups: VesselGroupRecord[],
  ): Observable<VesselGroupRecord[]> {
    const context = new HttpContext().set(SKIP_AUTH_REDIRECT, true);
    const headers = this.getAuthHeaders();
    const requests = groups.map((group) => {
      const url = `${this.trimUrl(endpoint.url)}/${encodeURIComponent(group.id)}`;
      return this.http.put<any>(url, group, { context, headers }).pipe(
        timeout(endpoint.timeoutMs),
        map((response) => {
          const row = response?.data ?? response;
          return this.normalizeVesselGroup(row, 0);
        }),
      );
    });
    return requests.length ? forkJoin(requests) : of([]);
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
        this.extractArray(response).map((row, index) => this.normalizeVessel(row, index)),
      ),
    );
  }

  private loadDatabaseVesselGroups(
    endpoint: ResolvedDatabaseEndpoint,
  ): Observable<VesselGroupRecord[]> {
    const context = new HttpContext().set(SKIP_AUTH_REDIRECT, true);
    const headers = this.getAuthHeaders();
    const request$ = endpoint.method === 'GET'
      ? this.http.get(endpoint.url, { context, headers })
      : this.http.post(endpoint.url, { page: 1, pageSize: 5000 }, { context, headers });

    return request$.pipe(
      timeout(endpoint.timeoutMs),
      map((response: any) =>
        this.extractArray(response).map((row, index) => this.normalizeVesselGroup(row, index)),
      ),
    );
  }

  private loadDatabaseUserSessions(
    endpoint: ResolvedDatabaseEndpoint,
  ): Observable<UserSessionRecord[]> {
    const context = new HttpContext().set(SKIP_AUTH_REDIRECT, true);
    const headers = this.getAuthHeaders();
    const request$ = endpoint.method === 'GET'
      ? this.http.get(endpoint.url, { context, headers })
      : this.http.post(
          endpoint.url,
          { includeOffline: true, activeWithinMinutes: 30, page: 1, pageSize: 1000 },
          { context, headers },
        );

    return request$.pipe(
      timeout(endpoint.timeoutMs),
      map((response: any) =>
        this.extractArray(response).map((row, index) => this.normalizeUserSession(row, index)),
      ),
    );
  }


  private loadDatabaseUserAccess(
    endpoint: ResolvedDatabaseEndpoint,
  ): Observable<UserAccessRecord[]> {
    const context = new HttpContext().set(SKIP_AUTH_REDIRECT, true);
    const headers = this.getAuthHeaders();
    const request$ = endpoint.method === 'GET'
      ? this.http.get(endpoint.url, { context, headers })
      : this.http.post(endpoint.url, { page: 1, pageSize: 5000 }, { context, headers });

    return request$.pipe(
      timeout(endpoint.timeoutMs),
      map((response: any) =>
        this.extractArray(response).map((row, index) => this.normalizeUserAccess(row, index, 'backend')),
      ),
    );
  }





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
      map((rows) => rows.map((row, index) => this.normalizeVessel(row, index))),
    );
  }

  private getCachedOverviewVessels(): VesselSettingsRecord[] {
    const snapshot = this.fleetVesselData.getSnapshot();
    if (!Array.isArray(snapshot) || snapshot.length === 0) return [];

    return snapshot
      .map((row: any, index: number) =>
        this.normalizeVessel(row?.fvInfo ?? row?.fv ?? row, index),
      )
      .filter((row) => !!row.id && !!row.name);
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return token ? this.authService.getAuthHeaders() : new HttpHeaders();
  }

  private mergeBackendMetadata(
    liveRows: VesselSettingsRecord[],
    metadataRows: VesselSettingsRecord[],
  ): VesselSettingsRecord[] {
    const liveByKey = new Map<string, VesselSettingsRecord>();
    const merged = new Map<string, VesselSettingsRecord>();

    for (const live of liveRows) {
      for (const key of this.vesselKeys(live)) liveByKey.set(key, live);
      merged.set(live.id, live);
    }

    for (const metadata of metadataRows) {
      const live = this.vesselKeys(metadata)
        .map((key) => liveByKey.get(key))
        .find((row): row is VesselSettingsRecord => !!row);

      if (!live) {
        merged.set(metadata.id, metadata);
        continue;
      }

      merged.delete(live.id);
      merged.set(live.id, {
        ...live,
        id: live.id,
        name: metadata.name || live.name,
        prefix: metadata.prefix || live.prefix,
        image: metadata.image || live.image,
        description: metadata.description || live.description,
        nationality: metadata.nationality || live.nationality,
        customer: metadata.customer || live.customer,
        owner: metadata.owner || live.owner,
        agency: metadata.agency || live.agency,
        groups: this.uniqueStrings([...live.groups, ...metadata.groups]),
        engines: metadata.engines.length ? metadata.engines : live.engines,
        engineAssignments: metadata.engineAssignments?.length
          ? metadata.engineAssignments
          : live.engineAssignments,
        status: live.status,
        lastSeenAt: live.lastSeenAt,
        lastSeenLabel: live.lastSeenLabel,
        latitude: live.latitude,
        longitude: live.longitude,
        source: 'backend',
        raw: { telemetry: live.raw, metadata: metadata.raw },
      });
    }

    return Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  private vesselKeys(row: VesselSettingsRecord): string[] {
    return this.uniqueStrings([row.id, row.prefix, row.name]).map((value) => value.toLowerCase());
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

  private normalizeVessel(row: any, index: number): VesselSettingsRecord {
    const name = String(
      row?.name ?? row?.Name ?? row?.vesselName ?? row?.VesselName ?? `Vessel ${index + 1}`,
    );
    const prefix = String(row?.prefix ?? row?.Prefix ?? row?.fvPrefix ?? row?.code ?? '').trim();
    const id = String(row?.id ?? row?.Id ?? row?._id ?? row?.vesselId ?? prefix ?? name).trim();
    const statusText = String(row?.status ?? row?.Status ?? row?.state ?? '').toLowerCase();
    const explicitStatus: VesselSettingsStatus = /idle|standby|stale/.test(statusText)
      ? 'idle'
      : /online|active|true|1|normal/.test(statusText)
        ? 'online'
        : /offline|inactive|false|0|down/.test(statusText)
          ? 'offline'
          : 'unknown';

    const rawLastSeen =
      row?.lastSeenAt ??
      row?.LastSeenAt ??
      row?.lastSeen ??
      row?.LastSeen ??
      row?.updatedAt ??
      row?.UpdatedAt ??
      row?.timestamp ??
      row?.Timestamp ??
      row?.receivedAt ??
      row?.ReceivedAt ??
      row?.lastUpdate ??
      row?.LastUpdate;
    const compactLastSeen =
      row?.lastSeenLabel ?? row?.LastSeenLabel ?? row?.lastSeenText ?? row?.LastSeenText ?? rawLastSeen;
    const normalizedLastSeen = this.toIsoDate(rawLastSeen);
    const timestampStatus = normalizedLastSeen
      ? getVesselStatusFromTimestamp(normalizedLastSeen)
      : 'nodata';
    const labelStatus = getVesselStatusFromLastSeenLabel(compactLastSeen);
    const derivedStatus = timestampStatus !== 'nodata' ? timestampStatus : labelStatus;
    const status: VesselSettingsStatus = derivedStatus === 'nodata' ? explicitStatus : derivedStatus;

    return {
      id: id || `vessel-${index + 1}`,
      name,
      prefix: prefix || id,
      image: String(row?.image ?? row?.Image ?? row?.imageUrl ?? row?.picture ?? ''),
      description: String(row?.description ?? row?.Description ?? ''),
      nationality: String(row?.nationality ?? row?.Nationality ?? row?.country ?? ''),
      customer: String(row?.customer ?? row?.Customer ?? row?.clientName ?? ''),
      owner: String(row?.owner ?? row?.Owner ?? row?.ownerName ?? ''),
      agency: String(row?.agency ?? row?.Agency ?? row?.agentName ?? ''),
      groups: this.toStringArray(row?.groups ?? row?.Groups ?? row?.group ?? row?.Group),
      engines: this.toStringArray(row?.engines ?? row?.Engines ?? row?.engine ?? row?.Engine),
      engineAssignments: this.normalizeEngineAssignments(
        row?.engineAssignments ?? row?.EngineAssignments,
        this.toStringArray(row?.engines ?? row?.Engines ?? row?.engine ?? row?.Engine),
      ),
      status,
      lastSeenAt: normalizedLastSeen,
      lastSeenLabel: this.isCompactLastSeen(compactLastSeen) ? String(compactLastSeen).trim() : '',
      latitude: this.toNumber(row?.lat ?? row?.latitude ?? row?.Latitude),
      longitude: this.toNumber(row?.long ?? row?.lng ?? row?.longitude ?? row?.Longitude),
      source: 'backend',
      raw: row,
    };
  }

  private normalizeEngineAssignments(
    value: unknown,
    legacyEngines: string[] = [],
  ): VesselEngineAssignment[] {
    if (Array.isArray(value)) {
      const normalized = value
        .map((item: any, index: number): VesselEngineAssignment | null => {
          const profileId = String(item?.profileId ?? item?.ProfileId ?? '').trim();
          const displayName = String(
            item?.displayName ?? item?.DisplayName ?? item?.name ?? item?.Name ?? '',
          ).trim();
          if (!profileId && !displayName) return null;
          const quantityValue = Number(item?.quantity ?? item?.Quantity ?? 1);
          const sourceValue = String(item?.source ?? item?.Source ?? '').trim().toLowerCase();
          const realtimeRow = Number(item?.realtimeRow ?? item?.RealtimeRow);
          const realtimeCol = Number(item?.realtimeCol ?? item?.RealtimeCol);
          return {
            id: String(item?.id ?? item?.Id ?? `${profileId || 'legacy'}-${index + 1}`).trim(),
            profileId,
            displayName: displayName || profileId,
            position: String(
              item?.position ?? item?.Position ?? `Engine ${index + 1}`,
            ).trim(),
            quantity: Number.isFinite(quantityValue)
              ? Math.min(12, Math.max(1, Math.round(quantityValue)))
              : 1,
            realtimeKey: String(item?.realtimeKey ?? item?.RealtimeKey ?? '').trim() || undefined,
            realtimeRow: Number.isFinite(realtimeRow) ? realtimeRow : undefined,
            realtimeCol: Number.isFinite(realtimeCol) ? realtimeCol : undefined,
            realtimeType: String(item?.realtimeType ?? item?.RealtimeType ?? '').trim() || undefined,
            source: sourceValue === 'realtime' || sourceValue === 'manual' || sourceValue === 'legacy'
              ? sourceValue as 'realtime' | 'manual' | 'legacy'
              : undefined,
          };
        })
        .filter((item): item is VesselEngineAssignment => !!item);
      if (normalized.length) return normalized;
    }

    return this.uniqueStrings(legacyEngines).map((name, index) => ({
      id: `legacy-${index + 1}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      profileId: '',
      displayName: name,
      position: `Engine ${index + 1}`,
      quantity: 1,
      source: 'legacy' as const,
    }));
  }

  private normalizeVesselGroup(row: any, index: number): VesselGroupRecord {
    const name = String(row?.name ?? row?.Name ?? `Group ${index + 1}`).trim();
    return {
      id: String(row?.id ?? row?.Id ?? row?._id ?? this.groupSlug(name)).trim(),
      name,
      description: String(row?.description ?? row?.Description ?? '').trim(),
      vesselIds: this.toStringArray(
        row?.vesselIds ?? row?.VesselIds ?? row?.members ?? row?.Members ?? row?.vessels,
      ),
      createdAt: this.toIsoDate(row?.createdAt ?? row?.CreatedAt) || new Date().toISOString(),
      updatedAt: this.toIsoDate(row?.updatedAt ?? row?.UpdatedAt),
      source: 'backend',
    };
  }

  private normalizeUserSession(row: any, index: number): UserSessionRecord {
    const username = String(
      row?.username ?? row?.Username ?? row?.userName ?? row?.UserName ?? row?.email ?? `User ${index + 1}`,
    ).trim();
    const displayName = String(
      row?.displayName ??
        row?.DisplayName ??
        row?.fullname ??
        row?.fullName ??
        row?.name ??
        row?.Name ??
        username,
    ).trim();
    const role = String(row?.role ?? row?.Role ?? row?.group ?? row?.Group ?? 'User').trim();
    const loginAt = this.toIsoDate(
      row?.loginAt ?? row?.LoginAt ?? row?.signedAt ?? row?.SignedAt ?? row?.createdAt,
    );
    const lastActiveAt = this.toIsoDate(
      row?.lastActiveAt ??
        row?.LastActiveAt ??
        row?.lastSeenAt ??
        row?.LastSeenAt ??
        row?.updatedAt ??
        row?.heartbeatAt ??
        loginAt,
    );
    const statusText = String(
      row?.status ?? row?.Status ?? row?.presence ?? row?.Presence ?? row?.isOnline ?? '',
    ).toLowerCase();
    const status = this.resolveUserPresence(statusText, lastActiveAt);

    return {
      id: String(row?.id ?? row?.Id ?? row?._id ?? row?.sessionId ?? username ?? index),
      username,
      displayName: displayName || username,
      role: role || 'User',
      status,
      loginAt,
      lastActiveAt,
      ipAddress: String(row?.ipAddress ?? row?.IPAddress ?? row?.ip ?? row?.remoteAddress ?? ''),
      device: String(row?.device ?? row?.Device ?? row?.deviceName ?? row?.platform ?? ''),
      browser: String(row?.browser ?? row?.Browser ?? row?.userAgent ?? ''),
      source: 'backend',
      raw: row,
    };
  }

  private normalizeUserAccess(
    row: any,
    index: number,
    source: UserAccessRecord['source'] = 'backend',
  ): UserAccessRecord {
    const username = String(
      row?.username ?? row?.Username ?? row?.userName ?? row?.UserName ?? `user-${index + 1}`,
    ).trim();
    const role = this.normalizeUserRole(row?.role ?? row?.Role ?? row?.group ?? row?.Group);
    const groupIds = this.toStringArray(row?.groupIds ?? row?.GroupIds ?? row?.groups ?? row?.Groups);
    const vesselIds = this.toStringArray(
      row?.vesselIds ?? row?.VesselIds ?? row?.siteAccess ?? row?.SiteAccess ?? row?.sites ?? row?.Sites,
    );
    const scopeText = String(row?.accessScope ?? row?.AccessScope ?? row?.scope ?? '').toLowerCase();
    const accessScope = scopeText === 'groups' || scopeText === 'vessels' || scopeText === 'all'
      ? scopeText
      : role === 'administrator'
        ? 'all'
        : groupIds.length
          ? 'groups'
          : 'vessels';

    return {
      id: String(row?.id ?? row?.Id ?? row?._id ?? username).trim(),
      username,
      displayName: String(
        row?.displayName ?? row?.DisplayName ?? row?.fullname ?? row?.fullName ?? row?.name ?? username,
      ).trim(),
      email: String(row?.email ?? row?.Email ?? '').trim(),
      role,
      status: String(row?.status ?? row?.Status ?? 'active').toLowerCase() === 'suspended'
        ? 'suspended'
        : 'active',
      accountId: String(row?.accountId ?? row?.AccountId ?? row?.identityId ?? row?.IdentityId ?? '').trim() || undefined,
      accountProvisioning: row?.accountProvisioning === 'managed' || row?.accountProvisioning === 'linked'
        ? row.accountProvisioning
        : row?.accountId || row?.AccountId
          ? 'managed'
          : 'access-only',
      accountLastSyncedAt: this.toIsoDate(row?.accountLastSyncedAt ?? row?.AccountLastSyncedAt),
      accessScope,
      groupIds,
      vesselIds,
      additionalVesselIds: this.toStringArray(
        row?.additionalVesselIds ?? row?.AdditionalVesselIds,
      ),
      excludedVesselIds: this.toStringArray(row?.excludedVesselIds ?? row?.ExcludedVesselIds),
      modulePermissions: this.normalizeModulePermissions(
        row?.modulePermissions ?? row?.ModulePermissions ?? row?.pageAccess ?? row?.PageAccess,
        role,
      ),
      createdAt: this.toIsoDate(row?.createdAt ?? row?.CreatedAt) || new Date().toISOString(),
      updatedAt: this.toIsoDate(row?.updatedAt ?? row?.UpdatedAt),
      source,
      raw: row,
    };
  }

  private normalizeUserRole(value: unknown): UserAccessRole {
    const role = String(value ?? '').trim().toLowerCase();
    if (role.includes('admin')) return 'administrator';
    if (role.includes('operator')) return 'operator';
    if (role.includes('custom')) return 'custom';
    return 'viewer';
  }

  private normalizeModulePermissions(value: any, role: UserAccessRole): UserModulePermissionMap {
    const modules: FleetModuleKey[] = [
      'overview', 'realtime', 'data-logger', 'chart', 'diagram', 'report', 'alarm', 'log', 'settings',
    ];
    const selected = Array.isArray(value)
      ? new Set(value.map((item) => String(item).trim().toLowerCase().replace(/[_\s]+/g, '-')))
      : null;

    return modules.reduce((permissions, module) => {
      const raw = value?.[module] ?? value?.[module.replace('-', '')] ?? value?.[module.toUpperCase()];
      const roleView = role === 'administrator' || module !== 'settings';
      const view = selected
        ? selected.has(module) || (module === 'data-logger' && selected.has('datalogger')) || (module === 'alarm' && selected.has('alerts'))
        : Boolean(raw?.view ?? raw?.View ?? roleView);
      permissions[module] = {
        view,
        export: Boolean(raw?.export ?? raw?.Export ?? (view && module !== 'overview' && module !== 'settings')),
        manage: Boolean(raw?.manage ?? raw?.Manage ?? (role === 'administrator')),
      };
      return permissions;
    }, {} as UserModulePermissionMap);
  }

  private ensureCurrentAdministrator(records: UserAccessRecord[]): UserAccessRecord[] {
    if (records.length) return records;
    const session = this.currentSessionRecord();
    const now = new Date().toISOString();
    const administrator = this.normalizeUserAccess({
      id: session.id,
      username: session.username,
      displayName: session.displayName,
      role: 'administrator',
      status: 'active',
      accessScope: 'all',
      createdAt: now,
      updatedAt: now,
    }, 0, 'session');
    this.writeLocalUserAccessRecords([administrator]);
    return [administrator];
  }

  private readLocalUserAccessRecords(): UserAccessRecord[] {
    try {
      const rows = JSON.parse(localStorage.getItem(this.userAccessStorageKey) || '[]');
      return Array.isArray(rows)
        ? rows.map((row, index) => this.normalizeUserAccess(row, index, row?.source || 'local'))
        : [];
    } catch {
      return [];
    }
  }

  private writeLocalUserAccessRecords(records: UserAccessRecord[]): void {
    localStorage.setItem(this.userAccessStorageKey, JSON.stringify(records));
  }

  private upsertLocalUserAccess(record: UserAccessRecord): void {
    const rows = this.readLocalUserAccessRecords();
    const normalizedUsername = record.username.trim().toLowerCase();
    const index = rows.findIndex(
      (item) => item.id === record.id || item.username.trim().toLowerCase() === normalizedUsername,
    );
    if (index >= 0) rows[index] = record;
    else rows.unshift(record);
    this.writeLocalUserAccessRecords(rows);
  }

  private removeLocalUserAccess(id: string): void {
    const rows = this.readLocalUserAccessRecords().filter((item) => item.id !== id);
    this.writeLocalUserAccessRecords(rows);
  }

  private currentSessionRecord(): UserSessionRecord {
    let rawUser: any = {};
    try {
      rawUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
    } catch {
      rawUser = {};
    }
    const username =
      this.authService.getUser() ||
      localStorage.getItem('username') ||
      sessionStorage.getItem('username') ||
      'Current user';
    const role = String(rawUser?.role ?? rawUser?.Role ?? rawUser?.Group ?? rawUser?.group ?? 'Administrator');
    const now = new Date().toISOString();

    return {
      id: String(rawUser?._id ?? rawUser?.id ?? username),
      username,
      displayName: String(rawUser?.fullname ?? rawUser?.fullName ?? rawUser?.name ?? username),
      role,
      status: 'online',
      loginAt: this.toIsoDate(rawUser?.signedAt ?? rawUser?.loginAt) || now,
      lastActiveAt: now,
      device: this.browserDeviceLabel(),
      browser: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      source: 'session',
      raw: rawUser,
    };
  }

  private resolveUserPresence(statusText: string, lastActiveAt?: string): UserPresenceStatus {
    if (/offline|loggedout|signedout|false|0/.test(statusText)) return 'offline';
    if (/idle|away|inactive/.test(statusText)) return 'idle';
    if (/online|active|true|1/.test(statusText)) return 'online';
    if (!lastActiveAt) return 'unknown';

    const elapsedMinutes = Math.max(0, (Date.now() - new Date(lastActiveAt).getTime()) / 60_000);
    if (elapsedMinutes <= 5) return 'online';
    if (elapsedMinutes <= 30) return 'idle';
    return 'offline';
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
      value?.groups,
      value?.Groups,
      value?.users,
      value?.Users,
      value?.sessions,
      value?.Sessions,
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
    if (Array.isArray(value)) {
      return value
        .map((item: any) => {
          if (typeof item === 'string' || typeof item === 'number') return String(item).trim();
          return String(item?.id ?? item?.Id ?? item?.vesselId ?? item?.name ?? item?.Name ?? '').trim();
        })
        .filter(Boolean);
    }
    if (typeof value === 'string') {
      return value.split(',').map((item) => item.trim()).filter(Boolean);
    }
    return [];
  }

  private uniqueStrings(values: unknown[]): string[] {
    return Array.from(new Set(values.map((value) => String(value ?? '').trim()).filter(Boolean)));
  }

  private toNumber(value: unknown): number | undefined {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private toIsoDate(value: unknown): string | undefined {
    if (value === null || value === undefined || value === '') return undefined;
    const numeric = Number(value);
    const normalized = Number.isFinite(numeric) && String(value).trim() !== ''
      ? numeric < 10_000_000_000
        ? numeric * 1000
        : numeric
      : value;
    const date = new Date(normalized as any);
    return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
  }

  private isCompactLastSeen(value: unknown): boolean {
    return /\d+(?:\.\d+)?\s*(M|MIN|H|HR|D|DAY)/i.test(String(value ?? '').trim());
  }

  private browserDeviceLabel(): string {
    if (typeof navigator === 'undefined') return 'Current browser';
    const agent = navigator.userAgent;
    if (/Android/i.test(agent)) return 'Android';
    if (/iPhone|iPad|iPod/i.test(agent)) return 'iOS';
    if (/Windows/i.test(agent)) return 'Windows';
    if (/Macintosh|Mac OS/i.test(agent)) return 'macOS';
    if (/Linux/i.test(agent)) return 'Linux';
    return 'Web browser';
  }

  private saveVesselLocally(record: VesselSettingsRecord): void {
    const store = this.readStore();
    const normalized = { ...record, source: record.source || 'local' } as VesselSettingsRecord;
    const index = store.records.findIndex((item) => item.id === normalized.id);
    if (index >= 0) store.records[index] = normalized;
    else store.records.unshift(normalized);
    store.deletedIds = store.deletedIds.filter((id) => id !== normalized.id);
    this.writeStore(store);
  }

  private deleteVesselLocally(id: string): void {
    const store = this.readStore();
    store.records = store.records.filter((item) => item.id !== id);
    if (!store.deletedIds.includes(id)) store.deletedIds.push(id);
    this.writeStore(store);
  }

  private removeLocalVesselOverride(id: string): void {
    const store = this.readStore();
    store.records = store.records.filter((item) => item.id !== id);
    store.deletedIds = store.deletedIds.filter((item) => item !== id);
    this.writeStore(store);
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
    this.backendVessels$ = undefined;
  }

  private readLocalGroups(): VesselGroupRecord[] {
    try {
      const parsed = JSON.parse(localStorage.getItem(this.groupStorageKey) || '[]');
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((group) => group && typeof group.name === 'string')
        .map((group) => ({
          id: String(group.id || this.groupSlug(group.name)),
          name: String(group.name).trim(),
          description: String(group.description || '').trim(),
          vesselIds: Array.isArray(group.vesselIds) ? group.vesselIds.map(String) : [],
          createdAt: String(group.createdAt || new Date().toISOString()),
          updatedAt: group.updatedAt ? String(group.updatedAt) : undefined,
          source: (group.source === 'backend' ? 'backend' : 'local') as 'backend' | 'local',
        }))
        .filter((group) => !!group.name);
    } catch {
      return [];
    }
  }

  private writeLocalGroups(groups: VesselGroupRecord[]): void {
    localStorage.setItem(this.groupStorageKey, JSON.stringify(groups));
  }

  private upsertLocalGroup(group: VesselGroupRecord): void {
    const groups = this.readLocalGroups();
    const index = groups.findIndex((item) => item.id === group.id);
    if (index >= 0) groups[index] = group;
    else groups.push(group);
    this.writeLocalGroups(groups);
    this.vesselGroups$ = undefined;
  }

  private removeLocalGroup(id: string): void {
    this.writeLocalGroups(this.readLocalGroups().filter((group) => group.id !== id));
    this.vesselGroups$ = undefined;
  }

  private groupSlug(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'group';
  }

  private trimUrl(url: string): string {
    return String(url || '').replace(/\/+$/, '');
  }
}
