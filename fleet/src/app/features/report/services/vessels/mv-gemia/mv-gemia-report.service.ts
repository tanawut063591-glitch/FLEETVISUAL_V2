import { buildMonthlyDailySlots } from '../../common/monthly-day-slots';
import { Injectable } from '@angular/core';
import { Observable, from, of, throwError } from 'rxjs';
import { catchError, finalize, map, mergeMap, shareReplay, tap, toArray } from 'rxjs/operators';

import { NewHttpClientService } from '../../../../../shared/services/http-client1.service';
import { resetReportCacheForAuthChange, setBoundedReportCache } from '../../common/report-cache.util';
import { reportDayConcurrency, reportPeriodCacheTtlMs } from '../../common/report-load-policy';
import {
  LiveReportProfileDocument,
  LiveReportSnapshot,
} from '../../../models/live-report.model';
import {
  VesselModeHistoryConfig,
  VesselReportAdapter,
} from '../../common/vessel-report-adapter';
import {
  buildExactMinuteValueMap,
  buildLegacyPdfFuelDeltaMap,
  legacyConvertToInt32,
  isCompletedDailyWindow,
  normalizeModeFuelToOfficialTotal,
  scaleModeDetailFuelToTarget,
} from '../../common/pdf-mode-parity';
import { calculateLegacyDailyFuelTotal, exactMinutePoints } from '../../common/legacy-daily-fuel';
import {
  MV_GEMIA_MODE_HISTORIAN_TAG,
  MV_GEMIA_REPORT_PROFILE,
} from './mv-gemia-report.profile';

export interface MvGemiaEngineSummaryRow {
  key: 'port' | 'center' | 'starboard';
  label: string;
  averageRpm: number | null;
  maximumRpm: number | null;
  runningHours: number;
  fuelUsed: number;
  utilizationPercent?: number;
}

export interface MvGemiaShaftSummaryRow {
  key: 'port' | 'center' | 'starboard';
  label: string;
  averageRpm: number | null;
  maximumRpm: number | null;
  runningHours: number;
  utilizationPercent?: number;
}

export interface MvGemiaAuxSummaryRow {
  key: 'port' | 'center' | 'starboard';
  label: string;
  runningHours: number;
  fuelUsed: number;
}

export interface MvGemiaUtilizationRow {
  label: string;
  port: number;
  center: number;
  starboard: number;
}

export interface MvGemiaModeSummaryRow {
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

export interface MvGemiaPassageSummary {
  mainEngines: MvGemiaEngineSummaryRow[];
  shafts: MvGemiaShaftSummaryRow[];
  auxFuel: MvGemiaAuxSummaryRow[];
  mainEngineFuelTotal: number;
  auxiliaryFuelTotal: number;
  averageSpeed: number | null;
  distanceNm: number;
}

export interface MvGemiaModeDetail {
  key: string;
  label: string;
  summary: MvGemiaPassageSummary;
}

export interface MvGemiaTrackingPoint {
  timestamp: Date;
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
}

export interface MvGemiaTrackingSummary {
  begin: MvGemiaTrackingPoint | null;
  end: MvGemiaTrackingPoint | null;
  distanceNm: number;
  route: MvGemiaTrackingPoint[];
}

export interface MvGemiaHourlyRow {
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
  portMainRunningHours: number | null;
  centerMainRunningHours: number | null;
  starboardMainRunningHours: number | null;
  portAuxRunningHours: number | null;
  centerAuxRunningHours: number | null;
  starboardAuxRunningHours: number | null;
  portShaftRunningHours: number | null;
  centerShaftRunningHours: number | null;
  starboardShaftRunningHours: number | null;
  portShaftRpm: number | null;
  centerShaftRpm: number | null;
  starboardShaftRpm: number | null;
  totalFuel: number | null;
}

export interface MvGemiaSpeedPoint {
  timestamp: Date;
  speed: number;
}

export interface MvGemiaDailyUiReport {
  periodStart: Date;
  periodEnd: Date;
  loadedAt: Date;
  coveragePercent: number;
  averageSpeed: number | null;
  maximumSpeed: number | null;
  engineSummary: MvGemiaEngineSummaryRow[];
  shaftSummary: MvGemiaShaftSummaryRow[];
  auxSummary: MvGemiaAuxSummaryRow[];
  utilization: MvGemiaUtilizationRow[];
  mainEngineFuelTotal: number;
  auxiliaryFuelTotal: number;
  totalFuelUsed: number;
  modeSummary: MvGemiaModeSummaryRow[];
  passageSummary: MvGemiaPassageSummary;
  modeDetails?: MvGemiaModeDetail[];
  tracking: MvGemiaTrackingSummary;
  hourly: MvGemiaHourlyRow[];
  speedSeries: MvGemiaSpeedPoint[];
}

export type MvGemiaUiPeriodKind = 'day' | 'range' | 'month';

export interface MvGemiaDailyTrendRow {
  date: Date;
  totalFuelUsed: number;
  mainEngineFuelTotal: number;
  auxiliaryFuelTotal: number;
  distanceNm: number;
  coveragePercent: number;
  modeRunningHours: number;
}

export interface MvGemiaPeriodUiReport extends MvGemiaDailyUiReport {
  periodKind: MvGemiaUiPeriodKind;
  dayCount: number;
  dailyTrend: MvGemiaDailyTrendRow[];
}

interface NumericPoint {
  timestamp: Date;
  value: number;
}

interface ReportCacheEntry {
  value: MvGemiaDailyUiReport;
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
  portMainRunMinutes: number;
  centerMainRunMinutes: number;
  starboardMainRunMinutes: number;
  portAuxRunMinutes: number;
  centerAuxRunMinutes: number;
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
const MAX_INTERPOLATION_GAP_MINUTES = 5;
const MAX_PERIOD_DAYS = 31;

const TAGS = {
  gpsSpeed: 'MV_GEMIA-VES-GPS-SPEED',
  gpsLat: 'MV_GEMIA-VES-GPS-LAT',
  gpsLong: 'MV_GEMIA-VES-GPS-LONG',
  gpsHead: 'MV_GEMIA-VES-GPS-HEAD',
  mode: 'MV_GEMIA-VES-MODE',

  // MV GEMIA exposes calculated shaft/engine speeds in the live point set.
  // Keep the raw counter-style aliases as a fallback for older historian archives.
  pmeSpeedCalc: 'MV_GEMIA-PME-SPD-CALC',
  smeSpeedCalc: 'MV_GEMIA-SME-SPD-CALC',
  paeSpeedCalc: 'MV_GEMIA-PAE-SPD-CALC',
  caeSpeedCalc: 'MV_GEMIA-CAE-SPD-CALC',
  saeSpeedCalc: 'MV_GEMIA-SAE-SPD-CALC',
  pmeSpeed: 'MV_GEMIA-PME-SPD',
  smeSpeed: 'MV_GEMIA-SME-SPD',
  ppsSpeedCalc: 'MV_GEMIA-PPS-SPD-CALC',
  spsSpeedCalc: 'MV_GEMIA-SPS-SPD-CALC',
  ppsSpeed: 'MV_GEMIA-PPS-SPD',
  spsSpeed: 'MV_GEMIA-SPS-SPD',
  paeSpeed: 'MV_GEMIA-PAE-SPD',
  caeSpeed: 'MV_GEMIA-CAE-SPD',
  saeSpeed: 'MV_GEMIA-SAE-SPD',

  // Primary fuel source used by the MV GEMIA live/report point model.
  pmeFuelToday: 'MV_GEMIA-PME-CONS-TODAY',
  smeFuelToday: 'MV_GEMIA-SME-CONS-TODAY',
  paeFuelToday: 'MV_GEMIA-PAE-CONS-TODAY',
  caeFuelToday: 'MV_GEMIA-CAE-CONS-TODAY',
  saeFuelToday: 'MV_GEMIA-SAE-CONS-TODAY',

  // Legacy totalizer fallback. This keeps the report useful against older archives
  // where *_CONS_TODAY was not retained but FIN/FOUT totalizers were.
  pmeFuelIn: 'MV_GEMIA-PME-FIN-VTOTAL',
  pmeFuelOut: 'MV_GEMIA-PME-FOUT-VTOTAL',
  smeFuelIn: 'MV_GEMIA-SME-FIN-VTOTAL',
  smeFuelOut: 'MV_GEMIA-SME-FOUT-VTOTAL',
  paeFuelIn: 'MV_GEMIA-PAE-FIN-VTOTAL',
  paeFuelOut: 'MV_GEMIA-PAE-FOUT-VTOTAL',
  caeFuelIn: 'MV_GEMIA-CAE-FIN-VTOTAL',
  caeFuelOut: 'MV_GEMIA-CAE-FOUT-VTOTAL',
  saeFuelIn: 'MV_GEMIA-SAE-FIN-VTOTAL',
  saeFuelOut: 'MV_GEMIA-SAE-FOUT-VTOTAL',
} as const;

const ALL_TAGS = Object.values(TAGS);

@Injectable({ providedIn: 'root' })
export class MvGemiaReportService implements VesselReportAdapter {
  readonly id = 'mv-gemia';
  readonly serviceLabel = 'MV GEMIA Report Service';
  readonly profileLabel = MV_GEMIA_REPORT_PROFILE.label;

  private readonly detailedReportCache = new Map<string, ReportCacheEntry>();
  private readonly detailedReportInFlight = new Map<string, Observable<MvGemiaDailyUiReport>>();
  private readonly periodReportCache = new Map<string, { value: MvGemiaPeriodUiReport; expiresAt: number }>();
  private readonly periodReportInFlight = new Map<string, Observable<MvGemiaPeriodUiReport>>();
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

    return candidates.some((value) => this.normalizeIdentity(value) === 'mvgemia');
  }

  prepareProfileDocument(baseDocument: LiveReportProfileDocument): LiveReportProfileDocument {
    const profiles = (baseDocument?.profiles || []).filter(
      (profile) => !this.isMvGemiaProfile(profile?.id, profile?.aliases, profile?.prefixes),
    );

    return {
      ...baseDocument,
      profiles: [...profiles, MV_GEMIA_REPORT_PROFILE],
    };
  }

  enhanceSnapshot(
    snapshot: LiveReportSnapshot,
    currentData: Record<string, any> | null | undefined,
  ): LiveReportSnapshot {
    const rawMode = this.findCurrentTagValue(currentData, MV_GEMIA_MODE_HISTORIAN_TAG);
    const modeLabel = this.resolveModeFromCode(rawMode);

    if (!modeLabel) {
      return {
        ...snapshot,
        profileLabel: this.profileLabel,
        sourceReport: MV_GEMIA_REPORT_PROFILE.sourceReport || snapshot.sourceReport,
        currentMode: null,
        currentModeRawValue: rawMode === null || rawMode === undefined ? null : String(rawMode),
        modeSourceTag: MV_GEMIA_MODE_HISTORIAN_TAG,
        modeSource: 'unavailable',
        modeConfidence: null,
        modeReason: 'MV GEMIA mode requires a valid MV_GEMIA-VES-MODE value (1-15).',
        modes: MV_GEMIA_REPORT_PROFILE.modes.map((mode) => ({
          key: mode.key,
          label: mode.label,
          isCurrent: false,
        })),
      };
    }

    return {
      ...snapshot,
      profileLabel: this.profileLabel,
      sourceReport: MV_GEMIA_REPORT_PROFILE.sourceReport || snapshot.sourceReport,
      currentMode: modeLabel,
      currentModeRawValue: String(rawMode),
      modeSourceTag: MV_GEMIA_MODE_HISTORIAN_TAG,
      modeSource: 'verified-tag',
      modeConfidence: 'high',
      modeReason: `Verified from ${MV_GEMIA_MODE_HISTORIAN_TAG}: ${String(rawMode)} = ${modeLabel}.`,
      modes: MV_GEMIA_REPORT_PROFILE.modes.map((mode) => ({
        key: mode.key,
        label: mode.label,
        isCurrent: this.normalizeIdentity(mode.label) === this.normalizeIdentity(modeLabel),
      })),
    };
  }

  getModeHistoryConfig(_snapshot: LiveReportSnapshot): VesselModeHistoryConfig {
    return {
      enabled: true,
      kind: 'direct',
      sourceTag: MV_GEMIA_MODE_HISTORIAN_TAG,
      eyebrow: 'MV GEMIA DAILY REPORT',
      title: 'Mode Summary',
      description: 'Mode values are read directly from the MV_GEMIA-VES-MODE historian tag.',
      qualityLabel: 'Verified · MV_GEMIA-VES-MODE',
    };
  }

  resolveHistorianModeLabel(rawValue: unknown): string | null {
    return this.resolveModeFromCode(rawValue);
  }

  loadDetailedDailyReport(
    periodStart: Date,
    periodEnd: Date,
    force = false,
  ): Observable<MvGemiaDailyUiReport> {
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
    // The MV GEMIA PDF includes the next-day 00:00 historian sample for machinery
    // running-hour/mode accounting (this is why a full-day Port M/E can show 24.02 h),
    // while navigation distance remains scoped to 00:00..23:59.
    const historianEnd = completedDaily
      ? new Date(start.getTime() + 24 * 60 * MINUTE_MS)
      : end;
    const requestStartText = this.formatHistorianRequestTime(start);
    const requestEndText = this.formatHistorianRequestTime(historianEnd);

    // Completed Daily PDF parity must use raw logger samples one tag at a time.
    // ChartGetHistorianValues can resample/downsample the cumulative fuel and
    // running-state channels, which is exactly the pattern that produced small
    // but systematic differences versus the official MV GEMIA PDF.
    const historianRequest$: Observable<any> = completedDaily
      ? this.newHttp.getConsistentPdfParityHistorianValues(
          requestStartText,
          requestEndText,
          requestTags,
          force,
        )
      : this.newHttp.getHistorianValues(requestStartText, requestEndText, requestTags);

    const request$ = historianRequest$.pipe(
        map((response) => this.buildDetailedDailyReport(response, start, end)),
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
    periodKind: MvGemiaUiPeriodKind = 'range',
    force = false,
  ): Observable<MvGemiaPeriodUiReport> {
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
          expiresAt: Date.now() + reportPeriodCacheTtlMs(start, end, periodKind),
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
    reports: readonly MvGemiaDailyUiReport[],
    periodStart: Date,
    periodEnd: Date,
    periodKind: MvGemiaUiPeriodKind,
  ): MvGemiaPeriodUiReport {
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
        .filter((row): row is MvGemiaEngineSummaryRow => !!row);
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
      } satisfies MvGemiaEngineSummaryRow;
    });

    const shaftSummary = (['port', 'starboard'] as const).map((key) => {
      const rows = reports
        .map((report) => report.shaftSummary.find((row) => row.key === key))
        .filter((row): row is MvGemiaShaftSummaryRow => !!row);
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
      } satisfies MvGemiaShaftSummaryRow;
    });

    const auxSummary = (['port', 'center', 'starboard'] as const).map((key) => {
      const rows = reports
        .map((report) => report.auxSummary.find((row) => row.key === key))
        .filter((row): row is MvGemiaAuxSummaryRow => !!row);
      return {
        key,
        label: rows[0]?.label || `${key} A/E`,
        runningHours: rows.reduce((sum, row) => sum + row.runningHours, 0),
        fuelUsed: rows.reduce((sum, row) => sum + row.fuelUsed, 0),
      } satisfies MvGemiaAuxSummaryRow;
    });

    const mainEngineFuelTotal = engineSummary.reduce((sum, row) => sum + row.fuelUsed, 0);
    const auxiliaryFuelTotal = auxSummary.reduce((sum, row) => sum + row.fuelUsed, 0);
    const totalFuelUsed = mainEngineFuelTotal + auxiliaryFuelTotal;

    const portEngine = engineSummary.find((row) => row.key === 'port');
    const starboardEngine = engineSummary.find((row) => row.key === 'starboard');
    const portShaft = shaftSummary.find((row) => row.key === 'port');
    const starboardShaft = shaftSummary.find((row) => row.key === 'starboard');
    const utilization: MvGemiaUtilizationRow[] = [
      {
        label: 'M/E Engine Utilized (%)',
        port: this.percent(portEngine?.runningHours || 0, totalElapsedHours),
        center: Number.NaN,
        starboard: this.percent(starboardEngine?.runningHours || 0, totalElapsedHours),
      },
      {
        label: 'Shaft Utilized (%)',
        port: this.percent(portShaft?.runningHours || 0, totalElapsedHours),
        center: Number.NaN,
        starboard: this.percent(starboardShaft?.runningHours || 0, totalElapsedHours),
      },
      {
        label: 'Shaft per M/E Engine Utilized (%)',
        port: this.ratioPercent(portShaft?.runningHours || 0, portEngine?.runningHours || 0),
        center: Number.NaN,
        starboard: this.ratioPercent(starboardShaft?.runningHours || 0, starboardEngine?.runningHours || 0),
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
    const modeSummary = MV_GEMIA_REPORT_PROFILE.modes.map((profileMode) => {
      const rows = reports
        .map((report) => report.modeSummary.find((row) => row.key === profileMode.key))
        .filter((row): row is MvGemiaModeSummaryRow => !!row);
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
      } satisfies MvGemiaModeSummaryRow;
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
        .filter((row): row is MvGemiaEngineSummaryRow => !!row);
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
      } satisfies MvGemiaEngineSummaryRow;
    });
    const passageShafts = (['port', 'starboard'] as const).map((key) => {
      const rows = passageReports
        .map((report) => report.shafts.find((row) => row.key === key))
        .filter((row): row is MvGemiaShaftSummaryRow => !!row);
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
      } satisfies MvGemiaShaftSummaryRow;
    });
    const passageAuxFuel = (['port', 'center', 'starboard'] as const).map((key) => {
      const rows = passageReports
        .map((report) => report.auxFuel.find((row) => row.key === key))
        .filter((row): row is MvGemiaAuxSummaryRow => !!row);
      return {
        key,
        label: rows[0]?.label || `${key} A/E`,
        runningHours: rows.reduce((sum, row) => sum + row.runningHours, 0),
        fuelUsed: rows.reduce((sum, row) => sum + row.fuelUsed, 0),
      } satisfies MvGemiaAuxSummaryRow;
    });
    const passageDistanceNm = passageReports.reduce((sum, report) => sum + report.distanceNm, 0);
    const passageAverageSpeedWeight = passageReports.reduce(
      (sum, report) => sum + (report.averageSpeed !== null ? Math.max(report.distanceNm, 0.01) : 0),
      0,
    );
    const passageSummary: MvGemiaPassageSummary = {
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
    const tracking: MvGemiaTrackingSummary = {
      begin: reports.find((report) => !!report.tracking.begin)?.tracking.begin || null,
      end: [...reports].reverse().find((report) => !!report.tracking.end)?.tracking.end || null,
      distanceNm: reports.reduce((sum, report) => sum + report.tracking.distanceNm, 0),
      route,
    };

    const hourly = Array.from({ length: 24 }, (_, hour): MvGemiaHourlyRow => {
      const rows = reports
        .map((report) => report.hourly.find((row) => row.hour === hour))
        .filter((row): row is MvGemiaHourlyRow => !!row && row.active);
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
          portMainRunningHours: null,
          centerMainRunningHours: null,
          starboardMainRunningHours: null,
          portAuxRunningHours: null,
          centerAuxRunningHours: null,
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

      const sumNullable = (selector: (row: MvGemiaHourlyRow) => number | null): number =>
        rows.reduce((sum, row) => sum + (selector(row) || 0), 0);
      const averageNullable = (selector: (row: MvGemiaHourlyRow) => number | null): number | null => {
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
        portMainRunningHours: sumNullable((row) => row.portMainRunningHours),
        centerMainRunningHours: sumNullable((row) => row.centerMainRunningHours),
        starboardMainRunningHours: sumNullable((row) => row.starboardMainRunningHours),
        portAuxRunningHours: sumNullable((row) => row.portAuxRunningHours),
        centerAuxRunningHours: sumNullable((row) => row.centerAuxRunningHours),
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
    const dailyTrend: MvGemiaDailyTrendRow[] = reports.map((report) => ({
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
      hourly: periodKind === 'month' ? buildMonthlyDailySlots(reports, periodStart) : hourly,
      speedSeries,
    };
  }

  private buildDetailedDailyReport(
    response: any,
    periodStart: Date,
    periodEnd: Date,
  ): MvGemiaDailyUiReport {
    const series = this.extractHistorianSeries(response, ALL_TAGS);
    const minuteStart = this.floorToMinute(periodStart).getTime();
    const reportMinuteEnd = Math.max(minuteStart + MINUTE_MS, this.floorToMinute(periodEnd).getTime());
    const completedDaily = isCompletedDailyWindow(
      this.floorToMinute(periodStart),
      this.floorToMinute(periodEnd),
      MINUTE_MS,
    );
    const dataMinuteEnd = completedDaily
      ? minuteStart + 24 * 60 * MINUTE_MS
      : reportMinuteEnd;
    const minuteCount = Math.max(1, Math.floor((reportMinuteEnd - minuteStart) / MINUTE_MS) + 1);

    const gpsSpeed = this.buildInstantMap(series.get(this.tagKey(TAGS.gpsSpeed)) || []);
    const gpsLat = this.buildInstantMap(series.get(this.tagKey(TAGS.gpsLat)) || []);
    const gpsLong = this.buildInstantMap(series.get(this.tagKey(TAGS.gpsLong)) || []);
    const gpsHead = this.buildInstantMap(series.get(this.tagKey(TAGS.gpsHead)) || []);
    const modeCodePoints = series.get(this.tagKey(TAGS.mode)) || [];
    const modeCode = completedDaily
      ? buildExactMinuteValueMap(modeCodePoints, MINUTE_MS)
      : this.buildInstantMap(modeCodePoints);

    const directOrCounter = (
      calculatedTag: string,
      rawTag: string,
      pulse: number,
      maxRpm: number,
    ): Map<number, number> => {
      const calculated = series.get(this.tagKey(calculatedTag)) || [];
      if (calculated.length > 0) {
        return this.buildDirectValueMap(calculated, 0, maxRpm);
      }
      return this.buildCounterRateMap(series.get(this.tagKey(rawTag)) || [], pulse, maxRpm);
    };

    // PDF parity rule for MV GEMIA page 1 / hourly machinery:
    // *_SPD_CALC is the authoritative M/E RPM source. The lower-scale raw
    // *_SPD channel belongs to the legacy Mode-detail pages and is NOT a
    // replacement for page-1 RPM. Mixing or scale-switching between the two
    // channels is what caused historical days (for example 03-Oct) to show
    // ~460 RPM on the UI while the PDF shows ~700 RPM.
    //
    // Only when the calculated channel is completely unavailable do we fall
    // back to raw speed x30 so an old archive can still render something.
    // We deliberately do not merge isolated raw minutes into a non-empty
    // calculated series because that changes Average/Max RPM and Running Hours.
    const mainEngineRpmForReport = (
      calculatedTag: string,
      rawTag: string,
      maxRpm: number,
    ): Map<number, number> => {
      const calculated = this.buildDirectValueMap(
        series.get(this.tagKey(calculatedTag)) || [],
        0,
        maxRpm,
      );
      if (calculated.size > 0) return calculated;

      const rawDirect = this.buildDirectValueMap(
        series.get(this.tagKey(rawTag)) || [],
        0,
        Math.max(100, maxRpm / 30),
      );
      const rawScaled = new Map<number, number>();
      rawDirect.forEach((value, bucket) => {
        const rpm = value * 30;
        if (Number.isFinite(rpm) && rpm >= 0 && rpm <= maxRpm) rawScaled.set(bucket, rpm);
      });
      return rawScaled;
    };

    const auxRpmWithRawFallback = (
      calculatedTag: string,
      rawTag: string,
      pulse: number,
      maxRpm: number,
    ): Map<number, number> => {
      const calculated = this.buildDirectValueMap(
        series.get(this.tagKey(calculatedTag)) || [],
        0,
        maxRpm,
      );
      const rawCounter = this.buildCounterRateMap(
        series.get(this.tagKey(rawTag)) || [],
        pulse,
        maxRpm,
      );
      if (calculated.size === 0) return rawCounter;
      if (rawCounter.size === 0) return calculated;

      // Keep *_SPD_CALC authoritative, but close isolated archive holes from the
      // raw counter. This matters for A/E Running Hours on days where the PDF has
      // a complete counter trace but the calculated channel drops a few minutes.
      const merged = new Map(calculated);
      rawCounter.forEach((value, bucket) => {
        if (!merged.has(bucket)) merged.set(bucket, value);
      });
      return merged;
    };

    const pmeRpm = mainEngineRpmForReport(TAGS.pmeSpeedCalc, TAGS.pmeSpeed, 3000);
    const smeRpm = mainEngineRpmForReport(TAGS.smeSpeedCalc, TAGS.smeSpeed, 3000);
    const ppsRpm = directOrCounter(TAGS.ppsSpeedCalc, TAGS.ppsSpeed, 10, 1200);
    const spsRpm = directOrCounter(TAGS.spsSpeedCalc, TAGS.spsSpeed, 10, 1200);
    const paeRpm = auxRpmWithRawFallback(TAGS.paeSpeedCalc, TAGS.paeSpeed, 2, 4000);
    const caeRpm = auxRpmWithRawFallback(TAGS.caeSpeedCalc, TAGS.caeSpeed, 2, 4000);
    const saeRpm = auxRpmWithRawFallback(TAGS.saeSpeedCalc, TAGS.saeSpeed, 2, 4000);

    // The MV GEMIA legacy Mode-detail pages display the raw M/E speed channel
    // (roughly 0..30) while page 1/hourly machinery uses *_SPD_CALC in RPM.
    // Preserve that report quirk when raw speed is available; if an archive only
    // retains calculated RPM, scale it by the known 30 factor as a safe fallback.
    const modeDisplaySpeed = (rawTag: string, calculated: Map<number, number>): Map<number, number> => {
      const raw = this.buildDirectValueMap(series.get(this.tagKey(rawTag)) || [], 0, 100);
      if (raw.size > 0) return raw;
      return new Map(
        Array.from(calculated.entries()).map(([bucket, value]) => [bucket, value / 30]),
      );
    };
    const pmeModeSpeed = modeDisplaySpeed(TAGS.pmeSpeed, pmeRpm);
    const smeModeSpeed = modeDisplaySpeed(TAGS.smeSpeed, smeRpm);

    const fuelForReport = (
      todayTag: string,
      inTag: string,
      outTag: string,
      totalizerMaxDelta = 1000,
    ): Map<number, number> => {
      const inputPoints = series.get(this.tagKey(inTag)) || [];
      const outputPoints = series.get(this.tagKey(outTag)) || [];
      const todayPoints = series.get(this.tagKey(todayTag)) || [];

      // The official MV GEMIA PDF's Page-1 fuel totals and Mode fuel agree with
      // FIN/FOUT accounting. Keep the existing 1000 L/min acceptance for the
      // channels already matching PDF, but allow an engine-specific limit for a
      // noisy totalizer. SC BONGKOT's minute fuel path uses 300 L/min; applying
      // that stricter limit only to GEMIA's Thruster A/E avoids changing the four
      // channels that already match the PDF on both 03-Oct and 04-Oct.
      if (completedDaily && (inputPoints.length > 1 || outputPoints.length > 1)) {
        const totalizerFuel = this.buildFuelMap(inputPoints, outputPoints, totalizerMaxDelta);
        if (totalizerFuel.size > 0) return totalizerFuel;
      }

      if (todayPoints.length > 1) {
        return this.buildDailyConsumptionDeltaMap(todayPoints, 2000);
      }
      return this.buildFuelMap(inputPoints, outputPoints, totalizerMaxDelta);
    };

    const pmeFuel = fuelForReport(TAGS.pmeFuelToday, TAGS.pmeFuelIn, TAGS.pmeFuelOut);
    const smeFuel = fuelForReport(TAGS.smeFuelToday, TAGS.smeFuelIn, TAGS.smeFuelOut);
    const paeFuel = fuelForReport(TAGS.paeFuelToday, TAGS.paeFuelIn, TAGS.paeFuelOut);
    const caeFuel = fuelForReport(TAGS.caeFuelToday, TAGS.caeFuelIn, TAGS.caeFuelOut, 300);
    const saeFuel = fuelForReport(TAGS.saeFuelToday, TAGS.saeFuelIn, TAGS.saeFuelOut);

    // Controlled SC BONGKOT compatibility trial for the one MV GEMIA channel that
    // still differs from the supplied PDFs: Thruster A/E. BONGKOT page 1 does not
    // sum every positive post-reset minute delta; it scans exact-minute FIN/FOUT
    // totalizers and uses the accepted daily spans. This prevents a mid-day reset
    // or duplicated archive segment from being counted twice. Do NOT apply this
    // to the other GEMIA engines: their current Page-1 fuel already matches PDF.
    const bongkotCompatibleDailyFuelRule = {
      input: { totalRangeLimit: 26_000, stepLimit: 20_000, stepInclusive: false, initialValueLimit: 100_000_000 },
      output: { totalRangeLimit: 26_000, stepLimit: 20_000, stepInclusive: true, initialValueLimit: 100_000_000 },
      ignoredValues: [999_999],
      clampNegative: true,
    } as const;
    const caeInputExact = exactMinutePoints(
      series.get(this.tagKey(TAGS.caeFuelIn)) || [],
      minuteStart,
      dataMinuteEnd,
    );
    const caeOutputExact = exactMinutePoints(
      series.get(this.tagKey(TAGS.caeFuelOut)) || [],
      minuteStart,
      dataMinuteEnd,
    );
    const caeBongkotDailyFuel = calculateLegacyDailyFuelTotal(
      caeInputExact,
      caeOutputExact,
      bongkotCompatibleDailyFuelRule,
    );
    const caePage1Fuel =
      completedDaily &&
      caeInputExact.length >= 2 &&
      caeOutputExact.length >= 2 &&
      Number.isFinite(caeBongkotDailyFuel) &&
      caeBongkotDailyFuel >= 0
        ? caeBongkotDailyFuel
        : this.sumMap(caeFuel);

    const pdfModeFuel = (
      todayTag: string,
      inTag: string,
      outTag: string,
    ): Map<number, number> => {
      const inputPoints = series.get(this.tagKey(inTag)) || [];
      const outputPoints = series.get(this.tagKey(outTag)) || [];
      const todayPoints = series.get(this.tagKey(todayTag)) || [];

      // Mode percentages must come from the same minute fuel source as the PDF.
      // Prefer FIN/FOUT for a completed Daily report so a CONS_TODAY reset cannot
      // move a large false delta into whichever Mode happens to own that minute.
      if (completedDaily && (inputPoints.length > 1 || outputPoints.length > 1)) {
        const totalizerModeFuel = buildLegacyPdfFuelDeltaMap(
          inputPoints,
          outputPoints,
          { supplyMaxDelta: 1000, returnMaxDelta: 1000, recoverAfterRejectedJump: true },
        );
        if (totalizerModeFuel.size > 0) return totalizerModeFuel;
      }

      if (todayPoints.length > 1) {
        return this.buildDailyConsumptionDeltaMap(todayPoints, 2000, false);
      }
      return buildLegacyPdfFuelDeltaMap(
        inputPoints,
        outputPoints,
        { supplyMaxDelta: 1000, returnMaxDelta: 1000, recoverAfterRejectedJump: true },
      );
    };

    const pmePdfModeFuel = pdfModeFuel(TAGS.pmeFuelToday, TAGS.pmeFuelIn, TAGS.pmeFuelOut);
    const smePdfModeFuel = pdfModeFuel(TAGS.smeFuelToday, TAGS.smeFuelIn, TAGS.smeFuelOut);
    const paePdfModeFuel = pdfModeFuel(TAGS.paeFuelToday, TAGS.paeFuelIn, TAGS.paeFuelOut);
    const caePdfModeFuel = pdfModeFuel(TAGS.caeFuelToday, TAGS.caeFuelIn, TAGS.caeFuelOut);
    const saePdfModeFuel = pdfModeFuel(TAGS.saeFuelToday, TAGS.saeFuelIn, TAGS.saeFuelOut);

    // Legacy utilization divides by the nominal report length (24 h for a full
    // Daily Report), not by the extra next-day 00:00 sample.
    const elapsedHours = Math.max(
      MINUTE_MS / 3_600_000,
      (reportMinuteEnd - minuteStart + MINUTE_MS) / 3_600_000,
    );
    const engineSummary: MvGemiaEngineSummaryRow[] = [
      this.buildEngineSummary('port', 'Port M/E', pmeRpm, pmeFuel, elapsedHours),
      this.buildEngineSummary('starboard', 'Stb. M/E', smeRpm, smeFuel, elapsedHours),
    ];

    const shaftSummary: MvGemiaShaftSummaryRow[] = [
      this.buildShaftSummary('port', 'Port Shaft', ppsRpm, pmeRpm),
      this.buildShaftSummary('starboard', 'Stb. Shaft', spsRpm, smeRpm),
    ];

    const auxSummary: MvGemiaAuxSummaryRow[] = [
      this.buildAuxSummary('port', 'Port A/E', paeRpm, paeFuel, minuteStart, reportMinuteEnd),
      {
        ...this.buildAuxSummary('center', 'Thruster A/E', caeRpm, caeFuel, minuteStart, reportMinuteEnd),
        fuelUsed: caePage1Fuel,
      },
      this.buildAuxSummary('starboard', 'Stb. A/E', saeRpm, saeFuel, minuteStart, reportMinuteEnd),
    ];

    const mainEngineFuelTotal = engineSummary.reduce((sum, row) => sum + row.fuelUsed, 0);
    const auxiliaryFuelTotal = auxSummary.reduce((sum, row) => sum + row.fuelUsed, 0);
    const totalFuelUsed = mainEngineFuelTotal + auxiliaryFuelTotal;

    const portEngine = engineSummary.find((row) => row.key === 'port')!;
    const starboardEngine = engineSummary.find((row) => row.key === 'starboard')!;
    const portShaft = shaftSummary.find((row) => row.key === 'port')!;
    const starboardShaft = shaftSummary.find((row) => row.key === 'starboard')!;
    const utilization: MvGemiaUtilizationRow[] = [
      {
        label: 'M/E Engine Utilized (%)',
        port: this.percent(portEngine.runningHours, elapsedHours),
        center: Number.NaN,
        starboard: this.percent(starboardEngine.runningHours, elapsedHours),
      },
      {
        label: 'Shaft Utilized (%)',
        port: this.percent(portShaft.runningHours, elapsedHours),
        center: Number.NaN,
        starboard: this.percent(starboardShaft.runningHours, elapsedHours),
      },
      {
        label: 'Shaft per M/E Engine Utilized (%)',
        port: this.ratioPercent(portShaft.runningHours, portEngine.runningHours),
        center: Number.NaN,
        starboard: this.ratioPercent(starboardShaft.runningHours, starboardEngine.runningHours),
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
      portMainRunMinutes: 0,
      centerMainRunMinutes: 0,
      starboardMainRunMinutes: 0,
      portAuxRunMinutes: 0,
      centerAuxRunMinutes: 0,
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

    const modeMap = new Map<string, MvGemiaModeSummaryRow>();
    for (const mode of MV_GEMIA_REPORT_PROFILE.modes) {
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

    // Keep the exact minute membership of every direct MV GEMIA operating mode.
    // The compact web detail card then follows the dominant active PDF mode instead
    // of always showing an arbitrary Underway bucket.
    const modeMinuteKeys = new Map<string, number[]>();
    MV_GEMIA_REPORT_PROFILE.modes.forEach((mode) => modeMinuteKeys.set(mode.key, []));
    let gpsAvailableMinutes = 0;
    let modeAvailableMinutes = 0;

    for (let bucket = minuteStart; bucket <= dataMinuteEnd; bucket += MINUTE_MS) {
      const isExtraMidnightSample = completedDaily && bucket > reportMinuteEnd;
      // The legacy report includes 00:00 of the following day in the last machinery
      // running-hour bucket. Navigation/distance, however, stops at 23:59.
      const hour = isExtraMidnightSample ? 23 : new Date(bucket).getHours();
      const hourData = hourlyAccumulators[hour];

      const speedValue = gpsSpeed.get(bucket);
      const speed =
        speedValue !== undefined && Number.isFinite(speedValue) ? Math.max(0, speedValue) : null;
      if (speed !== null && !isExtraMidnightSample) {
        gpsAvailableMinutes += 1;
        hourData.speedSum += speed;
        hourData.speedCount += 1;
      }
      const distance = speed !== null && !isExtraMidnightSample ? speed / 60 : 0;
      hourData.distanceNm += distance;

      const pmeMinuteFuel = pmeFuel.get(bucket) || 0;
      const smeMinuteFuel = smeFuel.get(bucket) || 0;
      const paeMinuteFuel = paeFuel.get(bucket) || 0;
      const caeMinuteFuel = caeFuel.get(bucket) || 0;
      const saeMinuteFuel = saeFuel.get(bucket) || 0;
      const mainFuel = pmeMinuteFuel + smeMinuteFuel;
      const auxFuel = paeMinuteFuel + caeMinuteFuel + saeMinuteFuel;
      const minuteFuel = mainFuel + auxFuel;

      hourData.portMainFuel += pmeMinuteFuel;
      hourData.starboardMainFuel += smeMinuteFuel;
      hourData.portAuxFuel += paeMinuteFuel;
      hourData.centerAuxFuel += caeMinuteFuel;
      hourData.starboardAuxFuel += saeMinuteFuel;
      hourData.mainFuel += mainFuel;
      hourData.auxFuel += auxFuel;

      const pme = pmeRpm.get(bucket) || 0;
      const sme = smeRpm.get(bucket) || 0;
      const pae = paeRpm.get(bucket) || 0;
      const cae = caeRpm.get(bucket) || 0;
      const sae = saeRpm.get(bucket) || 0;
      const pps = ppsRpm.get(bucket) || 0;
      const sps = spsRpm.get(bucket) || 0;
      const rawModeCode = modeCode.get(bucket);

      const hasMinuteTelemetry =
        speed !== null ||
        rawModeCode !== undefined ||
        pmeFuel.has(bucket) ||
        smeFuel.has(bucket) ||
        paeFuel.has(bucket) ||
        caeFuel.has(bucket) ||
        saeFuel.has(bucket) ||
        pmeRpm.has(bucket) ||
        smeRpm.has(bucket) ||
        paeRpm.has(bucket) ||
        caeRpm.has(bucket) ||
        saeRpm.has(bucket) ||
        ppsRpm.has(bucket) ||
        spsRpm.has(bucket);
      if (hasMinuteTelemetry) {
        hourData.active = true;
      }

      // Legacy MvGemia M/E running hours use >=100 RPM; A/E counts any positive counter movement.
      if (pme >= 100 || (!pmeRpm.has(bucket) && pmeMinuteFuel > 0)) hourData.portMainRunMinutes += 1;
      if (sme >= 100 || (!smeRpm.has(bucket) && smeMinuteFuel > 0)) hourData.starboardMainRunMinutes += 1;
      if (pae > 0 || (!paeRpm.has(bucket) && paeMinuteFuel > 0)) hourData.portAuxRunMinutes += 1;
      if (cae > 0 || (!caeRpm.has(bucket) && caeMinuteFuel > 0)) hourData.centerAuxRunMinutes += 1;
      if (sae > 0 || (!saeRpm.has(bucket) && saeMinuteFuel > 0)) hourData.starboardAuxRunMinutes += 1;
      if (pps > 0 && pme > 0) hourData.portShaftRunMinutes += 1;
      if (sps > 0 && sme > 0) hourData.starboardShaftRunMinutes += 1;

      if (pps > 0) {
        hourData.portShaftRpmSum += pps;
        hourData.portShaftRpmCount += 1;
      }
      if (sps > 0) {
        hourData.starboardShaftRpmSum += sps;
        hourData.starboardShaftRpmCount += 1;
      }

      const modeLabel = this.resolveModeFromCode(rawModeCode);
      if (modeLabel) {
        modeAvailableMinutes += 1;
        const modeKey = this.resolveModeProfileKey(modeLabel);
        const mode = modeMap.get(modeKey);
        if (mode) {
          const pdfModeMinuteFuel = (pmePdfModeFuel.get(bucket) || 0) + (smePdfModeFuel.get(bucket) || 0) + (paePdfModeFuel.get(bucket) || 0) + (caePdfModeFuel.get(bucket) || 0) + (saePdfModeFuel.get(bucket) || 0);
          mode.fuelUsed += pdfModeMinuteFuel;
          mode.runningHours += 1 / 60;
          mode.distanceNm += distance;
        }
        modeMinuteKeys.get(modeKey)?.push(bucket);
      }
    }

    const rawModeFuelTotal = Array.from(modeMap.values()).reduce((sum, row) => sum + row.fuelUsed, 0);
    const observedModeHours = Math.max(0, modeAvailableMinutes / 60);
    const rawModeSummary = MV_GEMIA_REPORT_PROFILE.modes.map((profileMode) => {
      const row = modeMap.get(profileMode.key)!;
      // MV GEMIA and SC BONGKOT share the same direct 1..15 mode mapping, but
      // their engine/fuel topology is different. Keep GEMIA's verified Mode-minute
      // membership here; Page-1 total correction below is propagated through the
      // existing normalization instead of copying BONGKOT's four-A/E engine model.
      // Percentages are calculated against fuel observed while Mode > 0.
      const fuelUsed = row.fuelUsed;
      const fuelPercent = rawModeFuelTotal > 0 ? (fuelUsed / rawModeFuelTotal) * 100 : 0;
      const runningPercent =
        observedModeHours > 0 ? (row.runningHours / observedModeHours) * 100 : 0;
      return {
        ...row,
        fuelUsed,
        fuelPercent,
        runningPercent,
        litresPerNm: row.distanceNm > 0 ? fuelUsed / row.distanceNm : null,
        litresPerHour: row.runningHours > 0 ? fuelUsed / row.runningHours : null,
      };
    });
    const modeSummary = normalizeModeFuelToOfficialTotal<MvGemiaModeSummaryRow>(
      rawModeSummary,
      totalFuelUsed,
      {
        // MV GEMIA uses the same 15-mode PDF table/layout as the Emerald family.
        // The supplied legacy source archive does not contain a Gemia C# class,
        // so the PDF remains the authority for this compatibility branch.
        residualModeKey: 'standby',
        residualFuelPercent: true,
        residualRunningHours: true,
        residualRunningPercent: true,
        distanceFromDisplayedHours: true,
        legacySinglePrecision: true,
      },
    );

    const modeDetails: MvGemiaModeDetail[] = modeSummary.map((mode) => {
      const rawSummary = this.buildPassageSummary(
        modeMinuteKeys.get(mode.key) || [],
        pmeRpm,
        smeRpm,
        pmeModeSpeed,
        smeModeSpeed,
        ppsRpm,
        spsRpm,
        paeRpm,
        caeRpm,
        saeRpm,
        pmePdfModeFuel,
        smePdfModeFuel,
        paePdfModeFuel,
        caePdfModeFuel,
        saePdfModeFuel,
        gpsSpeed,
      );
      return {
        key: mode.key,
        label: mode.label,
        summary: scaleModeDetailFuelToTarget(rawSummary, mode.fuelUsed),
      };
    });

    const dominantMode = [...modeSummary].sort(
      (left, right) =>
        Math.abs(right.fuelUsed) - Math.abs(left.fuelUsed) ||
        right.runningHours - left.runningHours ||
        left.label.localeCompare(right.label),
    )[0];
    const passageSummary =
      modeDetails.find((detail) => detail.key === dominantMode?.key)?.summary ||
      this.buildPassageSummary(
        [],
        pmeRpm, smeRpm, pmeModeSpeed, smeModeSpeed, ppsRpm, spsRpm,
        paeRpm, caeRpm, saeRpm, pmePdfModeFuel, smePdfModeFuel, paePdfModeFuel, caePdfModeFuel, saePdfModeFuel, gpsSpeed,
      );

    const tracking = this.buildTrackingSummary(
      minuteStart,
      dataMinuteEnd,
      gpsLat,
      gpsLong,
      gpsSpeed,
      gpsHead,
      reportMinuteEnd,
    );

    const hourly = hourlyAccumulators.map((item, hour): MvGemiaHourlyRow => {
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
          centerAuxFuel: null,
          starboardAuxFuel: null,
          portMainRunningHours: null,
          centerMainRunningHours: null,
          starboardMainRunningHours: null,
          portAuxRunningHours: null,
          centerAuxRunningHours: null,
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
        centerMainFuel: 0,
        starboardMainFuel: item.starboardMainFuel,
        portAuxFuel: item.portAuxFuel,
        centerAuxFuel: item.centerAuxFuel,
        starboardAuxFuel: item.starboardAuxFuel,
        portMainRunningHours: item.portMainRunMinutes / 60,
        centerMainRunningHours: 0,
        starboardMainRunningHours: item.starboardMainRunMinutes / 60,
        portAuxRunningHours: item.portAuxRunMinutes / 60,
        centerAuxRunningHours: item.centerAuxRunMinutes / 60,
        starboardAuxRunningHours: item.starboardAuxRunMinutes / 60,
        portShaftRunningHours: item.portShaftRunMinutes / 60,
        centerShaftRunningHours: 0,
        starboardShaftRunningHours: item.starboardShaftRunMinutes / 60,
        portShaftRpm:
          item.portShaftRpmCount > 0 ? item.portShaftRpmSum / item.portShaftRpmCount : 0,
        centerShaftRpm: 0,
        starboardShaftRpm:
          item.starboardShaftRpmCount > 0
            ? item.starboardShaftRpmSum / item.starboardShaftRpmCount
            : 0,
        totalFuel: item.mainFuel + item.auxFuel,
      };
    });

    const speedSeries = this.downsampleSpeedSeries(gpsSpeed, minuteStart, reportMinuteEnd, 1600);
    const validSpeedValues = Array.from(gpsSpeed.entries())
      .filter(
        ([bucket, value]) =>
          bucket >= minuteStart && bucket <= reportMinuteEnd && value >= 0 && Number.isFinite(value),
      )
      .map(([, value]) => value);

    return {
      periodStart: new Date(minuteStart),
      periodEnd: new Date(reportMinuteEnd),
      loadedAt: new Date(),
      coveragePercent: Math.max(0, Math.min(100, (gpsAvailableMinutes / minuteCount) * 100)),
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
      modeDetails,
      tracking,
      hourly,
      speedSeries,
    };
  }

  private buildEngineSummary(
    key: MvGemiaEngineSummaryRow['key'],
    label: string,
    rpmMap: Map<number, number>,
    fuelMap: Map<number, number>,
    _elapsedHours: number,
  ): MvGemiaEngineSummaryRow {
    const rpmValues = Array.from(rpmMap.values()).filter((value) => value >= 0 && value <= 2000);
    // Page-1 M/E Running Hours come from the same calculated RPM series used
    // for Average/Max RPM. Fuel movement must not create a running minute when
    // the RPM source is absent (02-Oct is the clearest case: Port M/E has fuel
    // movement but the official PDF reports 0.00 running hour and 0 RPM).
    const runningMinutes = Array.from(rpmMap.values()).filter((value) => value >= 100).length;
    return {
      key,
      label,
      averageRpm: this.average(rpmValues.filter((value) => value > 0)),
      maximumRpm: this.maximum(rpmValues),
      runningHours: runningMinutes / 60,
      fuelUsed: this.sumMap(fuelMap),
    };
  }

  private buildShaftSummary(
    key: MvGemiaShaftSummaryRow['key'],
    label: string,
    rpmMap: Map<number, number>,
    mainEngineRpm: Map<number, number>,
  ): MvGemiaShaftSummaryRow {
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
    key: MvGemiaAuxSummaryRow['key'],
    label: string,
    rpmMap: Map<number, number>,
    fuelMap: Map<number, number>,
    rangeStart?: number,
    rangeEnd?: number,
  ): MvGemiaAuxSummaryRow {
    // MvGemia CalSpeedAESummary counts any positive speed/counter movement as
    // running. If that minute's calculated speed is missing, accepted raw-counter
    // movement can close the archive hole. Page-1 A/E Running Hours are scoped to
    // 00:00..23:59; unlike M/E/mode accounting they do not count next-day 00:00.
    const inRange = (bucket: number) =>
      (rangeStart === undefined || bucket >= rangeStart) &&
      (rangeEnd === undefined || bucket <= rangeEnd);
    const runningBuckets = new Set<number>();
    rpmMap.forEach((value, bucket) => {
      if (inRange(bucket) && value > 0) runningBuckets.add(bucket);
    });
    fuelMap.forEach((value, bucket) => {
      if (inRange(bucket) && !rpmMap.has(bucket) && value > 0) runningBuckets.add(bucket);
    });
    const runningMinutes = runningBuckets.size;
    return {
      key,
      label,
      runningHours: runningMinutes / 60,
      fuelUsed: this.sumMap(fuelMap),
    };
  }

  private buildPassageSummary(
    minuteKeys: readonly number[],
    pmeRpm: Map<number, number>,
    smeRpm: Map<number, number>,
    pmeModeSpeed: Map<number, number>,
    smeModeSpeed: Map<number, number>,
    ppsRpm: Map<number, number>,
    spsRpm: Map<number, number>,
    paeRpm: Map<number, number>,
    caeRpm: Map<number, number>,
    saeRpm: Map<number, number>,
    pmeFuel: Map<number, number>,
    smeFuel: Map<number, number>,
    paeFuel: Map<number, number>,
    caeFuel: Map<number, number>,
    saeFuel: Map<number, number>,
    gpsSpeed: Map<number, number>,
  ): MvGemiaPassageSummary {
    const selectValues = (map: Map<number, number>, minExclusive = 0) =>
      minuteKeys
        .map((bucket) => map.get(bucket))
        .filter(
          (value): value is number =>
            value !== undefined && Number.isFinite(value) && value > minExclusive,
        );
    const selectCoupledShaftValues = (
      shaftMap: Map<number, number>,
      engineMap: Map<number, number>,
    ) =>
      minuteKeys
        .filter((bucket) => (shaftMap.get(bucket) || 0) > 0 && (engineMap.get(bucket) || 0) > 0)
        .map((bucket) => shaftMap.get(bucket)!)
        .filter((value) => Number.isFinite(value));
    const fuelFor = (map: Map<number, number>) =>
      minuteKeys.reduce((sum, bucket) => sum + (map.get(bucket) || 0), 0);
    const runningHoursForAux = (map: Map<number, number>) =>
      minuteKeys.reduce((sum, bucket) => sum + ((map.get(bucket) || 0) > 0 ? 1 / 60 : 0), 0);

    const pmeFuelValue = fuelFor(pmeFuel);
    const smeFuelValue = fuelFor(smeFuel);
    const paeFuelValue = fuelFor(paeFuel);
    const caeFuelValue = fuelFor(caeFuel);
    const saeFuelValue = fuelFor(saeFuel);
    const pmeModeValues = selectValues(pmeModeSpeed, 0);
    const smeModeValues = selectValues(smeModeSpeed, 0);
    const speedValues = minuteKeys.map((bucket) => {
      const value = gpsSpeed.get(bucket);
      return value !== undefined && Number.isFinite(value) && value >= 0 ? value : 0;
    });

    return {
      mainEngines: [
        {
          ...this.buildFilteredEngineSummary('port', 'Port M/E', pmeModeValues, pmeFuelValue, 0.000001),
          averageRpm: minuteKeys.length > 0 && pmeModeValues.length === 0 ? Number.NaN : this.average(pmeModeValues),
        },
        {
          ...this.buildFilteredEngineSummary('starboard', 'Stb. M/E', smeModeValues, smeFuelValue, 0.000001),
          averageRpm: minuteKeys.length > 0 && smeModeValues.length === 0 ? Number.NaN : this.average(smeModeValues),
        },
      ],
      shafts: [
        this.buildFilteredShaftSummary(
          'port',
          'Port Shaft',
          selectCoupledShaftValues(ppsRpm, pmeRpm),
        ),
        this.buildFilteredShaftSummary(
          'starboard',
          'Stb. Shaft',
          selectCoupledShaftValues(spsRpm, smeRpm),
        ),
      ],
      auxFuel: [
        {
          key: 'port',
          label: 'Port A/E',
          runningHours: runningHoursForAux(paeRpm),
          fuelUsed: paeFuelValue,
        },
        {
          key: 'center',
          label: 'Thruster A/E',
          runningHours: runningHoursForAux(caeRpm),
          fuelUsed: caeFuelValue,
        },
        {
          key: 'starboard',
          label: 'Stb. A/E',
          runningHours: runningHoursForAux(saeRpm),
          fuelUsed: saeFuelValue,
        },
      ],
      mainEngineFuelTotal: pmeFuelValue + smeFuelValue,
      auxiliaryFuelTotal: paeFuelValue + caeFuelValue + saeFuelValue,
      averageSpeed: this.average(speedValues),
      distanceNm: speedValues.reduce((sum, speed) => sum + speed / 60, 0),
    };
  }

  private buildFilteredEngineSummary(
    key: MvGemiaEngineSummaryRow['key'],
    label: string,
    rpmValues: number[],
    fuelUsed: number,
    runningThreshold = 100,
  ): MvGemiaEngineSummaryRow {
    const runningHours = rpmValues.filter((value) => value >= runningThreshold).length / 60;
    return {
      key,
      label,
      averageRpm: this.average(rpmValues),
      maximumRpm: this.maximum(rpmValues),
      runningHours,
      fuelUsed,
      utilizationPercent: this.percent(runningHours, 24),
    };
  }

  private buildFilteredShaftSummary(
    key: MvGemiaShaftSummaryRow['key'],
    label: string,
    rpmValues: number[],
  ): MvGemiaShaftSummaryRow {
    const runningHours = rpmValues.length / 60;
    return {
      key,
      label,
      averageRpm: this.average(rpmValues),
      maximumRpm: this.maximum(rpmValues),
      runningHours,
      utilizationPercent: this.percent(runningHours, 24),
    };
  }

  private buildTrackingSummary(
    minuteStart: number,
    minuteEnd: number,
    latitude: Map<number, number>,
    longitude: Map<number, number>,
    speed: Map<number, number>,
    heading: Map<number, number>,
    distanceEnd = minuteEnd,
  ): MvGemiaTrackingSummary {
    const route: MvGemiaTrackingPoint[] = [];
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
      .filter(([bucket, value]) => bucket >= minuteStart && bucket <= distanceEnd && value >= 0)
      .reduce((sum, [, value]) => sum + value / 60, 0);

    return {
      begin: route[0] || null,
      end: route[route.length - 1] || null,
      distanceNm,
      route: compactRoute,
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

  private buildDirectValueMap(
    points: readonly NumericPoint[],
    minimum: number,
    maximum: number,
  ): Map<number, number> {
    const result = new Map<number, number>();
    for (const point of points) {
      if (!Number.isFinite(point.value) || point.value < minimum || point.value > maximum) {
        continue;
      }
      result.set(this.floorToMinute(point.timestamp).getTime(), point.value);
    }
    return result;
  }

  /**
   * Convert MV GEMIA's cumulative *_CONS_TODAY historian values to minute fuel.
   * A negative delta is the normal midnight reset and is ignored.  Gaps are only
   * interpolated for whole-day/hourly totals; Mode attribution never invents fuel
   * inside a historian gap because that can assign consumption to the wrong mode.
   */
  private buildDailyConsumptionDeltaMap(
    points: readonly NumericPoint[],
    maxDeltaPerMinute = 2000,
    interpolateGaps = true,
  ): Map<number, number> {
    const result = new Map<number, number>();
    const sorted = [...points]
      .filter((point) => Number.isFinite(point.value) && point.value >= 0 && point.value !== 999999)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    for (let index = 1; index < sorted.length; index += 1) {
      const previous = sorted[index - 1];
      const current = sorted[index];
      const previousBucket = this.floorToMinute(previous.timestamp).getTime();
      const currentBucket = this.floorToMinute(current.timestamp).getTime();
      const gapMinutes = Math.round((currentBucket - previousBucket) / MINUTE_MS);
      if (gapMinutes < 1 || gapMinutes > MAX_INTERPOLATION_GAP_MINUTES) {
        continue;
      }

      // *_CONS_TODAY resets around midnight.  Never convert the reset into fuel.
      const delta = current.value - previous.value;
      if (!Number.isFinite(delta) || delta < 0) {
        continue;
      }
      const perMinute = delta / gapMinutes;
      if (!Number.isFinite(perMinute) || perMinute < 0 || perMinute > maxDeltaPerMinute) {
        continue;
      }

      if (!interpolateGaps) {
        if (gapMinutes === 1) {
          result.set(currentBucket, (result.get(currentBucket) || 0) + delta);
        }
        continue;
      }

      for (let minute = 1; minute <= gapMinutes; minute += 1) {
        const bucket = previousBucket + minute * MINUTE_MS;
        result.set(bucket, (result.get(bucket) || 0) + perMinute);
      }
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

  private isLegacyHistorianBundle(
    response: any,
  ): response is Array<{ __legacyTagName: string; __legacyResponse: any }> {
    return (
      Array.isArray(response) &&
      response.length > 0 &&
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

  /** Mirror SCReportingService TimeStamp.AddHours(7) for raw logger data. */
  private parseLegacyHistorianDate(value: any): Date | null {
    if (value === null || value === undefined || value === '') return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
    if (typeof value === 'number' && Number.isFinite(value)) return this.parseDate(value);

    const text = String(value).trim();
    const dotNet = /\/Date\(([-+]?\d+)/.exec(text);
    if (dotNet) {
      const date = new Date(Number(dotNet[1]));
      return Number.isNaN(date.getTime()) ? null : date;
    }
    if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(text)) return this.parseDate(text);

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
  ): MvGemiaSpeedPoint[] {
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
    source: readonly MvGemiaSpeedPoint[],
    maxPoints: number,
  ): MvGemiaSpeedPoint[] {
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

  private downsampleRoute(route: readonly MvGemiaTrackingPoint[], maxPoints: number): MvGemiaTrackingPoint[] {
    if (route.length <= maxPoints) return [...route];
    const step = Math.max(1, Math.ceil(route.length / maxPoints));
    const result = route.filter((_, index) => index % step === 0);
    const last = route[route.length - 1];
    if (result[result.length - 1] !== last) result.push(last);
    return result;
  }

  private resolveModeProfileKey(label: string): string {
    const normalized = this.normalizeIdentity(label);
    const mode = MV_GEMIA_REPORT_PROFILE.modes.find(
      (item) => this.normalizeIdentity(item.label) === normalized,
    );
    return mode?.key || MV_GEMIA_REPORT_PROFILE.modes[0].key;
  }

  private resolveModeFromCode(rawValue: unknown): string | null {
    const numeric = this.parseNumber(rawValue);
    if (numeric === null) return null;
    const code = legacyConvertToInt32(numeric);
    if (code === null || code < 1 || code > 15) return null;
    const mode = MV_GEMIA_REPORT_PROFILE.modes.find((item) =>
      (item.codes || []).some((candidate) => Number(candidate) === code),
    );
    return mode?.label || null;
  }

  private findCurrentTagValue(
    currentData: Record<string, any> | null | undefined,
    tagName: string,
  ): unknown {
    if (!currentData || typeof currentData !== 'object') return null;
    const target = this.tagKey(tagName);
    for (const [key, value] of Object.entries(currentData)) {
      if (this.tagKey(key) === target) {
        if (value && typeof value === 'object') {
          return (value as any).value ?? (value as any).Value ?? (value as any).data ?? value;
        }
        return value;
      }
    }
    return null;
  }

  private parseNumber(rawValue: unknown): number | null {
    if (rawValue === null || rawValue === undefined || rawValue === '') return null;
    const value = Number(String(rawValue).replace(/,/g, '').trim());
    return Number.isFinite(value) ? value : null;
  }

  private isMvGemiaProfile(id: unknown, aliases: unknown, prefixes: unknown): boolean {
    const candidates = [
      id,
      ...(Array.isArray(aliases) ? aliases : []),
      ...(Array.isArray(prefixes) ? prefixes : []),
    ];
    return candidates.some((value) => this.normalizeIdentity(value) === 'mvgemia');
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
    // Keep legacy PDF behaviour: a completed day can contain the next-day 00:00
    // machinery sample, so 24.02 h intentionally renders as 100.1% rather than
    // being clamped to 100%. Coverage gauges use their own bounded calculation.
    return Math.max(0, (value / total) * 100);
  }

  private ratioPercent(value: number, total: number): number {
    if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) return 0;
    return Math.max(0, (value / total) * 100);
  }
}
