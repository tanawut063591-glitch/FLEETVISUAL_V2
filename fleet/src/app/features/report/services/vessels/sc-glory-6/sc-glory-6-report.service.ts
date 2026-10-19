import { Injectable } from '@angular/core';
import { Observable, forkJoin, from, of, throwError } from 'rxjs';
import { catchError, finalize, map, mergeMap, shareReplay, tap, toArray } from 'rxjs/operators';

import { NewHttpClientService } from '../../../../../shared/services/http-client1.service';
import { resetReportCacheForAuthChange, setBoundedReportCache } from '../../common/report-cache.util';
import { reportDayConcurrency } from '../../common/report-load-policy';
import { OfficialPdfModeParityService } from '../../common/official-pdf-mode-parity.service';
import {
  OfficialPdfEngineFuelSummary,
  OfficialPdfEngineSummaryParityService,
} from '../../common/official-pdf-engine-summary-parity.service';
import {
  LiveReportProfileDocument,
  LiveReportSnapshot,
} from '../../../models/live-report.model';
import {
  VesselModeHistoryConfig,
  VesselReportAdapter,
} from '../../common/vessel-report-adapter';
import {
  buildGpsPdfParityModeSummary,
  isCompletedDailyWindow,
} from '../../common/pdf-mode-parity';
import {
  SC_GLORY_6_MODE_HISTORIAN_TAG,
  SC_GLORY_6_REPORT_PROFILE,
} from './sc-glory-6-report.profile';

export interface ScGlory6EngineSummaryRow {
  key: 'port' | 'center' | 'starboard';
  label: string;
  averageRpm: number | null;
  maximumRpm: number | null;
  runningHours: number;
  fuelUsed: number;
}

export interface ScGlory6ShaftSummaryRow {
  key: 'port' | 'center' | 'starboard';
  label: string;
  averageRpm: number | null;
  maximumRpm: number | null;
  runningHours: number;
}

export interface ScGlory6AuxSummaryRow {
  key: 'port' | 'center' | 'starboard' | 'fourth';
  label: string;
  runningHours: number;
  fuelUsed: number;
  averageRpm?: number | null;
  maximumRpm?: number | null;
}

export interface ScGlory6UtilizationRow {
  label: string;
  port: number;
  center: number;
  starboard: number;
}

export interface ScGlory6ModeSummaryRow {
  key: string;
  label: string;
  fuelUsed: number;
  fuelPercent: number;
  runningHours: number;
  runningPercent: number;
  distanceNm: number;
  litresPerNm: number | null;
  litresPerHour: number | null;
}

export interface ScGlory6PassageSummary {
  mainEngines: ScGlory6EngineSummaryRow[];
  shafts: ScGlory6ShaftSummaryRow[];
  auxFuel: ScGlory6AuxSummaryRow[];
  mainEngineFuelTotal: number;
  auxiliaryFuelTotal: number;
  averageSpeed: number | null;
  distanceNm: number;
}

export interface ScGlory6TrackingPoint {
  timestamp: Date;
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
}

export interface ScGlory6TrackingSummary {
  begin: ScGlory6TrackingPoint | null;
  end: ScGlory6TrackingPoint | null;
  distanceNm: number;
  route: ScGlory6TrackingPoint[];
}

export interface ScGlory6HourlyRow {
  hour: number;
  active: boolean;
  distanceNm: number | null;
  speedKnots: number | null;
  mainFuel: number | null;
  auxFuel: number | null;
  portMainFuel: number | null;
  centerMainFuel: number | null;
  starboardMainFuel: number | null;
  portAuxFuel: number | null;
  starboardAuxFuel: number | null;
  portMainRunningHours: number | null;
  centerMainRunningHours: number | null;
  starboardMainRunningHours: number | null;
  portAuxRunningHours: number | null;
  starboardAuxRunningHours: number | null;
  portShaftRunningHours: number | null;
  centerShaftRunningHours: number | null;
  starboardShaftRunningHours: number | null;
  portShaftRpm: number | null;
  centerShaftRpm: number | null;
  starboardShaftRpm: number | null;
  totalFuel: number | null;
}

export interface ScGlory6SpeedPoint {
  timestamp: Date;
  speed: number;
}

export interface ScGlory6DailyUiReport {
  periodStart: Date;
  periodEnd: Date;
  loadedAt: Date;
  coveragePercent: number;
  averageSpeed: number | null;
  maximumSpeed: number | null;
  engineSummary: ScGlory6EngineSummaryRow[];
  shaftSummary: ScGlory6ShaftSummaryRow[];
  auxSummary: ScGlory6AuxSummaryRow[];
  utilization: ScGlory6UtilizationRow[];
  mainEngineFuelTotal: number;
  auxiliaryFuelTotal: number;
  totalFuelUsed: number;
  modeSummary: ScGlory6ModeSummaryRow[];
  passageSummary: ScGlory6PassageSummary;
  tracking: ScGlory6TrackingSummary;
  hourly: ScGlory6HourlyRow[];
  speedSeries: ScGlory6SpeedPoint[];
}

export type ScGlory6UiPeriodKind = 'day' | 'range' | 'month';

export interface ScGlory6DailyTrendRow {
  date: Date;
  totalFuelUsed: number;
  mainEngineFuelTotal: number;
  auxiliaryFuelTotal: number;
  distanceNm: number;
  coveragePercent: number;
  modeRunningHours: number;
}

export interface ScGlory6PeriodUiReport extends ScGlory6DailyUiReport {
  periodKind: ScGlory6UiPeriodKind;
  dayCount: number;
  dailyTrend: ScGlory6DailyTrendRow[];
}

interface NumericPoint {
  timestamp: Date;
  value: number;
}

interface LegacyCounterSample {
  delta: number;
  lost: number;
  running: boolean;
}

interface ReportCacheEntry {
  value: ScGlory6DailyUiReport;
  expiresAt: number;
}

interface HourAccumulator {
  active: boolean;
  distanceNm: number;
  speedSum: number;
  speedCount: number;
  mainFuel: number;
  auxFuel: number;
  portMainFuel: number;
  centerMainFuel: number;
  starboardMainFuel: number;
  portAuxFuel: number;
  starboardAuxFuel: number;
  portMainRunMinutes: number;
  centerMainRunMinutes: number;
  starboardMainRunMinutes: number;
  portAuxRunMinutes: number;
  starboardAuxRunMinutes: number;
  portShaftRunMinutes: number;
  centerShaftRunMinutes: number;
  starboardShaftRunMinutes: number;
  portShaftRpmSum: number;
  portShaftRpmCount: number;
  centerShaftRpmSum: number;
  centerShaftRpmCount: number;
  starboardShaftRpmSum: number;
  starboardShaftRpmCount: number;
}

const MINUTE_MS = 60_000;
const COMPLETED_REPORT_CACHE_TTL_MS = 6 * 60 * 60_000;
const LIVE_REPORT_CACHE_TTL_MS = 30_000;
const PERIOD_REPORT_CACHE_TTL_MS = 60 * 60_000;
const MAX_INTERPOLATION_GAP_MINUTES = 5;
const MAX_PERIOD_DAYS = 31;

const TAGS = {
  gpsSpeed: 'A01-VES-GPS-SPEED',
  gpsLat: 'A01-VES-GPS-LAT',
  gpsLong: 'A01-VES-GPS-LONG',
  gpsHead: 'A01-VES-GPS-HEAD',
  pmeSpeed: 'A01-PME-SPD',
  cmeSpeed: 'A01-CME-SPD',
  smeSpeed: 'A01-SME-SPD',
  ppsSpeed: 'A01-PPS-SPD',
  cpsSpeed: 'A01-CPS-SPD',
  spsSpeed: 'A01-SPS-SPD',
  paeSpeed: 'A01-PAE-SPD',
  saeSpeed: 'A01-SAE-SPD',
  pmeFuelIn: 'A01-PME-FIN-VTOTAL',
  pmeFuelOut: 'A01-PME-FOUT-VTOTAL',
  cmeFuelIn: 'A01-CME-FIN-VTOTAL',
  cmeFuelOut: 'A01-CME-FOUT-VTOTAL',
  smeFuelIn: 'A01-SME-FIN-VTOTAL',
  smeFuelOut: 'A01-SME-FOUT-VTOTAL',
  paeFuelIn: 'A01-PAE-FIN-VTOTAL',
  paeFuelOut: 'A01-PAE-FOUT-VTOTAL',
  saeFuelIn: 'A01-SAE-FIN-VTOTAL',
  saeFuelOut: 'A01-SAE-FOUT-VTOTAL',
} as const;

const ALL_TAGS = Object.values(TAGS);

@Injectable({ providedIn: 'root' })
export class ScGlory6ReportService implements VesselReportAdapter {
  readonly id = 'sc-glory-6';
  readonly serviceLabel = 'SC GLORY 6 Report Service';
  readonly profileLabel = SC_GLORY_6_REPORT_PROFILE.label;

  private readonly detailedReportCache = new Map<string, ReportCacheEntry>();
  private readonly detailedReportInFlight = new Map<string, Observable<ScGlory6DailyUiReport>>();
  private readonly periodReportCache = new Map<string, { value: ScGlory6PeriodUiReport; expiresAt: number }>();
  private readonly periodReportInFlight = new Map<string, Observable<ScGlory6PeriodUiReport>>();
  private readonly reportCacheSession = { token: null as string | null };

  constructor(
    private newHttp: NewHttpClientService,
    private officialPdfMode: OfficialPdfModeParityService,
    private officialPdfEngineSummary: OfficialPdfEngineSummaryParityService,
  ) {}

  supports(vessel: any): boolean {
    const info = vessel?.fvInfo || vessel?.fv || vessel || {};
    const candidates = [
      info?.name,
      info?.Name,
      info?.vesselName,
      info?.VesselName,
      info?.prefix,
      info?.Prefix,
      info?.id,
      info?.Id,
    ];

    return candidates.some((value) => this.normalizeIdentity(value) === 'scglory6');
  }

  prepareProfileDocument(baseDocument: LiveReportProfileDocument): LiveReportProfileDocument {
    const profiles = (baseDocument?.profiles || []).filter(
      (profile) => !this.isScGlory6Profile(profile?.id, profile?.aliases, profile?.prefixes),
    );

    return {
      ...baseDocument,
      profiles: [...profiles, SC_GLORY_6_REPORT_PROFILE],
    };
  }

  enhanceSnapshot(
    snapshot: LiveReportSnapshot,
    _currentData: Record<string, any> | null | undefined,
  ): LiveReportSnapshot {
    const speed = snapshot.tracking.currentSpeed;
    const modeLabel = this.resolveModeFromGpsSpeed(speed);

    if (!modeLabel) {
      return {
        ...snapshot,
        profileLabel: this.profileLabel,
        sourceReport: SC_GLORY_6_REPORT_PROFILE.sourceReport || snapshot.sourceReport,
        currentMode: null,
        currentModeRawValue: speed === null ? null : String(speed),
        modeSourceTag: SC_GLORY_6_MODE_HISTORIAN_TAG,
        modeSource: 'unavailable',
        modeConfidence: null,
        modeReason: 'SC GLORY 6 mode requires a valid GPS speed value.',
        modes: SC_GLORY_6_REPORT_PROFILE.modes.map((mode) => ({
          key: mode.key,
          label: mode.label,
          isCurrent: false,
        })),
      };
    }

    return {
      ...snapshot,
      profileLabel: this.profileLabel,
      sourceReport: SC_GLORY_6_REPORT_PROFILE.sourceReport || snapshot.sourceReport,
      currentMode: modeLabel,
      currentModeRawValue: speed === null ? null : String(speed),
      modeSourceTag: SC_GLORY_6_MODE_HISTORIAN_TAG,
      modeSource: 'estimated-telemetry',
      modeConfidence: 'high',
      modeReason: this.buildModeReason(speed, modeLabel),
      modes: SC_GLORY_6_REPORT_PROFILE.modes.map((mode) => ({
        key: mode.key,
        label: mode.label,
        isCurrent: this.normalizeIdentity(mode.label) === this.normalizeIdentity(modeLabel),
      })),
    };
  }

  getModeHistoryConfig(snapshot: LiveReportSnapshot): VesselModeHistoryConfig {
    const enabled = snapshot.tracking.currentSpeed !== null;

    return {
      enabled,
      kind: enabled ? 'derived' : 'none',
      sourceTag: enabled ? SC_GLORY_6_MODE_HISTORIAN_TAG : null,
      eyebrow: 'SC GLORY 6 DAILY REPORT',
      title: 'Mode Summary',
      description: 'Mode values are aggregated inside the full daily historian report.',
      qualityLabel: 'Derived · SC GLORY 6 report rule',
    };
  }

  resolveHistorianModeLabel(rawValue: unknown): string | null {
    return this.resolveModeFromGpsSpeed(this.parseNumber(rawValue));
  }

  loadDetailedDailyReport(
    periodStart: Date,
    periodEnd: Date,
    force = false,
  ): Observable<ScGlory6DailyUiReport> {
    const start = this.floorToMinute(periodStart);
    const end = this.floorToMinute(periodEnd);
    const nowDate = new Date();
    const isCurrentDayWindow =
      start.getFullYear() === nowDate.getFullYear() &&
      start.getMonth() === nowDate.getMonth() &&
      start.getDate() === nowDate.getDate() &&
      Math.abs(nowDate.getTime() - end.getTime()) <= 10 * MINUTE_MS;
    const key = isCurrentDayWindow
      ? `live-${start.getFullYear()}-${start.getMonth() + 1}-${start.getDate()}`
      : `${start.getTime()}-${end.getTime()}`;
    const now = Date.now();
    resetReportCacheForAuthChange(
      this.reportCacheSession,
      this.detailedReportCache,
      this.periodReportCache,
      this.detailedReportInFlight,
      this.periodReportInFlight,
    );
    const cached = this.detailedReportCache.get(key);

    if (!force && cached && cached.expiresAt > now) {
      return of(cached.value);
    }

    if (!force) {
      const existing = this.detailedReportInFlight.get(key);
      if (existing) {
        return existing;
      }
    }

    const requestTags = ALL_TAGS.map((tagName) => ({ name: tagName, tagName }));
    const completedDaily = isCompletedDailyWindow(start, end, MINUTE_MS);
    const historianEnd = completedDaily
      ? new Date(start.getTime() + 24 * 60 * MINUTE_MS)
      : end;
    const requestStartText = this.formatHistorianRequestTime(start);
    const requestEndText = this.formatHistorianRequestTime(historianEnd);

    // Completed Daily UI must read the historian exactly like SCReportingService/PDF:
    // one tag per loggergethistorianvalues request, including next-day 00:00.
    const historianRequest$: Observable<any> = completedDaily
      ? this.newHttp.getConsistentPdfParityHistorianValues(
          requestStartText,
          requestEndText,
          requestTags,
          force,
        )
      : this.newHttp.getHistorianValues(requestStartText, requestEndText, requestTags);

    // Start the official PDF lookup in parallel with the historian bundle.
    // This preserves the same final Mode values while removing the old serial wait
    // (Historian -> PDF). It shortens completed Daily load time without adding
    // extra requests or increasing historian concurrency.
    const calculatedReport$ = historianRequest$.pipe(
      map((response) => this.buildDetailedDailyReport(response, start, end)),
    );
    const officialModeRows$ = completedDaily
      ? this.officialPdfMode.getDailyModeRows('SC GLORY 6', start)
      : of(null);
    const officialEngineFuel$ = completedDaily
      ? this.officialPdfEngineSummary.getDailyFuelSummary('SC GLORY 6', start)
      : of(null);

    const request$ = forkJoin({
      value: calculatedReport$,
      officialRows: officialModeRows$,
      officialEngineFuel: officialEngineFuel$,
    }).pipe(
      map(({ value, officialRows, officialEngineFuel }) => {
        if (!completedDaily) return value;

        const withOfficialMode: ScGlory6DailyUiReport = {
          ...value,
          modeSummary: this.officialPdfMode.overlayModeRows(value.modeSummary, officialRows),
        };

        return this.overlayOfficialEngineFuelSummary(withOfficialMode, officialEngineFuel);
      }),
      tap((value) => {
        if (this.detailedReportInFlight.get(key) !== request$) return;
          setBoundedReportCache(this.detailedReportCache, key, {
          value,
          expiresAt: Date.now() + (completedDaily ? COMPLETED_REPORT_CACHE_TTL_MS : LIVE_REPORT_CACHE_TTL_MS),
        });
      }),
      catchError((error) => throwError(() => error)),
      finalize(() => {
          if (this.detailedReportInFlight.get(key) === request$) this.detailedReportInFlight.delete(key);
        }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    this.detailedReportInFlight.set(key, request$);
    return request$;
  }

  loadPeriodReport(
    periodStart: Date,
    periodEnd: Date,
    periodKind: ScGlory6UiPeriodKind = 'range',
    force = false,
  ): Observable<ScGlory6PeriodUiReport> {
    const start = this.floorToMinute(periodStart);
    const end = this.floorToMinute(periodEnd);

    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end < start) {
      return throwError(() => new Error('INVALID_REPORT_PERIOD'));
    }

    const chunks = this.buildDailyChunks(start, end);
    if (chunks.length === 0 || chunks.length > MAX_PERIOD_DAYS) {
      return throwError(() => new Error(`REPORT_PERIOD_EXCEEDS_${MAX_PERIOD_DAYS}_DAYS`));
    }

    const key = `${periodKind}|${start.getTime()}|${end.getTime()}`;
    const now = Date.now();
    resetReportCacheForAuthChange(
      this.reportCacheSession,
      this.detailedReportCache,
      this.periodReportCache,
      this.detailedReportInFlight,
      this.periodReportInFlight,
    );
    const cached = this.periodReportCache.get(key);
    if (!force && cached && cached.expiresAt > now) {
      return of(cached.value);
    }

    if (!force) {
      const inFlight = this.periodReportInFlight.get(key);
      if (inFlight) return inFlight;
    }

    // Overlap up to two daily bundles; NewHttpClientService enforces the global
    // two-active-request limit for individual logger tags, including on PDF fallback.
    // Keep each day intact: no aggregation or source mixing before it is complete.
    const request$ = from(chunks).pipe(
      mergeMap(
        (chunk) => this.loadDetailedDailyReport(chunk.start, chunk.end, force),
        reportDayConcurrency(chunks.length),
      ),
      toArray(),
      map((reports) =>
        this.aggregatePeriodReports(
          [...reports].sort((a, b) => a.periodStart.getTime() - b.periodStart.getTime()),
          start,
          end,
          periodKind,
        ),
      ),
      tap((value) => {
        if (this.periodReportInFlight.get(key) !== request$) return;
          setBoundedReportCache(this.periodReportCache, key, {
          value,
          expiresAt: Date.now() + PERIOD_REPORT_CACHE_TTL_MS,
        });
      }),
      finalize(() => {
          if (this.periodReportInFlight.get(key) === request$) this.periodReportInFlight.delete(key);
        }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    this.periodReportInFlight.set(key, request$);
    return request$;
  }

  clearDetailedDailyReportCache(): void {
    this.detailedReportCache.clear();
    this.periodReportCache.clear();
  }

  private buildDailyChunks(start: Date, end: Date): Array<{ start: Date; end: Date }> {
    const chunks: Array<{ start: Date; end: Date }> = [];
    let cursor = new Date(start);

    while (cursor <= end && chunks.length <= MAX_PERIOD_DAYS) {
      const dayStart = new Date(
        cursor.getFullYear(),
        cursor.getMonth(),
        cursor.getDate(),
        0,
        0,
        0,
        0,
      );
      const nextDay = new Date(
        dayStart.getFullYear(),
        dayStart.getMonth(),
        dayStart.getDate() + 1,
        0,
        0,
        0,
        0,
      );
      const chunkStart = new Date(Math.max(start.getTime(), dayStart.getTime()));
      const chunkEnd = new Date(
        Math.min(end.getTime(), nextDay.getTime() - MINUTE_MS),
      );

      if (chunkEnd >= chunkStart) {
        chunks.push({ start: chunkStart, end: chunkEnd });
      }

      cursor = nextDay;
    }

    return chunks;
  }

  private aggregatePeriodReports(
    reports: readonly ScGlory6DailyUiReport[],
    periodStart: Date,
    periodEnd: Date,
    periodKind: ScGlory6UiPeriodKind,
  ): ScGlory6PeriodUiReport {
    if (reports.length === 0) {
      throw new Error('EMPTY_REPORT_PERIOD');
    }

    const totalElapsedHours = Math.max(
      MINUTE_MS / 3_600_000,
      (periodEnd.getTime() - periodStart.getTime() + MINUTE_MS) / 3_600_000,
    );
    const weightedCoverageMinutes = reports.reduce((sum, report) => {
      const minutes = Math.max(
        1,
        Math.floor((report.periodEnd.getTime() - report.periodStart.getTime()) / MINUTE_MS) + 1,
      );
      return sum + minutes * Math.max(0, Math.min(100, report.coveragePercent));
    }, 0);
    const totalMinutes = reports.reduce(
      (sum, report) =>
        sum +
        Math.max(
          1,
          Math.floor((report.periodEnd.getTime() - report.periodStart.getTime()) / MINUTE_MS) + 1,
        ),
      0,
    );
    const speedWeight = reports.reduce((sum, report) => {
      if (report.averageSpeed === null) return sum;
      const reportMinutes = Math.max(
        1,
        Math.floor((report.periodEnd.getTime() - report.periodStart.getTime()) / MINUTE_MS) + 1,
      );
      return sum + reportMinutes * Math.max(0, Math.min(100, report.coveragePercent)) / 100;
    }, 0);
    const averageSpeed =
      speedWeight > 0
        ? reports.reduce((sum, report) => {
            if (report.averageSpeed === null) return sum;
            const reportMinutes = Math.max(
              1,
              Math.floor((report.periodEnd.getTime() - report.periodStart.getTime()) / MINUTE_MS) + 1,
            );
            const weight = reportMinutes * Math.max(0, Math.min(100, report.coveragePercent)) / 100;
            return sum + report.averageSpeed * weight;
          }, 0) / speedWeight
        : null;
    const maximumSpeed = this.maximum(
      reports
        .map((report) => report.maximumSpeed)
        .filter((value): value is number => value !== null && Number.isFinite(value)),
    );

    const engineSummary = (['port', 'center', 'starboard'] as const).map((key) => {
      const rows = reports
        .map((report) => report.engineSummary.find((row) => row.key === key))
        .filter((row): row is ScGlory6EngineSummaryRow => !!row);
      const runningHours = rows.reduce((sum, row) => sum + row.runningHours, 0);
      const rpmWeight = rows.reduce(
        (sum, row) => sum + (row.averageRpm !== null ? Math.max(row.runningHours, 1 / 60) : 0),
        0,
      );
      const weightedRpm = rows.reduce(
        (sum, row) =>
          sum +
          (row.averageRpm !== null
            ? row.averageRpm * Math.max(row.runningHours, 1 / 60)
            : 0),
        0,
      );
      return {
        key,
        label: rows[0]?.label || `${key} M/E`,
        averageRpm: rpmWeight > 0 ? weightedRpm / rpmWeight : null,
        maximumRpm: this.maximum(
          rows
            .map((row) => row.maximumRpm)
            .filter((value): value is number => value !== null && Number.isFinite(value)),
        ),
        runningHours,
        fuelUsed: rows.reduce((sum, row) => sum + row.fuelUsed, 0),
      } satisfies ScGlory6EngineSummaryRow;
    });

    const shaftSummary = (['port', 'center', 'starboard'] as const).map((key) => {
      const rows = reports
        .map((report) => report.shaftSummary.find((row) => row.key === key))
        .filter((row): row is ScGlory6ShaftSummaryRow => !!row);
      const runningHours = rows.reduce((sum, row) => sum + row.runningHours, 0);
      const rpmWeight = rows.reduce(
        (sum, row) => sum + (row.averageRpm !== null ? Math.max(row.runningHours, 1 / 60) : 0),
        0,
      );
      const weightedRpm = rows.reduce(
        (sum, row) =>
          sum +
          (row.averageRpm !== null
            ? row.averageRpm * Math.max(row.runningHours, 1 / 60)
            : 0),
        0,
      );
      return {
        key,
        label: rows[0]?.label || `${key} Shaft`,
        averageRpm: rpmWeight > 0 ? weightedRpm / rpmWeight : null,
        maximumRpm: this.maximum(
          rows
            .map((row) => row.maximumRpm)
            .filter((value): value is number => value !== null && Number.isFinite(value)),
        ),
        runningHours,
      } satisfies ScGlory6ShaftSummaryRow;
    });

    const auxSummary = (['port', 'starboard'] as const).map((key) => {
      const rows = reports
        .map((report) => report.auxSummary.find((row) => row.key === key))
        .filter((row): row is ScGlory6AuxSummaryRow => !!row);
      return {
        key,
        label: rows[0]?.label || `${key} A/E`,
        runningHours: rows.reduce((sum, row) => sum + row.runningHours, 0),
        fuelUsed: rows.reduce((sum, row) => sum + row.fuelUsed, 0),
      } satisfies ScGlory6AuxSummaryRow;
    });

    const mainEngineFuelTotal = engineSummary.reduce((sum, row) => sum + row.fuelUsed, 0);
    const auxiliaryFuelTotal = auxSummary.reduce((sum, row) => sum + row.fuelUsed, 0);
    const totalFuelUsed = mainEngineFuelTotal + auxiliaryFuelTotal;

    const utilization: ScGlory6UtilizationRow[] = [
      {
        label: 'M/E Engine Utilized (%)',
        port: this.percent(engineSummary[0].runningHours, totalElapsedHours),
        center: this.percent(engineSummary[1].runningHours, totalElapsedHours),
        starboard: this.percent(engineSummary[2].runningHours, totalElapsedHours),
      },
      {
        label: 'Shaft Utilized (%)',
        port: this.percent(shaftSummary[0].runningHours, totalElapsedHours),
        center: this.percent(shaftSummary[1].runningHours, totalElapsedHours),
        starboard: this.percent(shaftSummary[2].runningHours, totalElapsedHours),
      },
      {
        label: 'Shaft per M/E Engine Utilized (%)',
        port: this.ratioPercent(shaftSummary[0].runningHours, engineSummary[0].runningHours),
        center: this.ratioPercent(shaftSummary[1].runningHours, engineSummary[1].runningHours),
        starboard: this.ratioPercent(shaftSummary[2].runningHours, engineSummary[2].runningHours),
      },
    ];

    const totalObservedModeHours = reports.reduce(
      (sum, report) =>
        sum + report.modeSummary.reduce((modeSum, row) => modeSum + Math.max(0, row.runningHours), 0),
      0,
    );
    const modeSummary = SC_GLORY_6_REPORT_PROFILE.modes.map((profileMode) => {
      const rows = reports
        .map((report) => report.modeSummary.find((row) => row.key === profileMode.key))
        .filter((row): row is ScGlory6ModeSummaryRow => !!row);
      const fuelUsed = rows.reduce((sum, row) => sum + row.fuelUsed, 0);
      const runningHours = rows.reduce((sum, row) => sum + row.runningHours, 0);
      const distanceNm = rows.reduce((sum, row) => sum + row.distanceNm, 0);
      return {
        key: profileMode.key,
        label: profileMode.label,
        fuelUsed,
        fuelPercent: totalFuelUsed > 0 ? (fuelUsed / totalFuelUsed) * 100 : 0,
        runningHours,
        runningPercent:
          totalObservedModeHours > 0 ? (runningHours / totalObservedModeHours) * 100 : 0,
        distanceNm,
        litresPerNm: distanceNm > 0 ? fuelUsed / distanceNm : null,
        litresPerHour: runningHours > 0 ? fuelUsed / runningHours : null,
      } satisfies ScGlory6ModeSummaryRow;
    });
    // A one-day UI report must preserve the already verified daily values exactly.
    // Re-aggregating the same row can introduce small percentage/LPH rounding drift.
    const pdfParityModeSummary =
      reports.length === 1
        ? reports[0].modeSummary.map((row) => ({ ...row }))
        : modeSummary;


    const passageReports = reports.map((report) => report.passageSummary);
    const passageMainEngines = (['port', 'center', 'starboard'] as const).map((key) => {
      const rows = passageReports
        .map((report) => report.mainEngines.find((row) => row.key === key))
        .filter((row): row is ScGlory6EngineSummaryRow => !!row);
      const runningHours = rows.reduce((sum, row) => sum + row.runningHours, 0);
      const weight = rows.reduce(
        (sum, row) => sum + (row.averageRpm !== null ? Math.max(row.runningHours, 1 / 60) : 0),
        0,
      );
      return {
        key,
        label: rows[0]?.label || `${key} M/E`,
        averageRpm:
          weight > 0
            ? rows.reduce(
                (sum, row) =>
                  sum +
                  (row.averageRpm !== null
                    ? row.averageRpm * Math.max(row.runningHours, 1 / 60)
                    : 0),
                0,
              ) / weight
            : null,
        maximumRpm: this.maximum(
          rows
            .map((row) => row.maximumRpm)
            .filter((value): value is number => value !== null && Number.isFinite(value)),
        ),
        runningHours,
        fuelUsed: rows.reduce((sum, row) => sum + row.fuelUsed, 0),
      } satisfies ScGlory6EngineSummaryRow;
    });
    const passageShafts = (['port', 'center', 'starboard'] as const).map((key) => {
      const rows = passageReports
        .map((report) => report.shafts.find((row) => row.key === key))
        .filter((row): row is ScGlory6ShaftSummaryRow => !!row);
      const runningHours = rows.reduce((sum, row) => sum + row.runningHours, 0);
      const weight = rows.reduce(
        (sum, row) => sum + (row.averageRpm !== null ? Math.max(row.runningHours, 1 / 60) : 0),
        0,
      );
      return {
        key,
        label: rows[0]?.label || `${key} Shaft`,
        averageRpm:
          weight > 0
            ? rows.reduce(
                (sum, row) =>
                  sum +
                  (row.averageRpm !== null
                    ? row.averageRpm * Math.max(row.runningHours, 1 / 60)
                    : 0),
                0,
              ) / weight
            : null,
        maximumRpm: this.maximum(
          rows
            .map((row) => row.maximumRpm)
            .filter((value): value is number => value !== null && Number.isFinite(value)),
        ),
        runningHours,
      } satisfies ScGlory6ShaftSummaryRow;
    });
    const passageAuxFuel = (['port', 'starboard'] as const).map((key) => {
      const rows = passageReports
        .map((report) => report.auxFuel.find((row) => row.key === key))
        .filter((row): row is ScGlory6AuxSummaryRow => !!row);
      return {
        key,
        label: rows[0]?.label || `${key} A/E`,
        runningHours: rows.reduce((sum, row) => sum + row.runningHours, 0),
        fuelUsed: rows.reduce((sum, row) => sum + row.fuelUsed, 0),
      } satisfies ScGlory6AuxSummaryRow;
    });
    const passageDistanceNm = passageReports.reduce((sum, report) => sum + report.distanceNm, 0);
    const passageAverageSpeedWeight = passageReports.reduce(
      (sum, report) => sum + (report.averageSpeed !== null ? Math.max(report.distanceNm, 0.01) : 0),
      0,
    );
    const passageSummary: ScGlory6PassageSummary = {
      mainEngines: passageMainEngines,
      shafts: passageShafts,
      auxFuel: passageAuxFuel,
      mainEngineFuelTotal: passageMainEngines.reduce((sum, row) => sum + row.fuelUsed, 0),
      auxiliaryFuelTotal: passageAuxFuel.reduce((sum, row) => sum + row.fuelUsed, 0),
      averageSpeed:
        passageAverageSpeedWeight > 0
          ? passageReports.reduce(
              (sum, report) =>
                sum +
                (report.averageSpeed !== null
                  ? report.averageSpeed * Math.max(report.distanceNm, 0.01)
                  : 0),
              0,
            ) / passageAverageSpeedWeight
          : null,
      distanceNm: passageDistanceNm,
    };

    const route = this.downsampleRoute(
      reports.flatMap((report) => report.tracking.route || []),
      500,
    );
    const tracking: ScGlory6TrackingSummary = {
      begin: reports.find((report) => !!report.tracking.begin)?.tracking.begin || null,
      end: [...reports].reverse().find((report) => !!report.tracking.end)?.tracking.end || null,
      distanceNm: reports.reduce((sum, report) => sum + report.tracking.distanceNm, 0),
      route,
    };

    const hourly = Array.from({ length: 24 }, (_, hour): ScGlory6HourlyRow => {
      const rows = reports
        .map((report) => report.hourly.find((row) => row.hour === hour))
        .filter((row): row is ScGlory6HourlyRow => !!row && row.active);
      if (rows.length === 0) {
        return {
          hour,
          active: false,
          distanceNm: null,
          speedKnots: null,
          mainFuel: null,
          auxFuel: null,
          portMainFuel: null,
          centerMainFuel: null,
          starboardMainFuel: null,
          portAuxFuel: null,
          starboardAuxFuel: null,
          portMainRunningHours: null,
          centerMainRunningHours: null,
          starboardMainRunningHours: null,
          portAuxRunningHours: null,
          starboardAuxRunningHours: null,
          portShaftRunningHours: null,
          centerShaftRunningHours: null,
          starboardShaftRunningHours: null,
          portShaftRpm: null,
          centerShaftRpm: null,
          starboardShaftRpm: null,
          totalFuel: null,
        };
      }

      const sumNullable = (selector: (row: ScGlory6HourlyRow) => number | null): number =>
        rows.reduce((sum, row) => sum + (selector(row) || 0), 0);
      const averageNullable = (selector: (row: ScGlory6HourlyRow) => number | null): number | null => {
        const values = rows
          .map(selector)
          .filter((value): value is number => value !== null && Number.isFinite(value));
        return values.length ? this.average(values) : null;
      };

      return {
        hour,
        active: true,
        distanceNm: sumNullable((row) => row.distanceNm),
        speedKnots: averageNullable((row) => row.speedKnots),
        mainFuel: sumNullable((row) => row.mainFuel),
        auxFuel: sumNullable((row) => row.auxFuel),
        portMainFuel: sumNullable((row) => row.portMainFuel),
        centerMainFuel: sumNullable((row) => row.centerMainFuel),
        starboardMainFuel: sumNullable((row) => row.starboardMainFuel),
        portAuxFuel: sumNullable((row) => row.portAuxFuel),
        starboardAuxFuel: sumNullable((row) => row.starboardAuxFuel),
        portMainRunningHours: sumNullable((row) => row.portMainRunningHours),
        centerMainRunningHours: sumNullable((row) => row.centerMainRunningHours),
        starboardMainRunningHours: sumNullable((row) => row.starboardMainRunningHours),
        portAuxRunningHours: sumNullable((row) => row.portAuxRunningHours),
        starboardAuxRunningHours: sumNullable((row) => row.starboardAuxRunningHours),
        portShaftRunningHours: sumNullable((row) => row.portShaftRunningHours),
        centerShaftRunningHours: sumNullable((row) => row.centerShaftRunningHours),
        starboardShaftRunningHours: sumNullable((row) => row.starboardShaftRunningHours),
        portShaftRpm: averageNullable((row) => row.portShaftRpm),
        centerShaftRpm: averageNullable((row) => row.centerShaftRpm),
        starboardShaftRpm: averageNullable((row) => row.starboardShaftRpm),
        totalFuel: sumNullable((row) => row.totalFuel),
      };
    });

    const allSpeedPoints = reports.flatMap((report) => report.speedSeries || []);
    const speedSeries = this.downsampleSpeedPoints(allSpeedPoints, 420);
    const dailyTrend: ScGlory6DailyTrendRow[] = reports.map((report) => ({
      date: new Date(report.periodStart),
      totalFuelUsed: report.totalFuelUsed,
      mainEngineFuelTotal: report.mainEngineFuelTotal,
      auxiliaryFuelTotal: report.auxiliaryFuelTotal,
      distanceNm: report.tracking.distanceNm,
      coveragePercent: report.coveragePercent,
      modeRunningHours: report.modeSummary.reduce((sum, row) => sum + row.runningHours, 0),
    }));

    return {
      periodKind,
      dayCount: reports.length,
      dailyTrend,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      loadedAt: new Date(),
      coveragePercent:
        totalMinutes > 0 ? Math.max(0, Math.min(100, weightedCoverageMinutes / totalMinutes)) : 0,
      averageSpeed,
      maximumSpeed,
      engineSummary,
      shaftSummary,
      auxSummary,
      utilization,
      mainEngineFuelTotal,
      auxiliaryFuelTotal,
      totalFuelUsed,
      modeSummary: pdfParityModeSummary,
      passageSummary,
      tracking,
      hourly,
      speedSeries,
    };
  }

  private buildDetailedDailyReport(
    response: any,
    periodStart: Date,
    periodEnd: Date,
  ): ScGlory6DailyUiReport {
    const series = this.extractHistorianSeries(response, ALL_TAGS);
    const minuteStart = this.floorToMinute(periodStart).getTime();
    const minuteEnd = Math.max(minuteStart + MINUTE_MS, this.floorToMinute(periodEnd).getTime());
    const completedDaily = isCompletedDailyWindow(
      new Date(minuteStart),
      new Date(minuteEnd),
      MINUTE_MS,
    );
    // SCReportingService creates 1,441 rows for a completed Daily report:
    // 00:00 through next-day 00:00, inclusive.
    const legacyDataEnd = completedDaily ? minuteStart + 24 * 60 * MINUTE_MS : minuteEnd;
    const minuteCount = Math.max(1, Math.floor((minuteEnd - minuteStart) / MINUTE_MS) + 1);

    // Keep the normal UI maps for Engine Summary / hourly charts / tracking.
    // Mode parity uses a separate exact-minute grid below so fixing Mode cannot
    // change totals that already match the legacy PDF.
    const gpsSpeedPoints = series.get(this.tagKey(TAGS.gpsSpeed)) || [];
    const gpsLatPoints = series.get(this.tagKey(TAGS.gpsLat)) || [];
    const gpsLongPoints = series.get(this.tagKey(TAGS.gpsLong)) || [];
    const gpsHeadPoints = series.get(this.tagKey(TAGS.gpsHead)) || [];

    const gpsSpeed = this.buildInstantMap(gpsSpeedPoints);
    const gpsLat = this.buildInstantMap(gpsLatPoints);
    const gpsLong = this.buildInstantMap(gpsLongPoints);
    const gpsHead = this.buildInstantMap(gpsHeadPoints);

    // PDF/C# parity path: DataTable.Select uses exact timestamps. A historian
    // record such as 10:15:23 is NOT moved into the 10:15 row. Missing GPS
    // remains 0 in the pre-created grid and therefore falls into Standby.
    const legacyPoints = (points: readonly NumericPoint[]): NumericPoint[] =>
      completedDaily
        ? this.filterLegacyExactMinutePoints(points, minuteStart, legacyDataEnd)
        : [...points];
    const legacyGpsSpeedPoints = legacyPoints(gpsSpeedPoints);
    const legacyGpsLatPoints = legacyPoints(gpsLatPoints);
    const legacyGpsLongPoints = legacyPoints(gpsLongPoints);
    const legacyGpsHeadPoints = legacyPoints(gpsHeadPoints);
    // GPSSpd is System.Single in the legacy DataTable. Keep float32 precision
    // for mode speed sums/distance so L/NM follows the PDF calculation order.
    const legacyGpsSpeed = this.buildLegacySingleInstantMap(legacyGpsSpeedPoints);
    const legacyGpsLat = this.buildInstantMap(legacyGpsLatPoints);
    const legacyGpsLong = this.buildInstantMap(legacyGpsLongPoints);
    const legacyGpsHead = this.buildInstantMap(legacyGpsHeadPoints);

    const pmeRpm = this.buildCounterRateMap(series.get(this.tagKey(TAGS.pmeSpeed)) || [], 6, 2000);
    const cmeRpm = this.buildCounterRateMap(series.get(this.tagKey(TAGS.cmeSpeed)) || [], 4, 2000);
    const smeRpm = this.buildCounterRateMap(series.get(this.tagKey(TAGS.smeSpeed)) || [], 6, 2000);
    const ppsRpm = this.buildCounterRateMap(series.get(this.tagKey(TAGS.ppsSpeed)) || [], 12, 800);
    const cpsRpm = this.buildCounterRateMap(series.get(this.tagKey(TAGS.cpsSpeed)) || [], 12, 800);
    const spsRpm = this.buildCounterRateMap(series.get(this.tagKey(TAGS.spsSpeed)) || [], 12, 800);
    const paeRpm = this.buildCounterRateMap(series.get(this.tagKey(TAGS.paeSpeed)) || [], 6, 2000);
    const saeRpm = this.buildCounterRateMap(series.get(this.tagKey(TAGS.saeSpeed)) || [], 6, 2000);

    const pmeFuelInPoints = series.get(this.tagKey(TAGS.pmeFuelIn)) || [];
    const pmeFuelOutPoints = series.get(this.tagKey(TAGS.pmeFuelOut)) || [];
    const cmeFuelInPoints = series.get(this.tagKey(TAGS.cmeFuelIn)) || [];
    const cmeFuelOutPoints = series.get(this.tagKey(TAGS.cmeFuelOut)) || [];
    const smeFuelInPoints = series.get(this.tagKey(TAGS.smeFuelIn)) || [];
    const smeFuelOutPoints = series.get(this.tagKey(TAGS.smeFuelOut)) || [];
    const paeFuelInPoints = series.get(this.tagKey(TAGS.paeFuelIn)) || [];
    const paeFuelOutPoints = series.get(this.tagKey(TAGS.paeFuelOut)) || [];
    const saeFuelInPoints = series.get(this.tagKey(TAGS.saeFuelIn)) || [];
    const saeFuelOutPoints = series.get(this.tagKey(TAGS.saeFuelOut)) || [];

    // Hourly charts keep the smooth historian maps. Daily totals and mode/passsage
    // calculations below intentionally mirror SCReportingService's legacy rules so
    // the web report and the generated PDF use the same arithmetic.
    const pmeFuel = this.buildFuelMap(pmeFuelInPoints, pmeFuelOutPoints);
    const cmeFuel = this.buildFuelMap(cmeFuelInPoints, cmeFuelOutPoints);
    const smeFuel = this.buildFuelMap(smeFuelInPoints, smeFuelOutPoints);
    const paeFuel = this.buildFuelMap(paeFuelInPoints, paeFuelOutPoints);
    const saeFuel = this.buildFuelMap(saeFuelInPoints, saeFuelOutPoints);

    // The completed Daily PDF never calculates summary fuel from arbitrary raw
    // historian timestamps. GetRawData first performs an exact timestamp join into
    // its 1,441-row minute DataTable, then CalFLowTotalSME/SME3 reads that table.
    // Use the same exact-minute input here; otherwise an off-minute point can change
    // the official total even though it never existed in the legacy PDF DataTable.
    const dailyPmeFuelInPoints = completedDaily ? legacyPoints(pmeFuelInPoints) : pmeFuelInPoints;
    const dailyPmeFuelOutPoints = completedDaily ? legacyPoints(pmeFuelOutPoints) : pmeFuelOutPoints;
    const dailyCmeFuelInPoints = completedDaily ? legacyPoints(cmeFuelInPoints) : cmeFuelInPoints;
    const dailyCmeFuelOutPoints = completedDaily ? legacyPoints(cmeFuelOutPoints) : cmeFuelOutPoints;
    const dailySmeFuelInPoints = completedDaily ? legacyPoints(smeFuelInPoints) : smeFuelInPoints;
    const dailySmeFuelOutPoints = completedDaily ? legacyPoints(smeFuelOutPoints) : smeFuelOutPoints;
    const dailyPaeFuelInPoints = completedDaily ? legacyPoints(paeFuelInPoints) : paeFuelInPoints;
    const dailyPaeFuelOutPoints = completedDaily ? legacyPoints(paeFuelOutPoints) : paeFuelOutPoints;
    const dailySaeFuelInPoints = completedDaily ? legacyPoints(saeFuelInPoints) : saeFuelInPoints;
    const dailySaeFuelOutPoints = completedDaily ? legacyPoints(saeFuelOutPoints) : saeFuelOutPoints;

    const pmeFuelTotal = this.buildLegacyDailyFuelTotal(
      dailyPmeFuelInPoints, dailyPmeFuelOutPoints, 20, 10,
    );
    const cmeFuelTotal = this.buildLegacyDailyFuelTotal(
      dailyCmeFuelInPoints, dailyCmeFuelOutPoints, 20, 10,
    );
    // SC GLORY 6 uses the same CalFLowTotalSME rule for PME/CME/SME/PAE/SAE:
    // accepted whole-day raw span < 20 m3, accepted increment <= 10 m3, then x1000 L.
    const smeFuelTotal = this.buildLegacyDailyFuelTotal(
      dailySmeFuelInPoints, dailySmeFuelOutPoints, 20, 10,
    );
    const paeFuelTotal = this.buildLegacyDailyFuelTotal(
      dailyPaeFuelInPoints, dailyPaeFuelOutPoints, 20, 10,
    );
    const saeFuelTotal = this.buildLegacyDailyFuelTotal(
      dailySaeFuelInPoints, dailySaeFuelOutPoints, 20, 10,
    );

    const elapsedHours = Math.max(MINUTE_MS / 3_600_000, (minuteEnd - minuteStart + MINUTE_MS) / 3_600_000);

    // For a completed Daily report, reproduce CalSpeedSummary /
    // CalSpeedShaftSummary / CalSpeedShaftRunningHr directly on the legacy minute
    // grid. The previous UI interpolated counters across short gaps, which is useful
    // for live charts but changes PDF running hours and RPM statistics.
    const legacyPmeCounterPoints = legacyPoints(series.get(this.tagKey(TAGS.pmeSpeed)) || []);
    const legacyCmeCounterPoints = legacyPoints(series.get(this.tagKey(TAGS.cmeSpeed)) || []);
    const legacySmeCounterPoints = legacyPoints(series.get(this.tagKey(TAGS.smeSpeed)) || []);
    const legacyPpsCounterPoints = legacyPoints(series.get(this.tagKey(TAGS.ppsSpeed)) || []);
    const legacyCpsCounterPoints = legacyPoints(series.get(this.tagKey(TAGS.cpsSpeed)) || []);
    const legacySpsCounterPoints = legacyPoints(series.get(this.tagKey(TAGS.spsSpeed)) || []);
    const legacyPaeCounterPoints = legacyPoints(series.get(this.tagKey(TAGS.paeSpeed)) || []);
    const legacySaeCounterPoints = legacyPoints(series.get(this.tagKey(TAGS.saeSpeed)) || []);

    const pmeLegacyStats = completedDaily
      ? this.calculateLegacySpeedSummary(legacyPmeCounterPoints, minuteStart, legacyDataEnd, 6, 2000)
      : null;
    const cmeLegacyStats = completedDaily
      ? this.calculateLegacySpeedSummary(legacyCmeCounterPoints, minuteStart, legacyDataEnd, 4, 2000)
      : null;
    const smeLegacyStats = completedDaily
      ? this.calculateLegacySpeedSummary(legacySmeCounterPoints, minuteStart, legacyDataEnd, 6, 2000)
      : null;
    const ppsLegacyStats = completedDaily
      ? this.calculateLegacyShaftSpeedSummary(legacyPpsCounterPoints, minuteStart, legacyDataEnd, 12, 800)
      : null;
    const cpsLegacyStats = completedDaily
      ? this.calculateLegacyShaftSpeedSummary(legacyCpsCounterPoints, minuteStart, legacyDataEnd, 12, 800)
      : null;
    const spsLegacyStats = completedDaily
      ? this.calculateLegacyShaftSpeedSummary(legacySpsCounterPoints, minuteStart, legacyDataEnd, 12, 800)
      : null;
    const paeLegacyStats = completedDaily
      ? this.calculateLegacySpeedSummary(legacyPaeCounterPoints, minuteStart, legacyDataEnd, 6, 2000)
      : null;
    const saeLegacyStats = completedDaily
      ? this.calculateLegacySpeedSummary(legacySaeCounterPoints, minuteStart, legacyDataEnd, 6, 2000)
      : null;

    const engineSummary: ScGlory6EngineSummaryRow[] = completedDaily
      ? [
          this.legacyEngineSummary('port', 'Port M/E', pmeLegacyStats!, pmeFuelTotal),
          this.legacyEngineSummary('center', 'Ctr. M/E', cmeLegacyStats!, cmeFuelTotal),
          this.legacyEngineSummary('starboard', 'Stb. M/E', smeLegacyStats!, smeFuelTotal),
        ]
      : [
          this.buildEngineSummary('port', 'Port M/E', pmeRpm, pmeFuel, elapsedHours, pmeFuelTotal),
          this.buildEngineSummary('center', 'Ctr. M/E', cmeRpm, cmeFuel, elapsedHours, cmeFuelTotal),
          this.buildEngineSummary('starboard', 'Stb. M/E', smeRpm, smeFuel, elapsedHours, smeFuelTotal),
        ];

    const shaftSummary: ScGlory6ShaftSummaryRow[] = completedDaily
      ? [
          this.legacyShaftSummary('port', 'Port Shaft', {
            ...ppsLegacyStats!,
            runningHours: this.calculateLegacyShaftRunningHours(
              legacyPmeCounterPoints, legacyPpsCounterPoints, minuteStart, legacyDataEnd,
            ),
          }),
          this.legacyShaftSummary('center', 'Ctr. Shaft', {
            ...cpsLegacyStats!,
            runningHours: this.calculateLegacyShaftRunningHours(
              legacyCmeCounterPoints, legacyCpsCounterPoints, minuteStart, legacyDataEnd,
            ),
          }),
          this.legacyShaftSummary('starboard', 'Stb. Shaft', {
            ...spsLegacyStats!,
            runningHours: this.calculateLegacyShaftRunningHours(
              legacySmeCounterPoints, legacySpsCounterPoints, minuteStart, legacyDataEnd,
            ),
          }),
        ]
      : [
          this.buildShaftSummary('port', 'Port Shaft', ppsRpm, pmeRpm),
          this.buildShaftSummary('center', 'Ctr. Shaft', cpsRpm, cmeRpm),
          this.buildShaftSummary('starboard', 'Stb. Shaft', spsRpm, smeRpm),
        ];

    let legacyPaeHours = paeLegacyStats?.runningHours ?? 0;
    let legacySaeHours = saeLegacyStats?.runningHours ?? 0;
    if (completedDaily) {
      // Same special-case correction as SCReportingService GenerateReport.
      if (legacySaeHours <= 0.2 && legacyPaeHours >= 23.8) {
        legacySaeHours = 0;
        legacyPaeHours = 24;
      } else if (legacyPaeHours <= 0.2 && legacySaeHours >= 23.8) {
        legacyPaeHours = 0;
        legacySaeHours = 24;
      }
    }

    const auxSummary: ScGlory6AuxSummaryRow[] = completedDaily
      ? [
          { key: 'port', label: 'Port A/E', runningHours: legacyPaeHours, fuelUsed: paeFuelTotal },
          { key: 'starboard', label: 'Stb. A/E', runningHours: legacySaeHours, fuelUsed: saeFuelTotal },
        ]
      : [
          this.buildAuxSummary('port', 'Port A/E', paeRpm, paeFuel, paeFuelTotal),
          this.buildAuxSummary('starboard', 'Stb. A/E', saeRpm, saeFuel, saeFuelTotal),
        ];

    const mainEngineFuelTotal = engineSummary.reduce((sum, row) => sum + row.fuelUsed, 0);
    const auxiliaryFuelTotal = auxSummary.reduce((sum, row) => sum + row.fuelUsed, 0);
    const totalFuelUsed = mainEngineFuelTotal + auxiliaryFuelTotal;

    const utilization: ScGlory6UtilizationRow[] = [
      {
        label: 'M/E Engine Utilized (%)',
        port: this.percent(engineSummary[0].runningHours, elapsedHours),
        center: this.percent(engineSummary[1].runningHours, elapsedHours),
        starboard: this.percent(engineSummary[2].runningHours, elapsedHours),
      },
      {
        label: 'Shaft Utilized (%)',
        port: this.percent(shaftSummary[0].runningHours, elapsedHours),
        center: this.percent(shaftSummary[1].runningHours, elapsedHours),
        starboard: this.percent(shaftSummary[2].runningHours, elapsedHours),
      },
      {
        label: 'Shaft per M/E Engine Utilized (%)',
        port: this.ratioPercent(shaftSummary[0].runningHours, engineSummary[0].runningHours),
        center: this.ratioPercent(shaftSummary[1].runningHours, engineSummary[1].runningHours),
        starboard: this.ratioPercent(shaftSummary[2].runningHours, engineSummary[2].runningHours),
      },
    ];

    const hourlyAccumulators = Array.from({ length: 24 }, (): HourAccumulator => ({
      active: false,
      distanceNm: 0,
      speedSum: 0,
      speedCount: 0,
      mainFuel: 0,
      auxFuel: 0,
      portMainFuel: 0,
      centerMainFuel: 0,
      starboardMainFuel: 0,
      portAuxFuel: 0,
      starboardAuxFuel: 0,
      portMainRunMinutes: 0,
      centerMainRunMinutes: 0,
      starboardMainRunMinutes: 0,
      portAuxRunMinutes: 0,
      starboardAuxRunMinutes: 0,
      portShaftRunMinutes: 0,
      centerShaftRunMinutes: 0,
      starboardShaftRunMinutes: 0,
      portShaftRpmSum: 0,
      portShaftRpmCount: 0,
      centerShaftRpmSum: 0,
      centerShaftRpmCount: 0,
      starboardShaftRpmSum: 0,
      starboardShaftRpmCount: 0,
    }));

    const modeMap = new Map<string, ScGlory6ModeSummaryRow>();
    for (const mode of SC_GLORY_6_REPORT_PROFILE.modes) {
      modeMap.set(mode.key, {
        key: mode.key,
        label: mode.label,
        fuelUsed: 0,
        fuelPercent: 0,
        runningHours: 0,
        runningPercent: 0,
        distanceNm: 0,
        litresPerNm: null,
        litresPerHour: null,
      });
    }

    // Mode fuel must be calculated from the same exact-minute rows that exist
    // in SCReportingService's dtRawData. Do not let non-grid records influence
    // previous/previousAfterLost; C# never copies those records into dtRawData.
    const legacyPmeFuelInPoints = legacyPoints(pmeFuelInPoints);
    const legacyPmeFuelOutPoints = legacyPoints(pmeFuelOutPoints);
    const legacyCmeFuelInPoints = legacyPoints(cmeFuelInPoints);
    const legacyCmeFuelOutPoints = legacyPoints(cmeFuelOutPoints);
    const legacySmeFuelInPoints = legacyPoints(smeFuelInPoints);
    const legacySmeFuelOutPoints = legacyPoints(smeFuelOutPoints);
    const legacyPaeFuelInPoints = legacyPoints(paeFuelInPoints);
    const legacyPaeFuelOutPoints = legacyPoints(paeFuelOutPoints);
    const legacySaeFuelInPoints = legacyPoints(saeFuelInPoints);
    const legacySaeFuelOutPoints = legacyPoints(saeFuelOutPoints);

    const legacyPmeFuel = this.buildLegacyFuelDeltaMap(legacyPmeFuelInPoints, legacyPmeFuelOutPoints, 0.3, 0.3);
    const legacyCmeFuel = this.buildLegacyFuelDeltaMap(legacyCmeFuelInPoints, legacyCmeFuelOutPoints, 0.3, 0.3);
    const legacySmeFuel = this.buildLegacyFuelDeltaMap(legacySmeFuelInPoints, legacySmeFuelOutPoints, 0.3, 0.3);
    const legacyPaeFuel = this.buildLegacyFuelDeltaMap(legacyPaeFuelInPoints, legacyPaeFuelOutPoints, 0.3, 0.3);
    // SC GLORY 6 mode/passage FIN/FOUT deltas use the same 300 L (= 0.3 m3) gate.
    const legacyPaePassageFuel = this.buildLegacyFuelDeltaMap(legacyPaeFuelInPoints, legacyPaeFuelOutPoints, 0.3, 0.3);
    const legacySaeFuel = this.buildLegacyFuelDeltaMap(legacySaeFuelInPoints, legacySaeFuelOutPoints, 0.3, 0.3);

    const passageMinuteKeys: number[] = [];
    let gpsAvailableMinutes = 0;

    for (let bucket = minuteStart; bucket <= minuteEnd; bucket += MINUTE_MS) {
      const date = new Date(bucket);
      const hour = date.getHours();
      const hourData = hourlyAccumulators[hour];

      const speedValue = gpsSpeed.get(bucket);
      const speed =
        speedValue !== undefined && Number.isFinite(speedValue) ? Math.max(0, speedValue) : null;
      if (speed !== null) {
        gpsAvailableMinutes += 1;
        hourData.speedSum += speed;
        hourData.speedCount += 1;
      }
      const distance = speed !== null ? speed / 60 : 0;
      hourData.distanceNm += distance;

      const pmeMinuteFuel = pmeFuel.get(bucket) || 0;
      const cmeMinuteFuel = cmeFuel.get(bucket) || 0;
      const smeMinuteFuel = smeFuel.get(bucket) || 0;
      const paeMinuteFuel = paeFuel.get(bucket) || 0;
      const saeMinuteFuel = saeFuel.get(bucket) || 0;
      const mainFuel = pmeMinuteFuel + cmeMinuteFuel + smeMinuteFuel;
      const auxFuel = paeMinuteFuel + saeMinuteFuel;
      const minuteFuel = mainFuel + auxFuel;

      hourData.portMainFuel += pmeMinuteFuel;
      hourData.centerMainFuel += cmeMinuteFuel;
      hourData.starboardMainFuel += smeMinuteFuel;
      hourData.portAuxFuel += paeMinuteFuel;
      hourData.starboardAuxFuel += saeMinuteFuel;
      hourData.mainFuel += mainFuel;
      hourData.auxFuel += auxFuel;

      const pme = pmeRpm.get(bucket) || 0;
      const cme = cmeRpm.get(bucket) || 0;
      const sme = smeRpm.get(bucket) || 0;
      const pae = paeRpm.get(bucket) || 0;
      const sae = saeRpm.get(bucket) || 0;
      const pps = ppsRpm.get(bucket) || 0;
      const cps = cpsRpm.get(bucket) || 0;
      const sps = spsRpm.get(bucket) || 0;

      const hasMinuteTelemetry =
        speed !== null ||
        pmeFuel.has(bucket) ||
        cmeFuel.has(bucket) ||
        smeFuel.has(bucket) ||
        paeFuel.has(bucket) ||
        saeFuel.has(bucket) ||
        pmeRpm.has(bucket) ||
        cmeRpm.has(bucket) ||
        smeRpm.has(bucket) ||
        paeRpm.has(bucket) ||
        saeRpm.has(bucket) ||
        ppsRpm.has(bucket) ||
        cpsRpm.has(bucket) ||
        spsRpm.has(bucket);
      if (hasMinuteTelemetry) {
        hourData.active = true;
      }

      if (pme >= 100) hourData.portMainRunMinutes += 1;
      if (cme >= 100) hourData.centerMainRunMinutes += 1;
      if (sme >= 100) hourData.starboardMainRunMinutes += 1;
      if (pae >= 100) hourData.portAuxRunMinutes += 1;
      if (sae >= 100) hourData.starboardAuxRunMinutes += 1;
      if (pps > 0 && pme > 0) hourData.portShaftRunMinutes += 1;
      if (cps > 0 && cme > 0) hourData.centerShaftRunMinutes += 1;
      if (sps > 0 && sme > 0) hourData.starboardShaftRunMinutes += 1;

      if (pps > 0) {
        hourData.portShaftRpmSum += pps;
        hourData.portShaftRpmCount += 1;
      }
      if (cps > 0) {
        hourData.centerShaftRpmSum += cps;
        hourData.centerShaftRpmCount += 1;
      }
      if (sps > 0) {
        hourData.starboardShaftRpmSum += sps;
        hourData.starboardShaftRpmCount += 1;
      }

    }

    // Use the same minute model and precision rules as the verified SC GLORY 3 PDF parity path.
    const fullDayWindow = completedDaily;
    const legacyModeEnd = legacyDataEnd;
    const pdfParityOptions = {
      modes: SC_GLORY_6_REPORT_PROFILE.modes,
      minuteStart,
      dataEnd: legacyModeEnd,
      completedDaily: fullDayWindow,
      minuteMs: MINUTE_MS,
      officialTotalFuel: totalFuelUsed,
      gpsSpeed: legacyGpsSpeed,
      minuteFuelAt: (minute: number) =>
        (legacyPmeFuel.get(minute) || 0) +
        (legacyCmeFuel.get(minute) || 0) +
        (legacySmeFuel.get(minute) || 0) +
        (legacyPaeFuel.get(minute) || 0) +
        (legacySaeFuel.get(minute) || 0),
      resolveModeLabel: (speed: number) => this.resolveModeFromGpsSpeed(speed),
      resolveModeKey: (label: string) => this.resolveModeProfileKey(label),
      standbyLabel: 'Standby',
      legacySinglePrecision: true,
      // SC GLORY 6 is the one GLORY variant whose C# report calculates Mode
      // distance as SumSpd / 60.0 instead of AvgSpeed * displayed Run Hrs.
      distanceStrategy: 'speed-sum-over-60' as const,
      // Service1.cs divides each mode fuel by sumCon without a zero guard.
      // A genuine all-zero fuel day therefore prints NaN in the official PDF.
      legacyNaNPercentWhenZeroFuelTotal: true,
    };

    // Production rule: always calculate Mode from the real 1,441-row historian
    // minute model. Do not apply a date-specific Excel/PDF calibration. Excel's
    // SUMIF is equivalent to this grouping step when MINUTE_MODEL!D is Mode and
    // MINUTE_MODEL!E is the real per-minute net fuel delta.
    const pdfParityMode = buildGpsPdfParityModeSummary(pdfParityOptions);
    const modeSummary = pdfParityMode.modeSummary as ScGlory6ModeSummaryRow[];
    const passageModeKey = this.resolveModeProfileKey('Passage');
    passageMinuteKeys.push(
      ...(pdfParityMode.minuteKeysByMode.get(passageModeKey) || []).filter(
        (minute) => minute <= minuteEnd,
      ),
    );
    const passageFuelTotal = pdfParityMode.scaledFuelByMode.get(passageModeKey) || 0;

    const passageSummary = this.buildLegacyPassageSummary(
      passageMinuteKeys,
      legacyPoints(series.get(this.tagKey(TAGS.pmeSpeed)) || []),
      legacyPoints(series.get(this.tagKey(TAGS.cmeSpeed)) || []),
      legacyPoints(series.get(this.tagKey(TAGS.smeSpeed)) || []),
      legacyPoints(series.get(this.tagKey(TAGS.ppsSpeed)) || []),
      legacyPoints(series.get(this.tagKey(TAGS.cpsSpeed)) || []),
      legacyPoints(series.get(this.tagKey(TAGS.spsSpeed)) || []),
      legacyPmeFuel,
      legacyCmeFuel,
      legacySmeFuel,
      legacyPaePassageFuel,
      legacySaeFuel,
      legacyGpsSpeed,
      passageFuelTotal,
    );

    const tracking = this.buildTrackingSummary(
      minuteStart,
      completedDaily ? legacyDataEnd : minuteEnd,
      completedDaily ? legacyGpsLat : gpsLat,
      completedDaily ? legacyGpsLong : gpsLong,
      completedDaily ? legacyGpsSpeed : gpsSpeed,
      completedDaily ? legacyGpsHead : gpsHead,
    );
    if (completedDaily) {
      // GenerateReportTracking receives TotalDis from GenerateReportFuelConsumtion.
      // That value is the sum of each displayed mode distance after 2-decimal
      // conversion, not a second independent GPS integration.
      tracking.distanceNm = this.roundLegacy2(
        modeSummary.reduce((sum, row) => sum + row.distanceNm, 0),
      );
    }

    const interpolatedHourly = hourlyAccumulators.map((item, hour): ScGlory6HourlyRow => {
      if (!item.active) {
        return {
          hour,
          active: false,
          distanceNm: null,
          speedKnots: null,
          mainFuel: null,
          auxFuel: null,
          portMainFuel: null,
          centerMainFuel: null,
          starboardMainFuel: null,
          portAuxFuel: null,
          starboardAuxFuel: null,
          portMainRunningHours: null,
          centerMainRunningHours: null,
          starboardMainRunningHours: null,
          portAuxRunningHours: null,
          starboardAuxRunningHours: null,
          portShaftRunningHours: null,
          centerShaftRunningHours: null,
          starboardShaftRunningHours: null,
          portShaftRpm: null,
          centerShaftRpm: null,
          starboardShaftRpm: null,
          totalFuel: null,
        };
      }

      return {
        hour,
        active: true,
        distanceNm: item.distanceNm,
        speedKnots: item.speedCount > 0 ? item.speedSum / item.speedCount : null,
        mainFuel: item.mainFuel,
        auxFuel: item.auxFuel,
        portMainFuel: item.portMainFuel,
        centerMainFuel: item.centerMainFuel,
        starboardMainFuel: item.starboardMainFuel,
        portAuxFuel: item.portAuxFuel,
        starboardAuxFuel: item.starboardAuxFuel,
        portMainRunningHours: item.portMainRunMinutes / 60,
        centerMainRunningHours: item.centerMainRunMinutes / 60,
        starboardMainRunningHours: item.starboardMainRunMinutes / 60,
        portAuxRunningHours: item.portAuxRunMinutes / 60,
        starboardAuxRunningHours: item.starboardAuxRunMinutes / 60,
        portShaftRunningHours: item.portShaftRunMinutes / 60,
        centerShaftRunningHours: item.centerShaftRunMinutes / 60,
        starboardShaftRunningHours: item.starboardShaftRunMinutes / 60,
        portShaftRpm: item.portShaftRpmCount > 0 ? item.portShaftRpmSum / item.portShaftRpmCount : 0,
        centerShaftRpm: item.centerShaftRpmCount > 0 ? item.centerShaftRpmSum / item.centerShaftRpmCount : 0,
        starboardShaftRpm: item.starboardShaftRpmCount > 0 ? item.starboardShaftRpmSum / item.starboardShaftRpmCount : 0,
        totalFuel: item.mainFuel + item.auxFuel,
      };
    });

    const hourly = completedDaily
      ? this.buildLegacyPdfHourlyRows(
          interpolatedHourly,
          minuteStart,
          legacyGpsSpeedPoints,
          legacySmeFuelInPoints, legacySmeFuelOutPoints,
          legacyCmeFuelInPoints, legacyCmeFuelOutPoints,
          legacyPmeFuelInPoints, legacyPmeFuelOutPoints,
          legacySaeFuelInPoints, legacySaeFuelOutPoints,
          legacyPaeFuelInPoints, legacyPaeFuelOutPoints,
        )
      : interpolatedHourly;

    // Keep every exact-minute, non-zero GPS sample for the daily chart. The
    // shared report renderer applies the legacy RptAverageSpd2 display window
    // for every vessel, so SC GLORY 6 follows the same path as the rest of the fleet.
    const speedSeries = completedDaily
      ? legacyGpsSpeedPoints
          .filter((point) => Number.isFinite(point.value) && point.value !== 0)
          .map((point) => ({ timestamp: new Date(point.timestamp.getTime()), speed: Math.fround(point.value) }))
      : this.downsampleSpeedSeries(gpsSpeed, minuteStart, minuteEnd, 1600);
    const speedForSummary = completedDaily ? legacyGpsSpeed : gpsSpeed;
    const validSpeedValues = Array.from(speedForSummary.entries())
      .filter(
        ([bucket, value]) =>
          bucket >= minuteStart && bucket <= minuteEnd && value >= 0 && Number.isFinite(value),
      )
      .map(([, value]) => value);

    const coverageAvailableMinutes = completedDaily
      ? legacyGpsSpeedPoints.filter((point) => Number.isFinite(point.value)).length
      : gpsAvailableMinutes;
    const coverageMinuteCount = completedDaily ? 1441 : minuteCount;

    return {
      periodStart: new Date(minuteStart),
      periodEnd: new Date(minuteEnd),
      loadedAt: new Date(),
      coveragePercent: Math.max(
        0,
        Math.min(100, (coverageAvailableMinutes / Math.max(1, coverageMinuteCount)) * 100),
      ),
      averageSpeed: this.average(validSpeedValues),
      maximumSpeed: this.maximum(validSpeedValues),
      engineSummary,
      shaftSummary,
      auxSummary,
      utilization,
      mainEngineFuelTotal,
      auxiliaryFuelTotal,
      totalFuelUsed,
      modeSummary,
      passageSummary,
      tracking,
      hourly,
      speedSeries,
    };
  }

  /**
   * Page 1 of the official SC GLORY 6 Daily PDF is the final source of truth for
   * whole-day Engine Summary fuel. The legacy report can legitimately show 0.00
   * in its hourly fuel pages while page 1 and the Mode table contain the correct
   * daily totals, so do not reconstruct these summary values from hourly rows.
   */
  private overlayOfficialEngineFuelSummary(
    report: ScGlory6DailyUiReport,
    official: OfficialPdfEngineFuelSummary | null,
  ): ScGlory6DailyUiReport {
    if (!official) return report;

    const engineFuelByKey: Record<ScGlory6EngineSummaryRow['key'], number> = {
      port: official.portMain,
      center: official.centerMain,
      starboard: official.starboardMain,
    };
    const auxFuelByKey: Partial<Record<ScGlory6AuxSummaryRow['key'], number>> = {
      port: official.portAux,
      starboard: official.starboardAux,
    };

    return {
      ...report,
      engineSummary: report.engineSummary.map((row) => ({
        ...row,
        fuelUsed: engineFuelByKey[row.key],
      })),
      auxSummary: report.auxSummary.map((row) => ({
        ...row,
        fuelUsed: auxFuelByKey[row.key] ?? row.fuelUsed,
      })),
      mainEngineFuelTotal: official.mainEngineFuelTotal,
      auxiliaryFuelTotal: official.auxiliaryFuelTotal,
      totalFuelUsed: official.totalFuelUsed,
    };
  }

  private buildEngineSummary(
    key: ScGlory6EngineSummaryRow['key'],
    label: string,
    rpmMap: Map<number, number>,
    fuelMap: Map<number, number>,
    _elapsedHours: number,
    fuelOverride?: number,
  ): ScGlory6EngineSummaryRow {
    const rpmValues = Array.from(rpmMap.values()).filter((value) => value >= 0 && value <= 2000);
    const runningMinutes = rpmValues.filter((value) => value >= 100).length;
    return {
      key,
      label,
      averageRpm: this.average(rpmValues.filter((value) => value > 0)),
      maximumRpm: this.maximum(rpmValues),
      runningHours: runningMinutes / 60,
      fuelUsed: fuelOverride !== undefined ? fuelOverride : this.sumMap(fuelMap),
    };
  }

  private buildShaftSummary(
    key: ScGlory6ShaftSummaryRow['key'],
    label: string,
    rpmMap: Map<number, number>,
    mainEngineRpm: Map<number, number>,
  ): ScGlory6ShaftSummaryRow {
    const rpmValues = Array.from(rpmMap.values()).filter((value) => value >= 0 && value <= 800);
    let runningMinutes = 0;
    rpmMap.forEach((value, bucket) => {
      if (value > 0 && (mainEngineRpm.get(bucket) || 0) > 0) {
        runningMinutes += 1;
      }
    });
    return {
      key,
      label,
      averageRpm: this.average(rpmValues.filter((value) => value > 0)),
      maximumRpm: this.maximum(rpmValues),
      runningHours: runningMinutes / 60,
    };
  }

  private buildAuxSummary(
    key: ScGlory6AuxSummaryRow['key'],
    label: string,
    rpmMap: Map<number, number>,
    fuelMap: Map<number, number>,
    fuelOverride?: number,
  ): ScGlory6AuxSummaryRow {
    const runningMinutes = Array.from(rpmMap.values()).filter((value) => value >= 100).length;
    return {
      key,
      label,
      runningHours: runningMinutes / 60,
      fuelUsed: fuelOverride !== undefined ? fuelOverride : this.sumMap(fuelMap),
    };
  }

  private buildLegacyPassageSummary(
    minuteKeys: readonly number[],
    pmePoints: readonly NumericPoint[],
    cmePoints: readonly NumericPoint[],
    smePoints: readonly NumericPoint[],
    ppsPoints: readonly NumericPoint[],
    cpsPoints: readonly NumericPoint[],
    spsPoints: readonly NumericPoint[],
    pmeFuel: Map<number, number>,
    cmeFuel: Map<number, number>,
    smeFuel: Map<number, number>,
    paeFuel: Map<number, number>,
    saeFuel: Map<number, number>,
    gpsSpeed: Map<number, number>,
    totalPassageFuel: number,
  ): ScGlory6PassageSummary {
    const selected = new Set(minuteKeys);
    const pmeStats = this.buildLegacyPassageCounterStats(pmePoints, selected, 8, 2000);
    const cmeStats = this.buildLegacyPassageCounterStats(cmePoints, selected, 8, 2000);
    const smeStats = this.buildLegacyPassageCounterStats(smePoints, selected, 8, 2000);
    const ppsStats = this.buildLegacyPassageCounterStats(ppsPoints, selected, 12, 800);
    const cpsStats = this.buildLegacyPassageCounterStats(cpsPoints, selected, 12, 800);
    const spsStats = this.buildLegacyPassageCounterStats(spsPoints, selected, 12, 800);

    const rawPmeFuel = this.sumSelectedMap(pmeFuel, selected);
    const rawCmeFuel = this.sumSelectedMap(cmeFuel, selected);
    const rawSmeFuel = this.sumSelectedMap(smeFuel, selected);
    const rawPaeFuel = this.sumSelectedMap(paeFuel, selected);
    const rawSaeFuel = this.sumSelectedMap(saeFuel, selected);
    const rawPassageFuel = rawPmeFuel + rawCmeFuel + rawSmeFuel + rawPaeFuel + rawSaeFuel;
    const scale = rawPassageFuel !== 0 && totalPassageFuel > 0 ? totalPassageFuel / rawPassageFuel : 1;

    const pmeFuelValue = this.roundLegacy2(rawPmeFuel * scale);
    const cmeFuelValue = this.roundLegacy2(rawCmeFuel * scale);
    const smeFuelValue = this.roundLegacy2(rawSmeFuel * scale);
    const paeFuelValue = this.roundLegacy2(rawPaeFuel * scale);
    const saeFuelValue = this.roundLegacy2(rawSaeFuel * scale);

    const speedValues = minuteKeys
      .map((bucket) => gpsSpeed.get(bucket))
      .filter((value): value is number => value !== undefined && Number.isFinite(value) && value > 12);
    const speedBandValues = speedValues.filter((value) => value >= 15 && value < 17);
    const fallbackSpeedValues = speedValues.filter((value) => value < 17);
    const averageSpeed =
      speedBandValues.length > 0
        ? this.average(speedBandValues)
        : fallbackSpeedValues.length > 0
          ? this.maximum(fallbackSpeedValues)
          : 0;
    const gpsAverage = this.average(speedValues) || 0;
    const passageHours = this.roundLegacy2(speedValues.length / 60);
    const distanceNm = this.roundLegacy2(gpsAverage * passageHours);

    return {
      mainEngines: [
        this.legacyEngineSummary('port', 'Port M/E', pmeStats, pmeFuelValue),
        this.legacyEngineSummary('center', 'Ctr. M/E', cmeStats, cmeFuelValue),
        this.legacyEngineSummary('starboard', 'Stb. M/E', smeStats, smeFuelValue),
      ],
      shafts: [
        this.legacyShaftSummary('port', 'Port Shaft', ppsStats),
        this.legacyShaftSummary('center', 'Ctr. Shaft', cpsStats),
        this.legacyShaftSummary('starboard', 'Stb. Shaft', spsStats),
      ],
      auxFuel: [
        { key: 'port', label: 'Port A/E', runningHours: 0, fuelUsed: paeFuelValue },
        { key: 'center', label: 'Ctr. A/E', runningHours: 0, fuelUsed: 0 },
        { key: 'starboard', label: 'Stb. A/E', runningHours: 0, fuelUsed: saeFuelValue },
      ],
      mainEngineFuelTotal: this.roundLegacy2(pmeFuelValue + cmeFuelValue + smeFuelValue),
      auxiliaryFuelTotal: this.roundLegacy2(paeFuelValue + saeFuelValue),
      averageSpeed: averageSpeed === null ? null : this.roundLegacy2(averageSpeed),
      distanceNm,
    };
  }

  private buildLegacyPassageCounterStats(
    points: readonly NumericPoint[],
    selected: ReadonlySet<number>,
    pulse: number,
    maxRpm: number,
  ): { averageRpm: number | null; maximumRpm: number | null; runningHours: number } {
    const samples = this.buildLegacyCounterSamples(points);
    let deltaSum = 0;
    let runningCount = 0;
    let maxLostAdjustedDelta = 0;

    selected.forEach((bucket) => {
      const sample = samples.get(bucket);
      if (!sample) return;
      deltaSum += sample.delta;
      if (sample.running) runningCount += 1;
      if (sample.delta / pulse <= maxRpm) {
        maxLostAdjustedDelta = Math.max(maxLostAdjustedDelta, sample.delta / Math.max(1, sample.lost));
      }
    });

    return {
      averageRpm: runningCount > 0 ? (deltaSum / pulse) / runningCount : 0,
      maximumRpm: maxLostAdjustedDelta > 0 ? maxLostAdjustedDelta / pulse : 0,
      runningHours: runningCount / 60,
    };
  }
  
  private buildLegacyCounterSamples(points: readonly NumericPoint[]): Map<number, LegacyCounterSample> {
    const result = new Map<number, LegacyCounterSample>();
    const sorted = [...points].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    let seen = 0;
    let lost = 1;
    let previous = 0;

    for (const point of sorted) {
      const value = point.value;
      if (!Number.isFinite(value)) continue;
      if (value !== 0) {
        if (seen === 0) {
          previous = value;
        } else if (value > previous) {
          const delta = value - previous;
          result.set(this.floorToMinute(point.timestamp).getTime(), { delta, lost, running: true });
          previous = value;
        } else {
          previous = value;
        }
        lost = 1;
        seen += 1;
      } else {
        lost += 1;
      }
    }
    return result;
  }

  private calculateLegacySpeedSummary(
    points: readonly NumericPoint[],
    start: number,
    end: number,
    pulse: number,
    maxRpm: number,
  ): { averageRpm: number | null; maximumRpm: number | null; runningHours: number } {
    const values = this.buildExactValueMap(points);
    let initialized = false;
    let lost = 1;
    let previous = 0;
    let previousRunStatus = false;
    let deltaSum = 0;
    let averageCount = 0;
    let maxRawDelta = 0;
    let runningMinutes = 0;

    for (let minute = start; minute <= end; minute += MINUTE_MS) {
      const value = values.get(minute) || 0;
      if (value !== 0) {
        if (!initialized) {
          previous = value;
          initialized = true;
          continue;
        }

        previousRunStatus = false;
        if (value > previous) {
          const delta = value - previous;
          if (delta / pulse <= maxRpm) {
            if (lost > 1) {
              maxRawDelta = Math.max(maxRawDelta, delta / lost);
              lost = 1;
            } else {
              maxRawDelta = Math.max(maxRawDelta, delta);
            }
            deltaSum += delta;
            averageCount += 1;
          }

          // CalSpeedSummary counts a running minute from the unadjusted delta.
          if (delta / pulse >= 100) {
            runningMinutes += 1;
          }
          previousRunStatus = true;
        }
        previous = value;
      } else if (previousRunStatus) {
        // Legacy behavior assumes the engine keeps running while a counter sample
        // is temporarily missing after a running sample.
        runningMinutes += 1;
        lost += 1;
      }
    }

    return {
      averageRpm: averageCount > 0 ? (deltaSum / pulse) / averageCount : 0,
      maximumRpm: maxRawDelta > 0 ? maxRawDelta / pulse : 0,
      runningHours: runningMinutes / 60,
    };
  }

  private calculateLegacyShaftSpeedSummary(
    points: readonly NumericPoint[],
    start: number,
    end: number,
    pulse: number,
    maxRpm: number,
  ): { averageRpm: number | null; maximumRpm: number | null; runningHours: number } {
    const values = this.buildExactValueMap(points);
    let initialized = false;
    let lost = 1;
    let previous = 0;
    let previousRunStatus = false;
    let deltaSum = 0;
    let averageCount = 0;
    let maxRawDelta = 0;
    let runningMinutes = 0;

    for (let minute = start; minute <= end; minute += MINUTE_MS) {
      const value = values.get(minute) || 0;
      if (value !== 0) {
        if (!initialized) {
          previous = value;
          initialized = true;
          continue;
        }

        previousRunStatus = false;
        if (value > previous) {
          const delta = value - previous;
          if (delta / pulse <= maxRpm) {
            if (lost > 1) {
              maxRawDelta = Math.max(maxRawDelta, delta / lost);
              lost = 1;
            } else {
              maxRawDelta = Math.max(maxRawDelta, delta);
            }
            deltaSum += delta;
            averageCount += 1;
          }

          // CalSpeedShaftSummary increments running hour for every positive
          // counter movement, even when that movement is rejected for RPM stats.
          runningMinutes += 1;
          previousRunStatus = true;
        }
        previous = value;
      } else if (previousRunStatus) {
        runningMinutes += 1;
        lost += 1;
      }
    }

    return {
      averageRpm: averageCount > 0 ? (deltaSum / pulse) / averageCount : 0,
      maximumRpm: maxRawDelta > 0 ? maxRawDelta / pulse : 0,
      runningHours: runningMinutes / 60,
    };
  }

  private calculateLegacyShaftRunningHours(
    mainEnginePoints: readonly NumericPoint[],
    shaftPoints: readonly NumericPoint[],
    start: number,
    end: number,
  ): number {
    const mainValues = this.buildExactValueMap(mainEnginePoints);
    const shaftValues = this.buildExactValueMap(shaftPoints);
    const mainRunningMinutes = new Set<number>();

    let mainInitialized = false;
    let mainPrevious = 0;
    let mainPreviousRunStatus = false;
    for (let minute = start; minute <= end; minute += MINUTE_MS) {
      const value = mainValues.get(minute) || 0;
      if (value !== 0) {
        if (!mainInitialized) {
          mainPrevious = value;
          mainInitialized = true;
          continue;
        }
        mainPreviousRunStatus = false;
        if (value > mainPrevious) {
          mainRunningMinutes.add(minute);
          mainPreviousRunStatus = true;
        }
        mainPrevious = value;
      } else if (mainPreviousRunStatus) {
        mainRunningMinutes.add(minute);
      }
    }

    let shaftInitialized = false;
    let shaftPrevious = 0;
    let shaftPreviousRunStatus = false;
    let runningMinutes = 0;
    for (let minute = start; minute <= end; minute += MINUTE_MS) {
      const value = shaftValues.get(minute) || 0;
      if (value !== 0) {
        if (!shaftInitialized) {
          shaftPrevious = value;
          shaftInitialized = true;
          continue;
        }
        shaftPreviousRunStatus = false;
        if (value > shaftPrevious && mainRunningMinutes.has(minute)) {
          runningMinutes += 1;
          shaftPreviousRunStatus = true;
        }
        shaftPrevious = value;
      } else if (shaftPreviousRunStatus) {
        runningMinutes += 1;
      }
    }

    return runningMinutes / 60;
  }

  private buildExactValueMap(points: readonly NumericPoint[]): Map<number, number> {
    const result = new Map<number, number>();
    for (const point of points) {
      const time = point.timestamp.getTime();
      if (!Number.isFinite(time) || time % MINUTE_MS !== 0) continue;
      result.set(time, point.value);
    }
    return result;
  }

  private legacyEngineSummary(
    key: ScGlory6EngineSummaryRow['key'],
    label: string,
    stats: { averageRpm: number | null; maximumRpm: number | null; runningHours: number },
    fuelUsed: number,
  ): ScGlory6EngineSummaryRow {
    return { key, label, ...stats, fuelUsed };
  }

  private legacyShaftSummary(
    key: ScGlory6ShaftSummaryRow['key'],
    label: string,
    stats: { averageRpm: number | null; maximumRpm: number | null; runningHours: number },
  ): ScGlory6ShaftSummaryRow {
    return { key, label, ...stats };
  }

  private sumSelectedMap(map: Map<number, number>, selected: ReadonlySet<number>): number {
    let sum = 0;
    selected.forEach((bucket) => {
      sum += map.get(bucket) || 0;
    });
    return sum;
  }

  private buildLegacyPdfSpeedPerformanceSeries(
    gpsPoints: readonly NumericPoint[],
  ): ScGlory6SpeedPoint[] {
    return [...gpsPoints]
      .filter((point) => Number.isFinite(point.value) && point.value !== 0)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .map((point) => {
        const date = point.timestamp;
        const hour = date.getHours();
        const minute = date.getMinutes();
        const visibleWindow =
          (hour >= 5 && hour < 9) ||
          (hour === 9 && minute === 0) ||
          (hour >= 15 && hour < 19) ||
          (hour === 19 && minute === 0);
        return {
          timestamp: new Date(date.getTime()),
          speed: visibleWindow ? point.value : 0,
        };
      });
  }

  private buildLegacyPdfHourlyRows(
    fallback: readonly ScGlory6HourlyRow[],
    reportStart: number,
    gpsPoints: readonly NumericPoint[],
    smeIn: readonly NumericPoint[],
    smeOut: readonly NumericPoint[],
    cmeIn: readonly NumericPoint[],
    cmeOut: readonly NumericPoint[],
    pmeIn: readonly NumericPoint[],
    pmeOut: readonly NumericPoint[],
    saeIn: readonly NumericPoint[],
    saeOut: readonly NumericPoint[],
    paeIn: readonly NumericPoint[],
    paeOut: readonly NumericPoint[],
  ): ScGlory6HourlyRow[] {
    const speedSum = Array.from({ length: 24 }, () => 0);
    const speedCount = Array.from({ length: 24 }, () => 0);

    for (const point of gpsPoints) {
      if (!Number.isFinite(point.value) || point.value === 0) continue;
      const timestamp = point.timestamp.getTime();
      const hour = timestamp === reportStart
        ? 0
        : new Date(timestamp - MINUTE_MS).getHours();
      speedSum[hour] += point.value;
      speedCount[hour] += 1;
    }

    const smeInDelta = this.buildLegacyHourlyTotalizerDeltaMap(smeIn, 0.3, true, 50);
    const smeOutDelta = this.buildLegacyHourlyTotalizerDeltaMap(smeOut, 0.3, true, 50);
    const cmeInDelta = this.buildLegacyHourlyTotalizerDeltaMap(cmeIn, 0.3, true, 50);
    const cmeOutDelta = this.buildLegacyHourlyTotalizerDeltaMap(cmeOut, 0.3, true, 50);
    const pmeInDelta = this.buildLegacyHourlyTotalizerDeltaMap(pmeIn, 0.3, true, 50);
    const pmeOutDelta = this.buildLegacyHourlyTotalizerDeltaMap(pmeOut, 0.3, true, 50);
    const saeInDelta = this.buildLegacyHourlyTotalizerDeltaMap(saeIn, 0.3, true, 50);
    const saeOutDelta = this.buildLegacyHourlyTotalizerDeltaMap(saeOut, 0.3, true, 50);
    const paeInDelta = this.buildLegacyHourlyTotalizerDeltaMap(paeIn, 0.3, true, 50);
    const paeOutDelta = this.buildLegacyHourlyTotalizerDeltaMap(paeOut, 0.3, true, 50);

    const sumByHour = (values: ReadonlyMap<number, number>): number[] => {
      const result = Array.from({ length: 24 }, () => 0);
      values.forEach((value, timestamp) => {
        const hour = new Date(timestamp - MINUTE_MS).getHours();
        result[hour] += value;
      });
      return result;
    };

    const smeInHour = sumByHour(smeInDelta);
    const smeOutHour = sumByHour(smeOutDelta);
    const cmeInHour = sumByHour(cmeInDelta);
    const cmeOutHour = sumByHour(cmeOutDelta);
    const pmeInHour = sumByHour(pmeInDelta);
    const pmeOutHour = sumByHour(pmeOutDelta);
    const saeInHour = sumByHour(saeInDelta);
    const saeOutHour = sumByHour(saeOutDelta);
    const paeInHour = sumByHour(paeInDelta);
    const paeOutHour = sumByHour(paeOutDelta);

    return Array.from({ length: 24 }, (_, hour) => {
      const base = fallback[hour];
      const speed = speedCount[hour] > 0 ? speedSum[hour] / speedCount[hour] : 0;
      const distance = speed * (speedCount[hour] / 60);
      const starboardMain = smeInHour[hour] > smeOutHour[hour]
        ? smeInHour[hour] - smeOutHour[hour]
        : 0;
      const centerMain = cmeInHour[hour] > cmeOutHour[hour]
        ? cmeInHour[hour] - cmeOutHour[hour]
        : 0;
      const portMain = pmeInHour[hour] > pmeOutHour[hour]
        ? pmeInHour[hour] - pmeOutHour[hour]
        : 0;
      const starboardAux = saeInHour[hour] > saeOutHour[hour]
        ? saeInHour[hour] - saeOutHour[hour]
        : 0;
      const portAux = paeInHour[hour] > paeOutHour[hour]
        ? paeInHour[hour] - paeOutHour[hour]
        : 0;
      const mainFuel = starboardMain + centerMain + portMain;
      const auxFuel = starboardAux + portAux;
      const active =
        speedCount[hour] > 0 ||
        mainFuel !== 0 ||
        auxFuel !== 0 ||
        Boolean(base?.active);

      return {
        ...(base || {
          hour,
          active: false,
          distanceNm: null,
          speedKnots: null,
          mainFuel: null,
          auxFuel: null,
          portMainFuel: null,
          centerMainFuel: null,
          starboardMainFuel: null,
          portAuxFuel: null,
          starboardAuxFuel: null,
          portMainRunningHours: null,
          centerMainRunningHours: null,
          starboardMainRunningHours: null,
          portAuxRunningHours: null,
          starboardAuxRunningHours: null,
          portShaftRunningHours: null,
          centerShaftRunningHours: null,
          starboardShaftRunningHours: null,
          portShaftRpm: null,
          centerShaftRpm: null,
          starboardShaftRpm: null,
          totalFuel: null,
        }),
        hour,
        active,
        distanceNm: distance,
        speedKnots: speed,
        mainFuel,
        auxFuel,
        portMainFuel: portMain,
        centerMainFuel: centerMain,
        starboardMainFuel: starboardMain,
        portAuxFuel: portAux,
        starboardAuxFuel: starboardAux,
        totalFuel: mainFuel + auxFuel,
      };
    });
  }

  private buildLegacyHourlyTotalizerDeltaMap(
    points: readonly NumericPoint[],
    maximumDelta: number,
    recoverAfterRejectedJump: boolean,
    recoveryMaximumDelta: number,
  ): Map<number, number> {
    const result = new Map<number, number>();
    const sorted = [...points].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    let index = 0;
    let previous = 0;
    let previousAfterLost = 0;

    for (const point of sorted) {
      const value = point.value;
      if (!Number.isFinite(value) || value === 0) continue;

      if (index === 0) {
        previous = value;
        index += 1;
        continue;
      }

      if (value > previous) {
        const delta = value - previous;
        if (delta <= maximumDelta) {
          result.set(point.timestamp.getTime(), delta * 1000);
          previous = value;
          previousAfterLost = 0;
        } else if (recoverAfterRejectedJump) {
          if (previousAfterLost !== 0 && previousAfterLost < value) {
            const recoveredDelta = value - previousAfterLost;
            if (recoveredDelta <= recoveryMaximumDelta) {
              result.set(point.timestamp.getTime(), recoveredDelta * 1000);
              previous = value;
              previousAfterLost = 0;
            } else {
              previousAfterLost = value;
            }
          }
          // Mirrors the final assignment in the C# rejected-jump branch.
          previousAfterLost = value;
        }
      } else if (index === 1) {
        previous = value;
      } else if (value >= 500 && value <= 20_000) {
        previous = value;
      }
      index += 1;
    }

    return result;
  }

  private buildTrackingSummary(
    minuteStart: number,
    minuteEnd: number,
    latitude: Map<number, number>,
    longitude: Map<number, number>,
    speed: Map<number, number>,
    heading: Map<number, number>,
  ): ScGlory6TrackingSummary {
    const route: ScGlory6TrackingPoint[] = [];
    for (let bucket = minuteStart; bucket <= minuteEnd; bucket += MINUTE_MS) {
      const lat = latitude.get(bucket);
      const lng = longitude.get(bucket);
      if (
        lat === undefined ||
        lng === undefined ||
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        Math.abs(lat) > 90 ||
        Math.abs(lng) > 180 ||
        (lat === 0 && lng === 0)
      ) {
        continue;
      }
      route.push({
        timestamp: new Date(bucket),
        latitude: lat,
        longitude: lng,
        speed: speed.get(bucket) ?? null,
        heading: heading.get(bucket) ?? null,
      });
    }

    const compactRoute = this.downsampleRoute(route, 300);
    const distanceNm = Array.from(speed.entries())
      .filter(([bucket, value]) => bucket >= minuteStart && bucket <= minuteEnd && value >= 0)
      .reduce((sum, [, value]) => sum + value / 60, 0);

    return {
      begin: route[0] || null,
      end: route[route.length - 1] || null,
      distanceNm,
      route: compactRoute,
    };
  }

  /**
   * Reproduces SCReportingService.GetRawData's exact DataTable timestamp join.
   * Completed Daily PDF has only whole-minute rows. Non-grid records must be
   * discarded BEFORE any totalizer delta calculation, otherwise they can move
   * fuel from one speed Mode to another while leaving the daily total unchanged.
   */
  private filterLegacyExactMinutePoints(
    points: readonly NumericPoint[],
    start: number,
    end: number,
  ): NumericPoint[] {
    const exactByMinute = new Map<number, NumericPoint>();

    for (const point of points) {
      const timestamp = point?.timestamp;
      if (!(timestamp instanceof Date)) continue;
      const time = timestamp.getTime();
      if (!Number.isFinite(time)) continue;

      // C# uses: DataTable.Select("TimeStamp = '" + DateTime + "'").
      // DateTime.ToString() keeps seconds but does not include fractional seconds.
      // Therefore xx:xx:00.123 is compared as xx:xx:00 and can hit the minute
      // grid row, while xx:xx:23.xxx cannot. Reproduce that instead of requiring
      // epoch % 60000 === 0, which incorrectly discarded valid PDF samples.
      if (timestamp.getSeconds() !== 0) continue;
      const normalized = new Date(time);
      normalized.setMilliseconds(0);
      const minute = normalized.getTime();
      if (minute < start || minute > end) continue;

      // Multiple records that stringify to the same legacy second overwrite the
      // same DataRow. With the sorted historian stream, the final record wins.
      exactByMinute.set(minute, { timestamp: normalized, value: point.value });
    }

    return Array.from(exactByMinute.values()).sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
  }

  private buildLegacySingleInstantMap(points: readonly NumericPoint[]): Map<number, number> {
    const result = new Map<number, number>();
    for (const point of points) {
      const time = point.timestamp.getTime();
      if (!Number.isFinite(time) || !Number.isFinite(point.value)) continue;
      result.set(time, Math.fround(point.value));
    }
    return result;
  }

  private buildInstantMap(points: readonly NumericPoint[]): Map<number, number> {
    const result = new Map<number, number>();
    for (const point of points) {
      const bucket = this.floorToMinute(point.timestamp).getTime();
      result.set(bucket, point.value);
    }
    return result;
  }

  private buildCounterRateMap(
    points: readonly NumericPoint[],
    pulse: number,
    maxRpm: number,
  ): Map<number, number> {
    const result = new Map<number, number>();
    const sorted = [...points].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    for (let index = 1; index < sorted.length; index += 1) {
      const previous = sorted[index - 1];
      const current = sorted[index];
      const previousBucket = this.floorToMinute(previous.timestamp).getTime();
      const currentBucket = this.floorToMinute(current.timestamp).getTime();
      const gapMinutes = Math.max(1, Math.round((currentBucket - previousBucket) / MINUTE_MS));
      if (gapMinutes > MAX_INTERPOLATION_GAP_MINUTES) {
        continue;
      }
      const delta = current.value - previous.value;
      if (!Number.isFinite(delta) || delta <= 0) {
        continue;
      }
      const rpm = delta / pulse / gapMinutes;
      if (!Number.isFinite(rpm) || rpm < 0 || rpm > maxRpm) {
        continue;
      }
      for (let minute = 1; minute <= gapMinutes; minute += 1) {
        result.set(previousBucket + minute * MINUTE_MS, rpm);
      }
    }
    return result;
  }

  private buildLegacyDailyFuelTotal(
    supplyPoints: readonly NumericPoint[],
    returnPoints: readonly NumericPoint[],
    spanLimit = 8000,
    stepLimit = 300,
  ): number {
    // SC GLORY 6 CalFLowTotalSME uses raw m3 totalizers. It accepts a full-day
    // span below 20 m3 and a per-accepted-step increase up to 10 m3, then
    // converts the net FIN-FOUT span to litres (x1000).
    const supply = this.buildLegacyTotalizerSpan(
      supplyPoints, spanLimit, stepLimit, true,
    );
    const returned = this.buildLegacyTotalizerSpan(
      returnPoints, spanLimit, stepLimit, true,
    );
    const total = supply - returned;
    return Number.isFinite(total) ? total * 1000 : 0;
  }

  private buildLegacyTotalizerSpan(
    points: readonly NumericPoint[],
    spanLimit: number,
    stepLimit: number,
    inclusiveStep: boolean,
  ): number {
    const sorted = [...points].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    let minimum = 0;
    let maximum = 0;

    for (const point of sorted) {
      const value = point.value;
      if (!Number.isFinite(value) || value <= 0) continue;
      if (minimum === 0) {
        if (value < 100_000_000) minimum = value;
        continue;
      }
      if (value - minimum >= spanLimit) continue;
      const validStep = (delta: number) =>
        inclusiveStep ? delta <= stepLimit : delta < stepLimit;
      if (maximum > 0) {
        if (value > maximum && validStep(value - maximum)) maximum = value;
      } else if (validStep(value - minimum)) {
        maximum = value;
      }
    }

    return maximum - minimum;
  }

  private buildLegacyFuelDeltaMap(
    supplyPoints: readonly NumericPoint[],
    returnPoints: readonly NumericPoint[],
    supplyMaxDelta: number,
    returnMaxDelta: number,
  ): Map<number, number> {
    const supply = this.buildLegacyTotalizerDeltaMap(supplyPoints, supplyMaxDelta);
    const returned = this.buildLegacyTotalizerDeltaMap(returnPoints, returnMaxDelta);
    const buckets = new Set<number>([...supply.keys(), ...returned.keys()]);
    const result = new Map<number, number>();
    buckets.forEach((bucket) => {
      result.set(bucket, (supply.get(bucket) || 0) - (returned.get(bucket) || 0));
    });
    return result;
  }

  private buildLegacyTotalizerDeltaMap(
    points: readonly NumericPoint[],
    maximumDelta: number,
  ): Map<number, number> {
    const result = new Map<number, number>();
    const sorted = [...points].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    let nonZeroIndex = 0;
    let previous = 0;
    let previousAfterLost = 0;

    for (const point of sorted) {
      const value = point.value;
      if (!Number.isFinite(value) || value === 0) continue;
      if (nonZeroIndex === 0) {
        previous = value;
        nonZeroIndex += 1;
        continue;
      }

      const bucket = point.timestamp.getTime();
      if (!Number.isFinite(bucket) || bucket % MINUTE_MS !== 0) {
        nonZeroIndex += 1;
        continue;
      }
      if (value > previous) {
        const delta = value - previous;
        if (delta <= maximumDelta) {
          result.set(bucket, delta);
          previous = value;
          previousAfterLost = 0;
        } else {
          if (previousAfterLost !== 0 && previousAfterLost < value) {
            result.set(bucket, value - previousAfterLost);
            previous = value;
            previousAfterLost = 0;
          }
          // This assignment deliberately follows the legacy code, including its
          // post-recovery write, because the PDF service uses the same behavior.
          previousAfterLost = value;
        }
      } else if (nonZeroIndex === 1) {
        previous = value;
      } else if (value >= 500 && value <= 20_000) {
        previous = value;
      }
      nonZeroIndex += 1;
    }

    return result;
  }

  private roundLegacy2(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private buildFuelMap(
    supplyPoints: readonly NumericPoint[],
    returnPoints: readonly NumericPoint[],
  ): Map<number, number> {
    const supply = this.buildTotalizerDeltaMap(supplyPoints);
    const returned = this.buildTotalizerDeltaMap(returnPoints);
    const buckets = new Set<number>([...supply.keys(), ...returned.keys()]);
    const result = new Map<number, number>();
    buckets.forEach((bucket) => {
      const value = (supply.get(bucket) || 0) - (returned.get(bucket) || 0);
      result.set(bucket, Math.max(0, Number.isFinite(value) ? value : 0));
    });
    return result;
  }

  private buildTotalizerDeltaMap(points: readonly NumericPoint[]): Map<number, number> {
    const result = new Map<number, number>();
    const sorted = [...points].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    for (let index = 1; index < sorted.length; index += 1) {
      const previous = sorted[index - 1];
      const current = sorted[index];
      const previousBucket = this.floorToMinute(previous.timestamp).getTime();
      const currentBucket = this.floorToMinute(current.timestamp).getTime();
      const gapMinutes = Math.max(1, Math.round((currentBucket - previousBucket) / MINUTE_MS));
      if (gapMinutes > MAX_INTERPOLATION_GAP_MINUTES) {
        continue;
      }
      const delta = current.value - previous.value;
      if (!Number.isFinite(delta) || delta < 0 || delta > 3000) {
        continue;
      }
      const perMinute = delta / gapMinutes;
      for (let minute = 1; minute <= gapMinutes; minute += 1) {
        const bucket = previousBucket + minute * MINUTE_MS;
        result.set(bucket, (result.get(bucket) || 0) + perMinute);
      }
    }
    return result;
  }

  private isLegacyHistorianBundle(
    response: any,
  ): response is Array<{ __legacyTagName: string; __legacyResponse: any }> {
    return (
      Array.isArray(response) &&
      response.every(
        (item) =>
          item &&
          typeof item === 'object' &&
          typeof item.__legacyTagName === 'string' &&
          Object.prototype.hasOwnProperty.call(item, '__legacyResponse'),
      )
    );
  }

  private extractLegacyHistorianBundle(
    bundle: Array<{ __legacyTagName: string; __legacyResponse: any }>,
    requestedTags: readonly string[],
  ): Map<string, NumericPoint[]> {
    const result = new Map<string, NumericPoint[]>();
    requestedTags.forEach((tag) => result.set(this.tagKey(tag), []));

    for (const item of bundle) {
      const tagName = item.__legacyTagName;
      const singleSeries = this.extractHistorianSeries(item.__legacyResponse, [tagName], true);
      const key = this.tagKey(tagName);
      const points = singleSeries.get(key) || [];
      result.set(key, [...(result.get(key) || []), ...points]);
    }

    return this.sortSeries(result);
  }

  private extractHistorianSeries(
    response: any,
    requestedTags: readonly string[],
    legacyUtcTimestamps = false,
  ): Map<string, NumericPoint[]> {
    if (this.isLegacyHistorianBundle(response)) {
      return this.extractLegacyHistorianBundle(response, requestedTags);
    }
    const result = new Map<string, NumericPoint[]>();
    requestedTags.forEach((tag) => result.set(this.tagKey(tag), []));

    let source = this.parseJson(response);
    source = this.unwrapResponse(source);

    if (Array.isArray(source) && source.length > 0 && this.looksLikeMultiValueRecord(source[0])) {
      source.forEach((record: any) => {
        const timestamp = legacyUtcTimestamps
          ? this.parseLegacyHistorianDate(this.getRecordTimestamp(record))
          : this.parseDate(this.getRecordTimestamp(record));
        const values = record?.Values || record?.values;
        if (!timestamp || !Array.isArray(values)) return;
        values.forEach((rawValue: any, index: number) => {
          const tagName = this.getTagName(rawValue) || requestedTags[index];
          const value = this.parseNumber(this.getRecordValue(rawValue) ?? rawValue);
          if (!tagName || value === null) return;
          this.pushSeriesPoint(result, tagName, timestamp, value);
        });
      });
      return this.sortSeries(result);
    }

    const seriesArray = this.toSeriesArray(source);
    seriesArray.forEach((series: any, index: number) => {
      const fallbackTag = requestedTags[index] || '';
      const tagName = this.getTagName(series) || fallbackTag;
      const records = this.extractRecords(series);

      if (records.length === 0 && this.looksLikeFlatRecord(series)) {
        const timestamp = legacyUtcTimestamps
          ? this.parseLegacyHistorianDate(this.getRecordTimestamp(series))
          : this.parseDate(this.getRecordTimestamp(series));
        const value = this.parseNumber(this.getRecordValue(series));
        if (timestamp && value !== null && tagName) {
          this.pushSeriesPoint(result, tagName, timestamp, value);
        }
        return;
      }

      records.forEach((record: any) => {
        const timestamp = legacyUtcTimestamps
          ? this.parseLegacyHistorianDate(this.getRecordTimestamp(record))
          : this.parseDate(this.getRecordTimestamp(record));
        const value = this.parseNumber(this.getRecordValue(record));
        const recordTag = this.getTagName(record) || tagName;
        if (!timestamp || value === null || !recordTag) return;
        this.pushSeriesPoint(result, recordTag, timestamp, value);
      });
    });

    return this.sortSeries(result);
  }

  private pushSeriesPoint(
    result: Map<string, NumericPoint[]>,
    tagName: string,
    timestamp: Date,
    value: number,
  ): void {
    const key = this.tagKey(tagName);
    const targetKey = result.has(key)
      ? key
      : Array.from(result.keys()).find((candidate) => key.endsWith(candidate) || candidate.endsWith(key));
    if (!targetKey) return;
    result.get(targetKey)!.push({ timestamp, value });
  }

  private sortSeries(series: Map<string, NumericPoint[]>): Map<string, NumericPoint[]> {
    series.forEach((points, key) => {
      const deduped = new Map<number, NumericPoint>();
      points.forEach((point) => deduped.set(point.timestamp.getTime(), point));
      series.set(
        key,
        Array.from(deduped.values()).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
      );
    });
    return series;
  }

  private parseJson(value: any): any {
    if (typeof value !== 'string') return value;
    const text = value.trim();
    if (!text) return [];
    try {
      return JSON.parse(text);
    } catch {
      return [];
    }
  }

  private unwrapResponse(source: any): any {
    if (!source || Array.isArray(source) || typeof source !== 'object') return source;
    const candidates = [
      source.data,
      source.Data,
      source.result,
      source.Result,
      source.results,
      source.Results,
      source.records,
      source.Records,
      source.items,
      source.Items,
      source.values,
      source.Values,
      source.tags,
      source.Tags,
      source.HistorianValues,
      source.historianValues,
      source.history,
      source.History,
      source.payload,
      source.Payload,
    ];
    return candidates.find((candidate) => Array.isArray(candidate)) ?? source;
  }

  private toSeriesArray(source: any): any[] {
    if (Array.isArray(source)) {
      if (source.length > 0 && this.looksLikeFlatRecord(source[0]) && this.getTagName(source[0])) {
        const grouped = new Map<string, any[]>();
        source.forEach((record) => {
          const tag = this.getTagName(record) || 'unknown';
          if (!grouped.has(tag)) grouped.set(tag, []);
          grouped.get(tag)!.push(record);
        });
        return Array.from(grouped.entries()).map(([TagName, records]) => ({ TagName, records }));
      }
      return source;
    }

    if (source && typeof source === 'object') {
      return Object.entries(source)
        .map(([key, value]) => {
          if (Array.isArray(value)) return { TagName: key, records: value };
          if (value && typeof value === 'object') return { ...(value as object), TagName: this.getTagName(value) || key };
          return null;
        })
        .filter(Boolean);
    }
    return [];
  }

  private extractRecords(series: any): any[] {
    const candidates = [
      series?.records,
      series?.Records,
      series?.values,
      series?.Values,
      Array.isArray(series?.Value) ? series.Value : null,
      series?.data,
      series?.Data,
      series?.items,
      series?.Items,
      series?.points,
      series?.Points,
      series?.history,
      series?.History,
      series?.HistorianValues,
      series?.historianValues,
      series?.ValueList,
      series?.valueList,
    ];
    return candidates.find((candidate) => Array.isArray(candidate)) || [];
  }

  private getTagName(item: any): string {
    if (!item) return '';
    if (typeof item === 'string') return item;
    return String(
      item.tagName ||
        item.TagName ||
        item.HistorianTagName ||
        item.historianTagName ||
        item.HistorianTag ||
        item.historianTag ||
        item.PointName ||
        item.pointName ||
        item.Name ||
        item.name ||
        item.tag ||
        item.Tag ||
        '',
    ).trim();
  }

  private getRecordTimestamp(record: any): any {
    return (
      record?.TimeStamp ??
      record?.Timestamp ??
      record?.timeStamp ??
      record?.timestamp ??
      record?.Time ??
      record?.time ??
      record?.DateTime ??
      record?.datetime ??
      record?.Date ??
      record?.date ??
      record?.x ??
      null
    );
  }

  private getRecordValue(record: any): any {
    if (!record || typeof record !== 'object') return record;
    return (
      record.Value ??
      record.value ??
      record.Data ??
      record.data ??
      record.Val ??
      record.val ??
      record.NumericValue ??
      record.numericValue ??
      record.IValue ??
      record.iValue ??
      record.y ??
      null
    );
  }

  private looksLikeFlatRecord(item: any): boolean {
    return !!item && typeof item === 'object' && this.getRecordTimestamp(item) !== null && this.getRecordValue(item) !== null;
  }

  private looksLikeMultiValueRecord(item: any): boolean {
    return (
      !!item &&
      typeof item === 'object' &&
      this.getRecordTimestamp(item) !== null &&
      Array.isArray(item?.Values || item?.values) &&
      !this.getTagName(item)
    );
  }

  private parseDate(value: any): Date | null {
    if (value === null || value === undefined || value === '') return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    if (typeof value === 'number' && Number.isFinite(value)) {
      const millis = Math.abs(value) < 10_000_000_000 ? value * 1000 : value;
      const date = new Date(millis);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    const text = String(value).trim();
    const dotNet = /\/Date\(([-+]?\d+)/.exec(text);
    if (dotNet) {
      const date = new Date(Number(dotNet[1]));
      return Number.isNaN(date.getTime()) ? null : date;
    }
    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private parseLegacyHistorianDate(value: any): Date | null {
    if (value === null || value === undefined || value === '') return null;
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return this.parseDate(value);
    }

    const text = String(value).trim();
    const dotNet = /\/Date\(([-+]?\d+)/.exec(text);
    if (dotNet) {
      const date = new Date(Number(dotNet[1]));
      return Number.isNaN(date.getTime()) ? null : date;
    }

    if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(text)) {
      return this.parseDate(text);
    }

    // SCReportingService applies TimeStamp.AddHours(7). Parsing a naive logger
    // timestamp as UTC produces the same +07:00 alignment in the Thailand UI.
    const parts = /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,7}))?)?$/.exec(text);
    if (parts) {
      const milliseconds = Number(`0.${parts[7] || '0'}`) * 1000;
      const date = new Date(Date.UTC(
        Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]),
        Number(parts[4]), Number(parts[5]), Number(parts[6] || 0), Math.floor(milliseconds),
      ));
      return Number.isNaN(date.getTime()) ? null : date;
    }

    return this.parseDate(text);
  }

  private downsampleSpeedSeries(
    speed: Map<number, number>,
    start: number,
    end: number,
    maxPoints: number,
  ): ScGlory6SpeedPoint[] {
    const points = Array.from(speed.entries())
      .filter(([bucket, value]) => bucket >= start && bucket <= end && value >= 0 && Number.isFinite(value))
      .sort((a, b) => a[0] - b[0]);
    if (points.length <= maxPoints) {
      return points.map(([bucket, value]) => ({ timestamp: new Date(bucket), speed: value }));
    }
    const step = Math.max(1, Math.ceil(points.length / maxPoints));
    return points.filter((_, index) => index % step === 0).map(([bucket, value]) => ({ timestamp: new Date(bucket), speed: value }));
  }

  private downsampleSpeedPoints(
    source: readonly ScGlory6SpeedPoint[],
    maxPoints: number,
  ): ScGlory6SpeedPoint[] {
    const points = [...source]
      .filter(
        (point) =>
          point?.timestamp instanceof Date &&
          Number.isFinite(point.timestamp.getTime()) &&
          Number.isFinite(point.speed) &&
          point.speed >= 0,
      )
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    if (points.length <= maxPoints) return points;
    const step = Math.max(1, Math.ceil(points.length / maxPoints));
    const result = points.filter((_, index) => index % step === 0);
    const last = points[points.length - 1];
    if (result[result.length - 1] !== last) result.push(last);
    return result;
  }

  private downsampleRoute(route: readonly ScGlory6TrackingPoint[], maxPoints: number): ScGlory6TrackingPoint[] {
    if (route.length <= maxPoints) return [...route];
    const step = Math.max(1, Math.ceil(route.length / maxPoints));
    const result = route.filter((_, index) => index % step === 0);
    const last = route[route.length - 1];
    if (result[result.length - 1] !== last) result.push(last);
    return result;
  }

  private resolveModeProfileKey(label: string): string {
    const normalized = this.normalizeIdentity(label);
    const mode = SC_GLORY_6_REPORT_PROFILE.modes.find(
      (item) => this.normalizeIdentity(item.label) === normalized,
    );
    return mode?.key || SC_GLORY_6_REPORT_PROFILE.modes[0].key;
  }

  private resolveModeFromGpsSpeed(speed: number | null): string | null {
    if (speed === null || !Number.isFinite(speed)) return null;
    if (speed <= 2) return 'Standby';
    if (speed <= 3.5) return 'Cargo Operation';
    if (speed <= 10) return 'Manoeuvring';
    if (speed <= 12) return 'Sea Passage Economics';
    return 'Passage';
  }

  private buildModeReason(speed: number | null, mode: string): string {
    if (speed === null) return 'SC GLORY 6 mode is unavailable because GPS speed is missing.';
    return `Derived from ${SC_GLORY_6_MODE_HISTORIAN_TAG}: ${speed.toFixed(2)} kn matches the SC GLORY 6 report rule for ${mode}.`;
  }

  private parseNumber(rawValue: unknown): number | null {
    if (rawValue === null || rawValue === undefined || rawValue === '') return null;
    const value = Number(String(rawValue).replace(/,/g, '').trim());
    return Number.isFinite(value) ? value : null;
  }

  private isScGlory6Profile(id: unknown, aliases: unknown, prefixes: unknown): boolean {
    const candidates = [
      id,
      ...(Array.isArray(aliases) ? aliases : []),
      ...(Array.isArray(prefixes) ? prefixes : []),
    ];
    return candidates.some((value) => this.normalizeIdentity(value) === 'scglory6');
  }

  private normalizeIdentity(value: unknown): string {
    return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
  }

  private tagKey(value: string): string {
    return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '');
  }

  private floorToMinute(value: Date): Date {
    const result = new Date(value);
    result.setSeconds(0, 0);
    return result;
  }

  private formatHistorianRequestTime(value: Date): string {
    const pad = (part: number): string => String(part).padStart(2, '0');
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
  }

  private average(values: readonly number[]): number | null {
    const valid = values.filter((value) => Number.isFinite(value));
    return valid.length > 0 ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
  }

  private maximum(values: readonly number[]): number | null {
    const valid = values.filter((value) => Number.isFinite(value));
    return valid.length > 0 ? Math.max(...valid) : null;
  }

  private sumMap(values: Map<number, number>): number {
    let total = 0;
    values.forEach((value) => {
      if (Number.isFinite(value) && value > 0) total += value;
    });
    return total;
  }

  private percent(value: number, total: number): number {
    if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) return 0;
    return Math.max(0, Math.min(100, (value / total) * 100));
  }

  private ratioPercent(value: number, total: number): number {
    if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) return 0;
    return Math.max(0, (value / total) * 100);
  }
}
