import { Injectable } from '@angular/core';
import { Observable, forkJoin, from, of, throwError } from 'rxjs';
import { catchError, finalize, map, mergeMap, shareReplay, tap, toArray } from 'rxjs/operators';

import { NewHttpClientService } from '../../../../../shared/services/http-client1.service';
import { setBoundedReportCache } from '../../common/report-cache.util';
import { OfficialPdfModeParityService } from '../../common/official-pdf-mode-parity.service';
import {
  LiveReportProfileDocument,
  LiveReportSnapshot,
} from '../../../models/live-report.model';
import {
  VesselModeHistoryConfig,
  VesselReportAdapter,
} from '../../common/vessel-report-adapter';
import {
  buildExactMinuteSingleValueMap,
  buildGpsPdfParityModeSummary,
} from '../../common/pdf-mode-parity';
import {
  SC_GLORY_3_MODE_HISTORIAN_TAG,
  SC_GLORY_3_REPORT_PROFILE,
} from './sc-glory-3-report.profile';

export interface ScGlory3EngineSummaryRow {
  key: 'port' | 'center' | 'starboard';
  label: string;
  averageRpm: number | null;
  maximumRpm: number | null;
  runningHours: number;
  fuelUsed: number;
}

export interface ScGlory3ShaftSummaryRow {
  key: 'port' | 'center' | 'starboard';
  label: string;
  averageRpm: number | null;
  maximumRpm: number | null;
  runningHours: number;
}

export interface ScGlory3AuxSummaryRow {
  key: 'port' | 'center' | 'starboard';
  label: string;
  runningHours: number;
  fuelUsed: number;
}

export interface ScGlory3UtilizationRow {
  label: string;
  port: number;
  center: number;
  starboard: number;
}

export interface ScGlory3ModeSummaryRow {
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

export interface ScGlory3PassageSummary {
  mainEngines: ScGlory3EngineSummaryRow[];
  shafts: ScGlory3ShaftSummaryRow[];
  auxFuel: ScGlory3AuxSummaryRow[];
  mainEngineFuelTotal: number;
  auxiliaryFuelTotal: number;
  averageSpeed: number | null;
  distanceNm: number;
}

export interface ScGlory3TrackingPoint {
  timestamp: Date;
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
}

export interface ScGlory3TrackingSummary {
  begin: ScGlory3TrackingPoint | null;
  end: ScGlory3TrackingPoint | null;
  distanceNm: number;
  route: ScGlory3TrackingPoint[];
}

export interface ScGlory3HourlyRow {
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

export interface ScGlory3SpeedPoint {
  timestamp: Date;
  speed: number;
}

export interface ScGlory3DailyUiReport {
  periodStart: Date;
  periodEnd: Date;
  loadedAt: Date;
  coveragePercent: number;
  averageSpeed: number | null;
  maximumSpeed: number | null;
  engineSummary: ScGlory3EngineSummaryRow[];
  shaftSummary: ScGlory3ShaftSummaryRow[];
  auxSummary: ScGlory3AuxSummaryRow[];
  utilization: ScGlory3UtilizationRow[];
  mainEngineFuelTotal: number;
  auxiliaryFuelTotal: number;
  totalFuelUsed: number;
  modeSummary: ScGlory3ModeSummaryRow[];
  passageSummary: ScGlory3PassageSummary;
  tracking: ScGlory3TrackingSummary;
  hourly: ScGlory3HourlyRow[];
  speedSeries: ScGlory3SpeedPoint[];
}

export type ScGlory3UiPeriodKind = 'day' | 'range' | 'month';

export interface ScGlory3DailyTrendRow {
  date: Date;
  totalFuelUsed: number;
  mainEngineFuelTotal: number;
  auxiliaryFuelTotal: number;
  distanceNm: number;
  coveragePercent: number;
  modeRunningHours: number;
}

export interface ScGlory3PeriodUiReport extends ScGlory3DailyUiReport {
  periodKind: ScGlory3UiPeriodKind;
  dayCount: number;
  dailyTrend: ScGlory3DailyTrendRow[];
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
  value: ScGlory3DailyUiReport;
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
  gpsSpeed: 'SC_GLORY3-VES-GPS-SPEED',
  gpsLat: 'SC_GLORY3-VES-GPS-LAT',
  gpsLong: 'SC_GLORY3-VES-GPS-LONG',
  gpsHead: 'SC_GLORY3-VES-GPS-HEAD',
  pmeSpeed: 'SC_GLORY3-PME-SPD',
  cmeSpeed: 'SC_GLORY3-CME-SPD',
  smeSpeed: 'SC_GLORY3-SME-SPD',
  ppsSpeed: 'SC_GLORY3-PPS-SPD',
  cpsSpeed: 'SC_GLORY3-CPS-SPD',
  spsSpeed: 'SC_GLORY3-SPS-SPD',
  paeSpeed: 'SC_GLORY3-PAE-SPD',
  saeSpeed: 'SC_GLORY3-SAE-SPD',
  pmeFuelIn: 'SC_GLORY3-PME-FIN-VTOTAL',
  pmeFuelOut: 'SC_GLORY3-PME-FOUT-VTOTAL',
  cmeFuelIn: 'SC_GLORY3-CME-FIN-VTOTAL',
  cmeFuelOut: 'SC_GLORY3-CME-FOUT-VTOTAL',
  smeFuelIn: 'SC_GLORY3-SME-FIN-VTOTAL',
  smeFuelOut: 'SC_GLORY3-SME-FOUT-VTOTAL',
  paeFuelIn: 'SC_GLORY3-PAE-FIN-VTOTAL',
  paeFuelOut: 'SC_GLORY3-PAE-FOUT-VTOTAL',
  saeFuelIn: 'SC_GLORY3-SAE-FIN-VTOTAL',
  saeFuelOut: 'SC_GLORY3-SAE-FOUT-VTOTAL',
} as const;

const ALL_TAGS = Object.values(TAGS);

@Injectable({ providedIn: 'root' })
export class ScGlory3ReportService implements VesselReportAdapter {
  readonly id = 'sc-glory-3';
  readonly serviceLabel = 'SC GLORY 3 Report Service';
  readonly profileLabel = SC_GLORY_3_REPORT_PROFILE.label;

  private readonly detailedReportCache = new Map<string, ReportCacheEntry>();
  private readonly detailedReportInFlight = new Map<string, Observable<ScGlory3DailyUiReport>>();
  private readonly periodReportCache = new Map<string, { value: ScGlory3PeriodUiReport; expiresAt: number }>();
  private readonly periodReportInFlight = new Map<string, Observable<ScGlory3PeriodUiReport>>();

  constructor(
    private newHttp: NewHttpClientService,
    private officialPdfMode: OfficialPdfModeParityService,
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

    return candidates.some((value) => {
      const identity = this.normalizeIdentity(value);
      return identity === 'scglory3';
    });
  }

  prepareProfileDocument(baseDocument: LiveReportProfileDocument): LiveReportProfileDocument {
    const profiles = (baseDocument?.profiles || []).filter(
      (profile) => !this.isScGlory3Profile(profile?.id, profile?.aliases, profile?.prefixes),
    );

    return {
      ...baseDocument,
      profiles: [...profiles, SC_GLORY_3_REPORT_PROFILE],
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
        sourceReport: SC_GLORY_3_REPORT_PROFILE.sourceReport || snapshot.sourceReport,
        currentMode: null,
        currentModeRawValue: speed === null ? null : String(speed),
        modeSourceTag: SC_GLORY_3_MODE_HISTORIAN_TAG,
        modeSource: 'unavailable',
        modeConfidence: null,
        modeReason: 'SC GLORY 3 mode requires a valid GPS speed value.',
        modes: SC_GLORY_3_REPORT_PROFILE.modes.map((mode) => ({
          key: mode.key,
          label: mode.label,
          isCurrent: false,
        })),
      };
    }

    return {
      ...snapshot,
      profileLabel: this.profileLabel,
      sourceReport: SC_GLORY_3_REPORT_PROFILE.sourceReport || snapshot.sourceReport,
      currentMode: modeLabel,
      currentModeRawValue: speed === null ? null : String(speed),
      modeSourceTag: SC_GLORY_3_MODE_HISTORIAN_TAG,
      modeSource: 'estimated-telemetry',
      modeConfidence: 'high',
      modeReason: this.buildModeReason(speed, modeLabel),
      modes: SC_GLORY_3_REPORT_PROFILE.modes.map((mode) => ({
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
      sourceTag: enabled ? SC_GLORY_3_MODE_HISTORIAN_TAG : null,
      eyebrow: 'SC GLORY 3 DAILY REPORT',
      title: 'Mode Summary',
      description: 'Mode values are aggregated inside the full daily historian report.',
      qualityLabel: 'Derived · SC GLORY 3 report rule',
    };
  }

  resolveHistorianModeLabel(rawValue: unknown): string | null {
    return this.resolveModeFromGpsSpeed(this.parseNumber(rawValue));
  }

  loadDetailedDailyReport(
    periodStart: Date,
    periodEnd: Date,
    force = false,
  ): Observable<ScGlory3DailyUiReport> {
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
    const completedDaily = this.isCompletedDailyWindow(start, end);
    const historianEnd = completedDaily
      ? new Date(start.getTime() + 24 * 60 * MINUTE_MS)
      : end;
    const requestStartText = this.formatHistorianRequestTime(start);
    const requestEndText = this.formatHistorianRequestTime(historianEnd);

    const historianRequest$: Observable<any> = completedDaily
      ? this.newHttp.getConsistentPdfParityHistorianValues(
          requestStartText,
          requestEndText,
          requestTags,
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
      ? this.officialPdfMode.getDailyModeRows('SC GLORY 3', start)
      : of(null);

    const request$ = forkJoin({
      value: calculatedReport$,
      officialRows: officialModeRows$,
    }).pipe(
      map(({ value, officialRows }) =>
        completedDaily
          ? {
              ...value,
              modeSummary: this.officialPdfMode.overlayModeRows(value.modeSummary, officialRows),
            }
          : value,
      ),
      tap((value) => {
        setBoundedReportCache(this.detailedReportCache, key, {
          value,
          expiresAt: Date.now() + (completedDaily ? COMPLETED_REPORT_CACHE_TTL_MS : LIVE_REPORT_CACHE_TTL_MS),
        });
      }),
      catchError((error) => throwError(() => error)),
      finalize(() => this.detailedReportInFlight.delete(key)),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    this.detailedReportInFlight.set(key, request$);
    return request$;
  }

  loadPeriodReport(
    periodStart: Date,
    periodEnd: Date,
    periodKind: ScGlory3UiPeriodKind = 'range',
    force = false,
  ): Observable<ScGlory3PeriodUiReport> {
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
    const cached = this.periodReportCache.get(key);
    if (!force && cached && cached.expiresAt > now) {
      return of(cached.value);
    }

    if (!force) {
      const inFlight = this.periodReportInFlight.get(key);
      if (inFlight) return inFlight;
    }

    const request$ = from(chunks).pipe(
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
        setBoundedReportCache(this.periodReportCache, key, {
          value,
          expiresAt: Date.now() + PERIOD_REPORT_CACHE_TTL_MS,
        });
      }),
      finalize(() => this.periodReportInFlight.delete(key)),
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
    reports: readonly ScGlory3DailyUiReport[],
    periodStart: Date,
    periodEnd: Date,
    periodKind: ScGlory3UiPeriodKind,
  ): ScGlory3PeriodUiReport {
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
        .filter((row): row is ScGlory3EngineSummaryRow => !!row);
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
      } satisfies ScGlory3EngineSummaryRow;
    });

    const shaftSummary = (['port', 'center', 'starboard'] as const).map((key) => {
      const rows = reports
        .map((report) => report.shaftSummary.find((row) => row.key === key))
        .filter((row): row is ScGlory3ShaftSummaryRow => !!row);
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
      } satisfies ScGlory3ShaftSummaryRow;
    });

    const auxSummary = (['port', 'starboard'] as const).map((key) => {
      const rows = reports
        .map((report) => report.auxSummary.find((row) => row.key === key))
        .filter((row): row is ScGlory3AuxSummaryRow => !!row);
      return {
        key,
        label: rows[0]?.label || `${key} A/E`,
        runningHours: rows.reduce((sum, row) => sum + row.runningHours, 0),
        fuelUsed: rows.reduce((sum, row) => sum + row.fuelUsed, 0),
      } satisfies ScGlory3AuxSummaryRow;
    });

    const mainEngineFuelTotal = engineSummary.reduce((sum, row) => sum + row.fuelUsed, 0);
    const auxiliaryFuelTotal = auxSummary.reduce((sum, row) => sum + row.fuelUsed, 0);
    const totalFuelUsed = mainEngineFuelTotal + auxiliaryFuelTotal;

    const utilization: ScGlory3UtilizationRow[] = [
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

    // A one-day UI report must keep the already calculated LEGACY_CALC values intact.
    // Recomputing the percentages here (for example runningHours / 24) changes the
    // verified 1,441-row PDF result: 47.11 becomes 47.08, 21.24 becomes 21.25, etc.
    // Keep all displayed Mode values (Fuel, %, Run Hrs, Run %, Distance, L/NM, LPH)
    // exactly as buildExcelParityModeSummary() produced them.
    const modeSummary: ScGlory3ModeSummaryRow[] =
      reports.length === 1
        ? reports[0].modeSummary.map((row) => ({ ...row }))
        : (() => {
            const totalObservedModeHours = reports.reduce(
              (sum, report) =>
                sum +
                report.modeSummary.reduce(
                  (modeSum, row) => modeSum + Math.max(0, row.runningHours),
                  0,
                ),
              0,
            );

            return SC_GLORY_3_REPORT_PROFILE.modes.map((profileMode) => {
              const rows = reports
                .map((report) => report.modeSummary.find((row) => row.key === profileMode.key))
                .filter((row): row is ScGlory3ModeSummaryRow => !!row);
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
                  totalObservedModeHours > 0
                    ? (runningHours / totalObservedModeHours) * 100
                    : 0,
                distanceNm,
                litresPerNm: distanceNm > 0 ? fuelUsed / distanceNm : null,
                litresPerHour: runningHours > 0 ? fuelUsed / runningHours : null,
              } satisfies ScGlory3ModeSummaryRow;
            });
          })();

    const passageReports = reports.map((report) => report.passageSummary);
    const passageMainEngines = (['port', 'center', 'starboard'] as const).map((key) => {
      const rows = passageReports
        .map((report) => report.mainEngines.find((row) => row.key === key))
        .filter((row): row is ScGlory3EngineSummaryRow => !!row);
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
      } satisfies ScGlory3EngineSummaryRow;
    });
    const passageShafts = (['port', 'center', 'starboard'] as const).map((key) => {
      const rows = passageReports
        .map((report) => report.shafts.find((row) => row.key === key))
        .filter((row): row is ScGlory3ShaftSummaryRow => !!row);
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
      } satisfies ScGlory3ShaftSummaryRow;
    });
    const passageAuxFuel = (['port', 'starboard'] as const).map((key) => {
      const rows = passageReports
        .map((report) => report.auxFuel.find((row) => row.key === key))
        .filter((row): row is ScGlory3AuxSummaryRow => !!row);
      return {
        key,
        label: rows[0]?.label || `${key} A/E`,
        runningHours: rows.reduce((sum, row) => sum + row.runningHours, 0),
        fuelUsed: rows.reduce((sum, row) => sum + row.fuelUsed, 0),
      } satisfies ScGlory3AuxSummaryRow;
    });
    const passageDistanceNm = passageReports.reduce((sum, report) => sum + report.distanceNm, 0);
    const passageAverageSpeedWeight = passageReports.reduce(
      (sum, report) => sum + (report.averageSpeed !== null ? Math.max(report.distanceNm, 0.01) : 0),
      0,
    );
    const passageSummary: ScGlory3PassageSummary = {
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
    const tracking: ScGlory3TrackingSummary = {
      begin: reports.find((report) => !!report.tracking.begin)?.tracking.begin || null,
      end: [...reports].reverse().find((report) => !!report.tracking.end)?.tracking.end || null,
      distanceNm: reports.reduce((sum, report) => sum + report.tracking.distanceNm, 0),
      route,
    };

    const hourly = Array.from({ length: 24 }, (_, hour): ScGlory3HourlyRow => {
      const rows = reports
        .map((report) => report.hourly.find((row) => row.hour === hour))
        .filter((row): row is ScGlory3HourlyRow => !!row && row.active);
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

      const sumNullable = (selector: (row: ScGlory3HourlyRow) => number | null): number =>
        rows.reduce((sum, row) => sum + (selector(row) || 0), 0);
      const averageNullable = (selector: (row: ScGlory3HourlyRow) => number | null): number | null => {
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
    const dailyTrend: ScGlory3DailyTrendRow[] = reports.map((report) => ({
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
      modeSummary,
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
  ): ScGlory3DailyUiReport {
    const series = this.extractHistorianSeries(response, ALL_TAGS);
    const minuteStart = this.floorToMinute(periodStart).getTime();
    const minuteEnd = Math.max(minuteStart + MINUTE_MS, this.floorToMinute(periodEnd).getTime());
    const completedDaily = this.isCompletedDailyWindow(new Date(minuteStart), new Date(minuteEnd));
    const legacyDataEnd = completedDaily ? minuteStart + 24 * 60 * MINUTE_MS : minuteEnd;
    const minuteCount = Math.max(1, Math.floor((minuteEnd - minuteStart) / MINUTE_MS) + 1);
    const legacyPoints = (points: readonly NumericPoint[]): NumericPoint[] =>
      completedDaily
        ? this.filterLegacyExactMinutePoints(points, minuteStart, legacyDataEnd)
        : [...points];

    const gpsSpeedPoints = legacyPoints(series.get(this.tagKey(TAGS.gpsSpeed)) || []);
    const gpsLatPoints = legacyPoints(series.get(this.tagKey(TAGS.gpsLat)) || []);
    const gpsLongPoints = legacyPoints(series.get(this.tagKey(TAGS.gpsLong)) || []);
    const gpsHeadPoints = legacyPoints(series.get(this.tagKey(TAGS.gpsHead)) || []);
    const pmeSpeedPoints = legacyPoints(series.get(this.tagKey(TAGS.pmeSpeed)) || []);
    const cmeSpeedPoints = legacyPoints(series.get(this.tagKey(TAGS.cmeSpeed)) || []);
    const smeSpeedPoints = legacyPoints(series.get(this.tagKey(TAGS.smeSpeed)) || []);
    const ppsSpeedPoints = legacyPoints(series.get(this.tagKey(TAGS.ppsSpeed)) || []);
    const cpsSpeedPoints = legacyPoints(series.get(this.tagKey(TAGS.cpsSpeed)) || []);
    const spsSpeedPoints = legacyPoints(series.get(this.tagKey(TAGS.spsSpeed)) || []);
    const paeSpeedPoints = legacyPoints(series.get(this.tagKey(TAGS.paeSpeed)) || []);
    const saeSpeedPoints = legacyPoints(series.get(this.tagKey(TAGS.saeSpeed)) || []);

    // GPSSpd is System.Single in the original SCGlory3.cs DataTable. Keep the
    // exact-minute float32 value for completed Daily Mode calculations.
    const gpsSpeed = completedDaily
      ? buildExactMinuteSingleValueMap(gpsSpeedPoints, MINUTE_MS)
      : this.buildInstantMap(gpsSpeedPoints);
    const gpsLat = this.buildInstantMap(gpsLatPoints);
    const gpsLong = this.buildInstantMap(gpsLongPoints);
    const gpsHead = this.buildInstantMap(gpsHeadPoints);

    const pmeFuelInPoints = legacyPoints(series.get(this.tagKey(TAGS.pmeFuelIn)) || []);
    const pmeFuelOutPoints = legacyPoints(series.get(this.tagKey(TAGS.pmeFuelOut)) || []);
    const cmeFuelInPoints = legacyPoints(series.get(this.tagKey(TAGS.cmeFuelIn)) || []);
    const cmeFuelOutPoints = legacyPoints(series.get(this.tagKey(TAGS.cmeFuelOut)) || []);
    const smeFuelInPoints = legacyPoints(series.get(this.tagKey(TAGS.smeFuelIn)) || []);
    const smeFuelOutPoints = legacyPoints(series.get(this.tagKey(TAGS.smeFuelOut)) || []);
    const paeFuelInPoints = legacyPoints(series.get(this.tagKey(TAGS.paeFuelIn)) || []);
    const paeFuelOutPoints = legacyPoints(series.get(this.tagKey(TAGS.paeFuelOut)) || []);
    const saeFuelInPoints = legacyPoints(series.get(this.tagKey(TAGS.saeFuelIn)) || []);
    const saeFuelOutPoints = legacyPoints(series.get(this.tagKey(TAGS.saeFuelOut)) || []);

    const pmeStats = this.buildPdfDailyCounterStats(pmeSpeedPoints, minuteStart, legacyDataEnd, 8, 2000, false);
    const cmeStats = this.buildPdfDailyCounterStats(cmeSpeedPoints, minuteStart, legacyDataEnd, 8, 2000, false);
    const smeStats = this.buildPdfDailyCounterStats(smeSpeedPoints, minuteStart, legacyDataEnd, 8, 2000, false);
    const ppsStats = this.buildPdfDailyCounterStats(ppsSpeedPoints, minuteStart, legacyDataEnd, 12, 800, true);
    const cpsStats = this.buildPdfDailyCounterStats(cpsSpeedPoints, minuteStart, legacyDataEnd, 12, 800, true);
    const spsStats = this.buildPdfDailyCounterStats(spsSpeedPoints, minuteStart, legacyDataEnd, 12, 800, true);
    const paeStats = this.buildPdfDailyCounterStats(paeSpeedPoints, minuteStart, legacyDataEnd, 4, 2000, false);
    const saeStats = this.buildPdfDailyCounterStats(saeSpeedPoints, minuteStart, legacyDataEnd, 4, 2000, false);

    const pmeFuelTotal = this.buildPdfDailyFuelTotal(pmeFuelInPoints, pmeFuelOutPoints, 'regular');
    const cmeFuelTotal = this.buildPdfDailyFuelTotal(cmeFuelInPoints, cmeFuelOutPoints, 'regular');
    const smeFuelTotal = this.buildPdfDailyFuelTotal(smeFuelInPoints, smeFuelOutPoints, 'sme3');
    const paeFuelTotal = this.buildPdfDailyFuelTotal(paeFuelInPoints, paeFuelOutPoints, 'regular');
    const saeFuelTotal = this.buildPdfDailyFuelTotal(saeFuelInPoints, saeFuelOutPoints, 'regular');

    const portShaftRunningHours = this.buildPdfDailyShaftRunningHours(
      pmeSpeedPoints, ppsSpeedPoints, minuteStart, legacyDataEnd,
    );
    const centerShaftRunningHours = this.buildPdfDailyShaftRunningHours(
      cmeSpeedPoints, cpsSpeedPoints, minuteStart, legacyDataEnd,
    );
    const starboardShaftRunningHours = this.buildPdfDailyShaftRunningHours(
      smeSpeedPoints, spsSpeedPoints, minuteStart, legacyDataEnd,
    );

    let portAuxRunningHours = paeStats.runningHours;
    let starboardAuxRunningHours = saeStats.runningHours;
    if (starboardAuxRunningHours <= 0.2 && portAuxRunningHours >= 23.8) {
      starboardAuxRunningHours = 0;
      portAuxRunningHours = 24;
    } else if (portAuxRunningHours <= 0.2 && starboardAuxRunningHours >= 23.8) {
      starboardAuxRunningHours = 24;
      portAuxRunningHours = 0;
    }

    const engineSummary: ScGlory3EngineSummaryRow[] = [
      this.legacyEngineSummary('port', 'Port M/E', pmeStats, pmeFuelTotal),
      this.legacyEngineSummary('center', 'Ctr. M/E', cmeStats, cmeFuelTotal),
      this.legacyEngineSummary('starboard', 'Stb. M/E', smeStats, smeFuelTotal),
    ];
    const shaftSummary: ScGlory3ShaftSummaryRow[] = [
      this.legacyShaftSummary('port', 'Port Shaft', { ...ppsStats, runningHours: portShaftRunningHours }),
      this.legacyShaftSummary('center', 'Ctr. Shaft', { ...cpsStats, runningHours: centerShaftRunningHours }),
      this.legacyShaftSummary('starboard', 'Stb. Shaft', { ...spsStats, runningHours: starboardShaftRunningHours }),
    ];
    const auxSummary: ScGlory3AuxSummaryRow[] = [
      { key: 'port', label: 'Port A/E', runningHours: portAuxRunningHours, fuelUsed: paeFuelTotal },
      { key: 'starboard', label: 'Stb. A/E', runningHours: starboardAuxRunningHours, fuelUsed: saeFuelTotal },
    ];

    const mainEngineFuelTotal = pmeFuelTotal + cmeFuelTotal + smeFuelTotal;
    const auxiliaryFuelTotal = paeFuelTotal + saeFuelTotal;
    const totalFuelUsed = mainEngineFuelTotal + auxiliaryFuelTotal;
    const utilizationHours = completedDaily ? 24 : Math.max(1 / 60, (minuteEnd - minuteStart + MINUTE_MS) / 3_600_000);
    const utilization: ScGlory3UtilizationRow[] = [
      {
        label: 'M/E Engine Utilized (%)',
        port: this.percent(pmeStats.runningHours, utilizationHours),
        center: this.percent(cmeStats.runningHours, utilizationHours),
        starboard: this.percent(smeStats.runningHours, utilizationHours),
      },
      {
        label: 'Shaft Utilized (%)',
        port: this.percent(portShaftRunningHours, utilizationHours),
        center: this.percent(centerShaftRunningHours, utilizationHours),
        starboard: this.percent(starboardShaftRunningHours, utilizationHours),
      },
      {
        label: 'Shaft per M/E Engine Utilized (%)',
        port: this.ratioPercent(portShaftRunningHours, pmeStats.runningHours),
        center: this.ratioPercent(centerShaftRunningHours, cmeStats.runningHours),
        starboard: this.ratioPercent(starboardShaftRunningHours, smeStats.runningHours),
      },
    ];

    const legacyPmeFuel = this.buildLegacyFuelDeltaMap(pmeFuelInPoints, pmeFuelOutPoints, 300, 300);
    const legacyCmeFuel = this.buildLegacyFuelDeltaMap(cmeFuelInPoints, cmeFuelOutPoints, 300, 300);
    const legacySmeFuel = this.buildLegacyFuelDeltaMap(smeFuelInPoints, smeFuelOutPoints, 300, 300);
    const legacyPaeFuel = this.buildLegacyFuelDeltaMap(paeFuelInPoints, paeFuelOutPoints, 300, 1000);
    const legacyPaePassageFuel = this.buildLegacyFuelDeltaMap(paeFuelInPoints, paeFuelOutPoints, 300, 300);
    const legacySaeFuel = this.buildLegacyFuelDeltaMap(saeFuelInPoints, saeFuelOutPoints, 300, 300);

    // Direct C# audit: SCGlory1.cs / SCGlory2.cs / SCGlory3.cs / SCGlory7.cs
    // have byte-for-byte equivalent Mode aggregation logic after vessel/log-name
    // normalization. Keep GLORY 3 on the same System.Single-compatible engine.
    const pdfParityMode = buildGpsPdfParityModeSummary({
      modes: SC_GLORY_3_REPORT_PROFILE.modes,
      minuteStart,
      dataEnd: legacyDataEnd,
      completedDaily,
      minuteMs: MINUTE_MS,
      officialTotalFuel: totalFuelUsed,
      gpsSpeed,
      minuteFuelAt: (minute) =>
        (legacyPmeFuel.get(minute) || 0) +
        (legacyCmeFuel.get(minute) || 0) +
        (legacySmeFuel.get(minute) || 0) +
        (legacyPaeFuel.get(minute) || 0) +
        (legacySaeFuel.get(minute) || 0),
      resolveModeLabel: (speed) => this.resolveModeFromGpsSpeed(speed),
      resolveModeKey: (label) => this.resolveModeProfileKey(label),
      standbyLabel: 'Standby',
      legacySinglePrecision: true,
    });
    const modeSummary = pdfParityMode.modeSummary as ScGlory3ModeSummaryRow[];
    const passageModeKey = this.resolveModeProfileKey('Passage');
    const passageMinuteKeys = pdfParityMode.minuteKeysByMode.get(passageModeKey) || [];
    const rawScaledFuel = pdfParityMode.scaledFuelByMode;
    const gpsAvailableMinutes = Array.from(gpsSpeed.keys()).filter(
      (bucket) => bucket >= minuteStart && bucket <= minuteEnd,
    ).length;

    const passageFuelTotal = rawScaledFuel.get(passageModeKey) || 0;
    const passageSummary = this.buildLegacyPassageSummary(
      passageMinuteKeys,
      pmeSpeedPoints,
      cmeSpeedPoints,
      smeSpeedPoints,
      ppsSpeedPoints,
      cpsSpeedPoints,
      spsSpeedPoints,
      legacyPmeFuel,
      legacyCmeFuel,
      legacySmeFuel,
      legacyPaePassageFuel,
      legacySaeFuel,
      gpsSpeed,
      passageFuelTotal,
    );

    const hourly = this.buildPdfHourlyRows(
      minuteStart,
      legacyDataEnd,
      gpsSpeed,
      pmeSpeedPoints,
      cmeSpeedPoints,
      smeSpeedPoints,
      ppsSpeedPoints,
      cpsSpeedPoints,
      spsSpeedPoints,
      paeSpeedPoints,
      saeSpeedPoints,
      pmeFuelInPoints,
      pmeFuelOutPoints,
      cmeFuelInPoints,
      cmeFuelOutPoints,
      smeFuelInPoints,
      smeFuelOutPoints,
      paeFuelInPoints,
      paeFuelOutPoints,
      saeFuelInPoints,
      saeFuelOutPoints,
    );

    let modeDistanceTotalFloat = 0;
    modeSummary.forEach((row) => {
      modeDistanceTotalFloat = Math.fround(
        modeDistanceTotalFloat + Math.fround(row.distanceNm),
      );
    });
    const modeDistanceTotal = this.roundLegacy2(modeDistanceTotalFloat);
    const tracking = this.buildPdfTrackingSummary(
      minuteStart,
      legacyDataEnd,
      gpsLat,
      gpsLong,
      gpsSpeed,
      gpsHead,
      modeDistanceTotal,
    );

    const speedSeries = this.downsampleSpeedSeries(gpsSpeed, minuteStart, minuteEnd, 1600);
    const validSpeedValues = Array.from(gpsSpeed.entries())
      .filter(([bucket, value]) => bucket >= minuteStart && bucket <= minuteEnd && value >= 0 && Number.isFinite(value))
      .map(([, value]) => value);

    return {
      periodStart: new Date(minuteStart),
      periodEnd: new Date(minuteEnd),
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
      tracking,
      hourly,
      speedSeries,
    };
  }

  private isCompletedDailyWindow(start: Date, end: Date): boolean {
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return false;
    if (start.getHours() !== 0 || start.getMinutes() !== 0) return false;
    const expected = new Date(start);
    expected.setDate(expected.getDate() + 1);
    expected.setMinutes(expected.getMinutes() - 1);
    return Math.abs(this.floorToMinute(end).getTime() - expected.getTime()) < MINUTE_MS;
  }

  private buildPdfDailyCounterStats(
    points: readonly NumericPoint[],
    start: number,
    end: number,
    pulse: number,
    maximumRpm: number,
    shaftMode: boolean,
  ): { averageRpm: number | null; maximumRpm: number | null; runningHours: number } {
    const values = this.buildInstantMap(points);
    let index = 0;
    let lost = 1;
    let averageDelta = 0;
    let averageCount = 0;
    let maximumDelta = 0;
    let previous = 0;
    let previousRunning = false;
    let runningMinutes = 0;

    for (let bucket = start; bucket <= end; bucket += MINUTE_MS) {
      const value = values.get(bucket) || 0;
      if (value !== 0) {
        if (index === 0) {
          previous = value;
        } else {
          previousRunning = false;
          if (value > previous) {
            const delta = value - previous;
            if (delta / pulse <= maximumRpm) {
              const candidateMax = lost > 1 ? delta / lost : delta;
              if (candidateMax > maximumDelta) maximumDelta = candidateMax;
              if (lost > 1) lost = 1;
              averageDelta += delta;
              averageCount += 1;
            }
            if (shaftMode || delta / pulse >= 100) runningMinutes += 1;
            previousRunning = true;
            previous = value;
          } else {
            previous = value;
          }
        }
        index += 1;
      } else if (previousRunning) {
        runningMinutes += 1;
        index += 1;
        lost += 1;
      }
    }

    return {
      averageRpm: averageCount > 0 ? (averageDelta / pulse) / averageCount : 0,
      maximumRpm: maximumDelta / pulse,
      runningHours: runningMinutes / 60,
    };
  }

  private buildPdfDailyShaftRunningHours(
    mainPoints: readonly NumericPoint[],
    shaftPoints: readonly NumericPoint[],
    start: number,
    end: number,
  ): number {
    const main = this.buildInstantMap(mainPoints);
    const shaft = this.buildInstantMap(shaftPoints);
    const mainRunning = new Set<number>();
    let index = 0;
    let previous = 0;
    let previousRunning = false;

    for (let bucket = start; bucket <= end; bucket += MINUTE_MS) {
      const value = main.get(bucket) || 0;
      if (value !== 0) {
        if (index === 0) {
          previous = value;
        } else {
          previousRunning = false;
          if (value > previous) {
            mainRunning.add(bucket);
            previousRunning = true;
            previous = value;
          } else {
            previous = value;
          }
        }
        index += 1;
      } else if (previousRunning) {
        mainRunning.add(bucket);
      }
    }

    index = 0;
    previous = 0;
    previousRunning = false;
    let runningMinutes = 0;
    for (let bucket = start; bucket <= end; bucket += MINUTE_MS) {
      const value = shaft.get(bucket) || 0;
      if (value !== 0) {
        if (index === 0) {
          previous = value;
        } else {
          previousRunning = false;
          if (value > previous) {
            if (mainRunning.has(bucket)) {
              runningMinutes += 1;
              previousRunning = true;
            }
            previous = value;
          } else {
            previous = value;
          }
        }
        index += 1;
      } else if (previousRunning) {
        runningMinutes += 1;
      }
    }
    return runningMinutes / 60;
  }

  private buildPdfDailyFuelTotal(
    supplyPoints: readonly NumericPoint[],
    returnPoints: readonly NumericPoint[],
    variant: 'regular' | 'sme3',
  ): number {
    const supply = variant === 'sme3'
      ? this.buildPdfTotalizerSpan(supplyPoints, 5000, 200, false)
      : this.buildPdfTotalizerSpan(supplyPoints, 4500, 300, false);
    const returned = variant === 'sme3'
      ? this.buildPdfTotalizerSpan(returnPoints, 5000, 200, true)
      : this.buildPdfTotalizerSpan(returnPoints, 3500, 300, true);
    const total = supply - returned;
    return Number.isFinite(total) ? total : 0;
  }

  private buildPdfTotalizerSpan(
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
      const validStep = (delta: number) => inclusiveStep ? delta <= stepLimit : delta < stepLimit;
      if (maximum > 0) {
        if (value > maximum && validStep(value - maximum)) maximum = value;
      } else if (validStep(value - minimum)) {
        maximum = value;
      }
    }
    return maximum - minimum;
  }

  private pdfHourForBucket(bucket: number, start: number): number {
    if (bucket === start) return 0;
    return new Date(bucket - MINUTE_MS).getHours();
  }

  private buildPdfHourlyTotalizer(
    points: readonly NumericPoint[],
    start: number,
    end: number,
    maximumDelta: number,
    recoveryDelta: number | null = null,
  ): number[] {
    const result = Array(24).fill(0) as number[];
    const values = this.buildInstantMap(points);
    let index = 0;
    let previous = 0;
    let previousAfterLost = 0;
    for (let bucket = start; bucket <= end; bucket += MINUTE_MS) {
      const value = values.get(bucket) || 0;
      if (value === 0) continue;
      if (index === 0) {
        previous = value;
        index += 1;
        continue;
      }
      if (value > previous) {
        const delta = value - previous;
        if (delta <= maximumDelta) {
          result[this.pdfHourForBucket(bucket, start)] += delta;
          previous = value;
          previousAfterLost = 0;
        } else if (recoveryDelta !== null) {
          if (previousAfterLost !== 0 && previousAfterLost < value) {
            const recovered = value - previousAfterLost;
            if (recovered <= recoveryDelta) {
              result[this.pdfHourForBucket(bucket, start)] += recovered;
              previous = value;
              previousAfterLost = 0;
            } else {
              previousAfterLost = value;
            }
          }
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

  private buildPdfHourlyMainShaftStats(
    mainPoints: readonly NumericPoint[],
    shaftPoints: readonly NumericPoint[],
    start: number,
    end: number,
  ): { mainRunningHours: number[]; shaftRunningHours: number[]; shaftRpm: number[] } {
    const main = this.buildInstantMap(mainPoints);
    const shaft = this.buildInstantMap(shaftPoints);
    const mainRunningHours = Array(24).fill(0) as number[];
    const shaftRunningHours = Array(24).fill(0) as number[];
    const shaftRpmSum = Array(24).fill(0) as number[];
    const shaftRunningTimestamps = new Set<number>();

    let index = 0;
    let previous = 0;
    let previousRunning = false;
    for (let bucket = start; bucket <= end; bucket += MINUTE_MS) {
      const value = main.get(bucket) || 0;
      if (value !== 0) {
        if (index === 0) {
          previous = value;
        } else {
          previousRunning = false;
          if (value > previous) {
            mainRunningHours[this.pdfHourForBucket(bucket, start)] += 1;
            shaftRunningTimestamps.add(bucket);
            previousRunning = true;
            previous = value;
          } else {
            previous = value;
            if (previous / 8 > 500 && previous <= 5000) {
              mainRunningHours[this.pdfHourForBucket(bucket, start)] += 1;
            }
          }
        }
        index += 1;
      } else if (previousRunning) {
        mainRunningHours[this.pdfHourForBucket(bucket, start)] += 1;
        shaftRunningTimestamps.add(bucket);
      }
    }

    index = 0;
    previous = 0;
    previousRunning = false;
    for (let bucket = start; bucket <= end; bucket += MINUTE_MS) {
      const value = shaft.get(bucket) || 0;
      if (value !== 0) {
        if (index === 0) {
          previous = value;
        } else {
          previousRunning = false;
          if (value > previous) {
            if (shaftRunningTimestamps.has(bucket)) {
              const hour = this.pdfHourForBucket(bucket, start);
              shaftRunningHours[hour] += 1;
              shaftRpmSum[hour] += (value - previous) / 12;
              previousRunning = true;
            }
            previous = value;
          } else {
            previous = value;
            if (previous <= 5000 && previous !== 0) {
              shaftRunningHours[this.pdfHourForBucket(bucket, start)] += 1;
            }
          }
        }
        index += 1;
      } else if (previousRunning) {
        shaftRunningHours[this.pdfHourForBucket(bucket, start)] += 1;
      }
    }

    return {
      mainRunningHours: mainRunningHours.map((minutes) => minutes / 60),
      shaftRunningHours: shaftRunningHours.map((minutes) => minutes / 60),
      shaftRpm: shaftRunningHours.map((minutes, hour) => minutes > 0 ? shaftRpmSum[hour] / minutes : 0),
    };
  }

  private buildPdfHourlyAuxRunningHours(
    points: readonly NumericPoint[],
    start: number,
    end: number,
    starboardRule: boolean,
  ): number[] {
    const result = Array(24).fill(0) as number[];
    const values = this.buildInstantMap(points);
    let index = 0;
    let previous = 0;
    let previousRunning = false;
    for (let bucket = start; bucket <= end; bucket += MINUTE_MS) {
      const value = values.get(bucket) || 0;
      if (value !== 0) {
        if (index === 0) {
          previous = value;
        } else {
          previousRunning = false;
          if (value > previous) {
            const delta = value - previous;
            if (!starboardRule || delta >= 100) {
              result[this.pdfHourForBucket(bucket, start)] += 1;
            }
            previousRunning = true;
            previous = value;
          } else {
            previous = value;
            if (previous <= 5000 && previous !== 0) {
              result[this.pdfHourForBucket(bucket, start)] += 1;
            }
          }
        }
        index += 1;
      } else if (previousRunning) {
        result[this.pdfHourForBucket(bucket, start)] += 1;
      }
    }
    return result.map((minutes) => minutes / 60);
  }

  private buildPdfHourlyRows(
    start: number,
    end: number,
    gpsSpeed: Map<number, number>,
    pmeSpeedPoints: readonly NumericPoint[],
    cmeSpeedPoints: readonly NumericPoint[],
    smeSpeedPoints: readonly NumericPoint[],
    ppsSpeedPoints: readonly NumericPoint[],
    cpsSpeedPoints: readonly NumericPoint[],
    spsSpeedPoints: readonly NumericPoint[],
    paeSpeedPoints: readonly NumericPoint[],
    saeSpeedPoints: readonly NumericPoint[],
    pmeFuelIn: readonly NumericPoint[], pmeFuelOut: readonly NumericPoint[],
    cmeFuelIn: readonly NumericPoint[], cmeFuelOut: readonly NumericPoint[],
    smeFuelIn: readonly NumericPoint[], smeFuelOut: readonly NumericPoint[],
    paeFuelIn: readonly NumericPoint[], paeFuelOut: readonly NumericPoint[],
    saeFuelIn: readonly NumericPoint[], saeFuelOut: readonly NumericPoint[],
  ): ScGlory3HourlyRow[] {
    const speedSum = Array(24).fill(0) as number[];
    const speedCount = Array(24).fill(0) as number[];
    for (let bucket = start; bucket <= end; bucket += MINUTE_MS) {
      const speed = gpsSpeed.get(bucket) || 0;
      if (speed === 0) continue;
      const hour = this.pdfHourForBucket(bucket, start);
      speedSum[hour] += speed;
      speedCount[hour] += 1;
    }

    const pmeIn = this.buildPdfHourlyTotalizer(pmeFuelIn, start, end, 3000);
    const pmeOut = this.buildPdfHourlyTotalizer(pmeFuelOut, start, end, 3000);
    const cmeIn = this.buildPdfHourlyTotalizer(cmeFuelIn, start, end, 3000);
    const cmeOut = this.buildPdfHourlyTotalizer(cmeFuelOut, start, end, 3000);
    const smeIn = this.buildPdfHourlyTotalizer(smeFuelIn, start, end, 3000, 50);
    const smeOut = this.buildPdfHourlyTotalizer(smeFuelOut, start, end, 3000, 50);
    const paeIn = this.buildPdfHourlyTotalizer(paeFuelIn, start, end, 1000);
    const paeOut = this.buildPdfHourlyTotalizer(paeFuelOut, start, end, 1000);
    const saeIn = this.buildPdfHourlyTotalizer(saeFuelIn, start, end, 1000);
    const saeOut = this.buildPdfHourlyTotalizer(saeFuelOut, start, end, 1000);

    const portStats = this.buildPdfHourlyMainShaftStats(pmeSpeedPoints, ppsSpeedPoints, start, end);
    const centerStats = this.buildPdfHourlyMainShaftStats(cmeSpeedPoints, cpsSpeedPoints, start, end);
    const starboardStats = this.buildPdfHourlyMainShaftStats(smeSpeedPoints, spsSpeedPoints, start, end);
    const portAuxRun = this.buildPdfHourlyAuxRunningHours(paeSpeedPoints, start, end, false);
    const starboardAuxRun = this.buildPdfHourlyAuxRunningHours(saeSpeedPoints, start, end, true);

    return Array.from({ length: 24 }, (_, hour): ScGlory3HourlyRow => {
      const portMainFuel = Math.max(0, pmeIn[hour] - pmeOut[hour]);
      const centerMainFuel = Math.max(0, cmeIn[hour] - cmeOut[hour]);
      const starboardMainFuel = Math.max(0, smeIn[hour] - smeOut[hour]);
      const portAuxFuel = Math.max(0, paeIn[hour] - paeOut[hour]);
      const starboardAuxFuel = Math.max(0, saeIn[hour] - saeOut[hour]);
      const mainFuel = portMainFuel + centerMainFuel + starboardMainFuel;
      const auxFuel = portAuxFuel + starboardAuxFuel;
      const speedKnots = speedCount[hour] > 0 ? speedSum[hour] / speedCount[hour] : 0;
      const distanceNm = speedKnots * (speedCount[hour] / 60);
      return {
        hour,
        active: true,
        distanceNm,
        speedKnots,
        mainFuel,
        auxFuel,
        portMainFuel,
        centerMainFuel,
        starboardMainFuel,
        portAuxFuel,
        starboardAuxFuel,
        portMainRunningHours: portStats.mainRunningHours[hour],
        centerMainRunningHours: centerStats.mainRunningHours[hour],
        starboardMainRunningHours: starboardStats.mainRunningHours[hour],
        portAuxRunningHours: portAuxRun[hour],
        starboardAuxRunningHours: starboardAuxRun[hour],
        portShaftRunningHours: portStats.shaftRunningHours[hour],
        centerShaftRunningHours: centerStats.shaftRunningHours[hour],
        starboardShaftRunningHours: starboardStats.shaftRunningHours[hour],
        portShaftRpm: portStats.shaftRpm[hour],
        centerShaftRpm: centerStats.shaftRpm[hour],
        starboardShaftRpm: starboardStats.shaftRpm[hour],
        totalFuel: mainFuel + auxFuel,
      };
    });
  }

  private buildPdfTrackingSummary(
    start: number,
    end: number,
    latitude: Map<number, number>,
    longitude: Map<number, number>,
    speed: Map<number, number>,
    heading: Map<number, number>,
    distanceNm: number,
  ): ScGlory3TrackingSummary {
    const route: ScGlory3TrackingPoint[] = [];
    for (let bucket = start; bucket <= end; bucket += MINUTE_MS) {
      const lat = latitude.get(bucket) || 0;
      const lng = longitude.get(bucket) || 0;
      if (lat <= 0 || lng <= 0 || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue;
      route.push({
        timestamp: new Date(bucket),
        latitude: lat,
        longitude: lng,
        speed: speed.get(bucket) ?? 0,
        heading: heading.get(bucket) ?? 0,
      });
    }
    const begin = route.length > 0 ? { ...route[0] } : null;
    const last = route.length > 0 ? route[route.length - 1] : null;
    const endPoint = last
      ? { ...last, timestamp: new Date(Math.max(start, last.timestamp.getTime() - MINUTE_MS)) }
      : null;
    return {
      begin,
      end: endPoint,
      distanceNm,
      route: this.downsampleRoute(route, 300),
    };
  }

  private buildEngineSummary(
    key: ScGlory3EngineSummaryRow['key'],
    label: string,
    rpmMap: Map<number, number>,
    fuelMap: Map<number, number>,
    _elapsedHours: number,
    fuelOverride?: number,
  ): ScGlory3EngineSummaryRow {
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
    key: ScGlory3ShaftSummaryRow['key'],
    label: string,
    rpmMap: Map<number, number>,
    mainEngineRpm: Map<number, number>,
  ): ScGlory3ShaftSummaryRow {
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
    key: ScGlory3AuxSummaryRow['key'],
    label: string,
    rpmMap: Map<number, number>,
    fuelMap: Map<number, number>,
    fuelOverride?: number,
  ): ScGlory3AuxSummaryRow {
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
  ): ScGlory3PassageSummary {
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

  private legacyEngineSummary(
    key: ScGlory3EngineSummaryRow['key'],
    label: string,
    stats: { averageRpm: number | null; maximumRpm: number | null; runningHours: number },
    fuelUsed: number,
  ): ScGlory3EngineSummaryRow {
    return { key, label, ...stats, fuelUsed };
  }

  private legacyShaftSummary(
    key: ScGlory3ShaftSummaryRow['key'],
    label: string,
    stats: { averageRpm: number | null; maximumRpm: number | null; runningHours: number },
  ): ScGlory3ShaftSummaryRow {
    return { key, label, ...stats };
  }

  private sumSelectedMap(map: Map<number, number>, selected: ReadonlySet<number>): number {
    let sum = 0;
    selected.forEach((bucket) => {
      sum += map.get(bucket) || 0;
    });
    return sum;
  }

  private buildTrackingSummary(
    minuteStart: number,
    minuteEnd: number,
    latitude: Map<number, number>,
    longitude: Map<number, number>,
    speed: Map<number, number>,
    heading: Map<number, number>,
  ): ScGlory3TrackingSummary {
    const route: ScGlory3TrackingPoint[] = [];
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

  private filterLegacyExactMinutePoints(
    points: readonly NumericPoint[],
    start: number,
    end: number,
  ): NumericPoint[] {
    const exactByMinute = new Map<number, NumericPoint>();

    for (const point of points) {
      const timestamp = point?.timestamp;
      if (!(timestamp instanceof Date) || !Number.isFinite(timestamp.getTime())) continue;
      if (timestamp.getSeconds() !== 0) continue;

      const normalized = new Date(timestamp.getTime());
      normalized.setMilliseconds(0);
      const minute = normalized.getTime();
      if (minute < start || minute > end) continue;

      exactByMinute.set(minute, { timestamp: normalized, value: point.value });
    }

    return Array.from(exactByMinute.values()).sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
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
  ): number {
    const supply = this.buildLegacyTotalizerSpan(supplyPoints, false);
    const returned = this.buildLegacyTotalizerSpan(returnPoints, true);
    const total = supply - returned;
    return Number.isFinite(total) ? total : 0;
  }

  private buildLegacyTotalizerSpan(points: readonly NumericPoint[], inclusiveStep: boolean): number {
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
      if (value - minimum >= 8000) continue;
      const validStep = (delta: number) => (inclusiveStep ? delta <= 300 : delta < 300);
      if (maximum > 0) {
        if (value > maximum && validStep(value - maximum)) maximum = value;
      } else if (validStep(value - minimum)) {
        maximum = value;
      }
    }

    return maximum - minimum;
  }

  /**
   * Exact TypeScript translation of the verified Excel MODE calculation.
   *
   * Excel source: SC_GLORY3_Mode_Calculation_PDF_Match_20260908.xlsx
   * Sheet: LEGACY_CALC
   *
   * Formula parity:
   * - Mode            = IF(speed<=2, Standby, IF(speed<=3.5, Cargo, IF(speed<=10,
   *                     Manoeuvring, IF(speed<=12, Sea Passage Economics, Passage))))
   * - Samples         = COUNTIF(mode column, mode)
   * - Run Hrs         = ROUND(samples/60, 2), except Standby = 24-SUM(other Run Hrs)
   * - Run %           = ROUND(samples/totalRows*100, 2), except Standby = 100-SUM(other Run %)
   * - Raw Fuel        = SUMIF(mode column, mode, minute fuel column)
   * - Fuel Scale      = officialTotalFuel / SUM(raw minute fuel)
   * - Fuel Full       = rawFuel * Fuel Scale
   * - Fuel Display    = ROUND(Fuel Full, 2)
   * - Fuel %          = ROUND(rawFuel/totalRawFuel*100, 2), except Standby residual to 100
   * - Avg GPS Speed   = SUM(speed for mode) / samples
   * - Distance Full   = Avg GPS Speed * displayed Run Hrs
   * - Distance        = ROUND(Distance Full, 2)
   * - L/NM            = ROUND(Fuel Full / Distance Full, 2)
   * - LPH             = ROUND(Fuel Full / displayed Run Hrs, 2)
   */
  private buildExcelParityModeSummary(
    minuteStart: number,
    legacyDataEnd: number,
    completedDaily: boolean,
    gpsSpeed: ReadonlyMap<number, number>,
    officialTotalFuel: number,
    pmeFuel: ReadonlyMap<number, number>,
    cmeFuel: ReadonlyMap<number, number>,
    smeFuel: ReadonlyMap<number, number>,
    paeFuel: ReadonlyMap<number, number>,
    saeFuel: ReadonlyMap<number, number>,
  ): {
    modeSummary: ScGlory3ModeSummaryRow[];
    passageMinuteKeys: number[];
    rawScaledFuel: Map<string, number>;
  } {
    type ExcelModeBucket = {
      key: string;
      label: string;
      samples: number;
      rawFuel: number;
      speedSum: number;
    };

    const buckets = new Map<string, ExcelModeBucket>();
    SC_GLORY_3_REPORT_PROFILE.modes.forEach((mode) => {
      buckets.set(mode.key, {
        key: mode.key,
        label: mode.label,
        samples: 0,
        rawFuel: 0,
        speedSum: 0,
      });
    });

    const passageMinuteKeys: number[] = [];
    let totalRows = 0;
    let totalRawFuel = 0;

    // Excel MINUTE_MODEL contains rows minute 0..1440 inclusive for a completed day.
    // Missing GPS stays 0 and therefore classifies as Standby.
    for (let minute = minuteStart; minute <= legacyDataEnd; minute += MINUTE_MS) {
      const rawSpeed = gpsSpeed.get(minute);
      const speed = rawSpeed !== undefined && Number.isFinite(rawSpeed) ? rawSpeed : 0;

      const minuteFuel =
        (smeFuel.get(minute) || 0) +
        (cmeFuel.get(minute) || 0) +
        (pmeFuel.get(minute) || 0) +
        (saeFuel.get(minute) || 0) +
        (paeFuel.get(minute) || 0);

      const modeLabel = this.resolveModeFromGpsSpeed(speed) || 'Standby';
      const modeKey = this.resolveModeProfileKey(modeLabel);
      const bucket = buckets.get(modeKey);
      if (!bucket) continue;

      bucket.samples += 1;
      bucket.rawFuel += minuteFuel;
      bucket.speedSum += speed;

      totalRows += 1;
      totalRawFuel += minuteFuel;

      if (modeLabel === 'Passage') {
        passageMinuteKeys.push(minute);
      }
    }

    const standbyKey = this.resolveModeProfileKey('Standby');
    const runningHours = new Map<string, number>();
    const runningPercent = new Map<string, number>();
    const fuelPercent = new Map<string, number>();
    const rawScaledFuel = new Map<string, number>();

    // The verified Excel daily model fixes this denominator at 1,441 rows.
    // For a non-completed/live window, use the actual row count so the UI remains usable.
    const runningPercentDenominator = completedDaily ? 1441 : totalRows;

    let otherRunningHours = 0;
    let otherRunningPercent = 0;
    let otherFuelPercent = 0;

    for (const profileMode of SC_GLORY_3_REPORT_PROFILE.modes) {
      if (profileMode.key === standbyKey) continue;
      const bucket = buckets.get(profileMode.key)!;

      // Excel: =ROUND(C13/60,2)
      const hours = this.roundExcel2(bucket.samples / 60);
      runningHours.set(profileMode.key, hours);
      otherRunningHours += hours;

      // Excel: =ROUND(C13/$B$6*100,2), B6 = 1441 for completed day
      const runPercent =
        runningPercentDenominator > 0
          ? this.roundExcel2((bucket.samples / runningPercentDenominator) * 100)
          : 0;
      runningPercent.set(profileMode.key, runPercent);
      otherRunningPercent += runPercent;

      // Excel: =ROUND(F13/SUM($F$12:$F$16)*100,2)
      const modeFuelPercent =
        totalRawFuel !== 0
          ? this.roundExcel2((bucket.rawFuel / totalRawFuel) * 100)
          : 0;
      fuelPercent.set(profileMode.key, modeFuelPercent);
      otherFuelPercent += modeFuelPercent;
    }

    // Excel Standby residual formulas:
    // D12 = 24-SUM(D13:D16)
    // E12 = 100-SUM(E13:E16)
    // I12 = 100-SUM(I13:I16)
    runningHours.set(standbyKey, this.roundExcel2(24 - otherRunningHours));
    runningPercent.set(standbyKey, this.roundExcel2(100 - otherRunningPercent));
    fuelPercent.set(standbyKey, this.roundExcel2(100 - otherFuelPercent));

    // Excel B8: =B5/SUM(MINUTE_MODEL!$E$4:$E$1444)
    const fuelScale = totalRawFuel !== 0 ? officialTotalFuel / totalRawFuel : 0;

    const modeSummary = SC_GLORY_3_REPORT_PROFILE.modes.map((profileMode) => {
      const bucket = buckets.get(profileMode.key)!;
      const hours = runningHours.get(profileMode.key) || 0;

      // Excel Gxx: =Fxx*$B$8 (keep full precision internally)
      const fuelFull = bucket.rawFuel * fuelScale;
      rawScaledFuel.set(profileMode.key, fuelFull);

      // Excel Jxx: SUMIF(speed contribution)/sample count
      const averageGpsSpeed = bucket.samples > 0 ? bucket.speedSum / bucket.samples : 0;

      // Excel Kxx: =Jxx*Dxx (uses displayed/rounded running hours)
      const distanceFull = averageGpsSpeed * hours;

      return {
        key: profileMode.key,
        label: profileMode.label,

        // Excel Hxx: =ROUND(Gxx,2)
        fuelUsed: this.roundExcel2(fuelFull),
        fuelPercent: fuelPercent.get(profileMode.key) || 0,
        runningHours: hours,
        runningPercent: runningPercent.get(profileMode.key) || 0,

        // Excel Lxx: =ROUND(Kxx,2)
        distanceNm: this.roundExcel2(distanceFull),

        // Excel Mxx: =IF(Kxx=0,0,ROUND(Gxx/Kxx,2))
        litresPerNm:
          distanceFull !== 0
            ? this.roundExcel2(fuelFull / distanceFull)
            : null,

        // Excel Nxx: =IF(Dxx=0,0,ROUND(Gxx/Dxx,2))
        litresPerHour:
          hours !== 0
            ? this.roundExcel2(fuelFull / hours)
            : null,
      } satisfies ScGlory3ModeSummaryRow;
    });

    return {
      modeSummary,
      passageMinuteKeys,
      rawScaledFuel,
    };
  }

  /** Excel-compatible ROUND(value, 2) for the positive report quantities used here. */
  private roundExcel2(value: number): number {
    if (!Number.isFinite(value)) return 0;
    const factor = 100;
    return Math.round((value + Number.EPSILON) * factor) / factor;
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

      const bucket = this.floorToMinute(point.timestamp).getTime();
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
      const singleSeries = this.extractHistorianSeries(
        item.__legacyResponse,
        [tagName],
        true,
      );
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

    const parts =
      /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,7}))?)?$/.exec(text);
    if (parts) {
      const milliseconds = Number(`0.${parts[7] || '0'}`) * 1000;
      const date = new Date(
        Date.UTC(
          Number(parts[1]),
          Number(parts[2]) - 1,
          Number(parts[3]),
          Number(parts[4]),
          Number(parts[5]),
          Number(parts[6] || 0),
          Math.floor(milliseconds),
        ),
      );
      return Number.isNaN(date.getTime()) ? null : date;
    }

    return this.parseDate(text);
  }

  private downsampleSpeedSeries(
    speed: Map<number, number>,
    start: number,
    end: number,
    maxPoints: number,
  ): ScGlory3SpeedPoint[] {
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
    source: readonly ScGlory3SpeedPoint[],
    maxPoints: number,
  ): ScGlory3SpeedPoint[] {
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

  private downsampleRoute(route: readonly ScGlory3TrackingPoint[], maxPoints: number): ScGlory3TrackingPoint[] {
    if (route.length <= maxPoints) return [...route];
    const step = Math.max(1, Math.ceil(route.length / maxPoints));
    const result = route.filter((_, index) => index % step === 0);
    const last = route[route.length - 1];
    if (result[result.length - 1] !== last) result.push(last);
    return result;
  }

  private resolveModeProfileKey(label: string): string {
    const normalized = this.normalizeIdentity(label);
    const mode = SC_GLORY_3_REPORT_PROFILE.modes.find(
      (item) => this.normalizeIdentity(item.label) === normalized,
    );
    return mode?.key || SC_GLORY_3_REPORT_PROFILE.modes[0].key;
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
    if (speed === null) return 'SC GLORY 3 mode is unavailable because GPS speed is missing.';
    return `Derived from ${SC_GLORY_3_MODE_HISTORIAN_TAG}: ${speed.toFixed(2)} kn matches the SC GLORY 3 report rule for ${mode}.`;
  }

  private parseNumber(rawValue: unknown): number | null {
    if (rawValue === null || rawValue === undefined || rawValue === '') return null;
    const value = Number(String(rawValue).replace(/,/g, '').trim());
    return Number.isFinite(value) ? value : null;
  }

  private isScGlory3Profile(id: unknown, aliases: unknown, prefixes: unknown): boolean {
    const candidates = [
      id,
      ...(Array.isArray(aliases) ? aliases : []),
      ...(Array.isArray(prefixes) ? prefixes : []),
    ];
    return candidates.some((value) => {
      const identity = this.normalizeIdentity(value);
      return identity === 'scglory3';
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
