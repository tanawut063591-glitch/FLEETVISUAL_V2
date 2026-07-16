import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  Observable,
  catchError,
  forkJoin,
  finalize,
  from,
  map,
  mergeMap,
  of,
  shareReplay,
  switchMap,
  throwError,
  take,
  tap,
  timeout,
  toArray,
} from 'rxjs';

import { environment } from '../../../environments/environment';
import { getThresholdFromTag } from '../../features/data-logger/data-logger-threshold.util';
import { AlertFetchResult, AlertQuery, AlertRecord, AlertSeverity } from '../models/alert.model';
import { HttpClientService } from './http-client.service';
import { NewHttpClientService } from './http-client1.service';

interface TelemetryTagDefinition {
  name: string;
  tagName: string;
  unit?: string;
  [key: string]: unknown;
}

interface TelemetrySnapshot {
  active: AlertRecord[];
  vessels: any[];
  endpoint: string;
  fetchedAt: string;
  rawCount: number;
}

@Injectable({ providedIn: 'root' })
export class TelemetryAlertsService {
  private readonly cacheDurationMs = 15_000;
  private readonly legacyStorageKeys = [
    'fleetTelemetryAlertLifecycleV1',
    'fleetTelemetrySnapshotV2',
    'fleetTelemetrySnapshotV3',
    'fleet-alerts-cache',
    'fleet-activity-logs-cache',
    'alertCount',
    'fleet-date-range:alerts',
    'fleet-date-range:activity-logs',
  ];
  private snapshot$?: Observable<TelemetrySnapshot>;
  private snapshotExpiresAt = 0;
  private snapshotLoading = false;
  private readonly tagConfig$: Observable<Record<string, unknown>>;
  // Keep the polling payload small and deterministic. Vessel connectivity is
  // already checked from getvesselcurrentInfo; these are the highest-value
  // machinery/status tags for alerting across the fleet.
  private readonly relevantTagPattern =
    /^(FV-API-ALIVE|DCP-PLC-ALIVE|DCP-GATEWAY-ALIVE|GPS-PANEL-ALIVE|(?:PME|SME|CME)-ENGINE-LOAD|(?:PME|SME|CME|DG[1-4])-(?:FIN|FOUT)-TEMP)$/i;

  constructor(
    private http: HttpClient,
    private backend: HttpClientService,
    private directBackend: NewHttpClientService,
  ) {
    this.clearLegacyBrowserData();
    this.tagConfig$ = this.http
      .get<Record<string, unknown>>('/assets/tags/dashboard.tag.json')
      .pipe(
        catchError(() => of({})),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
  }

  /**
   * Creates alerts from current values returned by the existing FleetVisual backend.
   * No sample, persisted snapshot, or browser-generated history is returned. Every row
   * is calculated from the latest successful server response for vessel status/current values.
   */
  fetch(query: AlertQuery, forceRefresh = false): Observable<AlertFetchResult> {
    return this.getSnapshot(forceRefresh).pipe(
      map((snapshot) => ({
        alerts: this.filterByRange(snapshot.active, query),
        endpoint: snapshot.endpoint,
        fetchedAt: snapshot.fetchedAt,
        rawCount: snapshot.rawCount,
      })),
    );
  }

  getVessels(forceRefresh = false): Observable<any[]> {
    return this.getSnapshot(forceRefresh).pipe(map((snapshot) => snapshot.vessels));
  }

  private getSnapshot(forceRefresh: boolean): Observable<TelemetrySnapshot> {
    const now = Date.now();
    if (
      this.snapshot$ &&
      (this.snapshotLoading || (!forceRefresh && now < this.snapshotExpiresAt))
    ) {
      return this.snapshot$;
    }

    this.snapshotLoading = true;

    const request$ = forkJoin({
      vessels: this.loadVessels(),
      tagConfig: this.tagConfig$.pipe(take(1)),
    }).pipe(
      switchMap(({ vessels, tagConfig }) => {
        if (!Array.isArray(vessels) || vessels.length === 0) {
          return throwError(
            () => new Error('The live vessel API returned no accessible vessel records.'),
          );
        }

        const definitions = this.flattenTags(tagConfig).filter((tag) =>
          this.relevantTagPattern.test(String(tag.tagName || '').trim()),
        );
        const requestTags = this.buildRequestTags(vessels, definitions);
        const chunks = this.chunk(requestTags, 220);
        const values$ = chunks.length
          ? from(chunks).pipe(
              mergeMap((chunk) => this.loadCurrentValues(chunk), 4),
              toArray(),
              map((responses) => responses.flatMap((response) => this.extractRows(response))),
            )
          : of([]);

        return values$.pipe(
          map((values) => ({
            active: [
              ...this.deriveVesselStatusAlerts(vessels),
              ...this.deriveTelemetryAlerts(values, vessels, definitions),
            ],
            vessels,
            endpoint: `${String(environment.API_URL || '').replace(/\/+$/, '')}/api/vessels/getcurrentvalues`,
            fetchedAt: new Date().toISOString(),
            rawCount: values.length + vessels.length,
          })),
        );
      }),
      tap(() => (this.snapshotExpiresAt = Date.now() + this.cacheDurationMs)),
      catchError((error) => {
        this.snapshotExpiresAt = 0;
        this.snapshot$ = undefined;
        return throwError(() => error);
      }),
      finalize(() => (this.snapshotLoading = false)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    this.snapshot$ = request$;
    return request$;
  }

  private loadVessels(): Observable<any[]> {
    return this.backend.getVesselInfo().pipe(
      timeout(5000),
      catchError(() => of([] as any[])),
      switchMap((vessels) => {
        if (Array.isArray(vessels) && vessels.length > 0) return of(vessels);
        return from(this.directBackend.getVesselInfo2()).pipe(timeout(5000));
      }),
      switchMap((vessels) =>
        Array.isArray(vessels) && vessels.length > 0
          ? of(vessels)
          : throwError(() => new Error('The live vessel API returned no accessible records.')),
      ),
    );
  }

  private loadCurrentValues(tags: any[]): Observable<any> {
    return this.backend.getCurrentValues(tags).pipe(
      timeout(5000),
      catchError((primaryError) =>
        this.directBackend.getCurrentValues(tags).pipe(
          timeout(5000),
          catchError(() => throwError(() => primaryError)),
        ),
      ),
    );
  }

  private flattenTags(source: unknown): TelemetryTagDefinition[] {
    const tags: TelemetryTagDefinition[] = [];

    const visit = (value: unknown): void => {
      if (!value || typeof value !== 'object') return;
      if (Array.isArray(value)) {
        value.forEach(visit);
        return;
      }

      const item = value as Record<string, unknown>;
      const tagName = String(item['tagName'] || item['TagName'] || '');
      const name = String(item['name'] || item['Name'] || tagName);

      if (tagName) {
        tags.push({ ...item, name, tagName } as TelemetryTagDefinition);
        return;
      }

      Object.values(item).forEach(visit);
    };

    visit(source);

    const unique = new Map<string, TelemetryTagDefinition>();
    tags.forEach((tag) => unique.set(tag.tagName.toUpperCase(), tag));
    return Array.from(unique.values());
  }

  private buildRequestTags(vessels: any[], definitions: TelemetryTagDefinition[]): any[] {
    const rows = new Map<string, any>();

    vessels.forEach((vessel) => {
      const prefix = this.vesselPrefix(vessel);
      if (!prefix) return;

      definitions.forEach((tag) => {
        const fullTagName = `${prefix}-${tag.tagName}`;
        rows.set(fullTagName.toUpperCase(), {
          ...tag,
          name: tag.name,
          tagName: fullTagName,
          vesselName: this.vesselName(vessel),
          vesselPrefix: prefix,
        });
      });
    });

    return Array.from(rows.values());
  }

  private deriveVesselStatusAlerts(vessels: any[]): AlertRecord[] {
    const now = Date.now();
    const rows: AlertRecord[] = [];

    vessels.forEach((vessel) => {
      const name = this.vesselName(vessel);
      const prefix = this.vesselPrefix(vessel) || name;
      const status = String(
        vessel?.status ?? vessel?.Status ?? vessel?.state ?? vessel?.State ?? '',
      ).toLowerCase();
      const timestamp = this.readTimestamp(vessel) || new Date().toISOString();
      const lastSeen = new Date(timestamp).getTime();
      const ageMinutes = Number.isFinite(lastSeen) ? Math.max(0, (now - lastSeen) / 60000) : 0;
      const explicitlyOffline = /(offline|disconnect|inactive|down|false|0)/i.test(status);
      const stale = ageMinutes >= 10;

      if (!explicitlyOffline && !stale) return;

      const severity: AlertSeverity =
        ageMinutes >= 60 || explicitlyOffline ? 'critical' : 'warning';
      const duration = ageMinutes >= 1 ? `${Math.floor(ageMinutes)} minutes` : 'recently';

      rows.push({
        id: `vessel:${prefix}:connection`,
        title: 'Vessel connection unavailable',
        message: `${name} has not delivered fresh backend data for ${duration}.`,
        vesselName: name,
        vesselId: prefix,
        tagName: 'VESSEL-CONNECTION',
        equipment: 'Connectivity',
        severity,
        state: 'active',
        occurredAt: timestamp,
        source: 'Backend vessel status',
        raw: vessel,
      });
    });

    return rows;
  }

  private deriveTelemetryAlerts(
    values: any[],
    vessels: any[],
    definitions: TelemetryTagDefinition[],
  ): AlertRecord[] {
    const rows: AlertRecord[] = [];
    const definitionByName = new Map<string, TelemetryTagDefinition>();
    definitions.forEach((tag) => definitionByName.set(tag.tagName.toUpperCase(), tag));
    const vesselIndex = [...vessels]
      .map((vessel) => ({ vessel, prefix: this.vesselPrefix(vessel).toUpperCase() }))
      .filter((entry) => !!entry.prefix)
      .sort((a, b) => b.prefix.length - a.prefix.length);

    values.forEach((item) => {
      const fullTag = this.readTagName(item);
      if (!fullTag) return;

      const vessel = this.findVesselByTag(vesselIndex, fullTag);
      if (!vessel) return;

      const prefix = this.vesselPrefix(vessel);
      const baseTagName = this.stripPrefix(fullTag, prefix);
      const definition = definitionByName.get(baseTagName.toUpperCase()) || {
        name: baseTagName,
        tagName: baseTagName,
      };
      const displayName = String(definition.name || baseTagName).replace(/[-_]+/g, ' ');
      const rawValue = this.readValue(item);
      const rawUnit = String(
        item?.Unit ?? item?.unit ?? item?.UOM ?? item?.uom ?? definition.unit ?? '',
      );
      const normalized = this.normalizeTelemetryValue(rawValue, rawUnit, baseTagName);
      const numericValue = Number(normalized.value);
      const isAlive = /alive/i.test(baseTagName);

      let severity: AlertSeverity | null = null;
      let reason = '';

      if (isAlive) {
        if (!this.isHealthyValue(rawValue)) {
          severity = /fv-api|plc|gateway/i.test(baseTagName) ? 'critical' : 'warning';
          reason = 'reported offline';
        }
      } else if (Number.isFinite(numericValue)) {
        const threshold = getThresholdFromTag(definition, `${displayName} ${baseTagName}`);
        if (!threshold) return;

        if (
          (threshold.alarmLow !== undefined && numericValue < threshold.alarmLow) ||
          (threshold.alarmHigh !== undefined && numericValue > threshold.alarmHigh)
        ) {
          severity = 'critical';
          reason = 'exceeded the alarm limit';
        } else if (
          (threshold.warningLow !== undefined && numericValue < threshold.warningLow) ||
          (threshold.warningHigh !== undefined && numericValue > threshold.warningHigh)
        ) {
          severity = 'warning';
          reason = 'exceeded the warning limit';
        }
      }

      if (!severity) return;

      const vesselName = this.vesselName(vessel);
      const unit = normalized.unit;
      const displayValue = normalized.value;
      const valueLabel =
        displayValue === undefined || displayValue === null
          ? ''
          : ` (${this.formatTelemetryValue(displayValue)}${unit ? ` ${unit}` : ''})`;

      rows.push({
        id: `telemetry:${fullTag.toUpperCase()}`,
        title: this.humanizeTag(baseTagName),
        message: `${displayName} ${reason}${valueLabel}.`,
        vesselName,
        vesselId: prefix || vesselName,
        tagName: fullTag,
        equipment: this.moduleForTag(baseTagName),
        severity,
        state: 'active',
        occurredAt: this.readTimestamp(item) || new Date().toISOString(),
        value: displayValue as string | number,
        unit: unit || undefined,
        source: 'Live server telemetry',
        raw: normalized.converted
          ? {
              ...item,
              _normalization: {
                rawValue,
                rawUnit,
                value: displayValue,
                unit,
                rule: 'Kelvin-to-Celsius for FIN/FOUT temperature telemetry',
              },
            }
          : item,
      });
    });

    const unique = new Map<string, AlertRecord>();
    rows.forEach((row) => unique.set(row.id, row));
    return Array.from(unique.values());
  }

  private extractRows(response: any): any[] {
    if (Array.isArray(response)) return response;
    const candidates = [
      response?.data,
      response?.Data,
      response?.result,
      response?.Result,
      response?.results,
      response?.Results,
      response?.items,
      response?.Items,
      response?.values,
      response?.Values,
    ];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) return candidate;
    }
    if (response && typeof response === 'object') {
      return Object.entries(response).map(([key, value]) =>
        value && typeof value === 'object'
          ? { Name: key, ...(value as object) }
          : { Name: key, Value: value },
      );
    }
    return [];
  }

  private readTagName(item: any): string {
    return String(
      item?.Name ?? item?.name ?? item?.TagName ?? item?.tagName ?? item?.Key ?? item?.key ?? '',
    );
  }

  private readValue(item: any): unknown {
    return (
      item?.Value ??
      item?.value ??
      item?.IValue ??
      item?.iValue ??
      item?.CurrentValue ??
      item?.currentValue ??
      item?.ActualValue ??
      item?.actualValue ??
      item?.Val ??
      item?.val
    );
  }

  private readTimestamp(item: any): string {
    const raw =
      item?.TimeStamp ??
      item?.Timestamp ??
      item?.timestamp ??
      item?.DateTime ??
      item?.dateTime ??
      item?.lastUpdate ??
      item?.lastSeenAt ??
      item?.updatedAt ??
      '';
    const date = raw ? new Date(raw) : null;
    return date && !Number.isNaN(date.getTime()) ? date.toISOString() : '';
  }

  private isHealthyValue(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value > 0;
    return /^(1|true|yes|online|connected|active|up|normal|alive|ok|good|healthy|running)$/i.test(
      String(value || '').trim(),
    );
  }

  private findVesselByTag(
    vesselIndex: Array<{ vessel: any; prefix: string }>,
    tagName: string,
  ): any | null {
    const upper = tagName.toUpperCase();
    return (
      vesselIndex.find(
        ({ prefix }) =>
          upper === prefix || upper.startsWith(`${prefix}-`) || upper.startsWith(`${prefix}_`),
      )?.vessel || null
    );
  }

  private filterByRange(rows: AlertRecord[], query: AlertQuery): AlertRecord[] {
    const start = new Date(query.startTime).getTime();
    const end = new Date(query.endTime).getTime();

    return rows
      .filter((row) => {
        const time = new Date(row.occurredAt).getTime();
        return !Number.isFinite(time) || (time >= start && time <= end);
      })
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  }

  private normalizeTelemetryValue(
    value: unknown,
    unit: string,
    tagName: string,
  ): { value: unknown; unit: string; converted: boolean } {
    const numeric = Number(value);
    const isFuelTemperature = /(?:FIN|FOUT)-TEMP$/i.test(tagName);
    const labelledCelsius = /(?:deg\s*c|°c|celsius)/i.test(unit);

    // Some live FIN/FOUT tags are returned as Kelvin while the payload label says Deg C.
    // Constrain the correction to these temperature tags and a physically plausible Kelvin range.
    if (
      isFuelTemperature &&
      labelledCelsius &&
      Number.isFinite(numeric) &&
      numeric >= 250 &&
      numeric <= 400
    ) {
      return {
        value: Math.round((numeric - 273.15) * 10000) / 10000,
        unit: '°C',
        converted: true,
      };
    }

    return { value, unit, converted: false };
  }

  private formatTelemetryValue(value: unknown): string {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return String(value ?? '');
    return String(Math.round(numeric * 100) / 100);
  }

  private clearLegacyBrowserData(): void {
    for (const key of this.legacyStorageKeys) {
      try {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      } catch {
        // Storage may be disabled; live network loading still works.
      }
    }
  }

  private stripPrefix(tagName: string, prefix: string): string {
    if (!prefix) return tagName;
    return tagName.replace(new RegExp(`^${this.escapeRegExp(prefix)}[-_]`, 'i'), '');
  }

  private vesselName(vessel: any): string {
    return String(
      vessel?.name ?? vessel?.Name ?? vessel?.vesselName ?? vessel?.VesselName ?? 'Unknown vessel',
    );
  }

  private vesselPrefix(vessel: any): string {
    return String(
      vessel?.prefix ??
        vessel?.Prefix ??
        vessel?.id ??
        vessel?.Id ??
        vessel?.name ??
        vessel?.Name ??
        '',
    );
  }

  private moduleForTag(tagName: string): string {
    const tag = tagName.toUpperCase();
    if (/GPS|VES-/.test(tag)) return 'Navigation';
    if (/PME|SME|CME|ENGINE/.test(tag)) return 'Main Engine';
    if (/DG|GEN/.test(tag)) return 'Generator';
    if (/BAT|VOLT|ELECT/.test(tag)) return 'Electrical';
    if (/FUEL|FIN|FOUT|CONS/.test(tag)) return 'Fuel System';
    if (/ALIVE|DCP|GATEWAY|PLC|API/.test(tag)) return 'Connectivity';
    return 'Telemetry';
  }

  private humanizeTag(tagName: string): string {
    return tagName
      .replace(/[-_]+/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  private chunk<T>(rows: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let index = 0; index < rows.length; index += size) {
      chunks.push(rows.slice(index, index + size));
    }
    return chunks;
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
