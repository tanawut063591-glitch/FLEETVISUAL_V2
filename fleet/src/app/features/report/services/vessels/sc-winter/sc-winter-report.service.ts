import { Injectable } from '@angular/core';
import { Observable, from, of, throwError } from 'rxjs';
import { catchError, finalize, map, mergeMap, shareReplay, tap, toArray } from 'rxjs/operators';

import { NewHttpClientService } from '../../../../../shared/services/http-client1.service';
import { resetReportCacheForAuthChange, setBoundedReportCache } from '../../common/report-cache.util';
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
  buildExactMinuteValueMap,
  isCompletedDailyWindow,
} from '../../common/pdf-mode-parity';
import { calculateLegacyDailyFuelTotal, exactMinutePoints } from '../../common/legacy-daily-fuel';
import {
  SC_WINTER_MODE_HISTORIAN_TAG,
  SC_WINTER_REPORT_PROFILE,
} from './sc-winter-report.profile';

export interface ScWinterEngineSummaryRow {
  key: 'port' | 'center' | 'starboard';
  label: string;
  averageRpm: number | null;
  maximumRpm: number | null;
  runningHours: number;
  fuelUsed: number;
}

export interface ScWinterShaftSummaryRow {
  key: 'port' | 'center' | 'starboard';
  label: string;
  averageRpm: number | null;
  maximumRpm: number | null;
  runningHours: number;
}

export interface ScWinterAuxSummaryRow {
  key: 'port' | 'center' | 'starboard' | 'fourth';
  label: string;
  runningHours: number;
  fuelUsed: number;
  averageRpm: number | null;
  maximumRpm: number | null;
}

export interface ScWinterUtilizationRow {
  label: string;
  port: number;
  center: number;
  starboard: number;
}

export interface ScWinterModeSummaryRow {
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

export interface ScWinterPassageSummary {
  mainEngines: ScWinterEngineSummaryRow[];
  shafts: ScWinterShaftSummaryRow[];
  auxFuel: ScWinterAuxSummaryRow[];
  mainEngineFuelTotal: number;
  auxiliaryFuelTotal: number;
  averageSpeed: number | null;
  distanceNm: number;
}

export interface ScWinterTrackingPoint {
  timestamp: Date;
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
}

export interface ScWinterTrackingSummary {
  begin: ScWinterTrackingPoint | null;
  end: ScWinterTrackingPoint | null;
  distanceNm: number;
  route: ScWinterTrackingPoint[];
}

export interface ScWinterHourlyRow {
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
  centerAuxFuel: number | null;
  starboardAuxFuel: number | null;
  fourthAuxFuel?: number | null;
  portMainRunningHours: number | null;
  centerMainRunningHours: number | null;
  starboardMainRunningHours: number | null;
  portAuxRunningHours: number | null;
  centerAuxRunningHours: number | null;
  starboardAuxRunningHours: number | null;
  fourthAuxRunningHours?: number | null;
  portShaftRunningHours: number | null;
  centerShaftRunningHours: number | null;
  starboardShaftRunningHours: number | null;
  portShaftRpm: number | null;
  centerShaftRpm: number | null;
  starboardShaftRpm: number | null;
  totalFuel: number | null;
}

export interface ScWinterSpeedPoint {
  timestamp: Date;
  speed: number;
}

export type ScWinterHistorianSource = 'report' | 'api2' | 'live' | 'mixed';

export interface ScWinterReportQuality {
  historianSource: ScWinterHistorianSource;
  pdfParityVerified: boolean;
  fuelRecoveryUsed: boolean;
  warnings: string[];
}

export interface ScWinterDailyUiReport {
  periodStart: Date;
  periodEnd: Date;
  loadedAt: Date;
  coveragePercent: number;
  averageSpeed: number | null;
  maximumSpeed: number | null;
  engineSummary: ScWinterEngineSummaryRow[];
  shaftSummary: ScWinterShaftSummaryRow[];
  auxSummary: ScWinterAuxSummaryRow[];
  utilization: ScWinterUtilizationRow[];
  mainEngineFuelTotal: number;
  auxiliaryFuelTotal: number;
  totalFuelUsed: number;
  modeSummary: ScWinterModeSummaryRow[];
  passageSummary: ScWinterPassageSummary;
  tracking: ScWinterTrackingSummary;
  hourly: ScWinterHourlyRow[];
  speedSeries: ScWinterSpeedPoint[];
  quality: ScWinterReportQuality;
}

export type ScWinterUiPeriodKind = 'day' | 'range' | 'month';

export interface ScWinterDailyTrendRow {
  date: Date;
  totalFuelUsed: number;
  mainEngineFuelTotal: number;
  auxiliaryFuelTotal: number;
  distanceNm: number;
  coveragePercent: number;
  modeRunningHours: number;
}

export interface ScWinterPeriodUiReport extends ScWinterDailyUiReport {
  periodKind: ScWinterUiPeriodKind;
  dayCount: number;
  dailyTrend: ScWinterDailyTrendRow[];
}

interface NumericPoint {
  timestamp: Date;
  value: number;
}

interface ScWinterBuildContext {
  source: Exclude<ScWinterHistorianSource, 'mixed'>;
  sourceError?: string;
}

interface ScWinterFuelResolution {
  value: number;
  legacyTotal: number;
  acceptedMinuteFuel: number;
  method: 'legacy' | 'gap-safe-recovery' | 'accepted-minute-fallback';
  warning?: string;
}

interface ReportCacheEntry {
  value: ScWinterDailyUiReport;
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
  centerAuxFuel: number;
  starboardAuxFuel: number;
  fourthAuxFuel: number;
  portMainRunMinutes: number;
  centerMainRunMinutes: number;
  starboardMainRunMinutes: number;
  portAuxRunMinutes: number;
  centerAuxRunMinutes: number;
  starboardAuxRunMinutes: number;
  fourthAuxRunMinutes: number;
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
  gpsSpeed: 'A09-VES-GPS-SPEED',
  gpsLat: 'A09-VES-GPS-LAT',
  gpsLong: 'A09-VES-GPS-LONG',
  gpsHead: 'A09-VES-GPS-HEAD',
  ae1Speed: 'A09-PME-SPD',
  ae2Speed: 'A09-SME-SPD',
  portMainSpeed: 'A09-PPS-SPD',
  starboardMainSpeed: 'A09-SPS-SPD',
  ae3Speed: 'A09-PAE-SPD',
  ae4Speed: 'A09-SAE-SPD',
  ae1FuelIn: 'A09-PME-FIN-VTOTAL',
  ae1FuelOut: 'A09-PME-FOUT-VTOTAL',
  ae2FuelIn: 'A09-SME-FIN-VTOTAL',
  ae2FuelOut: 'A09-SME-FOUT-VTOTAL',
  ae3FuelIn: 'A09-PAE-FIN-VTOTAL',
  ae3FuelOut: 'A09-PAE-FOUT-VTOTAL',
  ae4FuelIn: 'A09-SAE-FIN-VTOTAL',
  ae4FuelOut: 'A09-SAE-FOUT-VTOTAL',
} as const;

const ALL_TAGS = Object.values(TAGS);

@Injectable({ providedIn: 'root' })
export class ScWinterReportService implements VesselReportAdapter {
  readonly id = 'sc-winter';
  readonly serviceLabel = 'SC WINTER Report Service';
  readonly profileLabel = SC_WINTER_REPORT_PROFILE.label;

  private readonly detailedReportCache = new Map<string, ReportCacheEntry>();
  private readonly detailedReportInFlight = new Map<string, Observable<ScWinterDailyUiReport>>();
  private readonly periodReportCache = new Map<string, { value: ScWinterPeriodUiReport; expiresAt: number }>();
  private readonly periodReportInFlight = new Map<string, Observable<ScWinterPeriodUiReport>>();
  private readonly reportCacheSession = { token: null as string | null };

  constructor(private newHttp: NewHttpClientService) {}

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

    return candidates.some((value) => {
      const normalized = this.normalizeIdentity(value);
      return normalized === 'scwinter' || normalized === 'a09';
    });
  }

  prepareProfileDocument(baseDocument: LiveReportProfileDocument): LiveReportProfileDocument {
    const profiles = (baseDocument?.profiles || []).filter(
      (profile) => !this.isScWinterProfile(profile?.id, profile?.aliases, profile?.prefixes),
    );

    return {
      ...baseDocument,
      profiles: [...profiles, SC_WINTER_REPORT_PROFILE],
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
        sourceReport: SC_WINTER_REPORT_PROFILE.sourceReport || snapshot.sourceReport,
        currentMode: null,
        currentModeRawValue: speed === null ? null : String(speed),
        modeSourceTag: SC_WINTER_MODE_HISTORIAN_TAG,
        modeSource: 'unavailable',
        modeConfidence: null,
        modeReason: 'SC WINTER operating mode requires a valid GPS speed value.',
        modes: SC_WINTER_REPORT_PROFILE.modes.map((mode) => ({
          key: mode.key,
          label: mode.label,
          isCurrent: false,
        })),
      };
    }

    return {
      ...snapshot,
      profileLabel: this.profileLabel,
      sourceReport: SC_WINTER_REPORT_PROFILE.sourceReport || snapshot.sourceReport,
      currentMode: modeLabel,
      currentModeRawValue: speed === null ? null : String(speed),
      modeSourceTag: SC_WINTER_MODE_HISTORIAN_TAG,
      modeSource: 'estimated-telemetry',
      modeConfidence: 'high',
      modeReason: this.buildModeReason(speed, modeLabel),
      modes: SC_WINTER_REPORT_PROFILE.modes.map((mode) => ({
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
      sourceTag: enabled ? SC_WINTER_MODE_HISTORIAN_TAG : null,
      eyebrow: 'SC WINTER DAILY REPORT',
      title: 'Mode Summary',
      description: 'Operating mode is derived from the SC WINTER GPS-speed bands used by the legacy daily report.',
      qualityLabel: 'Derived · SC WINTER report rule',
    };
  }

  resolveHistorianModeLabel(rawValue: unknown): string | null {
    return this.resolveModeFromGpsSpeed(this.parseNumber(rawValue));
  }

  loadDetailedDailyReport(
    periodStart: Date,
    periodEnd: Date,
    force = false,
  ): Observable<ScWinterDailyUiReport> {
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

    // Completed Daily parity strategy:
    // 1) Prefer the exact reporting historian used by SCReportingService/PDF.
    // 2) If that source is unavailable, restart the WHOLE request through the
    //    source-consistent API2 logger. Never mix report/API2 tag-by-tag.
    // 3) The report remains usable, but a visible data-quality warning is attached
    //    whenever the verified PDF source was not used or a fuel recovery was needed.
    //
    // This keeps the page operational for real work while still making the
    // financial/parity status explicit instead of silently presenting fallback
    // values as verified PDF data.
    const historianRequest$: Observable<{ response: any; context: ScWinterBuildContext }> = completedDaily
      ? this.newHttp
          .getStrictConsistentPdfParityHistorianValues(
            requestStartText,
            requestEndText,
            requestTags,
          )
          .pipe(
            map((response) => ({
              response,
              context: { source: 'report' as const },
            })),
            catchError((error: any) => {
              const reason = String(error?.message || error?.name || error || 'unknown error');
              console.warn(
                '[SC WINTER] verified reporting historian unavailable; restarting the complete request via source-consistent API2 logger.',
                error,
              );
              return this.newHttp
                .getConsistentPdfParityHistorianValues(
                  requestStartText,
                  requestEndText,
                  requestTags,
                )
                .pipe(
                  map((response) => ({
                    response,
                    context: { source: 'api2' as const, sourceError: reason },
                  })),
                );
            }),
          )
      : this.newHttp.getHistorianValues(requestStartText, requestEndText, requestTags).pipe(
          map((response) => ({
            response,
            context: { source: 'live' as const },
          })),
        );

    const request$ = historianRequest$.pipe(
        map(({ response, context }) => this.buildDetailedDailyReport(response, start, end, context)),
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
    periodKind: ScWinterUiPeriodKind = 'range',
    force = false,
  ): Observable<ScWinterPeriodUiReport> {
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

    const request$ = from(chunks).pipe(
      // Two concurrent day-sized historian requests keep monthly views responsive
      // without asking the backend for a very large multi-tag, 31-day payload at once.
      // Long range/month reports are intentionally limited to one day bundle at a time.
      // Each bundle already reads at most two historian tags concurrently, so the
      // total browser pressure stays capped at two historian requests.
      mergeMap(
        (chunk) => this.loadDetailedDailyReport(chunk.start, chunk.end, force),
        1,
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
    reports: readonly ScWinterDailyUiReport[],
    periodStart: Date,
    periodEnd: Date,
    periodKind: ScWinterUiPeriodKind,
  ): ScWinterPeriodUiReport {
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

    const engineSummary = (['port', 'starboard'] as const).map((key) => {
      const rows = reports
        .map((report) => report.engineSummary.find((row) => row.key === key))
        .filter((row): row is ScWinterEngineSummaryRow => !!row);
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
      } satisfies ScWinterEngineSummaryRow;
    });

    const shaftSummary: ScWinterShaftSummaryRow[] = [];

    const auxSummary = (['port', 'center', 'starboard', 'fourth'] as const).map((key) => {
      const rows = reports
        .map((report) => report.auxSummary.find((row) => row.key === key))
        .filter((row): row is ScWinterAuxSummaryRow => !!row);
      const runningHours = rows.reduce((sum, row) => sum + row.runningHours, 0);
      const rpmWeight = rows.reduce(
        (sum, row) => sum + (row.averageRpm !== null ? Math.max(row.runningHours, 1 / 60) : 0),
        0,
      );
      return {
        key,
        label: rows[0]?.label || (key === 'fourth' ? 'A/E4' : `${key} A/E`),
        runningHours,
        fuelUsed: rows.reduce((sum, row) => sum + row.fuelUsed, 0),
        averageRpm: rpmWeight > 0
          ? rows.reduce((sum, row) => sum + ((row.averageRpm || 0) * Math.max(row.runningHours, 1 / 60)), 0) / rpmWeight
          : null,
        maximumRpm: this.maximum(rows.map((row) => row.maximumRpm).filter((value): value is number => value !== null && Number.isFinite(value))),
      } satisfies ScWinterAuxSummaryRow;
    });

    const mainEngineFuelTotal = 0;
    const auxiliaryFuelTotal = auxSummary.reduce((sum, row) => sum + row.fuelUsed, 0);
    const totalFuelUsed = mainEngineFuelTotal + auxiliaryFuelTotal;

    const portEngine = engineSummary.find((row) => row.key === 'port');
    const starboardEngine = engineSummary.find((row) => row.key === 'starboard');
    const utilization: ScWinterUtilizationRow[] = [
      {
        label: 'M/E Engine Utilized (%)',
        port: this.percent(portEngine?.runningHours || 0, totalElapsedHours),
        center: Number.NaN,
        starboard: this.percent(starboardEngine?.runningHours || 0, totalElapsedHours),
      },
    ];

    const totalObservedModeHours = reports.reduce(
      (sum, report) =>
        sum + report.modeSummary.reduce((modeSum, row) => modeSum + Math.max(0, row.runningHours), 0),
      0,
    );
    const totalObservedModeFuel = reports.reduce(
      (sum, report) =>
        sum + report.modeSummary.reduce((modeSum, row) => modeSum + Math.max(0, row.fuelUsed), 0),
      0,
    );
    const modeSummary = SC_WINTER_REPORT_PROFILE.modes.map((profileMode) => {
      const rows = reports
        .map((report) => report.modeSummary.find((row) => row.key === profileMode.key))
        .filter((row): row is ScWinterModeSummaryRow => !!row);
      const fuelUsed = rows.reduce((sum, row) => sum + row.fuelUsed, 0);
      const runningHours = rows.reduce((sum, row) => sum + row.runningHours, 0);
      const distanceNm = rows.reduce((sum, row) => sum + row.distanceNm, 0);
      return {
        key: profileMode.key,
        label: profileMode.label,
        fuelUsed,
        fuelPercent: totalObservedModeFuel > 0 ? (fuelUsed / totalObservedModeFuel) * 100 : 0,
        runningHours,
        runningPercent:
          totalObservedModeHours > 0 ? (runningHours / totalObservedModeHours) * 100 : 0,
        distanceNm,
        litresPerNm: distanceNm > 0 ? fuelUsed / distanceNm : null,
        litresPerHour: runningHours > 0 ? fuelUsed / runningHours : null,
      } satisfies ScWinterModeSummaryRow;
    });
    // A one-day UI report must preserve the already verified daily values exactly.
    // Re-aggregating the same row can introduce small percentage/LPH rounding drift.
    const pdfParityModeSummary =
      reports.length === 1
        ? reports[0].modeSummary.map((row) => ({ ...row }))
        : modeSummary;


    const passageReports = reports.map((report) => report.passageSummary);
    const passageMainEngines = (['port', 'starboard'] as const).map((key) => {
      const rows = passageReports
        .map((report) => report.mainEngines.find((row) => row.key === key))
        .filter((row): row is ScWinterEngineSummaryRow => !!row);
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
      } satisfies ScWinterEngineSummaryRow;
    });
    const passageShafts: ScWinterShaftSummaryRow[] = [];
    const passageAuxFuel = (['port', 'center', 'starboard', 'fourth'] as const).map((key) => {
      const rows = passageReports
        .map((report) => report.auxFuel.find((row) => row.key === key))
        .filter((row): row is ScWinterAuxSummaryRow => !!row);
      const runningHours = rows.reduce((sum, row) => sum + row.runningHours, 0);
      const rpmWeight = rows.reduce(
        (sum, row) => sum + (row.averageRpm !== null ? Math.max(row.runningHours, 1 / 60) : 0),
        0,
      );
      return {
        key,
        label: rows[0]?.label || (key === 'fourth' ? 'A/E4' : `${key} A/E`),
        runningHours,
        fuelUsed: rows.reduce((sum, row) => sum + row.fuelUsed, 0),
        averageRpm: rpmWeight > 0
          ? rows.reduce((sum, row) => sum + ((row.averageRpm || 0) * Math.max(row.runningHours, 1 / 60)), 0) / rpmWeight
          : null,
        maximumRpm: this.maximum(rows.map((row) => row.maximumRpm).filter((value): value is number => value !== null && Number.isFinite(value))),
      } satisfies ScWinterAuxSummaryRow;
    });
    const passageDistanceNm = passageReports.reduce((sum, report) => sum + report.distanceNm, 0);
    const passageAverageSpeedWeight = passageReports.reduce(
      (sum, report) => sum + (report.averageSpeed !== null ? Math.max(report.distanceNm, 0.01) : 0),
      0,
    );
    const passageSummary: ScWinterPassageSummary = {
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
    const tracking: ScWinterTrackingSummary = {
      begin: reports.find((report) => !!report.tracking.begin)?.tracking.begin || null,
      end: [...reports].reverse().find((report) => !!report.tracking.end)?.tracking.end || null,
      distanceNm: reports.reduce((sum, report) => sum + report.tracking.distanceNm, 0),
      route,
    };

    const hourly = Array.from({ length: 24 }, (_, hour): ScWinterHourlyRow => {
      const rows = reports
        .map((report) => report.hourly.find((row) => row.hour === hour))
        .filter((row): row is ScWinterHourlyRow => !!row && row.active);
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
          centerAuxFuel: null,
          starboardAuxFuel: null,
          fourthAuxFuel: null,
          portMainRunningHours: null,
          centerMainRunningHours: null,
          starboardMainRunningHours: null,
          portAuxRunningHours: null,
          centerAuxRunningHours: null,
          starboardAuxRunningHours: null,
          fourthAuxRunningHours: null,
          portShaftRunningHours: null,
          centerShaftRunningHours: null,
          starboardShaftRunningHours: null,
          portShaftRpm: null,
          centerShaftRpm: null,
          starboardShaftRpm: null,
          totalFuel: null,
        };
      }

      const sumNullable = (selector: (row: ScWinterHourlyRow) => number | null): number =>
        rows.reduce((sum, row) => sum + (selector(row) || 0), 0);
      const averageNullable = (selector: (row: ScWinterHourlyRow) => number | null): number | null => {
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
        centerAuxFuel: sumNullable((row) => row.centerAuxFuel),
        starboardAuxFuel: sumNullable((row) => row.starboardAuxFuel),
        fourthAuxFuel: sumNullable((row) => row.fourthAuxFuel ?? null),
        portMainRunningHours: sumNullable((row) => row.portMainRunningHours),
        centerMainRunningHours: sumNullable((row) => row.centerMainRunningHours),
        starboardMainRunningHours: sumNullable((row) => row.starboardMainRunningHours),
        portAuxRunningHours: sumNullable((row) => row.portAuxRunningHours),
        centerAuxRunningHours: sumNullable((row) => row.centerAuxRunningHours),
        starboardAuxRunningHours: sumNullable((row) => row.starboardAuxRunningHours),
        fourthAuxRunningHours: sumNullable((row) => row.fourthAuxRunningHours ?? null),
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
    const dailyTrend: ScWinterDailyTrendRow[] = reports.map((report) => ({
      date: new Date(report.periodStart),
      totalFuelUsed: report.totalFuelUsed,
      mainEngineFuelTotal: report.mainEngineFuelTotal,
      auxiliaryFuelTotal: report.auxiliaryFuelTotal,
      distanceNm: report.tracking.distanceNm,
      coveragePercent: report.coveragePercent,
      modeRunningHours: report.modeSummary.reduce((sum, row) => sum + row.runningHours, 0),
    }));

    const historianSources = Array.from(
      new Set(reports.map((report) => report.quality?.historianSource || 'live')),
    );
    const quality: ScWinterReportQuality = {
      historianSource:
        historianSources.length === 1
          ? historianSources[0] as ScWinterHistorianSource
          : 'mixed',
      pdfParityVerified: reports.every((report) => !!report.quality?.pdfParityVerified),
      fuelRecoveryUsed: reports.some((report) => !!report.quality?.fuelRecoveryUsed),
      warnings: Array.from(
        new Set(reports.flatMap((report) => report.quality?.warnings || [])),
      ),
    };

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
      quality,
    };
  }

  private buildDetailedDailyReport(
    response: any,
    periodStart: Date,
    periodEnd: Date,
    context: ScWinterBuildContext = { source: 'live' },
  ): ScWinterDailyUiReport {
    const series = this.extractHistorianSeries(response, ALL_TAGS);
    const missingHistorianTags = ALL_TAGS.filter(
      (tag) => (series.get(this.tagKey(tag)) || []).length === 0,
    );
    const minuteStart = this.floorToMinute(periodStart).getTime();
    const minuteEnd = Math.max(minuteStart + MINUTE_MS, this.floorToMinute(periodEnd).getTime());
    const completedDaily = isCompletedDailyWindow(
      this.floorToMinute(periodStart),
      this.floorToMinute(periodEnd),
      MINUTE_MS,
    );
    const boundaryBucket = minuteEnd + MINUTE_MS;
    const pdfModeDataEnd = completedDaily ? boundaryBucket : minuteEnd;
    const minuteCount = Math.max(1, Math.floor((minuteEnd - minuteStart) / MINUTE_MS) + 1);

    const gpsSpeedPoints = series.get(this.tagKey(TAGS.gpsSpeed)) || [];
    const gpsSpeed = this.buildInstantMap(gpsSpeedPoints);
    const pdfModeGpsSpeed = completedDaily
      ? new Map(
          Array.from(buildExactMinuteValueMap(gpsSpeedPoints, MINUTE_MS).entries()).map(
            ([minute, value]) => [minute, Math.fround(value)] as const,
          ),
        )
      : gpsSpeed;
    const gpsLat = this.buildInstantMap(series.get(this.tagKey(TAGS.gpsLat)) || []);
    const gpsLong = this.buildInstantMap(series.get(this.tagKey(TAGS.gpsLong)) || []);
    const gpsHead = this.buildInstantMap(series.get(this.tagKey(TAGS.gpsHead)) || []);

    const portMainRpm = this.buildCounterRateMap(series.get(this.tagKey(TAGS.portMainSpeed)) || [], 24, 1600);
    const starboardMainRpm = this.buildCounterRateMap(series.get(this.tagKey(TAGS.starboardMainSpeed)) || [], 24, 1600);
    const ae1Rpm = this.buildCounterRateMap(series.get(this.tagKey(TAGS.ae1Speed)) || [], 6, 1200);
    const ae2Rpm = this.buildCounterRateMap(series.get(this.tagKey(TAGS.ae2Speed)) || [], 12, 1200);
    const ae3Rpm = this.buildCounterRateMap(series.get(this.tagKey(TAGS.ae3Speed)) || [], 12, 1200);
    const ae4Rpm = this.buildCounterRateMap(series.get(this.tagKey(TAGS.ae4Speed)) || [], 6, 1200);

    const ae1Fuel = this.buildFuelMap(
      series.get(this.tagKey(TAGS.ae1FuelIn)) || [],
      series.get(this.tagKey(TAGS.ae1FuelOut)) || [],
      300,
    );
    const ae2Fuel = this.buildFuelMap(
      series.get(this.tagKey(TAGS.ae2FuelIn)) || [],
      series.get(this.tagKey(TAGS.ae2FuelOut)) || [],
      300,
    );
    const ae3Fuel = this.buildFuelMap(
      series.get(this.tagKey(TAGS.ae3FuelIn)) || [],
      series.get(this.tagKey(TAGS.ae3FuelOut)) || [],
      300,
    );
    const ae4Fuel = this.buildFuelMap(
      series.get(this.tagKey(TAGS.ae4FuelIn)) || [],
      series.get(this.tagKey(TAGS.ae4FuelOut)) || [],
      300,
    );

    // Page-1 PDF fuel uses SCWinter.CalFLowTotalSME against the exact-minute
    // dtRawData table.  Summing interpolated minute deltas can turn a valid
    // A/E total into 0 or a smaller value when samples are sparse.
    const winterFuelRule = {
      input: { totalRangeLimit: 28_000, stepLimit: 300, stepInclusive: true, initialValueLimit: 90_000_000 },
      output: { totalRangeLimit: 25_000, stepLimit: 300, stepInclusive: true, initialValueLimit: 90_000_000 },
      ignoredValues: [999_999],
      clampNegative: false,
    } as const;
    const pdfFuelPoints = (tag: string) => exactMinutePoints(
      series.get(this.tagKey(tag)) || [], minuteStart, pdfModeDataEnd,
    );
    const ae1FuelInExact = pdfFuelPoints(TAGS.ae1FuelIn);
    const ae1FuelOutExact = pdfFuelPoints(TAGS.ae1FuelOut);
    const ae2FuelInExact = pdfFuelPoints(TAGS.ae2FuelIn);
    const ae2FuelOutExact = pdfFuelPoints(TAGS.ae2FuelOut);
    const ae3FuelInExact = pdfFuelPoints(TAGS.ae3FuelIn);
    const ae3FuelOutExact = pdfFuelPoints(TAGS.ae3FuelOut);
    const ae4FuelInExact = pdfFuelPoints(TAGS.ae4FuelIn);
    const ae4FuelOutExact = pdfFuelPoints(TAGS.ae4FuelOut);
    const missingExactFuelPairs = [
      ['A/E1', ae1FuelInExact.length, ae1FuelOutExact.length] as const,
      ['A/E2', ae2FuelInExact.length, ae2FuelOutExact.length] as const,
      ['A/E3', ae3FuelInExact.length, ae3FuelOutExact.length] as const,
      ['A/E4', ae4FuelInExact.length, ae4FuelOutExact.length] as const,
    ].filter(([, inputCount, outputCount]) => inputCount === 0 || outputCount === 0);

    const ae1FuelResolution = this.resolveScWinterDailyFuel(
      calculateLegacyDailyFuelTotal(ae1FuelInExact, ae1FuelOutExact, winterFuelRule),
      ae1FuelInExact,
      ae1FuelOutExact,
      ae1Fuel,
      'A/E1',
    );
    const ae2FuelResolution = this.resolveScWinterDailyFuel(
      calculateLegacyDailyFuelTotal(ae2FuelInExact, ae2FuelOutExact, winterFuelRule),
      ae2FuelInExact,
      ae2FuelOutExact,
      ae2Fuel,
      'A/E2',
    );
    const ae3FuelResolution = this.resolveScWinterDailyFuel(
      calculateLegacyDailyFuelTotal(ae3FuelInExact, ae3FuelOutExact, winterFuelRule),
      ae3FuelInExact,
      ae3FuelOutExact,
      ae3Fuel,
      'A/E3',
    );
    const ae4FuelResolution = this.resolveScWinterDailyFuel(
      calculateLegacyDailyFuelTotal(ae4FuelInExact, ae4FuelOutExact, winterFuelRule),
      ae4FuelInExact,
      ae4FuelOutExact,
      ae4Fuel,
      'A/E4',
    );

    const ae1DailyFuel = ae1FuelResolution.value;
    const ae2DailyFuel = ae2FuelResolution.value;
    const ae3DailyFuel = ae3FuelResolution.value;
    const ae4DailyFuel = ae4FuelResolution.value;

    const fuelResolutions = [
      ae1FuelResolution,
      ae2FuelResolution,
      ae3FuelResolution,
      ae4FuelResolution,
    ];
    const qualityWarnings: string[] = [];
    if (missingHistorianTags.length > 0) {
      qualityWarnings.push(
        `Historian returned no records for ${missingHistorianTags.length} SC WINTER tag(s): ${missingHistorianTags.join(', ')}.`,
      );
    }
    if (missingExactFuelPairs.length > 0) {
      qualityWarnings.push(
        `Exact-minute FIN/FOUT evidence is incomplete for ${missingExactFuelPairs.map(([label]) => label).join(', ')}.`,
      );
    }
    if (completedDaily && context.source !== 'report') {
      qualityWarnings.push(
        'SC WINTER PDF source is unavailable, so this view is using one source-consistent API2 historian bundle. Values are usable for diagnostics, but completed-day PDF parity is not marked as verified until the reporting historian is reachable.',
      );
    }
    if (context.sourceError) {
      console.warn('[SC WINTER] reporting-historian fallback reason:', context.sourceError);
    }
    for (const resolution of fuelResolutions) {
      if (resolution.warning) qualityWarnings.push(resolution.warning);
    }
    const fuelRecoveryUsed = fuelResolutions.some((item) => item.method !== 'legacy');
    const quality: ScWinterReportQuality = {
      historianSource: context.source,
      pdfParityVerified:
        completedDaily &&
        context.source === 'report' &&
        !fuelRecoveryUsed &&
        missingHistorianTags.length === 0 &&
        missingExactFuelPairs.length === 0,
      fuelRecoveryUsed,
      warnings: Array.from(new Set(qualityWarnings)),
    };

    // Page-1 RPM / Running Hours use the original SCWinter CalSpeedSummary /
    // CalSpeedAESummary state machine, not the generic interpolated RPM map.
    // This preserves the legacy lost-minute behavior and removes the 0.01-0.02 h
    // drift that was visible on Port/Stb. M/E and A/E4.
    const portMainLegacy = this.buildLegacyCounterSummary(
      series.get(this.tagKey(TAGS.portMainSpeed)) || [],
      minuteStart,
      pdfModeDataEnd,
      24,
      1600,
      500,
      false,
    );
    const starboardMainLegacy = this.buildLegacyCounterSummary(
      series.get(this.tagKey(TAGS.starboardMainSpeed)) || [],
      minuteStart,
      pdfModeDataEnd,
      24,
      1600,
      500,
      false,
    );
    const ae1Legacy = this.buildLegacyCounterSummary(
      series.get(this.tagKey(TAGS.ae1Speed)) || [], minuteStart, pdfModeDataEnd, 6, 1200, 0, true,
    );
    const ae2Legacy = this.buildLegacyCounterSummary(
      series.get(this.tagKey(TAGS.ae2Speed)) || [], minuteStart, pdfModeDataEnd, 12, 1200, 0, true,
    );
    const ae3Legacy = this.buildLegacyCounterSummary(
      series.get(this.tagKey(TAGS.ae3Speed)) || [], minuteStart, pdfModeDataEnd, 12, 1200, 0, true,
    );
    const ae4Legacy = this.buildLegacyCounterSummary(
      series.get(this.tagKey(TAGS.ae4Speed)) || [], minuteStart, pdfModeDataEnd, 6, 1200, 0, true,
    );

    this.foldCompletedDayBoundary(portMainRpm, minuteEnd, boundaryBucket);
    this.foldCompletedDayBoundary(starboardMainRpm, minuteEnd, boundaryBucket);
    this.foldCompletedDayBoundary(ae1Rpm, minuteEnd, boundaryBucket);
    this.foldCompletedDayBoundary(ae2Rpm, minuteEnd, boundaryBucket);
    this.foldCompletedDayBoundary(ae3Rpm, minuteEnd, boundaryBucket);
    this.foldCompletedDayBoundary(ae4Rpm, minuteEnd, boundaryBucket);
    this.foldCompletedDayBoundary(ae1Fuel, minuteEnd, boundaryBucket, true);
    this.foldCompletedDayBoundary(ae2Fuel, minuteEnd, boundaryBucket, true);
    this.foldCompletedDayBoundary(ae3Fuel, minuteEnd, boundaryBucket, true);
    this.foldCompletedDayBoundary(ae4Fuel, minuteEnd, boundaryBucket, true);

    const elapsedHours = Math.max(
      MINUTE_MS / 3_600_000,
      (minuteEnd - minuteStart + MINUTE_MS) / 3_600_000,
    );

    const engineSummary: ScWinterEngineSummaryRow[] = [
      {
        key: 'port', label: 'Port M/E', averageRpm: portMainLegacy.averageRpm,
        maximumRpm: portMainLegacy.maximumRpm, runningHours: portMainLegacy.runningHours, fuelUsed: 0,
      },
      {
        key: 'starboard', label: 'Stb. M/E', averageRpm: starboardMainLegacy.averageRpm,
        maximumRpm: starboardMainLegacy.maximumRpm, runningHours: starboardMainLegacy.runningHours, fuelUsed: 0,
      },
    ];
    const shaftSummary: ScWinterShaftSummaryRow[] = [];
    const auxSummary: ScWinterAuxSummaryRow[] = [
      {
        key: 'port', label: 'A/E1', runningHours: ae1Legacy.runningHours, fuelUsed: ae1DailyFuel,
        averageRpm: ae1Legacy.averageRpm, maximumRpm: ae1Legacy.maximumRpm,
      },
      {
        key: 'center', label: 'A/E2', runningHours: ae2Legacy.runningHours, fuelUsed: ae2DailyFuel,
        averageRpm: ae2Legacy.averageRpm, maximumRpm: ae2Legacy.maximumRpm,
      },
      {
        key: 'starboard', label: 'A/E3', runningHours: ae3Legacy.runningHours, fuelUsed: ae3DailyFuel,
        averageRpm: ae3Legacy.averageRpm, maximumRpm: ae3Legacy.maximumRpm,
      },
      {
        key: 'fourth', label: 'A/E4', runningHours: ae4Legacy.runningHours, fuelUsed: ae4DailyFuel,
        averageRpm: ae4Legacy.averageRpm, maximumRpm: ae4Legacy.maximumRpm,
      },
    ];

    const mainEngineFuelTotal = 0;
    const auxiliaryFuelTotal = auxSummary.reduce((sum, row) => sum + row.fuelUsed, 0);
    const totalFuelUsed = auxiliaryFuelTotal;
    const portEngine = engineSummary.find((row) => row.key === 'port')!;
    const starboardEngine = engineSummary.find((row) => row.key === 'starboard')!;
    const utilization: ScWinterUtilizationRow[] = [
      {
        label: 'M/E Engine Utilized (%)',
        port: this.percent(portEngine.runningHours, elapsedHours),
        center: Number.NaN,
        starboard: this.percent(starboardEngine.runningHours, elapsedHours),
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
      centerAuxFuel: 0,
      starboardAuxFuel: 0,
      fourthAuxFuel: 0,
      portMainRunMinutes: 0,
      centerMainRunMinutes: 0,
      starboardMainRunMinutes: 0,
      portAuxRunMinutes: 0,
      centerAuxRunMinutes: 0,
      starboardAuxRunMinutes: 0,
      fourthAuxRunMinutes: 0,
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

    const modeMap = new Map<string, ScWinterModeSummaryRow>();
    for (const mode of SC_WINTER_REPORT_PROFILE.modes) {
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

    const passageMinuteKeys: number[] = [];
    let gpsAvailableMinutes = 0;

    for (let bucket = minuteStart; bucket <= minuteEnd; bucket += MINUTE_MS) {
      const hourData = hourlyAccumulators[new Date(bucket).getHours()];
      const rawSpeed = gpsSpeed.get(bucket);
      const speed = rawSpeed !== undefined && Number.isFinite(rawSpeed) ? Math.max(0, rawSpeed) : null;
      if (speed !== null) {
        gpsAvailableMinutes += 1;
        hourData.speedSum += speed;
        hourData.speedCount += 1;
      }
      const distance = speed !== null ? speed / 60 : 0;
      hourData.distanceNm += distance;

      const ae1MinuteFuel = ae1Fuel.get(bucket) || 0;
      const ae2MinuteFuel = ae2Fuel.get(bucket) || 0;
      const ae3MinuteFuel = ae3Fuel.get(bucket) || 0;
      const ae4MinuteFuel = ae4Fuel.get(bucket) || 0;
      const auxFuel = ae1MinuteFuel + ae2MinuteFuel + ae3MinuteFuel + ae4MinuteFuel;

      hourData.portAuxFuel += ae1MinuteFuel;
      hourData.centerAuxFuel += ae2MinuteFuel;
      hourData.starboardAuxFuel += ae3MinuteFuel;
      hourData.fourthAuxFuel += ae4MinuteFuel;
      hourData.auxFuel += auxFuel;

      const portMain = portMainRpm.get(bucket) || 0;
      const starboardMain = starboardMainRpm.get(bucket) || 0;
      const ae1 = ae1Rpm.get(bucket) || 0;
      const ae2 = ae2Rpm.get(bucket) || 0;
      const ae3 = ae3Rpm.get(bucket) || 0;
      const ae4 = ae4Rpm.get(bucket) || 0;

      const hasMinuteTelemetry = speed !== null || ae1Fuel.has(bucket) || ae2Fuel.has(bucket) ||
        ae3Fuel.has(bucket) || ae4Fuel.has(bucket) || portMainRpm.has(bucket) || starboardMainRpm.has(bucket) ||
        ae1Rpm.has(bucket) || ae2Rpm.has(bucket) || ae3Rpm.has(bucket) || ae4Rpm.has(bucket);
      if (hasMinuteTelemetry) hourData.active = true;

      if (portMain >= 500) hourData.portMainRunMinutes += 1;
      if (starboardMain >= 500) hourData.starboardMainRunMinutes += 1;
      if (ae1 > 0) hourData.portAuxRunMinutes += 1;
      if (ae2 > 0) hourData.centerAuxRunMinutes += 1;
      if (ae3 > 0) hourData.starboardAuxRunMinutes += 1;
      if (ae4 > 0) hourData.fourthAuxRunMinutes += 1;

      const modeLabel = this.resolveModeFromGpsSpeed(speed);
      if (modeLabel) {
        const modeKey = this.resolveModeProfileKey(modeLabel);
        const mode = modeMap.get(modeKey);
        if (mode) {
          mode.fuelUsed += auxFuel;
          mode.runningHours += 1 / 60;
          mode.distanceNm += distance;
        }
      }
      if (speed !== null && speed >= 7) passageMinuteKeys.push(bucket);
    }

    // Page 2 uses GetDataFuelConsumption(), whose FIN/FOUT recovery differs
    // subtly from several other vessel families (no i==1 reset special-case and
    // no 500..20000 reset window). Use the SC WINTER-specific signed maps.
    const pdfModeAE1In = this.buildLegacyPassageTotalizerDelta(
      series.get(this.tagKey(TAGS.ae1FuelIn)) || [], minuteStart, pdfModeDataEnd,
    );
    const pdfModeAE1Out = this.buildLegacyPassageTotalizerDelta(
      series.get(this.tagKey(TAGS.ae1FuelOut)) || [], minuteStart, pdfModeDataEnd,
    );
    const pdfModeAE2In = this.buildLegacyPassageTotalizerDelta(
      series.get(this.tagKey(TAGS.ae2FuelIn)) || [], minuteStart, pdfModeDataEnd,
    );
    const pdfModeAE2Out = this.buildLegacyPassageTotalizerDelta(
      series.get(this.tagKey(TAGS.ae2FuelOut)) || [], minuteStart, pdfModeDataEnd,
    );
    const pdfModeAE3In = this.buildLegacyPassageTotalizerDelta(
      series.get(this.tagKey(TAGS.ae3FuelIn)) || [], minuteStart, pdfModeDataEnd,
    );
    const pdfModeAE3Out = this.buildLegacyPassageTotalizerDelta(
      series.get(this.tagKey(TAGS.ae3FuelOut)) || [], minuteStart, pdfModeDataEnd,
    );
    const pdfModeAE4In = this.buildLegacyPassageTotalizerDelta(
      series.get(this.tagKey(TAGS.ae4FuelIn)) || [], minuteStart, pdfModeDataEnd,
    );
    const pdfModeAE4Out = this.buildLegacyPassageTotalizerDelta(
      series.get(this.tagKey(TAGS.ae4FuelOut)) || [], minuteStart, pdfModeDataEnd,
    );

    const pdfParityMode = buildGpsPdfParityModeSummary({
      modes: SC_WINTER_REPORT_PROFILE.modes,
      minuteStart,
      dataEnd: pdfModeDataEnd,
      completedDaily,
      minuteMs: MINUTE_MS,
      officialTotalFuel: totalFuelUsed,
      gpsSpeed: pdfModeGpsSpeed,
      minuteFuelAt: (minute) =>
        ((pdfModeAE1In.get(minute) || 0) - (pdfModeAE1Out.get(minute) || 0)) +
        ((pdfModeAE2In.get(minute) || 0) - (pdfModeAE2Out.get(minute) || 0)) +
        ((pdfModeAE3In.get(minute) || 0) - (pdfModeAE3Out.get(minute) || 0)) +
        ((pdfModeAE4In.get(minute) || 0) - (pdfModeAE4Out.get(minute) || 0)),
      resolveModeLabel: (speed) => this.resolveModeFromGpsSpeed(speed),
      resolveModeKey: (label) => this.resolveModeProfileKey(label),
      standbyLabel: 'Standby',
      // SC WINTER stores mode speed sums / running counters in Single columns.
      legacySinglePrecision: true,
      // SC WINTER legacy PDF keeps raw by-Mode fuel; it does not normalize Mode fuel to Page-1 total.
      scaleFuelToOfficialTotal: false,
      // The original report calculates Standby fuel % as 100 minus the already
      // rounded percentages of the other modes. It can legitimately be negative
      // (for 04-Oct-2026 the PDF shows -78.28%). Preserve that legacy result.
      allowNegativeResidualFuelPercent: true,
    });
    const modeSummary = pdfParityMode.modeSummary as ScWinterModeSummaryRow[];

    // Page 3 of the legacy SC WINTER PDF uses a separate minute-by-minute
    // calculation path from Page 1 and the hourly pages. Reproduce that path
    // for completed daily reports instead of reusing the generic UI maps.
    const passageSummary = completedDaily
      ? this.buildLegacyPassageSummary(series, minuteStart, pdfModeDataEnd)
      : this.buildPassageSummary(
          passageMinuteKeys,
          portMainRpm,
          starboardMainRpm,
          ae1Rpm,
          ae2Rpm,
          ae3Rpm,
          ae4Rpm,
          ae1Fuel,
          ae2Fuel,
          ae3Fuel,
          ae4Fuel,
          gpsSpeed,
        );
    // Page 4 tracking also follows the legacy completed-daily path. The PDF
    // receives Total Distance from the already rounded Mode Summary, and its
    // final position is the next-day 00:00 historian endpoint displayed as
    // 23:59. Do not recompute this page from the generic speed integral.
    const tracking = completedDaily
      ? this.buildLegacyTrackingSummary(
          series,
          minuteStart,
          pdfModeDataEnd,
          modeSummary,
        )
      : this.buildTrackingSummary(minuteStart, minuteEnd, gpsLat, gpsLong, gpsSpeed, gpsHead);

    // Pages 5-13 are NOT built by summing the generic interpolated maps.
    // SCReportingService has dedicated hourly state machines that attribute each
    // accepted transition to Timestamp-1 minute, recover short rejected jumps,
    // and count running minutes with vessel-specific missing-sample behaviour.
    // Using those exact rules removes the visible 0.98/0.93 h and 189/183 L
    // drift seen in the web UI versus the official PDF.
    const legacyHourly = completedDaily
      ? {
          navigation: this.buildLegacyHourlyNavigation(
            series.get(this.tagKey(TAGS.gpsSpeed)) || [],
            minuteStart,
            pdfModeDataEnd,
          ),
          ae1Fuel: this.buildLegacyHourlyFuel(
            ae1FuelInExact, ae1FuelOutExact, minuteStart, pdfModeDataEnd,
          ),
          ae2Fuel: this.buildLegacyHourlyFuel(
            ae2FuelInExact, ae2FuelOutExact, minuteStart, pdfModeDataEnd,
          ),
          ae3Fuel: this.buildLegacyHourlyFuel(
            ae3FuelInExact, ae3FuelOutExact, minuteStart, pdfModeDataEnd,
          ),
          ae4Fuel: this.buildLegacyHourlyFuel(
            ae4FuelInExact, ae4FuelOutExact, minuteStart, pdfModeDataEnd,
          ),
          portMainRunning: this.buildLegacyHourlyRunningHours(
            series.get(this.tagKey(TAGS.portMainSpeed)) || [],
            minuteStart,
            pdfModeDataEnd,
            24,
            false,
          ),
          starboardMainRunning: this.buildLegacyHourlyRunningHours(
            series.get(this.tagKey(TAGS.starboardMainSpeed)) || [],
            minuteStart,
            pdfModeDataEnd,
            24,
            false,
          ),
          ae1Running: this.buildLegacyHourlyRunningHours(
            series.get(this.tagKey(TAGS.ae1Speed)) || [],
            minuteStart,
            pdfModeDataEnd,
            6,
            true,
          ),
          ae2Running: this.buildLegacyHourlyRunningHours(
            series.get(this.tagKey(TAGS.ae2Speed)) || [],
            minuteStart,
            pdfModeDataEnd,
            12,
            true,
          ),
          ae3Running: this.buildLegacyHourlyRunningHours(
            series.get(this.tagKey(TAGS.ae3Speed)) || [],
            minuteStart,
            pdfModeDataEnd,
            12,
            true,
          ),
          ae4Running: this.buildLegacyHourlyRunningHours(
            series.get(this.tagKey(TAGS.ae4Speed)) || [],
            minuteStart,
            pdfModeDataEnd,
            6,
            true,
          ),
        }
      : null;

    const hourly: ScWinterHourlyRow[] = hourlyAccumulators.map((item, hour) => {
      if (!completedDaily && !item.active) {
        return {
          hour, active: false, distanceNm: null, speedKnots: null, mainFuel: null, auxFuel: null,
          portMainFuel: null, centerMainFuel: null, starboardMainFuel: null,
          portAuxFuel: null, centerAuxFuel: null, starboardAuxFuel: null, fourthAuxFuel: null,
          portMainRunningHours: null, centerMainRunningHours: null, starboardMainRunningHours: null,
          portAuxRunningHours: null, centerAuxRunningHours: null, starboardAuxRunningHours: null, fourthAuxRunningHours: null,
          portShaftRunningHours: null, centerShaftRunningHours: null, starboardShaftRunningHours: null,
          portShaftRpm: null, centerShaftRpm: null, starboardShaftRpm: null, totalFuel: null,
        };
      }
      const portAuxFuel = legacyHourly?.ae1Fuel[hour] ?? item.portAuxFuel;
      const centerAuxFuel = legacyHourly?.ae2Fuel[hour] ?? item.centerAuxFuel;
      const starboardAuxFuel = legacyHourly?.ae3Fuel[hour] ?? item.starboardAuxFuel;
      const fourthAuxFuel = legacyHourly?.ae4Fuel[hour] ?? item.fourthAuxFuel;
      const hourlyAuxFuel = portAuxFuel + centerAuxFuel + starboardAuxFuel + fourthAuxFuel;

      return {
        hour, active: true,
        distanceNm: legacyHourly?.navigation.distanceNm[hour] ?? item.distanceNm,
        speedKnots:
          legacyHourly?.navigation.speedKnots[hour] ??
          (item.speedCount > 0 ? item.speedSum / item.speedCount : null),
        mainFuel: 0,
        auxFuel: hourlyAuxFuel,
        portMainFuel: 0,
        centerMainFuel: 0,
        starboardMainFuel: 0,
        portAuxFuel,
        centerAuxFuel,
        starboardAuxFuel,
        fourthAuxFuel,
        portMainRunningHours:
          legacyHourly?.portMainRunning[hour] ?? item.portMainRunMinutes / 60,
        centerMainRunningHours: 0,
        starboardMainRunningHours:
          legacyHourly?.starboardMainRunning[hour] ?? item.starboardMainRunMinutes / 60,
        portAuxRunningHours:
          legacyHourly?.ae1Running[hour] ?? item.portAuxRunMinutes / 60,
        centerAuxRunningHours:
          legacyHourly?.ae2Running[hour] ?? item.centerAuxRunMinutes / 60,
        starboardAuxRunningHours:
          legacyHourly?.ae3Running[hour] ?? item.starboardAuxRunMinutes / 60,
        fourthAuxRunningHours:
          legacyHourly?.ae4Running[hour] ?? item.fourthAuxRunMinutes / 60,
        portShaftRunningHours: 0,
        centerShaftRunningHours: 0,
        starboardShaftRunningHours: 0,
        portShaftRpm: 0,
        centerShaftRpm: 0,
        starboardShaftRpm: 0,
        totalFuel: hourlyAuxFuel,
      };
    });

    const speedSeries = this.downsampleSpeedSeries(gpsSpeed, minuteStart, minuteEnd, 1600);
    const validSpeedValues = Array.from(gpsSpeed.entries())
      .filter(([bucket, value]) => bucket >= minuteStart && bucket <= minuteEnd && value >= 0 && Number.isFinite(value))
      .map(([, value]) => value);

    return {
      periodStart: new Date(minuteStart), periodEnd: new Date(minuteEnd), loadedAt: new Date(),
      coveragePercent: Math.max(0, Math.min(100, (gpsAvailableMinutes / minuteCount) * 100)),
      averageSpeed: this.average(validSpeedValues), maximumSpeed: this.maximum(validSpeedValues),
      engineSummary, shaftSummary, auxSummary, utilization,
      mainEngineFuelTotal, auxiliaryFuelTotal, totalFuelUsed,
      modeSummary, passageSummary, tracking, hourly, speedSeries, quality,
    };
  }

  private buildEngineSummary(
    key: ScWinterEngineSummaryRow['key'],
    label: string,
    rpmMap: Map<number, number>,
    fuelMap: Map<number, number>,
    _elapsedHours: number,
    runningThreshold = 500,
  ): ScWinterEngineSummaryRow {
    const rpmValues = Array.from(rpmMap.values()).filter((value) => value >= 0 && value <= 1600);
    return {
      key,
      label,
      averageRpm: this.average(rpmValues.filter((value) => value > 0)),
      maximumRpm: this.maximum(rpmValues),
      runningHours: rpmValues.filter((value) => value >= runningThreshold).length / 60,
      fuelUsed: this.sumMap(fuelMap),
    };
  }

  private buildShaftSummary(
    key: ScWinterShaftSummaryRow['key'],
    label: string,
    rpmMap: Map<number, number>,
    mainEngineRpm: Map<number, number>,
  ): ScWinterShaftSummaryRow {
    const rpmValues = Array.from(rpmMap.values()).filter((value) => value >= 0 && value <= 1600);
    let runningMinutes = 0;
    rpmMap.forEach((value, bucket) => {
      if (value > 0 && (mainEngineRpm.get(bucket) || 0) > 0) runningMinutes += 1;
    });
    return { key, label, averageRpm: this.average(rpmValues.filter((value) => value > 0)), maximumRpm: this.maximum(rpmValues), runningHours: runningMinutes / 60 };
  }

  private buildAuxSummary(
    key: ScWinterAuxSummaryRow['key'],
    label: string,
    rpmMap: Map<number, number>,
    fuelMap: Map<number, number>,
  ): ScWinterAuxSummaryRow {
    const rpmValues = Array.from(rpmMap.values()).filter(
      (value) => Number.isFinite(value) && value > 0 && value <= 1200,
    );
    return {
      key,
      label,
      runningHours: rpmValues.length / 60,
      fuelUsed: this.sumMap(fuelMap),
      averageRpm: this.average(rpmValues),
      maximumRpm: this.maximum(rpmValues),
    };
  }

  private buildPassageSummary(
    minuteKeys: readonly number[],
    portMainRpm: Map<number, number>,
    starboardMainRpm: Map<number, number>,
    ae1Rpm: Map<number, number>,
    ae2Rpm: Map<number, number>,
    ae3Rpm: Map<number, number>,
    ae4Rpm: Map<number, number>,
    ae1Fuel: Map<number, number>,
    ae2Fuel: Map<number, number>,
    ae3Fuel: Map<number, number>,
    ae4Fuel: Map<number, number>,
    gpsSpeed: Map<number, number>,
  ): ScWinterPassageSummary {
    const valuesFor = (map: Map<number, number>, minExclusive = 0) => minuteKeys
      .map((bucket) => map.get(bucket))
      .filter((value): value is number => value !== undefined && Number.isFinite(value) && value > minExclusive);
    const fuelFor = (map: Map<number, number>) => minuteKeys.reduce((sum, bucket) => sum + (map.get(bucket) || 0), 0);
    const auxHours = (map: Map<number, number>) => minuteKeys.reduce((sum, bucket) => sum + ((map.get(bucket) || 0) > 0 ? 1 / 60 : 0), 0);
    const ae1FuelValue = fuelFor(ae1Fuel);
    const ae2FuelValue = fuelFor(ae2Fuel);
    const ae3FuelValue = fuelFor(ae3Fuel);
    const ae4FuelValue = fuelFor(ae4Fuel);
    const speedValues = valuesFor(gpsSpeed, 0);
    return {
      mainEngines: [
        this.buildFilteredEngineSummary('port', 'Port M/E', valuesFor(portMainRpm, 0), 0, 500),
        this.buildFilteredEngineSummary('starboard', 'Stb. M/E', valuesFor(starboardMainRpm, 0), 0, 500),
      ],
      shafts: [],
      auxFuel: [
        { key: 'port', label: 'A/E1', runningHours: auxHours(ae1Rpm), fuelUsed: ae1FuelValue, averageRpm: this.average(valuesFor(ae1Rpm, 0)), maximumRpm: this.maximum(valuesFor(ae1Rpm, 0)) },
        { key: 'center', label: 'A/E2', runningHours: auxHours(ae2Rpm), fuelUsed: ae2FuelValue, averageRpm: this.average(valuesFor(ae2Rpm, 0)), maximumRpm: this.maximum(valuesFor(ae2Rpm, 0)) },
        { key: 'starboard', label: 'A/E3', runningHours: auxHours(ae3Rpm), fuelUsed: ae3FuelValue, averageRpm: this.average(valuesFor(ae3Rpm, 0)), maximumRpm: this.maximum(valuesFor(ae3Rpm, 0)) },
        { key: 'fourth', label: 'A/E4', runningHours: auxHours(ae4Rpm), fuelUsed: ae4FuelValue, averageRpm: this.average(valuesFor(ae4Rpm, 0)), maximumRpm: this.maximum(valuesFor(ae4Rpm, 0)) },
      ],
      mainEngineFuelTotal: 0,
      auxiliaryFuelTotal: ae1FuelValue + ae2FuelValue + ae3FuelValue + ae4FuelValue,
      averageSpeed: this.average(speedValues),
      distanceNm: speedValues.reduce((sum, speed) => sum + speed / 60, 0),
    };
  }

  private buildFilteredEngineSummary(
    key: ScWinterEngineSummaryRow['key'], label: string, rpmValues: number[], fuelUsed: number, runningThreshold = 500,
  ): ScWinterEngineSummaryRow {
    return { key, label, averageRpm: this.average(rpmValues), maximumRpm: this.maximum(rpmValues), runningHours: rpmValues.filter((value) => value >= runningThreshold).length / 60, fuelUsed };
  }

  private buildFilteredShaftSummary(
    key: ScWinterShaftSummaryRow['key'], label: string, rpmValues: number[],
  ): ScWinterShaftSummaryRow {
    return { key, label, averageRpm: this.average(rpmValues), maximumRpm: this.maximum(rpmValues), runningHours: rpmValues.length / 60 };
  }

  private buildTrackingSummary(
    minuteStart: number,
    minuteEnd: number,
    latitude: Map<number, number>,
    longitude: Map<number, number>,
    speed: Map<number, number>,
    heading: Map<number, number>,
  ): ScWinterTrackingSummary {
    const route: ScWinterTrackingPoint[] = [];
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
   * Exact completed-daily Page 4 tracking behavior from SCReportingService.
   *
   * Legacy rules that matter for PDF parity:
   * - Latitude is the driver row; longitude/speed/heading are exact-minute joins.
   * - Only positive latitude/longitude positions become Begin/End positions.
   * - The 1,441st row (next-day 00:00) is retained as the closing endpoint, but
   *   the report labels that End Position as Timestamp-1 minute (23:59).
   * - Total Distance is NOT recalculated here. GenerateReportTracking receives
   *   the sum of the already displayed 2dp mode distances from Page 2.
   */
  private buildLegacyTrackingSummary(
    series: Map<string, NumericPoint[]>,
    startMs: number,
    endMs: number,
    modeSummary: readonly ScWinterModeSummaryRow[],
  ): ScWinterTrackingSummary {
    const points = (tag: string): readonly NumericPoint[] =>
      series.get(this.tagKey(tag)) || [];

    const latitude = this.buildLegacyExactMinuteLookup(points(TAGS.gpsLat), startMs, endMs);
    const longitude = this.buildLegacyExactMinuteLookup(points(TAGS.gpsLong), startMs, endMs);
    const speed = this.buildLegacyExactMinuteLookup(points(TAGS.gpsSpeed), startMs, endMs);
    const heading = this.buildLegacyExactMinuteLookup(points(TAGS.gpsHead), startMs, endMs);

    const exactRoute: ScWinterTrackingPoint[] = [];
    for (let minute = startMs; minute <= endMs; minute += MINUTE_MS) {
      const lat = latitude.get(minute) || 0;
      if (lat === 0) continue;

      const lng = longitude.get(minute) || 0;
      // The original SC WINTER report explicitly requires positive N/E
      // coordinates before accepting a Begin/End position.
      if (lat <= 0 || lng <= 0 || lat > 90 || lng > 180) continue;

      exactRoute.push({
        timestamp: new Date(minute),
        latitude: lat,
        longitude: lng,
        speed: Math.fround(speed.get(minute) ?? 0),
        heading: heading.get(minute) ?? 0,
      });
    }

    const begin = exactRoute.length > 0 ? { ...exactRoute[0] } : null;
    const last = exactRoute.length > 0 ? exactRoute[exactRoute.length - 1] : null;
    const end = last
      ? {
          ...last,
          // GenerateReportTracking labels End Position with AddMinutes(-1).
          timestamp: new Date(last.timestamp.getTime() - MINUTE_MS),
        }
      : null;

    // C# stores each Mode distance in a Single, formats it to n2, parses it
    // back to float, then accumulates TotalDistance. Reproduce that ordering.
    let legacyDistance = Math.fround(0);
    for (const row of modeSummary) {
      const displayedDistance = Math.fround(Number(row.distanceNm.toFixed(2)));
      legacyDistance = Math.fround(legacyDistance + displayedDistance);
    }

    return {
      begin,
      end,
      distanceNm: legacyDistance,
      route: this.downsampleRoute(exactRoute, 300),
    };
  }

  private buildInstantMap(points: readonly NumericPoint[]): Map<number, number> {
    const result = new Map<number, number>();
    for (const point of points) {
      const bucket = this.floorToMinute(point.timestamp).getTime();
      result.set(bucket, point.value);
    }
    return result;
  }

  /**
   * Rebuild the legacy fixed-minute DataTable lookup used by SCReportingService.
   * Only exact :00 second samples are allowed into the row, matching DataTable.Select.
   */
  private buildLegacyExactMinuteLookup(
    points: readonly NumericPoint[],
    startMs: number,
    endMs: number,
  ): Map<number, number> {
    const result = new Map<number, number>();
    for (const point of exactMinutePoints(points, startMs, endMs)) {
      if (Number.isFinite(point.value)) result.set(point.timestamp.getTime(), point.value);
    }
    return result;
  }

  private legacyPreviousMinuteHour(minute: number): number {
    return new Date(minute - MINUTE_MS).getHours();
  }

  /**
   * Exact hourly FIN/FOUT side scan used by GetDataAEFuelConsumption and the
   * individual A/E hourly pages. This intentionally preserves the legacy
   * reset/lost-sample rules instead of interpolating historian gaps.
   */
  private buildLegacyHourlyTotalizerSide(
    points: readonly NumericPoint[],
    startMs: number,
    endMs: number,
  ): number[] {
    const values = this.buildLegacyExactMinuteLookup(points, startMs, endMs);
    const hourly = Array.from({ length: 24 }, () => 0);
    let i = 0;
    let previous = 0;
    let previousAfterLost = 0;

    for (let minute = startMs; minute <= endMs; minute += MINUTE_MS) {
      const value = values.get(minute) || 0;
      if (value === 0) continue;

      if (i === 0) {
        previous = value;
      } else if (value > previous) {
        const delta = value - previous;
        if (delta <= 300) {
          hourly[this.legacyPreviousMinuteHour(minute)] += delta;
          previous = value;
          previousAfterLost = 0;
        } else {
          if (previousAfterLost !== 0 && previousAfterLost < value) {
            const recovered = value - previousAfterLost;
            if (recovered <= 50) {
              hourly[this.legacyPreviousMinuteHour(minute)] += recovered;
              previous = value;
              previousAfterLost = 0;
            } else {
              previousAfterLost = value;
            }
          }
          // The original C# writes this again after the recovery branch.
          previousAfterLost = value;
        }
      } else if (i === 1) {
        // Legacy special-case for a bad/reset value around 00:00.
        previous = value;
      } else if (value >= 0 && value <= 20_000 && value >= 500) {
        previous = value;
      }

      i += 1;
    }

    return hourly;
  }

  private buildLegacyHourlyFuel(
    supplyPoints: readonly NumericPoint[],
    returnPoints: readonly NumericPoint[],
    startMs: number,
    endMs: number,
  ): number[] {
    const input = this.buildLegacyHourlyTotalizerSide(supplyPoints, startMs, endMs);
    const output = this.buildLegacyHourlyTotalizerSide(returnPoints, startMs, endMs);
    return input.map((value, hour) => (value > output[hour] ? value - output[hour] : 0));
  }

  /**
   * Exact Page 6/7 and A/E hourly running-hour state machine.
   * Main-engine pages have the legacy /24 > 500 gate on non-increasing samples;
   * A/E pages do not. Missing samples immediately after a running sample are
   * carried as running minutes exactly like the C# service.
   */
  private buildLegacyHourlyRunningHours(
    points: readonly NumericPoint[],
    startMs: number,
    endMs: number,
    pulse: number,
    auxiliary: boolean,
  ): number[] {
    const values = this.buildLegacyExactMinuteLookup(points, startMs, endMs);
    const minutesByHour = Array.from({ length: 24 }, () => 0);
    let i = 0;
    let previous = 0;
    let previousRunStatus = false;

    const addMinute = (minute: number): void => {
      minutesByHour[this.legacyPreviousMinuteHour(minute)] += 1;
    };

    for (let minute = startMs; minute <= endMs; minute += MINUTE_MS) {
      const value = values.get(minute) || 0;
      if (value !== 0) {
        if (i === 0) {
          previous = value;
        } else {
          previousRunStatus = false;
          if (value > previous) {
            addMinute(minute);
            previousRunStatus = true;
            previous = value;
          } else {
            previous = value;
            if (auxiliary) {
              if (previous <= 5_000 && previous !== 0) addMinute(minute);
            } else if (previous / pulse > 500 && previous <= 5_000 && previous !== 0) {
              addMinute(minute);
            }
          }
        }
        i += 1;
      } else if (previousRunStatus) {
        addMinute(minute);
      }
    }

    return minutesByHour.map((minutes) => minutes / 60);
  }

  /** Page 5 legacy V.D. / V.S. calculation. */
  private buildLegacyHourlyNavigation(
    points: readonly NumericPoint[],
    startMs: number,
    endMs: number,
  ): { distanceNm: number[]; speedKnots: number[] } {
    const values = this.buildLegacyExactMinuteLookup(points, startMs, endMs);
    const speedSum = Array.from({ length: 24 }, () => 0);
    const speedCount = Array.from({ length: 24 }, () => 0);

    for (let minute = startMs; minute <= endMs; minute += MINUTE_MS) {
      const value = values.get(minute) || 0;
      if (!Number.isFinite(value) || value === 0) continue;
      const hour = minute === startMs ? 0 : this.legacyPreviousMinuteHour(minute);
      // GPSSpd is a System.Single column in SCWinter.GetRawData(). Preserve
      // single-precision accumulation before the hourly average is stored.
      speedSum[hour] = Math.fround(Math.fround(speedSum[hour]) + Math.fround(value));
      speedCount[hour] += 1;
    }

    const speedKnots = speedSum.map((sum, hour) =>
      speedCount[hour] > 0 ? Math.fround(sum / speedCount[hour]) : 0,
    );
    const distanceNm = speedKnots.map((speed, hour) =>
      speedCount[hour] > 0 ? Number(speed) * (speedCount[hour] / 60) : 0,
    );

    return { distanceNm, speedKnots };
  }

  /** Passage-page FIN/FOUT scan. It differs from the hourly-page recovery rule. */
  private buildLegacyPassageTotalizerDelta(
    points: readonly NumericPoint[],
    startMs: number,
    endMs: number,
  ): Map<number, number> {
    const values = this.buildLegacyExactMinuteLookup(points, startMs, endMs);
    const result = new Map<number, number>();
    let i = 0;
    let previous = 0;
    let previousAfterLost = 0;

    for (let minute = startMs; minute <= endMs; minute += MINUTE_MS) {
      const value = values.get(minute) || 0;
      if (value === 0) continue;

      if (i === 0) {
        previous = value;
      } else if (value > previous) {
        const delta = value - previous;
        if (delta <= 300) {
          result.set(minute, delta);
          previous = value;
          previousAfterLost = 0;
        } else {
          if (previousAfterLost !== 0 && previousAfterLost < value) {
            result.set(minute, value - previousAfterLost);
            previous = value;
            previousAfterLost = 0;
          }
          previousAfterLost = value;
        }
      } else if (value >= 0) {
        previous = value;
      }

      i += 1;
    }

    return result;
  }

  private buildLegacyPassageCounter(
    points: readonly NumericPoint[],
    startMs: number,
    endMs: number,
    defaultLost: number,
    defaultRunning: number,
  ): { delta: Map<number, number>; lost: Map<number, number>; running: Map<number, number> } {
    const values = this.buildLegacyExactMinuteLookup(points, startMs, endMs);
    const delta = new Map<number, number>();
    const lost = new Map<number, number>();
    const running = new Map<number, number>();
    let i = 0;
    let previous = 0;
    let lostCount = 1;

    for (let minute = startMs; minute <= endMs; minute += MINUTE_MS) {
      lost.set(minute, defaultLost);
      running.set(minute, defaultRunning);
      const value = values.get(minute) || 0;

      if (value !== 0) {
        if (i === 0) {
          previous = value;
        } else {
          if (value > previous) {
            delta.set(minute, value - previous);
            lost.set(minute, lostCount);
            running.set(minute, 1);
            previous = value;
          } else {
            previous = value;
          }
          lostCount = 1;
        }
        i += 1;
      } else {
        lostCount += 1;
      }
    }

    return { delta, lost, running };
  }

  /**
   * Exact SCWinter GetDataPassageSummary + GenerateReportPassageSummary replica.
   * Page 3 deliberately has different fuel/RPM arithmetic from Page 1 and from
   * the hourly pages; sharing one generic map is therefore not PDF-parity safe.
   */
  private buildLegacyPassageSummary(
    series: Map<string, NumericPoint[]>,
    startMs: number,
    endMs: number,
  ): ScWinterPassageSummary {
    const points = (tag: string): readonly NumericPoint[] =>
      series.get(this.tagKey(tag)) || [];
    const gps = this.buildLegacyExactMinuteLookup(points(TAGS.gpsSpeed), startMs, endMs);

    const starboardMain = this.buildLegacyPassageCounter(
      points(TAGS.starboardMainSpeed), startMs, endMs, 0, 1,
    );
    const portMain = this.buildLegacyPassageCounter(
      points(TAGS.portMainSpeed), startMs, endMs, 0, 1,
    );
    const ae1 = this.buildLegacyPassageCounter(
      points(TAGS.ae1Speed), startMs, endMs, 0, 1,
    );
    // The legacy DataTable initializes AE2/AE3/AE4 lost counters to 1 and
    // their running flags to 0. Preserve that seemingly odd behaviour.
    const ae2 = this.buildLegacyPassageCounter(
      points(TAGS.ae2Speed), startMs, endMs, 1, 0,
    );
    const ae3 = this.buildLegacyPassageCounter(
      points(TAGS.ae3Speed), startMs, endMs, 1, 0,
    );
    const ae4 = this.buildLegacyPassageCounter(
      points(TAGS.ae4Speed), startMs, endMs, 1, 0,
    );

    const ae1In = this.buildLegacyPassageTotalizerDelta(points(TAGS.ae1FuelIn), startMs, endMs);
    const ae1Out = this.buildLegacyPassageTotalizerDelta(points(TAGS.ae1FuelOut), startMs, endMs);
    const ae2In = this.buildLegacyPassageTotalizerDelta(points(TAGS.ae2FuelIn), startMs, endMs);
    const ae2Out = this.buildLegacyPassageTotalizerDelta(points(TAGS.ae2FuelOut), startMs, endMs);
    const ae3In = this.buildLegacyPassageTotalizerDelta(points(TAGS.ae3FuelIn), startMs, endMs);
    const ae3Out = this.buildLegacyPassageTotalizerDelta(points(TAGS.ae3FuelOut), startMs, endMs);
    const ae4In = this.buildLegacyPassageTotalizerDelta(points(TAGS.ae4FuelIn), startMs, endMs);
    const ae4Out = this.buildLegacyPassageTotalizerDelta(points(TAGS.ae4FuelOut), startMs, endMs);

    const fadd = (left: number, right: number): number =>
      Math.fround(Math.fround(left) + Math.fround(right));

    let starboardRaw = 0;
    let portRaw = 0;
    let ae1Raw = 0;
    let ae2Raw = 0;
    let ae3Raw = 0;
    let ae4Raw = 0;
    let starboardMaxRaw = 0;
    let portMaxRaw = 0;
    let ae1MaxRaw = 0;
    let ae2MaxRaw = 0;
    let ae3MaxRaw = 0;
    let ae4MaxRaw = 0;
    let starboardRun = 0;
    let portRun = 0;
    let ae1Run = 0;
    let ae2Run = 0;
    let ae3Run = 0;
    let ae4Run = 0;
    let ae1Fuel = 0;
    let ae2Fuel = 0;
    let ae3Fuel = 0;
    let ae4Fuel = 0;
    let speedSum = 0;
    let rowCount = 0;

    const updateMax = (
      rawDelta: number,
      lostCount: number,
      pulse: number,
      rpmLimit: number,
      current: number,
    ): number => {
      const singleDelta = Math.fround(rawDelta);
      if (Math.fround(singleDelta / pulse) > rpmLimit || lostCount <= 0) return current;
      const candidate = Math.fround(singleDelta / lostCount);
      return candidate > current ? candidate : current;
    };

    for (let minute = startMs; minute <= endMs; minute += MINUTE_MS) {
      const speed = Math.fround(gps.get(minute) || 0);
      if (speed < 7) continue;

      const starboardDelta = Math.fround(starboardMain.delta.get(minute) || 0);
      const portDelta = Math.fround(portMain.delta.get(minute) || 0);
      const ae1Delta = Math.fround(ae1.delta.get(minute) || 0);
      const ae2Delta = Math.fround(ae2.delta.get(minute) || 0);
      const ae3Delta = Math.fround(ae3.delta.get(minute) || 0);
      const ae4Delta = Math.fround(ae4.delta.get(minute) || 0);

      starboardRaw = fadd(starboardRaw, starboardDelta);
      portRaw = fadd(portRaw, portDelta);
      ae1Raw = fadd(ae1Raw, ae1Delta);
      ae2Raw = fadd(ae2Raw, ae2Delta);
      ae3Raw = fadd(ae3Raw, ae3Delta);
      ae4Raw = fadd(ae4Raw, ae4Delta);

      starboardMaxRaw = updateMax(
        starboardDelta, starboardMain.lost.get(minute) || 0, 24, 1500, starboardMaxRaw,
      );
      portMaxRaw = updateMax(
        portDelta, portMain.lost.get(minute) || 0, 24, 1500, portMaxRaw,
      );
      ae1MaxRaw = updateMax(ae1Delta, ae1.lost.get(minute) || 0, 6, 1200, ae1MaxRaw);
      ae2MaxRaw = updateMax(ae2Delta, ae2.lost.get(minute) || 0, 12, 1200, ae2MaxRaw);
      ae3MaxRaw = updateMax(ae3Delta, ae3.lost.get(minute) || 0, 12, 1200, ae3MaxRaw);
      ae4MaxRaw = updateMax(ae4Delta, ae4.lost.get(minute) || 0, 6, 1200, ae4MaxRaw);

      starboardRun = fadd(starboardRun, starboardMain.running.get(minute) || 0);
      portRun = fadd(portRun, portMain.running.get(minute) || 0);
      ae1Run = fadd(ae1Run, ae1.running.get(minute) || 0);
      ae2Run = fadd(ae2Run, ae2.running.get(minute) || 0);
      ae3Run = fadd(ae3Run, ae3.running.get(minute) || 0);
      ae4Run = fadd(ae4Run, ae4.running.get(minute) || 0);

      const ae1Net = (ae1In.get(minute) || 0) - (ae1Out.get(minute) || 0);
      const ae2Candidate = (ae2In.get(minute) || 0) - (ae2Out.get(minute) || 0);
      const ae2Net = ae2Candidate < 9 ? ae2Candidate : 0;
      const ae3Net = (ae3In.get(minute) || 0) - (ae3Out.get(minute) || 0);
      const ae4Net = (ae4In.get(minute) || 0) - (ae4Out.get(minute) || 0);

      ae1Fuel += ae1Net;
      ae2Fuel += ae2Net;
      ae3Fuel += ae3Net;
      ae4Fuel += ae4Net;
      speedSum = fadd(speedSum, speed);
      rowCount += 1;
    }

    const legacyAverage = (raw: number, pulse: number, run: number): number =>
      run > 0 ? Math.fround(Math.fround(raw / pulse) / run) : 0;
    const legacyMax = (raw: number, pulse: number): number => Math.fround(raw / pulse);
    const averageSpeed = rowCount > 0 ? Math.fround(speedSum / rowCount) : null;
    const displayedPassageHours = Math.fround(Number((rowCount / 60).toFixed(2)));
    const distanceNm = averageSpeed === null
      ? 0
      : Math.fround(Math.fround(averageSpeed) * displayedPassageHours);
    const totalFuel = ae1Fuel + ae2Fuel + ae3Fuel + ae4Fuel;

    return {
      mainEngines: [
        {
          key: 'port',
          label: 'Port M/E',
          averageRpm: legacyAverage(portRaw, 24, portRun),
          maximumRpm: legacyMax(portMaxRaw, 24),
          runningHours: portRun / 60,
          fuelUsed: 0,
        },
        {
          key: 'starboard',
          label: 'Stb. M/E',
          averageRpm: legacyAverage(starboardRaw, 24, starboardRun),
          maximumRpm: legacyMax(starboardMaxRaw, 24),
          runningHours: starboardRun / 60,
          fuelUsed: 0,
        },
      ],
      shafts: [],
      auxFuel: [
        {
          key: 'port', label: 'A/E1', runningHours: ae1Run / 60, fuelUsed: ae1Fuel,
          averageRpm: legacyAverage(ae1Raw, 6, ae1Run), maximumRpm: legacyMax(ae1MaxRaw, 6),
        },
        {
          key: 'center', label: 'A/E2', runningHours: ae2Run / 60, fuelUsed: ae2Fuel,
          averageRpm: legacyAverage(ae2Raw, 12, ae2Run), maximumRpm: legacyMax(ae2MaxRaw, 12),
        },
        {
          key: 'starboard', label: 'A/E3', runningHours: ae3Run / 60, fuelUsed: ae3Fuel,
          averageRpm: legacyAverage(ae3Raw, 12, ae3Run), maximumRpm: legacyMax(ae3MaxRaw, 12),
        },
        {
          key: 'fourth', label: 'A/E4', runningHours: ae4Run / 60, fuelUsed: ae4Fuel,
          averageRpm: legacyAverage(ae4Raw, 6, ae4Run), maximumRpm: legacyMax(ae4MaxRaw, 6),
        },
      ],
      mainEngineFuelTotal: 0,
      auxiliaryFuelTotal: totalFuel,
      averageSpeed,
      distanceNm,
    };
  }

  /**
   * Exact SCWinter CalSpeedSummary / CalSpeedAESummary replica for Page 1.
   *
   * The legacy service walks a fixed 1,441-row minute table. Missing counter
   * samples are zeros and, immediately after a running sample, are counted as
   * running/lost minutes. The generic RPM map cannot reproduce that behavior
   * exactly, which caused 18.38 vs 18.40 h and 23.98 vs 24.00 h drift.
   */
  private buildLegacyCounterSummary(
    points: readonly NumericPoint[],
    startMs: number,
    endMs: number,
    pulse: number,
    maximumRpm: number,
    runningThresholdRpm: number,
    auxiliary: boolean,
  ): { averageRpm: number; maximumRpm: number; runningHours: number } {
    const exact = exactMinutePoints(points, startMs, endMs);
    const valueByMinute = new Map<number, number>();
    for (const point of exact) {
      if (Number.isFinite(point.value)) valueByMinute.set(point.timestamp.getTime(), point.value);
    }

    let i = 0;
    let lost = 1;
    let numberForAverage = 0;
    let previous = 0;
    let previousRunStatus = false;
    let averageRaw = 0;
    let maximumRaw = 0;
    let runningMinutes = 0;

    for (let minute = startMs; minute <= endMs; minute += MINUTE_MS) {
      const value = valueByMinute.get(minute) || 0;

      if (value !== 0) {
        if (i === 0) {
          previous = value;
        } else {
          previousRunStatus = false;
          if (value > previous) {
            const delta = value - previous;
            const rpm = delta / pulse;

            if (rpm <= maximumRpm) {
              if (lost > 1) {
                if (delta / lost > maximumRaw) maximumRaw = delta / lost;
                lost = 1;
              } else if (delta > maximumRaw) {
                maximumRaw = delta;
              }
              averageRaw += delta;
              numberForAverage += 1;
            }

            if (auxiliary || rpm >= runningThresholdRpm) runningMinutes += 1;
            previousRunStatus = true;
            previous = value;
          } else {
            previous = value;
          }
        }
        i += 1;
      } else if (previousRunStatus) {
        runningMinutes += 1;
        i += 1;
        lost += 1;
      }
    }

    return {
      averageRpm: numberForAverage > 0 ? averageRaw / pulse / numberForAverage : 0,
      maximumRpm: maximumRaw / pulse,
      runningHours: runningMinutes / 60,
    };
  }

  /**
   * Protect Page-1 fuel totals from a mismatched/reset API2 totalizer while
   * keeping the exact legacy min/max result whenever it is physically valid.
   *
   * If the independent IN/OUT spans produce a negative daily fuel value, pair
   * exact-minute IN and OUT readings into a net cumulative fuel counter and sum
   * only physically plausible positive net growth. This also bridges historian
   * gaps (the official SC WINTER PDF can have zero hourly fuel during a gap while
   * its Page-1 daily total still includes the fuel consumed across that gap).
   */
  private resolveScWinterDailyFuel(
    legacyTotal: number,
    inputPoints: readonly NumericPoint[],
    outputPoints: readonly NumericPoint[],
    minuteFuelMap: Map<number, number>,
    label: string,
  ): ScWinterFuelResolution {
    const acceptedMinuteFuel = Math.max(0, this.sumMap(minuteFuelMap));

    if (Number.isFinite(legacyTotal) && legacyTotal >= 0) {
      return {
        value: legacyTotal,
        legacyTotal,
        acceptedMinuteFuel,
        method: 'legacy',
      };
    }

    // If the legacy independent FIN/FOUT span becomes negative because one side
    // reset/rolled over, recover from a synchronized net cumulative counter.
    // The recovered daily value must be at least the accepted minute-fuel lower
    // bound and must remain inside SC WINTER's legacy FIN daily range (< 28,000 L).
    const gapSafe = this.calculateGapSafeNetFuel(inputPoints, outputPoints, 300);
    const recoveryIsPlausible =
      Number.isFinite(gapSafe) &&
      gapSafe > 0 &&
      gapSafe + 0.01 >= acceptedMinuteFuel &&
      gapSafe < 28_000;

    if (recoveryIsPlausible) {
      const warning =
        `${label}: the legacy FIN/FOUT daily span was invalid (${this.formatDiagnosticNumber(legacyTotal)} L), ` +
        `so the report used synchronized net-totalizer recovery (${this.formatDiagnosticNumber(gapSafe)} L).`;
      console.warn(`[SC WINTER] ${warning}`, { legacyTotal, recoveredTotal: gapSafe, acceptedMinuteFuel });
      return {
        value: gapSafe,
        legacyTotal,
        acceptedMinuteFuel,
        method: 'gap-safe-recovery',
        warning,
      };
    }

    // Last-resort lower-bound fallback: keep the report page open and never show
    // a negative customer fuel value. The UI receives an explicit quality warning
    // so this fallback cannot be mistaken for verified PDF parity.
    const fallback = Math.max(0, acceptedMinuteFuel);
    const warning =
      `${label}: the daily totalizer could not be validated; showing accepted minute fuel ` +
      `(${this.formatDiagnosticNumber(fallback)} L) as an unverified lower-bound fallback.`;
    console.warn(`[SC WINTER] ${warning}`, { legacyTotal, acceptedMinuteFuel, gapSafe });
    return {
      value: fallback,
      legacyTotal,
      acceptedMinuteFuel,
      method: 'accepted-minute-fallback',
      warning,
    };
  }

  private formatDiagnosticNumber(value: number): string {
    return Number.isFinite(value) ? value.toFixed(2) : String(value);
  }

  private calculateGapSafeNetFuel(
    inputPoints: readonly NumericPoint[],
    outputPoints: readonly NumericPoint[],
    maxFuelPerMinute: number,
  ): number {
    const valid = (value: number): boolean =>
      Number.isFinite(value) && value > 0 && value !== 999_999 && value < 90_000_000;

    const input = new Map<number, number>();
    const output = new Map<number, number>();
    for (const point of inputPoints) if (valid(point.value)) input.set(point.timestamp.getTime(), point.value);
    for (const point of outputPoints) if (valid(point.value)) output.set(point.timestamp.getTime(), point.value);

    const commonMinutes = Array.from(input.keys())
      .filter((minute) => output.has(minute))
      .sort((a, b) => a - b);

    let total = 0;
    let previousNet: number | null = null;
    let previousMinute: number | null = null;

    for (const minute of commonMinutes) {
      const net = (input.get(minute) || 0) - (output.get(minute) || 0);
      if (!Number.isFinite(net)) continue;

      if (previousNet !== null && previousMinute !== null) {
        const gapMinutes = Math.max(1, Math.round((minute - previousMinute) / MINUTE_MS));
        const delta = net - previousNet;
        const maximumPlausible = maxFuelPerMinute * gapMinutes;

        // Positive net growth is actual fuel consumption. A negative jump means
        // one side reset/rolled over; re-baseline instead of subtracting fuel.
        if (delta >= 0 && delta <= maximumPlausible) total += delta;
      }

      previousNet = net;
      previousMinute = minute;
    }

    return total;
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

  private buildFuelMap(
    supplyPoints: readonly NumericPoint[],
    returnPoints: readonly NumericPoint[],
    maxDeltaPerMinute = 300,
  ): Map<number, number> {
    const supply = this.buildTotalizerDeltaMap(supplyPoints, maxDeltaPerMinute);
    const returned = this.buildTotalizerDeltaMap(returnPoints, maxDeltaPerMinute);
    const buckets = new Set<number>([...supply.keys(), ...returned.keys()]);
    const result = new Map<number, number>();
    buckets.forEach((bucket) => {
      const value = (supply.get(bucket) || 0) - (returned.get(bucket) || 0);
      result.set(bucket, Math.max(0, Number.isFinite(value) ? value : 0));
    });
    return result;
  }

  private buildTotalizerDeltaMap(
    points: readonly NumericPoint[],
    maxDeltaPerMinute = 300,
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
      if (!Number.isFinite(delta) || delta < 0) {
        continue;
      }
      const perMinute = delta / gapMinutes;
      if (!Number.isFinite(perMinute) || perMinute > maxDeltaPerMinute) {
        continue;
      }
      for (let minute = 1; minute <= gapMinutes; minute += 1) {
        const bucket = previousBucket + minute * MINUTE_MS;
        result.set(bucket, (result.get(bucket) || 0) + perMinute);
      }
    }
    return result;
  }

  private foldCompletedDayBoundary(
    map: Map<number, number>,
    minuteEnd: number,
    boundaryBucket: number,
    additive = false,
  ): void {
    if (!map.has(boundaryBucket)) return;
    const value = map.get(boundaryBucket) || 0;
    if (additive) map.set(minuteEnd, (map.get(minuteEnd) || 0) + value);
    else if (value > 0) map.set(minuteEnd, value);
    map.delete(boundaryBucket);
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
  ): ScWinterSpeedPoint[] {
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
    source: readonly ScWinterSpeedPoint[],
    maxPoints: number,
  ): ScWinterSpeedPoint[] {
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

  private downsampleRoute(route: readonly ScWinterTrackingPoint[], maxPoints: number): ScWinterTrackingPoint[] {
    if (route.length <= maxPoints) return [...route];
    const step = Math.max(1, Math.ceil(route.length / maxPoints));
    const result = route.filter((_, index) => index % step === 0);
    const last = route[route.length - 1];
    if (result[result.length - 1] !== last) result.push(last);
    return result;
  }

  private resolveModeProfileKey(label: string): string {
    const normalized = this.normalizeIdentity(label);
    const mode = SC_WINTER_REPORT_PROFILE.modes.find(
      (item) => this.normalizeIdentity(item.label) === normalized,
    );
    return mode?.key || SC_WINTER_REPORT_PROFILE.modes[0].key;
  }

  private resolveModeFromGpsSpeed(speed: number | null): string | null {
    if (speed === null || !Number.isFinite(speed)) return null;
    if (speed < 1) return 'Standby';
    if (speed < 3) return 'Cargo Operation';
    if (speed < 7) return 'Manoeuvring';
    return 'Passage';
  }

  private buildModeReason(speed: number | null, modeLabel: string): string {
    if (speed === null || !Number.isFinite(speed)) return `Derived SC WINTER mode: ${modeLabel}.`;
    const band = speed < 1 ? '< 1 kn' : speed < 3 ? '1-<3 kn' : speed < 7 ? '3-<7 kn' : '>= 7 kn';
    return `Derived from A09-VES-GPS-SPEED ${speed.toFixed(2)} kn (${band}) = ${modeLabel}.`;
  }

  private parseNumber(rawValue: unknown): number | null {
    if (rawValue === null || rawValue === undefined || rawValue === '') return null;
    const value = Number(String(rawValue).replace(/,/g, '').trim());
    return Number.isFinite(value) ? value : null;
  }

  private isScWinterProfile(id: unknown, aliases: unknown, prefixes: unknown): boolean {
    const candidates = [
      id,
      ...(Array.isArray(aliases) ? aliases : []),
      ...(Array.isArray(prefixes) ? prefixes : []),
    ];
    return candidates.some((value) => {
      const normalized = this.normalizeIdentity(value);
      return normalized === 'scwinter' || normalized === 'a09';
    });
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
