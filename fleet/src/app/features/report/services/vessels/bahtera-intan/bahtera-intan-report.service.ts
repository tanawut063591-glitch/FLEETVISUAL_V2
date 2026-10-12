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
import { isCompletedDailyWindow, legacyConvertToInt32, roundPdf2 } from '../../common/pdf-mode-parity';
import {
  BAHTERA_INTAN_MODE_HISTORIAN_TAG,
  BAHTERA_INTAN_REPORT_PROFILE,
} from './bahtera-intan-report.profile';

export interface BahteraIntanEngineSummaryRow {
  key: 'port' | 'center' | 'starboard';
  label: string;
  averageRpm: number | null;
  maximumRpm: number | null;
  runningHours: number;
  fuelUsed: number;
}

export interface BahteraIntanShaftSummaryRow {
  key: 'port' | 'center' | 'starboard';
  label: string;
  averageRpm: number | null;
  maximumRpm: number | null;
  runningHours: number;
}

export interface BahteraIntanAuxSummaryRow {
  key: 'port' | 'center' | 'starboard' | 'fourth';
  label: string;
  runningHours: number;
  fuelUsed: number;
  averageRpm: number | null;
  maximumRpm: number | null;
  engineLoadKw?: number | null;
  utilizationPercent?: number;
}

export interface BahteraIntanUtilizationRow {
  label: string;
  port: number;
  center: number;
  starboard: number;
}

export interface BahteraIntanModeSummaryRow {
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

export interface BahteraIntanPassageSummary {
  mainEngines: BahteraIntanEngineSummaryRow[];
  shafts: BahteraIntanShaftSummaryRow[];
  auxFuel: BahteraIntanAuxSummaryRow[];
  mainEngineFuelTotal: number;
  auxiliaryFuelTotal: number;
  averageSpeed: number | null;
  distanceNm: number;
}

export interface BahteraIntanModeDetail {
  key: string;
  label: string;
  summary: BahteraIntanPassageSummary;
}

export interface BahteraIntanTrackingPoint {
  timestamp: Date;
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
}

export interface BahteraIntanTrackingSummary {
  begin: BahteraIntanTrackingPoint | null;
  end: BahteraIntanTrackingPoint | null;
  distanceNm: number;
  route: BahteraIntanTrackingPoint[];
}

export interface BahteraIntanHourlyRow {
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
  portAuxEngineLoad?: number | null;
  centerAuxEngineLoad?: number | null;
  starboardAuxEngineLoad?: number | null;
  fourthAuxEngineLoad?: number | null;
  portShaftRunningHours: number | null;
  centerShaftRunningHours: number | null;
  starboardShaftRunningHours: number | null;
  portShaftRpm: number | null;
  centerShaftRpm: number | null;
  starboardShaftRpm: number | null;
  totalFuel: number | null;
}

export interface BahteraIntanSpeedPoint {
  timestamp: Date;
  speed: number;
}

export interface BahteraIntanDailyUiReport {
  periodStart: Date;
  periodEnd: Date;
  loadedAt: Date;
  coveragePercent: number;
  averageSpeed: number | null;
  maximumSpeed: number | null;
  engineSummary: BahteraIntanEngineSummaryRow[];
  shaftSummary: BahteraIntanShaftSummaryRow[];
  auxSummary: BahteraIntanAuxSummaryRow[];
  utilization: BahteraIntanUtilizationRow[];
  mainEngineFuelTotal: number;
  auxiliaryFuelTotal: number;
  totalFuelUsed: number;
  modeSummary: BahteraIntanModeSummaryRow[];
  passageSummary: BahteraIntanPassageSummary;
  modeDetails?: BahteraIntanModeDetail[];
  tracking: BahteraIntanTrackingSummary;
  hourly: BahteraIntanHourlyRow[];
  speedSeries: BahteraIntanSpeedPoint[];
}

export type BahteraIntanUiPeriodKind = 'day' | 'range' | 'month';

export interface BahteraIntanDailyTrendRow {
  date: Date;
  totalFuelUsed: number;
  mainEngineFuelTotal: number;
  auxiliaryFuelTotal: number;
  distanceNm: number;
  coveragePercent: number;
  modeRunningHours: number;
}

export interface BahteraIntanPeriodUiReport extends BahteraIntanDailyUiReport {
  periodKind: BahteraIntanUiPeriodKind;
  dayCount: number;
  dailyTrend: BahteraIntanDailyTrendRow[];
}

interface NumericPoint {
  timestamp: Date;
  value: number;
}

interface ReportCacheEntry {
  value: BahteraIntanDailyUiReport;
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
  gpsSpeed: 'BB_INTAN-VES-GPS-SPEED',
  gpsLat: 'BB_INTAN-VES-GPS-LAT',
  gpsLong: 'BB_INTAN-VES-GPS-LONG',
  gpsHead: 'BB_INTAN-VES-GPS-HEAD',
  mode: 'BB_INTAN-VES-MODE',
  dg1FuelIn: 'BB_INTAN-DG1-FIN-VTOTAL',
  dg1FuelOut: 'BB_INTAN-DG1-FOUT-VTOTAL',
  dg2FuelIn: 'BB_INTAN-DG2-FIN-VTOTAL',
  dg2FuelOut: 'BB_INTAN-DG2-FOUT-VTOTAL',
  dg3FuelIn: 'BB_INTAN-DG3-FIN-VTOTAL',
  dg3FuelOut: 'BB_INTAN-DG3-FOUT-VTOTAL',
  dg4FuelIn: 'BB_INTAN-DG4-FIN-VTOTAL',
  dg4FuelOut: 'BB_INTAN-DG4-FOUT-VTOTAL',
  dg1LoadKw: 'BB_INTAN-DG1-GEN-LOAD-KW',
  dg2LoadKw: 'BB_INTAN-DG2-GEN-LOAD-KW',
  dg3LoadKw: 'BB_INTAN-DG3-GEN-LOAD-KW',
  dg4LoadKw: 'BB_INTAN-DG4-GEN-LOAD-KW',
} as const;

const ALL_TAGS = Object.values(TAGS);

function roundPdf1(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 10) / 10;
}


@Injectable({ providedIn: 'root' })
export class BahteraIntanReportService implements VesselReportAdapter {
  readonly id = 'bahtera-intan';
  readonly serviceLabel = 'BAHTERA INTAN Report Service';
  readonly profileLabel = BAHTERA_INTAN_REPORT_PROFILE.label;

  private readonly detailedReportCache = new Map<string, ReportCacheEntry>();
  private readonly detailedReportInFlight = new Map<string, Observable<BahteraIntanDailyUiReport>>();
  private readonly periodReportCache = new Map<string, { value: BahteraIntanPeriodUiReport; expiresAt: number }>();
  private readonly periodReportInFlight = new Map<string, Observable<BahteraIntanPeriodUiReport>>();
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
      return normalized === 'bahteraintan' || normalized === 'bbintan';
    });
  }

  prepareProfileDocument(baseDocument: LiveReportProfileDocument): LiveReportProfileDocument {
    const profiles = (baseDocument?.profiles || []).filter(
      (profile) => !this.isBahteraIntanProfile(profile?.id, profile?.aliases, profile?.prefixes),
    );

    return {
      ...baseDocument,
      profiles: [...profiles, BAHTERA_INTAN_REPORT_PROFILE],
    };
  }

  enhanceSnapshot(
    snapshot: LiveReportSnapshot,
    currentData: Record<string, any> | null | undefined,
  ): LiveReportSnapshot {
    const rawMode = this.findCurrentTagValue(currentData, BAHTERA_INTAN_MODE_HISTORIAN_TAG);
    const modeLabel = this.resolveModeFromCode(rawMode);

    if (!modeLabel) {
      return {
        ...snapshot,
        profileLabel: this.profileLabel,
        sourceReport: BAHTERA_INTAN_REPORT_PROFILE.sourceReport || snapshot.sourceReport,
        currentMode: null,
        currentModeRawValue: rawMode === null || rawMode === undefined ? null : String(rawMode),
        modeSourceTag: BAHTERA_INTAN_MODE_HISTORIAN_TAG,
        modeSource: 'unavailable',
        modeConfidence: null,
        modeReason: 'BAHTERA INTAN mode requires a valid BB_INTAN-VES-MODE value (1-16).',
        modes: BAHTERA_INTAN_REPORT_PROFILE.modes.map((mode) => ({
          key: mode.key,
          label: mode.label,
          isCurrent: false,
        })),
      };
    }

    return {
      ...snapshot,
      profileLabel: this.profileLabel,
      sourceReport: BAHTERA_INTAN_REPORT_PROFILE.sourceReport || snapshot.sourceReport,
      currentMode: modeLabel,
      currentModeRawValue: String(rawMode),
      modeSourceTag: BAHTERA_INTAN_MODE_HISTORIAN_TAG,
      modeSource: 'verified-tag',
      modeConfidence: 'high',
      modeReason: `Verified from ${BAHTERA_INTAN_MODE_HISTORIAN_TAG}: ${String(rawMode)} = ${modeLabel}.`,
      modes: BAHTERA_INTAN_REPORT_PROFILE.modes.map((mode) => ({
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
      sourceTag: BAHTERA_INTAN_MODE_HISTORIAN_TAG,
      eyebrow: 'BAHTERA INTAN DAILY REPORT',
      title: 'Mode Summary',
      description: 'Mode values are read directly from the BB_INTAN-VES-MODE historian tag.',
      qualityLabel: 'Verified · BB_INTAN-VES-MODE',
    };
  }

  resolveHistorianModeLabel(rawValue: unknown): string | null {
    return this.resolveModeFromCode(rawValue);
  }

  loadDetailedDailyReport(
    periodStart: Date,
    periodEnd: Date,
    force = false,
  ): Observable<BahteraIntanDailyUiReport> {
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
    const completedDaily =
      start.getHours() === 0 &&
      start.getMinutes() === 0 &&
      end.getHours() === 23 &&
      end.getMinutes() === 59 &&
      start.getFullYear() === end.getFullYear() &&
      start.getMonth() === end.getMonth() &&
      start.getDate() === end.getDate();
    // Legacy C# parity: Bahtera*.GenerateReport() requests completed daily
    // historian data only through 23:59 (endD.AddMinutes(-1)). GetRawData still
    // creates a 1,441st 00:00 row internally, but that row remains zero-filled.
    // Pulling the real next-day 00:00 sample changes FIN/FOUT totals, running
    // hours and average load, so never extend a completed Daily request here.
    const requestStartText = this.formatHistorianRequestTime(start);
    const requestEndText = this.formatHistorianRequestTime(end);
    const historianRequest$: Observable<any> = completedDaily
      ? this.newHttp.getConsistentPdfParityHistorianValues(
          requestStartText,
          requestEndText,
          requestTags,
        )
      : this.newHttp.getHistorianValues(requestStartText, requestEndText, requestTags);
    const request$ = historianRequest$      .pipe(
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
    periodKind: BahteraIntanUiPeriodKind = 'range',
    force = false,
  ): Observable<BahteraIntanPeriodUiReport> {
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
    reports: readonly BahteraIntanDailyUiReport[],
    periodStart: Date,
    periodEnd: Date,
    periodKind: BahteraIntanUiPeriodKind,
  ): BahteraIntanPeriodUiReport {
    if (reports.length === 0) {
      throw new Error('EMPTY_REPORT_PERIOD');
    }

    // Preserve the verified per-day report object for a completed Daily Report.
    // The detailed model already contains PDF-specific generator fields such as
    // engineLoadKw and utilizationPercent. Rebuilding a one-day result through
    // the generic period aggregator used to drop those optional fields, so the
    // UI displayed em-dashes even though the historian values were available.
    if (reports.length === 1) {
      const report = reports[0];
      const modeRunningHours = report.modeSummary.reduce(
        (sum, row) => sum + Math.max(0, Number(row.runningHours) || 0),
        0,
      );
      return {
        ...report,
        periodKind,
        dayCount: 1,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        loadedAt: new Date(),
        dailyTrend: [
          {
            date: new Date(report.periodStart),
            totalFuelUsed: report.totalFuelUsed,
            mainEngineFuelTotal: report.mainEngineFuelTotal,
            auxiliaryFuelTotal: report.auxiliaryFuelTotal,
            distanceNm: report.tracking.distanceNm,
            coveragePercent: report.coveragePercent,
            modeRunningHours,
          },
        ],
      };
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
        .filter((row): row is BahteraIntanEngineSummaryRow => !!row);
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
      } satisfies BahteraIntanEngineSummaryRow;
    });

    const shaftSummary: BahteraIntanShaftSummaryRow[] = [];

    const auxSummary = (['port', 'center', 'starboard', 'fourth'] as const).map((key) => {
      const rows = reports
        .map((report) => report.auxSummary.find((row) => row.key === key))
        .filter((row): row is BahteraIntanAuxSummaryRow => !!row);
      const runningHours = rows.reduce((sum, row) => sum + row.runningHours, 0);
      const fuelUsed = rows.reduce((sum, row) => sum + row.fuelUsed, 0);
      const loadRows = rows
        .map((row) => Number(row.engineLoadKw))
        .filter((value) => Number.isFinite(value) && value >= 0);
      const engineLoadKw = loadRows.length > 0
        ? loadRows.reduce((sum, value) => sum + value, 0) / loadRows.length
        : null;
      const utilizationPercent = fuelUsed >= 0.005 && totalElapsedHours > 0
        ? roundPdf1((runningHours / totalElapsedHours) * 100)
        : 0;
      return {
        key,
        label: rows[0]?.label || (key === 'fourth' ? 'A/E4' : `${key} A/E`),
        runningHours,
        fuelUsed,
        averageRpm: engineLoadKw,
        maximumRpm: null,
        engineLoadKw,
        utilizationPercent,
      } satisfies BahteraIntanAuxSummaryRow;
    });

    const mainEngineFuelTotal = 0;
    const auxiliaryFuelTotal = auxSummary.reduce((sum, row) => sum + row.fuelUsed, 0);
    const totalFuelUsed = mainEngineFuelTotal + auxiliaryFuelTotal;

    const portEngine = engineSummary.find((row) => row.key === 'port');
    const starboardEngine = engineSummary.find((row) => row.key === 'starboard');
    const utilization: BahteraIntanUtilizationRow[] = [
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
    const modeSummary = BAHTERA_INTAN_REPORT_PROFILE.modes.map((profileMode) => {
      const rows = reports
        .map((report) => report.modeSummary.find((row) => row.key === profileMode.key))
        .filter((row): row is BahteraIntanModeSummaryRow => !!row);
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
      } satisfies BahteraIntanModeSummaryRow;
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
        .filter((row): row is BahteraIntanEngineSummaryRow => !!row);
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
      } satisfies BahteraIntanEngineSummaryRow;
    });
    const passageShafts: BahteraIntanShaftSummaryRow[] = [];
    const passageAuxFuel = (['port', 'center', 'starboard', 'fourth'] as const).map((key) => {
      const rows = passageReports
        .map((report) => report.auxFuel.find((row) => row.key === key))
        .filter((row): row is BahteraIntanAuxSummaryRow => !!row);
      const runningHours = rows.reduce((sum, row) => sum + row.runningHours, 0);
      const fuelUsed = rows.reduce((sum, row) => sum + row.fuelUsed, 0);
      const loadRows = rows
        .map((row) => Number(row.engineLoadKw))
        .filter((value) => Number.isFinite(value) && value >= 0);
      const engineLoadKw = loadRows.length > 0
        ? loadRows.reduce((sum, value) => sum + value, 0) / loadRows.length
        : null;
      const utilizationPercent = fuelUsed >= 0.005 && totalElapsedHours > 0
        ? roundPdf1((runningHours / totalElapsedHours) * 100)
        : 0;
      return {
        key,
        label: rows[0]?.label || (key === 'fourth' ? 'A/E4' : `${key} A/E`),
        runningHours,
        fuelUsed,
        averageRpm: engineLoadKw,
        maximumRpm: null,
        engineLoadKw,
        utilizationPercent,
      } satisfies BahteraIntanAuxSummaryRow;
    });
    const passageDistanceNm = passageReports.reduce((sum, report) => sum + report.distanceNm, 0);
    const passageAverageSpeedWeight = passageReports.reduce(
      (sum, report) => sum + (report.averageSpeed !== null ? Math.max(report.distanceNm, 0.01) : 0),
      0,
    );
    const passageSummary: BahteraIntanPassageSummary = {
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
    const tracking: BahteraIntanTrackingSummary = {
      begin: reports.find((report) => !!report.tracking.begin)?.tracking.begin || null,
      end: [...reports].reverse().find((report) => !!report.tracking.end)?.tracking.end || null,
      distanceNm: reports.reduce((sum, report) => sum + report.tracking.distanceNm, 0),
      route,
    };

    const hourly = Array.from({ length: 24 }, (_, hour): BahteraIntanHourlyRow => {
      const rows = reports
        .map((report) => report.hourly.find((row) => row.hour === hour))
        .filter((row): row is BahteraIntanHourlyRow => !!row && row.active);
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

      const sumNullable = (selector: (row: BahteraIntanHourlyRow) => number | null): number =>
        rows.reduce((sum, row) => sum + (selector(row) || 0), 0);
      const averageNullable = (selector: (row: BahteraIntanHourlyRow) => number | null): number | null => {
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
    const dailyTrend: BahteraIntanDailyTrendRow[] = reports.map((report) => ({
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
  ): BahteraIntanDailyUiReport {
    const series = this.extractHistorianSeries(response, ALL_TAGS);
    const hasAnyHistorianSamples = Array.from(series.values()).some((points) => points.length > 0);
    const minuteStart = this.floorToMinute(periodStart).getTime();
    const minuteEnd = Math.max(minuteStart, this.floorToMinute(periodEnd).getTime());
    const completedDaily = isCompletedDailyWindow(
      this.floorToMinute(periodStart),
      this.floorToMinute(periodEnd),
      MINUTE_MS,
    );
    // Legacy SCReportingService builds 1,441 rows for a completed daily report:
    // 00:00 through the following day's 00:00, inclusive. For these generator
    // vessels the logger request itself ends at 23:59, so the final boundary row
    // intentionally remains zero-filled; keep it only to reproduce DataTable shape.
    const legacyDataEnd = completedDaily ? minuteStart + 24 * 60 * MINUTE_MS : minuteEnd;
    const minuteCount = Math.max(1, Math.floor((minuteEnd - minuteStart) / MINUTE_MS) + 1);

    // SCReportingService builds a fixed one-minute DataTable and uses exact DateTime
    // equality after the logger timestamp has been converted to Thai local time.
    // Therefore records with non-zero seconds/milliseconds must not be floored into a minute.
    const exact = (tag: string): Map<number, number> =>
      this.buildLegacyExactMinuteMap(series.get(this.tagKey(tag)) || [], minuteStart, legacyDataEnd);

    const gpsSpeed = exact(TAGS.gpsSpeed);
    const gpsLat = exact(TAGS.gpsLat);
    const gpsLong = exact(TAGS.gpsLong);
    const gpsHead = exact(TAGS.gpsHead);
    const modeCode = exact(TAGS.mode);

    const dgFuelIn = [exact(TAGS.dg1FuelIn), exact(TAGS.dg2FuelIn), exact(TAGS.dg3FuelIn), exact(TAGS.dg4FuelIn)];
    const dgFuelOut = [exact(TAGS.dg1FuelOut), exact(TAGS.dg2FuelOut), exact(TAGS.dg3FuelOut), exact(TAGS.dg4FuelOut)];
    const dgLoad = [exact(TAGS.dg1LoadKw), exact(TAGS.dg2LoadKw), exact(TAGS.dg3LoadKw), exact(TAGS.dg4LoadKw)];

    // Page 1 uses CalFLowTotalSME, which is intentionally different from the
    // minute delta model used on page 2. Keeping the two paths separate is
    // required to reproduce the legacy PDF exactly.
    const official = dgFuelIn.map((input, index) =>
      this.calculateLegacyOfficialFuel(input, dgFuelOut[index]),
    );
    const officialFuel = official.map((item) => item.fuelUsed);
    const officialRunHours = official.map((item) => item.runningHours);
    const officialEngineLoads = dgLoad.map((map) => this.calculateLegacyEngineLoad(map));
    const totalFuelUsed = officialFuel.reduce((sum, value) => sum + value, 0);

    const generatorKeys: Array<BahteraIntanAuxSummaryRow['key']> = ['port', 'center', 'starboard', 'fourth'];
    const generatorLabels = ['DG1', 'DG2', 'DG3', 'EG'];
    const auxSummary: BahteraIntanAuxSummaryRow[] = generatorKeys.map((key, index) => ({
      key,
      label: generatorLabels[index],
      runningHours: officialRunHours[index],
      fuelUsed: officialFuel[index],
      // Existing shared UI stores the secondary generator metric in averageRpm.
      // For BAHTERA INTAN the template relabels this as Engine Load (kW).
      averageRpm: officialEngineLoads[index],
      maximumRpm: null,
      engineLoadKw: officialEngineLoads[index],
      utilizationPercent: officialFuel[index] >= 0.005 ? roundPdf1((officialRunHours[index] / 24) * 100) : 0,
    }));

    const engineSummary: BahteraIntanEngineSummaryRow[] = [];
    const shaftSummary: BahteraIntanShaftSummaryRow[] = [];
    const mainEngineFuelTotal = 0;
    const auxiliaryFuelTotal = totalFuelUsed;
    const utilization: BahteraIntanUtilizationRow[] = [];

    const supplyDetail = dgFuelIn.map((map) => this.buildLegacyModeDeltaDetail(map));
    const returnDetail = dgFuelOut.map((map) => this.buildLegacyModeDeltaDetail(map));

    type ModeAccumulator = {
      samples: number;
      speedSum: number;
      engineFuel: number[];
      engineRunMinutes: number[];
      engineLoadSum: number[];
      engineLoadCount: number[];
      minuteKeys: number[];
    };
    const modeAcc = new Map<string, ModeAccumulator>();
    BAHTERA_INTAN_REPORT_PROFILE.modes.forEach((mode) => modeAcc.set(mode.key, {
      samples: 0,
      speedSum: 0,
      engineFuel: [0, 0, 0, 0],
      engineRunMinutes: [0, 0, 0, 0],
      engineLoadSum: [0, 0, 0, 0],
      engineLoadCount: [0, 0, 0, 0],
      minuteKeys: [],
    }));

    let modeRows = 0;
    for (let bucket = minuteStart; bucket <= legacyDataEnd; bucket += MINUTE_MS) {
      const modeLabel = this.resolveModeFromCode(modeCode.get(bucket));
      if (!modeLabel) continue;
      const key = this.resolveModeProfileKey(modeLabel);
      const acc = modeAcc.get(key);
      if (!acc) continue;
      acc.samples += 1;
      modeRows += 1;
      acc.minuteKeys.push(bucket);
      acc.speedSum = Math.fround(Math.fround(acc.speedSum) + Math.fround(gpsSpeed.get(bucket) || 0));
      for (let index = 0; index < 4; index += 1) {
        const supplied = supplyDetail[index].get(bucket);
        const returned = returnDetail[index].get(bucket);
        acc.engineFuel[index] += (supplied?.delta || 0) - (returned?.delta || 0);
        if (supplied?.runningAccepted) acc.engineRunMinutes[index] += 1;
        const load = dgLoad[index].get(bucket) || 0;
        if (load > 0 && load !== 999999) {
          acc.engineLoadSum[index] += load;
          acc.engineLoadCount[index] += 1;
        }
      }
    }

    // Legacy PDF clamps each generator's aggregate for a mode before summing
    // the mode total. Do not clamp each minute independently.
    const rawFuelByMode = new Map<string, number>();
    let rawModeFuelTotal = 0;
    BAHTERA_INTAN_REPORT_PROFILE.modes.forEach((mode) => {
      const acc = modeAcc.get(mode.key)!;
      const engineFuel = acc.engineFuel.map((value) => (value < 0 ? 0 : value));
      acc.engineFuel = engineFuel;
      const total = engineFuel.reduce((sum, value) => sum + value, 0);
      rawFuelByMode.set(mode.key, total);
      rawModeFuelTotal += total;
    });

    const fuelPercent = new Map<string, number>();
    const runHours = new Map<string, number>();
    const runPercent = new Map<string, number>();
    const standbyKey = 'standby';
    let fuelPercentOther = 0;
    let runHoursOther = 0;
    let runPercentOther = 0;
    for (const mode of BAHTERA_INTAN_REPORT_PROFILE.modes) {
      if (mode.key === standbyKey) continue;
      const acc = modeAcc.get(mode.key)!;
      const rawFuel = rawFuelByMode.get(mode.key) || 0;
      const fp = rawModeFuelTotal > 0
        ? roundPdf2((Math.fround(rawFuel) / rawModeFuelTotal) * 100)
        : 0;
      const hours = roundPdf2(Math.fround(acc.samples) / 60);
      const rp = modeRows > 0 ? roundPdf2((Math.fround(acc.samples) / Math.fround(modeRows)) * 100) : 0;
      fuelPercent.set(mode.key, fp);
      runHours.set(mode.key, hours);
      runPercent.set(mode.key, rp);
      fuelPercentOther += fp;
      runHoursOther += hours;
      runPercentOther += rp;
    }
    // Only apply the legacy residual-to-100% / residual-to-24h rule when the
    // historian actually returned samples. With a completely empty response the old
    // UI fabricated a 24 h / 100% standby day, which looked like valid operations.
    fuelPercent.set(
      standbyKey,
      hasAnyHistorianSamples && fuelPercentOther < 100 ? roundPdf2(100 - fuelPercentOther) : 0,
    );
    runHours.set(
      standbyKey,
      hasAnyHistorianSamples && runHoursOther < 24 ? roundPdf2(24 - runHoursOther) : 0,
    );
    runPercent.set(
      standbyKey,
      hasAnyHistorianSamples && runPercentOther < 100 ? roundPdf2(100 - runPercentOther) : 0,
    );

    const fuelScale = rawModeFuelTotal > 0 ? totalFuelUsed / rawModeFuelTotal : 0;
    const modeSummary: BahteraIntanModeSummaryRow[] = BAHTERA_INTAN_REPORT_PROFILE.modes.map((mode) => {
      const acc = modeAcc.get(mode.key)!;
      const rawFuel = rawFuelByMode.get(mode.key) || 0;
      const fuelFull = rawFuel * fuelScale;
      const hours = runHours.get(mode.key) ?? roundPdf2(acc.samples / 60);
      const distanceFull = acc.samples > 0 ? Math.fround(Math.fround(acc.speedSum) / Math.fround(60)) : 0;
      return {
        key: mode.key,
        label: mode.label,
        fuelUsed: roundPdf2(fuelFull),
        fuelPercent: fuelPercent.get(mode.key) || 0,
        runningHours: hours,
        runningPercent: runPercent.get(mode.key) || 0,
        distanceNm: roundPdf2(distanceFull),
        litresPerNm: Math.abs(distanceFull) >= 0.01 ? roundPdf2(fuelFull / distanceFull) : 0,
        litresPerHour: acc.samples > 0 && hours !== 0 ? roundPdf2(fuelFull / hours) : 0,
      };
    });

    const buildModeDetail = (mode: BahteraIntanModeSummaryRow): BahteraIntanModeDetail => {
      const acc = modeAcc.get(mode.key);
      const rawEngineFuel = acc?.engineFuel || [0, 0, 0, 0];
      const rawFuelTotal = rawEngineFuel.reduce((sum, value) => sum + Math.max(0, value), 0);
      const fuelScale = rawFuelTotal > 0 ? mode.fuelUsed / rawFuelTotal : 0;
      const auxFuel: BahteraIntanAuxSummaryRow[] = generatorKeys.map((key, index) => {
        const load = acc && acc.engineLoadCount[index] > 0
          ? acc.engineLoadSum[index] / acc.engineLoadCount[index]
          : 0;
        const fuel = Math.max(0, rawEngineFuel[index] || 0) * fuelScale;
        const runningHours = (acc?.engineRunMinutes[index] || 0) / 60;
        return {
          key,
          label: generatorLabels[index],
          runningHours,
          fuelUsed: fuel,
          averageRpm: load,
          maximumRpm: null,
          engineLoadKw: load,
          utilizationPercent: fuel >= 0.005 ? roundPdf1((runningHours / 24) * 100) : 0,
        };
      });
      const samples = acc?.samples || 0;
      const averageSpeed = samples > 0
        ? Math.fround(Math.fround(acc!.speedSum) / Math.fround(samples))
        : 0;
      const displayedHours = roundPdf2(samples / 60);
      return {
        key: mode.key,
        label: mode.label,
        summary: {
          mainEngines: [],
          shafts: [],
          auxFuel,
          mainEngineFuelTotal: 0,
          auxiliaryFuelTotal: auxFuel.reduce((sum, row) => sum + row.fuelUsed, 0),
          averageSpeed,
          distanceNm: Math.fround(Math.fround(averageSpeed) * Math.fround(displayedHours)),
        },
      };
    };

    const modeDetails: BahteraIntanModeDetail[] = modeSummary.map(buildModeDetail);
    const dominantMode = modeSummary.reduce<BahteraIntanModeSummaryRow | null>(
      (best, row) => {
        const hasActivity = Math.abs(row.fuelUsed) > 0 || row.runningHours > 0 || row.distanceNm > 0;
        if (!hasActivity) return best;
        return !best || Math.abs(row.fuelUsed) > Math.abs(best.fuelUsed) ? row : best;
      },
      null,
    );
    const passageSummary: BahteraIntanPassageSummary =
      modeDetails.find((item) => item.key === dominantMode?.key)?.summary ||
      buildModeDetail(modeSummary[0]).summary;

    const hourly = this.buildLegacyHourlyRows(
      minuteStart,
      minuteEnd,
      gpsSpeed,
      dgFuelIn,
      dgFuelOut,
      dgLoad,
    );

    const totalDistance = modeSummary.reduce((sum, row) => sum + row.distanceNm, 0);
    const tracking = this.buildBahteraTrackingSummary(
      minuteStart,
      minuteEnd,
      gpsLat,
      gpsLong,
      gpsSpeed,
      gpsHead,
      totalDistance,
    );
    const speedSeries = this.downsampleSpeedSeries(gpsSpeed, minuteStart, minuteEnd, 1600);
    const validSpeeds = Array.from(gpsSpeed.values()).filter((value) => value > 0 && Number.isFinite(value));

    return {
      periodStart: new Date(minuteStart),
      periodEnd: new Date(minuteEnd),
      loadedAt: new Date(),
      coveragePercent: Math.max(0, Math.min(100, (modeRows / minuteCount) * 100)),
      averageSpeed: this.average(validSpeeds),
      maximumSpeed: this.maximum(validSpeeds),
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

  /** Exact one-minute join used by dtRawData.Select("TimeStamp = ..."). */
  private buildLegacyExactMinuteMap(
    points: readonly NumericPoint[],
    start: number,
    end: number,
  ): Map<number, number> {
    const result = new Map<number, number>();
    for (const point of points) {
      const timestamp = point?.timestamp;
      if (!(timestamp instanceof Date)) continue;
      const time = timestamp.getTime();
      if (!Number.isFinite(time) || !Number.isFinite(point.value)) continue;

      // Legacy DataTable.Select compares the DateTime string at whole-second
      // precision. :00.xxx can therefore populate the :00 minute row, while
      // :23.xxx cannot. Normalize milliseconds only after validating seconds.
      if (timestamp.getSeconds() !== 0) continue;
      const normalized = new Date(time);
      normalized.setMilliseconds(0);
      const bucket = normalized.getTime();
      if (bucket < start || bucket > end) continue;

      // If multiple logger records resolve to the same legacy row, the last
      // assignment wins, matching the C# DataRow behavior.
      result.set(bucket, point.value);
    }
    return result;
  }

  private calculateLegacyOfficialFuel(
    supply: ReadonlyMap<number, number>,
    returned: ReadonlyMap<number, number>,
  ): { fuelUsed: number; runningHours: number } {
    const scan = (values: ReadonlyMap<number, number>, countRunning: boolean) => {
      let minValue = 0;
      let maxValue = 0;
      let runMinutes = 0;
      const sorted = [...values.entries()].sort((a, b) => a[0] - b[0]);
      for (const [, raw] of sorted) {
        const value = Number(raw);
        if (!Number.isFinite(value) || value === 0 || value === 999999 || value <= 0) continue;
        if (minValue === 0) {
          if (value < 90_000_000) minValue = value;
          continue;
        }
        if (value - minValue >= 50_000) continue;
        const base = maxValue > 0 ? maxValue : minValue;
        const delta = value - base;
        if (delta <= 10_000 && delta >= 0) {
          if (countRunning && delta > 0) runMinutes += 1;
          maxValue = value;
        }
      }
      return { minValue, maxValue, runMinutes };
    };
    const input = scan(supply, true);
    const output = scan(returned, false);
    let fuelUsed = (input.maxValue - input.minValue) - (output.maxValue - output.minValue);
    let runningHours = input.runMinutes / 60;
    if (fuelUsed < 0 || !Number.isFinite(fuelUsed)) {
      fuelUsed = 0;
      runningHours = 0;
    }
    return { fuelUsed, runningHours };
  }

  private calculateLegacyEngineLoad(values: ReadonlyMap<number, number>): number {
    let total = 0;
    let count = 0;
    values.forEach((raw) => {
      const value = Number(raw);
      if (Number.isFinite(value) && value !== 0 && value !== 999999 && value > 0) {
        total += value;
        count += 1;
      }
    });
    return count > 0 ? total / count : 0;
  }

  private buildLegacyModeDeltaDetail(
    values: ReadonlyMap<number, number>,
  ): Map<number, { delta: number; runningAccepted: boolean }> {
    const result = new Map<number, { delta: number; runningAccepted: boolean }>();
    const sorted = [...values.entries()].sort((a, b) => a[0] - b[0]);
    let nonZeroIndex = 0;
    let previous = 0;
    let previousAfterLost = 0;
    for (const [bucket, raw] of sorted) {
      const value = Number(raw);
      if (!Number.isFinite(value) || value === 0) continue;
      if (nonZeroIndex === 0) {
        previous = value;
        nonZeroIndex += 1;
        continue;
      }
      if (value > previous) {
        const delta = value - previous;
        if (delta <= 400) {
          const modeDelta = delta < 10 ? 0 : delta;
          result.set(bucket, { delta: modeDelta, runningAccepted: delta > 10 });
          previous = value;
          previousAfterLost = 0;
        } else {
          if (previousAfterLost !== 0 && previousAfterLost < value) {
            result.set(bucket, { delta: value - previousAfterLost, runningAccepted: true });
            previous = value;
            previousAfterLost = 0;
          }
          previousAfterLost = value;
        }
      } else if (value >= 0 && value <= 20_000 && value >= 10) {
        previous = value;
      }
      nonZeroIndex += 1;
    }
    return result;
  }

  private buildLegacyHourlyRows(
    start: number,
    end: number,
    gpsSpeed: ReadonlyMap<number, number>,
    inputs: ReadonlyArray<ReadonlyMap<number, number>>,
    outputs: ReadonlyArray<ReadonlyMap<number, number>>,
    loads: ReadonlyArray<ReadonlyMap<number, number>>,
  ): BahteraIntanHourlyRow[] {
    const speedSum = Array(24).fill(0) as number[];
    const speedCount = Array(24).fill(0) as number[];
    for (const [bucket, raw] of [...gpsSpeed.entries()].sort((a, b) => a[0] - b[0])) {
      const speed = Number(raw);
      if (!Number.isFinite(speed) || speed === 0) continue;
      const hour = bucket === start ? new Date(start).getHours() : new Date(bucket - MINUTE_MS).getHours();
      speedSum[hour] = Math.fround(Math.fround(speedSum[hour]) + Math.fround(speed));
      speedCount[hour] += 1;
    }

    const fuelByGenerator: number[][] = [];
    const runByGenerator: number[][] = [];
    const loadByGenerator: number[][] = [];
    for (let index = 0; index < 4; index += 1) {
      const supplied = this.buildLegacyModeDeltaDetail(inputs[index]);
      const returned = this.buildLegacyModeDeltaDetail(outputs[index]);
      const inHours = Array(24).fill(0) as number[];
      const outHours = Array(24).fill(0) as number[];
      const runMinutes = Array(24).fill(0) as number[];
      supplied.forEach((item, bucket) => {
        if (!item.runningAccepted) return; // Hourly report uses strict delta > 10.
        const hour = new Date(bucket - MINUTE_MS).getHours();
        inHours[hour] += item.delta;
        runMinutes[hour] += 1;
      });
      returned.forEach((item, bucket) => {
        if (!item.runningAccepted) return;
        const hour = new Date(bucket - MINUTE_MS).getHours();
        outHours[hour] += item.delta;
      });
      fuelByGenerator[index] = inHours.map((value, hour) => value > outHours[hour] ? value - outHours[hour] : 0);
      runByGenerator[index] = runMinutes.map((value) => value / 60);

      const sums = Array(24).fill(0) as number[];
      const counts = Array(24).fill(0) as number[];
      loads[index].forEach((raw, bucket) => {
        const value = Number(raw);
        if (!Number.isFinite(value) || value <= 0 || value === 999999) return;
        const hour = new Date(bucket - MINUTE_MS).getHours();
        sums[hour] += value;
        counts[hour] += 1;
      });
      loadByGenerator[index] = sums.map((value, hour) => counts[hour] > 0 ? value / counts[hour] : 0);
    }

    return Array.from({ length: 24 }, (_, hour): BahteraIntanHourlyRow => {
      const speed = speedCount[hour] > 0 ? speedSum[hour] / speedCount[hour] : 0;
      const distance = speedCount[hour] > 0 ? speed * (speedCount[hour] / 60) : 0;
      const fuels = fuelByGenerator.map((items) => items[hour] || 0);
      const runs = runByGenerator.map((items) => items[hour] || 0);
      const total = fuels.reduce((sum, value) => sum + value, 0);
      return {
        hour,
        active: true,
        distanceNm: distance,
        speedKnots: speed,
        mainFuel: 0,
        auxFuel: total,
        portMainFuel: 0,
        centerMainFuel: 0,
        starboardMainFuel: 0,
        portAuxFuel: fuels[0],
        centerAuxFuel: fuels[1],
        starboardAuxFuel: fuels[2],
        fourthAuxFuel: fuels[3],
        portMainRunningHours: 0,
        centerMainRunningHours: 0,
        starboardMainRunningHours: 0,
        portAuxRunningHours: runs[0],
        centerAuxRunningHours: runs[1],
        starboardAuxRunningHours: runs[2],
        fourthAuxRunningHours: runs[3],
        portShaftRunningHours: 0,
        centerShaftRunningHours: 0,
        starboardShaftRunningHours: 0,
        portShaftRpm: 0,
        centerShaftRpm: 0,
        starboardShaftRpm: 0,
        totalFuel: total,
        portAuxEngineLoad: loadByGenerator[0][hour],
        centerAuxEngineLoad: loadByGenerator[1][hour],
        starboardAuxEngineLoad: loadByGenerator[2][hour],
        fourthAuxEngineLoad: loadByGenerator[3][hour],
      } as BahteraIntanHourlyRow;
    });
  }

  private buildBahteraTrackingSummary(
    start: number,
    end: number,
    latitude: ReadonlyMap<number, number>,
    longitude: ReadonlyMap<number, number>,
    speed: ReadonlyMap<number, number>,
    heading: ReadonlyMap<number, number>,
    totalDistance: number,
  ): BahteraIntanTrackingSummary {
    const route: BahteraIntanTrackingPoint[] = [];
    for (let bucket = start; bucket <= end; bucket += MINUTE_MS) {
      const lat = latitude.get(bucket);
      const lng = longitude.get(bucket);
      if (lat === undefined || lng === undefined || !Number.isFinite(lat) || !Number.isFinite(lng) ||
          Math.abs(lat) > 90 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) continue;
      route.push({
        timestamp: new Date(bucket),
        latitude: lat,
        longitude: lng,
        speed: speed.get(bucket) ?? null,
        heading: heading.get(bucket) ?? null,
      });
    }
    return {
      begin: route[0] || null,
      end: route[route.length - 1] || null,
      distanceNm: roundPdf2(totalDistance),
      route: this.downsampleRoute(route, 300),
    };
  }

  private buildEngineSummary(
    key: BahteraIntanEngineSummaryRow['key'],
    label: string,
    rpmMap: Map<number, number>,
    fuelMap: Map<number, number>,
    _elapsedHours: number,
    runningThreshold = 500,
  ): BahteraIntanEngineSummaryRow {
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
    key: BahteraIntanShaftSummaryRow['key'],
    label: string,
    rpmMap: Map<number, number>,
    mainEngineRpm: Map<number, number>,
  ): BahteraIntanShaftSummaryRow {
    const rpmValues = Array.from(rpmMap.values()).filter((value) => value >= 0 && value <= 1600);
    let runningMinutes = 0;
    rpmMap.forEach((value, bucket) => {
      if (value > 0 && (mainEngineRpm.get(bucket) || 0) > 0) runningMinutes += 1;
    });
    return { key, label, averageRpm: this.average(rpmValues.filter((value) => value > 0)), maximumRpm: this.maximum(rpmValues), runningHours: runningMinutes / 60 };
  }

  private buildAuxSummary(
    key: BahteraIntanAuxSummaryRow['key'],
    label: string,
    rpmMap: Map<number, number>,
    fuelMap: Map<number, number>,
  ): BahteraIntanAuxSummaryRow {
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
    targetFuelUsed: number | null = null,
  ): BahteraIntanPassageSummary {
    const valuesFor = (map: Map<number, number>, minExclusive = 0) => minuteKeys
      .map((bucket) => map.get(bucket))
      .filter((value): value is number => value !== undefined && Number.isFinite(value) && value > minExclusive);
    const fuelFor = (map: Map<number, number>) => minuteKeys.reduce((sum, bucket) => sum + (map.get(bucket) || 0), 0);
    const auxHours = (map: Map<number, number>) => minuteKeys.reduce((sum, bucket) => sum + ((map.get(bucket) || 0) > 0 ? 1 / 60 : 0), 0);
    const rawAe1FuelValue = fuelFor(ae1Fuel);
    const rawAe2FuelValue = fuelFor(ae2Fuel);
    const rawAe3FuelValue = fuelFor(ae3Fuel);
    const rawAe4FuelValue = fuelFor(ae4Fuel);
    const rawAuxFuelTotal = rawAe1FuelValue + rawAe2FuelValue + rawAe3FuelValue + rawAe4FuelValue;
    const fuelScale = targetFuelUsed !== null && targetFuelUsed >= 0 && rawAuxFuelTotal > 0
      ? targetFuelUsed / rawAuxFuelTotal
      : 1;
    const ae1FuelValue = rawAe1FuelValue * fuelScale;
    const ae2FuelValue = rawAe2FuelValue * fuelScale;
    const ae3FuelValue = rawAe3FuelValue * fuelScale;
    const ae4FuelValue = rawAe4FuelValue * fuelScale;
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
    key: BahteraIntanEngineSummaryRow['key'], label: string, rpmValues: number[], fuelUsed: number, runningThreshold = 500,
  ): BahteraIntanEngineSummaryRow {
    return { key, label, averageRpm: this.average(rpmValues), maximumRpm: this.maximum(rpmValues), runningHours: rpmValues.filter((value) => value >= runningThreshold).length / 60, fuelUsed };
  }

  private buildFilteredShaftSummary(
    key: BahteraIntanShaftSummaryRow['key'], label: string, rpmValues: number[],
  ): BahteraIntanShaftSummaryRow {
    return { key, label, averageRpm: this.average(rpmValues), maximumRpm: this.maximum(rpmValues), runningHours: rpmValues.length / 60 };
  }

  private buildTrackingSummary(
    minuteStart: number,
    minuteEnd: number,
    latitude: Map<number, number>,
    longitude: Map<number, number>,
    speed: Map<number, number>,
    heading: Map<number, number>,
  ): BahteraIntanTrackingSummary {
    const route: BahteraIntanTrackingPoint[] = [];
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

  private extractHistorianSeries(
    response: any,
    requestedTags: readonly string[],
  ): Map<string, NumericPoint[]> {
    const result = new Map<string, NumericPoint[]>();
    requestedTags.forEach((tag) => result.set(this.tagKey(tag), []));

    let source = this.parseJson(response);
    source = this.unwrapResponse(source);

    if (Array.isArray(source) && source.length > 0 && this.looksLikeMultiValueRecord(source[0])) {
      source.forEach((record: any) => {
        const timestamp = this.parseLegacyHistorianDate(this.getRecordTimestamp(record));
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
        const timestamp = this.parseLegacyHistorianDate(this.getRecordTimestamp(series));
        const value = this.parseNumber(this.getRecordValue(series));
        if (timestamp && value !== null && tagName) {
          this.pushSeriesPoint(result, tagName, timestamp, value);
        }
        return;
      }

      records.forEach((record: any) => {
        const timestamp = this.parseLegacyHistorianDate(this.getRecordTimestamp(record));
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

  /**
   * Mirror SCReportingService's `record.TimeStamp.AddHours(7)` behavior.
   *
   * The logger can return timestamps without a timezone suffix. JavaScript normally
   * interprets those as browser-local time, which would skip the legacy +07:00 shift
   * and move mode/fuel samples by seven hours. Treat timezone-less historian values
   * as UTC instead; in the Thailand UI they then land on the same local minute as
   * the legacy C# `AddHours(7)` code. Zoned timestamps are already absolute and must
   * not be shifted a second time.
   */
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

    const parts = /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,7}))?)?$/.exec(text);
    if (parts) {
      const milliseconds = Number(`0.${parts[7] || '0'}`) * 1000;
      const date = new Date(Date.UTC(
        Number(parts[1]),
        Number(parts[2]) - 1,
        Number(parts[3]),
        Number(parts[4]),
        Number(parts[5]),
        Number(parts[6] || 0),
        Math.floor(milliseconds),
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
  ): BahteraIntanSpeedPoint[] {
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
    source: readonly BahteraIntanSpeedPoint[],
    maxPoints: number,
  ): BahteraIntanSpeedPoint[] {
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

  private downsampleRoute(route: readonly BahteraIntanTrackingPoint[], maxPoints: number): BahteraIntanTrackingPoint[] {
    if (route.length <= maxPoints) return [...route];
    const step = Math.max(1, Math.ceil(route.length / maxPoints));
    const result = route.filter((_, index) => index % step === 0);
    const last = route[route.length - 1];
    if (result[result.length - 1] !== last) result.push(last);
    return result;
  }

  private resolveModeProfileKey(label: string): string {
    const normalized = this.normalizeIdentity(label);
    const mode = BAHTERA_INTAN_REPORT_PROFILE.modes.find(
      (item) => this.normalizeIdentity(item.label) === normalized,
    );
    return mode?.key || BAHTERA_INTAN_REPORT_PROFILE.modes[0].key;
  }

  private resolveModeFromCode(rawValue: unknown): string | null {
    const numeric = this.parseNumber(rawValue);
    if (numeric === null) return null;
    const code = legacyConvertToInt32(numeric);
    if (code === null || code < 1 || code > 16) return null;
    const mode = BAHTERA_INTAN_REPORT_PROFILE.modes.find((item) =>
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

  private isBahteraIntanProfile(id: unknown, aliases: unknown, prefixes: unknown): boolean {
    const candidates = [
      id,
      ...(Array.isArray(aliases) ? aliases : []),
      ...(Array.isArray(prefixes) ? prefixes : []),
    ];
    return candidates.some((value) => {
      const normalized = this.normalizeIdentity(value);
      return normalized === 'bahteraintan' || normalized === 'bbintan';
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
