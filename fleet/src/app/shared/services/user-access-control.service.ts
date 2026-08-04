import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, of, switchMap, take, tap, timeout } from 'rxjs';

import { SKIP_AUTH_REDIRECT } from '../../core/interceptors/http-context.tokens';
import {
  FleetModuleKey,
  USER_ACCESS_STORAGE_KEY,
  UserAccessRecord,
  UserModulePermissionMap,
  VESSEL_GROUP_STORAGE_KEY,
  VesselGroupRecord,
} from '../models/settings.model';
import { AuthService } from './auth.service';
import { DatabaseApiConfigService } from './database-api-config.service';

@Injectable({ providedIn: 'root' })
export class UserAccessControlService {
  private readonly currentAccessSource = new BehaviorSubject<UserAccessRecord | null>(null);
  private backendAccessControlEnabled = false;
  readonly currentAccess$ = this.currentAccessSource.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private databaseConfig: DatabaseApiConfigService,
  ) {
    this.currentAccessSource.next(this.readCurrentAccessFromBrowser());
  }

  refreshCurrentAccess(): Observable<UserAccessRecord | null> {
    const username = this.authService.getUser() || this.authService.getUsername();
    const local = this.readAccessRecords().find(
      (record) => this.normalize(record.username) === this.normalize(username),
    ) || this.readAccessFromLoginPayload(username);

    return this.databaseConfig.config$.pipe(
      take(1),
      switchMap((config) => {
        this.backendAccessControlEnabled = config.userAccess.enabled;
        if (!username || !config.userAccess.enabled) return of(local || null);
        const context = new HttpContext().set(SKIP_AUTH_REDIRECT, true);
        const url = `${this.trimUrl(config.userAccess.url)}/${encodeURIComponent(username)}`;
        return this.http.get<any>(url, {
          context,
          headers: this.authService.getAuthHeaders(),
        }).pipe(
          timeout(config.userAccess.timeoutMs),
          map((response) => {
            const payload = response?.data ?? response?.Data ?? response;
            const rows = Array.isArray(payload)
              ? payload
              : Array.isArray(payload?.items)
                ? payload.items
                : Array.isArray(payload?.rows)
                  ? payload.rows
                  : [payload];
            const selected = rows.find((row: any) =>
              this.normalize(row?.username ?? row?.Username ?? row?.userName) === this.normalize(username),
            ) ?? rows[0];
            return this.normalizeAccessRecord(selected, username);
          }),
          tap((record) => {
            if (record) this.upsertBrowserRecord(record);
          }),
          catchError((error) => {
            console.warn('[UserAccessControlService] backend access fallback:', error);
            return of(local || null);
          }),
        );
      }),
      tap((record) => this.currentAccessSource.next(record)),
    );
  }

  getCurrentAccess(): UserAccessRecord | null {
    return this.readCurrentAccessFromBrowser();
  }

  canAccessModule(module: FleetModuleKey): boolean {
    const record = this.getCurrentAccess();
    if (!record) return !this.isAccessControlConfigured();
    if (record.status !== 'active') return false;
    if (record.role === 'administrator') return true;
    return record.modulePermissions?.[module]?.view !== false;
  }

  canManageModule(module: FleetModuleKey): boolean {
    const record = this.getCurrentAccess();
    if (!record) return !this.isAccessControlConfigured();
    if (record.status !== 'active') return false;
    if (record.role === 'administrator') return true;
    return record.modulePermissions?.[module]?.view === true && record.modulePermissions?.[module]?.manage === true;
  }

  canExportModule(module: FleetModuleKey): boolean {
    const record = this.getCurrentAccess();
    if (!record) return !this.isAccessControlConfigured();
    if (record.status !== 'active') return false;
    if (record.role === 'administrator') return true;
    return record.modulePermissions?.[module]?.view === true && record.modulePermissions?.[module]?.export === true;
  }

  hasAnyModuleAccess(): boolean {
    const record = this.getCurrentAccess();
    if (!record) return !this.isAccessControlConfigured();
    if (record.status !== 'active') return false;
    const modules: FleetModuleKey[] = ['overview', 'realtime', 'data-logger', 'chart', 'diagram', 'report', 'alarm', 'log', 'settings'];
    return modules.some((module) => module === 'settings' ? this.canManageModule(module) : this.canAccessModule(module));
  }

  firstAllowedRoute(): string {
    const modules: FleetModuleKey[] = [
      'overview',
      'realtime',
      'data-logger',
      'chart',
      'diagram',
      'report',
      'alarm',
      'log',
      'settings',
    ];
    const selected = modules.find((module) =>
      module === 'settings' ? this.canManageModule(module) : this.canAccessModule(module),
    );
    return selected ? `/main/${selected}` : '/login';
  }

  filterVessels<T>(rows: T[]): T[] {
    if (!Array.isArray(rows) || rows.length === 0) return [];
    const record = this.getCurrentAccess();
    if (!record) return this.isAccessControlConfigured() ? [] : rows;
    if (record.role === 'administrator' || record.accessScope === 'all') return rows;
    if (record.status !== 'active') return [];

    const allowed = new Set<string>();
    if (record.accessScope === 'groups') {
      const selectedGroups = new Set(record.groupIds.map((id) => this.normalize(id)));
      for (const group of this.readVesselGroups()) {
        const groupKeys = [group.id, group.name].map((value) => this.normalize(value));
        if (groupKeys.some((key) => selectedGroups.has(key))) {
          group.vesselIds.forEach((id) => allowed.add(this.normalize(id)));
        }
      }
    }
    if (record.accessScope === 'vessels') {
      record.vesselIds.forEach((id) => allowed.add(this.normalize(id)));
    }
    record.additionalVesselIds.forEach((id) => allowed.add(this.normalize(id)));
    record.excludedVesselIds.forEach((id) => allowed.delete(this.normalize(id)));

    return rows.filter((row) => this.vesselKeys(row).some((key) => allowed.has(key)));
  }

  notifyRecordsChanged(): void {
    this.currentAccessSource.next(this.readCurrentAccessFromBrowser());
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fleet-user-access-changed'));
    }
  }


  private isAccessControlConfigured(): boolean {
    return this.backendAccessControlEnabled || this.readAccessRecords().length > 0;
  }

  private readCurrentAccessFromBrowser(): UserAccessRecord | null {
    const username = this.authService.getUser() || this.authService.getUsername();
    if (!username) return null;
    return this.readAccessRecords().find(
      (record) => this.normalize(record.username) === this.normalize(username),
    ) || this.readAccessFromLoginPayload(username);
  }

  private readAccessRecords(): UserAccessRecord[] {
    try {
      const rows = JSON.parse(localStorage.getItem(USER_ACCESS_STORAGE_KEY) || '[]');
      return Array.isArray(rows)
        ? rows.map((row, index) => this.normalizeAccessRecord(row, `user-${index + 1}`)).filter((row): row is UserAccessRecord => !!row)
        : [];
    } catch {
      return [];
    }
  }

  private readVesselGroups(): VesselGroupRecord[] {
    try {
      const rows = JSON.parse(localStorage.getItem(VESSEL_GROUP_STORAGE_KEY) || '[]');
      return Array.isArray(rows) ? rows : [];
    } catch {
      return [];
    }
  }

  private readAccessFromLoginPayload(username: string): UserAccessRecord | null {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const access = user?.access ?? user?.Access ?? user?.userAccess ?? user?.UserAccess;
      if (!access && !user?.pageAccess && !user?.siteAccess) return null;
      return this.normalizeAccessRecord({ ...user, ...(access || {}) }, username);
    } catch {
      return null;
    }
  }

  private normalizeAccessRecord(value: any, fallbackUsername: string): UserAccessRecord | null {
    if (!value || typeof value !== 'object') return null;
    const username = String(value.username ?? value.Username ?? value.userName ?? fallbackUsername ?? '').trim();
    if (!username) return null;
    const roleText = String(value.role ?? value.Role ?? value.group ?? value.Group ?? 'viewer').toLowerCase();
    const role = roleText.includes('admin')
      ? 'administrator'
      : roleText.includes('operator')
        ? 'operator'
        : roleText.includes('custom')
          ? 'custom'
          : 'viewer';
    const scopeText = String(value.accessScope ?? value.AccessScope ?? value.scope ?? '').toLowerCase();
    const groupIds = this.toStringArray(value.groupIds ?? value.GroupIds ?? value.groups ?? value.Groups);
    const vesselIds = this.toStringArray(
      value.vesselIds ?? value.VesselIds ?? value.siteAccess ?? value.SiteAccess ?? value.sites ?? value.Sites,
    );
    const accessScope = scopeText === 'groups' || scopeText === 'vessels' || scopeText === 'all'
      ? scopeText
      : role === 'administrator'
        ? 'all'
        : groupIds.length
          ? 'groups'
          : 'vessels';

    return {
      id: String(value.id ?? value.Id ?? value._id ?? username),
      username,
      displayName: String(value.displayName ?? value.DisplayName ?? value.fullname ?? value.fullName ?? value.name ?? username),
      email: String(value.email ?? value.Email ?? ''),
      role,
      status: String(value.status ?? value.Status ?? 'active').toLowerCase() === 'suspended' ? 'suspended' : 'active',
      accountId: String(value.accountId ?? value.AccountId ?? value.identityId ?? value.IdentityId ?? '').trim() || undefined,
      accountProvisioning: value.accountProvisioning === 'managed' || value.accountProvisioning === 'linked'
        ? value.accountProvisioning
        : value.accountId || value.AccountId
          ? 'managed'
          : 'access-only',
      accountLastSyncedAt: this.toIso(value.accountLastSyncedAt ?? value.AccountLastSyncedAt),
      accessScope,
      groupIds,
      vesselIds,
      additionalVesselIds: this.toStringArray(value.additionalVesselIds ?? value.AdditionalVesselIds),
      excludedVesselIds: this.toStringArray(value.excludedVesselIds ?? value.ExcludedVesselIds),
      modulePermissions: this.normalizePermissions(value.modulePermissions ?? value.ModulePermissions ?? value.pageAccess),
      createdAt: this.toIso(value.createdAt ?? value.CreatedAt) || new Date().toISOString(),
      updatedAt: this.toIso(value.updatedAt ?? value.UpdatedAt),
      source: value.source === 'backend' ? 'backend' : value.source === 'session' ? 'session' : 'local',
      raw: value,
    };
  }

  private normalizePermissions(value: any): UserModulePermissionMap {
    const modules: FleetModuleKey[] = [
      'overview', 'realtime', 'data-logger', 'chart', 'diagram', 'report', 'alarm', 'log', 'settings',
    ];
    const selected = Array.isArray(value)
      ? new Set(value.map((item) => this.normalizeModule(String(item))))
      : null;
    return modules.reduce((result, module) => {
      const item = value?.[module] ?? value?.[module.replace('-', '')] ?? value?.[module.toUpperCase()];
      const view = selected ? selected.has(module) : item?.view ?? item?.View ?? true;
      result[module] = {
        view: Boolean(view),
        export: Boolean(item?.export ?? item?.Export ?? view),
        manage: Boolean(item?.manage ?? item?.Manage ?? false),
      };
      return result;
    }, {} as UserModulePermissionMap);
  }

  private normalizeModule(value: string): FleetModuleKey {
    const normalized = value.trim().toLowerCase().replace(/[_\s]+/g, '-');
    if (normalized === 'datalogger') return 'data-logger';
    if (normalized === 'alerts') return 'alarm';
    return normalized as FleetModuleKey;
  }

  private vesselKeys(row: any): string[] {
    const sources = [row, row?.fv, row?.fvInfo, row?.vessel];
    const values: unknown[] = [];
    sources.forEach((source) => {
      if (!source) return;
      values.push(source.id, source._id, source.vesselId, source.siteId, source.prefix, source.name, source.vesselName);
    });
    return Array.from(new Set(values.map((value) => this.normalize(value)).filter(Boolean)));
  }

  private upsertBrowserRecord(record: UserAccessRecord): void {
    const rows = this.readAccessRecords();
    const index = rows.findIndex((item) => this.normalize(item.username) === this.normalize(record.username));
    if (index >= 0) rows[index] = record;
    else rows.push(record);
    localStorage.setItem(USER_ACCESS_STORAGE_KEY, JSON.stringify(rows));
  }

  private toStringArray(value: unknown): string[] {
    if (Array.isArray(value)) {
      return Array.from(new Set(value.map((item: any) => String(item?.id ?? item?.Id ?? item?.name ?? item ?? '').trim()).filter(Boolean)));
    }
    if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean);
    return [];
  }

  private toIso(value: unknown): string | undefined {
    if (!value) return undefined;
    const date = new Date(value as any);
    return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
  }

  private normalize(value: unknown): string {
    return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private trimUrl(value: string): string {
    return String(value || '').replace(/\/+$/, '');
  }
}
