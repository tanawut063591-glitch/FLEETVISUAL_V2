import { Injectable } from '@angular/core';
import { Observable, from, of, throwError } from 'rxjs';
import { catchError, finalize, map, mergeMap, shareReplay, tap, toArray } from 'rxjs/operators';

import { NewHttpClientService } from '../../../../../shared/services/http-client1.service';
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
  normalizeModeFuelToOfficialTotal,
  scaleModeDetailFuelToTarget,
  roundPdf2,
} from '../../common/pdf-mode-parity';
import {
  SC_SULTAN_MODE_HISTORIAN_TAG,
  SC_SULTAN_REPORT_PROFILE,
} from './sc-sultan-report.profile';

export interface ScSultanEngineSummaryRow {
  key: 'port' | 'center' | 'starboard';
  label: string;
  averageRpm: number | null;
  maximumRpm: number | null;
  runningHours: number;
  fuelUsed: number;
  engineLoad?: number | null;
}

export interface ScSultanShaftSummaryRow {
  key: 'port' | 'center' | 'starboard';
  label: string;
  averageRpm: number | null;
  maximumRpm: number | null;
  runningHours: number;
}

export interface ScSultanAuxSummaryRow {
  key: 'port' | 'center' | 'starboard';
  label: string;
  runningHours: number;
  fuelUsed: number;
}

export interface ScSultanUtilizationRow {
  label: string;
  port: number;
  center: number;
  starboard: number;
}

export interface ScSultanModeSummaryRow {
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

export interface ScSultanPassageSummary {
  mainEngines: ScSultanEngineSummaryRow[];
  shafts: ScSultanShaftSummaryRow[];
  auxFuel: ScSultanAuxSummaryRow[];
  mainEngineFuelTotal: number;
  auxiliaryFuelTotal: number;
  averageSpeed: number | null;
  distanceNm: number;
}

export interface ScSultanModeDetail {
  key: string;
  label: string;
  summary: ScSultanPassageSummary;
}

export interface ScSultanTrackingPoint {
  timestamp: Date;
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
}

export interface ScSultanTrackingSummary {
  begin: ScSultanTrackingPoint | null;
  end: ScSultanTrackingPoint | null;
  distanceNm: number;
  route: ScSultanTrackingPoint[];
}

export interface ScSultanHourlyRow {
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
  portMainEngineLoad?: number | null;
  centerMainEngineLoad?: number | null;
  starboardMainEngineLoad?: number | null;
  totalFuel: number | null;
}

export interface ScSultanSpeedPoint {
  timestamp: Date;
  speed: number;
}

export interface ScSultanDailyUiReport {
  periodStart: Date;
  periodEnd: Date;
  loadedAt: Date;
  coveragePercent: number;
  averageSpeed: number | null;
  maximumSpeed: number | null;
  engineSummary: ScSultanEngineSummaryRow[];
  shaftSummary: ScSultanShaftSummaryRow[];
  auxSummary: ScSultanAuxSummaryRow[];
  utilization: ScSultanUtilizationRow[];
  mainEngineFuelTotal: number;
  auxiliaryFuelTotal: number;
  totalFuelUsed: number;
  modeSummary: ScSultanModeSummaryRow[];
  passageSummary: ScSultanPassageSummary;
  modeDetails?: ScSultanModeDetail[];
  tracking: ScSultanTrackingSummary;
  hourly: ScSultanHourlyRow[];
  speedSeries: ScSultanSpeedPoint[];
}

export type ScSultanUiPeriodKind = 'day' | 'range' | 'month';

export interface ScSultanDailyTrendRow {
  date: Date;
  totalFuelUsed: number;
  mainEngineFuelTotal: number;
  auxiliaryFuelTotal: number;
  distanceNm: number;
  coveragePercent: number;
  modeRunningHours: number;
}

export interface ScSultanPeriodUiReport extends ScSultanDailyUiReport {
  periodKind: ScSultanUiPeriodKind;
  dayCount: number;
  dailyTrend: ScSultanDailyTrendRow[];
}

interface NumericPoint {
  timestamp: Date;
  value: number;
}

interface ReportCacheEntry {
  value: ScSultanDailyUiReport;
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
  portMainEngineLoadSum: number;
  portMainEngineLoadCount: number;
  starboardMainEngineLoadSum: number;
  starboardMainEngineLoadCount: number;
}

const MINUTE_MS = 60_000;
const CACHE_TTL_MS = 5 * 60_000;
const MAX_INTERPOLATION_GAP_MINUTES = 5;
const MAX_PERIOD_DAYS = 31;

const TAGS = {
  gpsSpeed: 'SC_SULTAN-VES-GPS-SPEED',
  gpsLat: 'SC_SULTAN-VES-GPS-LAT',
  gpsLong: 'SC_SULTAN-VES-GPS-LONG',
  gpsHead: 'SC_SULTAN-VES-GPS-HEAD',
  mode: 'SC_SULTAN-VES-MODE',
  pmeSpeed: 'SC_SULTAN-PME-SPD',
  smeSpeed: 'SC_SULTAN-SME-SPD',
  ppsSpeed: 'SC_SULTAN-PPS-SPD',
  spsSpeed: 'SC_SULTAN-SPS-SPD',
  paeSpeed: 'SC_SULTAN-PAE-SPD',
  caeSpeed: 'SC_SULTAN-CAE-SPD',
  saeSpeed: 'SC_SULTAN-SAE-SPD',
  pmeFuelIn: 'SC_SULTAN-PME-FIN-VTOTAL',
  pmeFuelOut: 'SC_SULTAN-PME-FOUT-VTOTAL',
  smeFuelIn: 'SC_SULTAN-SME-FIN-VTOTAL',
  smeFuelOut: 'SC_SULTAN-SME-FOUT-VTOTAL',
  paeFuelIn: 'SC_SULTAN-PAE-FIN-VTOTAL',
  paeFuelOut: 'SC_SULTAN-PAE-FOUT-VTOTAL',
  caeFuelIn: 'SC_SULTAN-CAE-FIN-VTOTAL',
  caeFuelOut: 'SC_SULTAN-CAE-FOUT-VTOTAL',
  saeFuelIn: 'SC_SULTAN-SAE-FIN-VTOTAL',
  saeFuelOut: 'SC_SULTAN-SAE-FOUT-VTOTAL',
  pmeEngineLoad: 'SC_SULTAN-PME-ENGINE-LOAD',
  smeEngineLoad: 'SC_SULTAN-SME-ENGINE-LOAD',
} as const;

const ALL_TAGS = Object.values(TAGS);

@Injectable({ providedIn: 'root' })
export class ScSultanReportService implements VesselReportAdapter {
  readonly id = 'sc-sultan';
  readonly serviceLabel = 'SC SULTAN Report Service';
  readonly profileLabel = SC_SULTAN_REPORT_PROFILE.label;

  private readonly detailedReportCache = new Map<string, ReportCacheEntry>();
  private readonly detailedReportInFlight = new Map<string, Observable<ScSultanDailyUiReport>>();
  private readonly periodReportCache = new Map<string, { value: ScSultanPeriodUiReport; expiresAt: number }>();
  private readonly periodReportInFlight = new Map<string, Observable<ScSultanPeriodUiReport>>();

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
      return normalized === 'scsultan' || normalized === 'scenasultan';
    });
  }

  prepareProfileDocument(baseDocument: LiveReportProfileDocument): LiveReportProfileDocument {
    const profiles = (baseDocument?.profiles || []).filter(
      (profile) => !this.isScSultanProfile(profile?.id, profile?.aliases, profile?.prefixes),
    );

    return {
      ...baseDocument,
      profiles: [...profiles, SC_SULTAN_REPORT_PROFILE],
    };
  }

  enhanceSnapshot(
    snapshot: LiveReportSnapshot,
    currentData: Record<string, any> | null | undefined,
  ): LiveReportSnapshot {
    const rawMode = this.findCurrentTagValue(currentData, SC_SULTAN_MODE_HISTORIAN_TAG);
    const modeLabel = this.resolveModeFromCode(rawMode);

    if (!modeLabel) {
      return {
        ...snapshot,
        profileLabel: this.profileLabel,
        sourceReport: SC_SULTAN_REPORT_PROFILE.sourceReport || snapshot.sourceReport,
        currentMode: null,
        currentModeRawValue: rawMode === null || rawMode === undefined ? null : String(rawMode),
        modeSourceTag: SC_SULTAN_MODE_HISTORIAN_TAG,
        modeSource: 'unavailable',
        modeConfidence: null,
        modeReason: 'SC SULTAN mode requires a valid SC_SULTAN-VES-MODE value (1-10).',
        modes: SC_SULTAN_REPORT_PROFILE.modes.map((mode) => ({
          key: mode.key,
          label: mode.label,
          isCurrent: false,
        })),
      };
    }

    return {
      ...snapshot,
      profileLabel: this.profileLabel,
      sourceReport: SC_SULTAN_REPORT_PROFILE.sourceReport || snapshot.sourceReport,
      currentMode: modeLabel,
      currentModeRawValue: String(rawMode),
      modeSourceTag: SC_SULTAN_MODE_HISTORIAN_TAG,
      modeSource: 'verified-tag',
      modeConfidence: 'high',
      modeReason: `Verified from ${SC_SULTAN_MODE_HISTORIAN_TAG}: ${String(rawMode)} = ${modeLabel}.`,
      modes: SC_SULTAN_REPORT_PROFILE.modes.map((mode) => ({
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
      sourceTag: SC_SULTAN_MODE_HISTORIAN_TAG,
      eyebrow: 'SC SULTAN DAILY REPORT',
      title: 'Mode Summary',
      description: 'Mode values are read directly from the SC_SULTAN-VES-MODE historian tag.',
      qualityLabel: 'Verified · SC_SULTAN-VES-MODE',
    };
  }

  resolveHistorianModeLabel(rawValue: unknown): string | null {
    return this.resolveModeFromCode(rawValue);
  }

  loadDetailedDailyReport(
    periodStart: Date,
    periodEnd: Date,
    force = false,
  ): Observable<ScSultanDailyUiReport> {
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
    const completedDaily =
      start.getHours() === 0 &&
      start.getMinutes() === 0 &&
      end.getHours() === 23 &&
      end.getMinutes() === 59 &&
      end.getTime() - start.getTime() >= 23 * 60 * 60 * 1000;
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
    const request$ = historianRequest$.pipe(
        map((response) => this.buildDetailedDailyReport(response, start, end)),
        tap((value) => {
          this.detailedReportCache.set(key, {
            value,
            expiresAt: Date.now() + CACHE_TTL_MS,
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
    periodKind: ScSultanUiPeriodKind = 'range',
    force = false,
  ): Observable<ScSultanPeriodUiReport> {
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
      // Two concurrent day-sized historian requests keep monthly views responsive
      // without asking the backend for a very large multi-tag, 31-day payload at once.
      mergeMap(
        (chunk) => this.loadDetailedDailyReport(chunk.start, chunk.end, force),
        2,
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
        this.periodReportCache.set(key, {
          value,
          expiresAt: Date.now() + CACHE_TTL_MS,
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
    reports: readonly ScSultanDailyUiReport[],
    periodStart: Date,
    periodEnd: Date,
    periodKind: ScSultanUiPeriodKind,
  ): ScSultanPeriodUiReport {
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
        .filter((row): row is ScSultanEngineSummaryRow => !!row);
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
        engineLoad: this.average(
          rows
            .map((row) => row.engineLoad)
            .filter((value): value is number => value !== null && value !== undefined && Number.isFinite(value)),
        ),
      } satisfies ScSultanEngineSummaryRow;
    });

    const shaftSummary = (['port', 'starboard'] as const).map((key) => {
      const rows = reports
        .map((report) => report.shaftSummary.find((row) => row.key === key))
        .filter((row): row is ScSultanShaftSummaryRow => !!row);
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
      } satisfies ScSultanShaftSummaryRow;
    });

    const auxSummary = (['port', 'center', 'starboard'] as const).map((key) => {
      const rows = reports
        .map((report) => report.auxSummary.find((row) => row.key === key))
        .filter((row): row is ScSultanAuxSummaryRow => !!row);
      return {
        key,
        label: rows[0]?.label || (key === 'center' ? 'Ctr. A/E' : `${key} A/E`),
        runningHours: rows.reduce((sum, row) => sum + row.runningHours, 0),
        fuelUsed: rows.reduce((sum, row) => sum + row.fuelUsed, 0),
      } satisfies ScSultanAuxSummaryRow;
    });

    const mainEngineFuelTotal = engineSummary.reduce((sum, row) => sum + row.fuelUsed, 0);
    const auxiliaryFuelTotal = auxSummary.reduce((sum, row) => sum + row.fuelUsed, 0);
    const totalFuelUsed = mainEngineFuelTotal + auxiliaryFuelTotal;

    const portEngine = engineSummary.find((row) => row.key === 'port');
    const starboardEngine = engineSummary.find((row) => row.key === 'starboard');
    const portShaft = shaftSummary.find((row) => row.key === 'port');
    const starboardShaft = shaftSummary.find((row) => row.key === 'starboard');
    const utilization: ScSultanUtilizationRow[] = [
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
    const modeSummary = SC_SULTAN_REPORT_PROFILE.modes.map((profileMode) => {
      const rows = reports
        .map((report) => report.modeSummary.find((row) => row.key === profileMode.key))
        .filter((row): row is ScSultanModeSummaryRow => !!row);
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
      } satisfies ScSultanModeSummaryRow;
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
        .filter((row): row is ScSultanEngineSummaryRow => !!row);
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
      } satisfies ScSultanEngineSummaryRow;
    });
    const passageShafts = (['port', 'starboard'] as const).map((key) => {
      const rows = passageReports
        .map((report) => report.shafts.find((row) => row.key === key))
        .filter((row): row is ScSultanShaftSummaryRow => !!row);
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
      } satisfies ScSultanShaftSummaryRow;
    });
    const passageAuxFuel = (['port', 'center', 'starboard'] as const).map((key) => {
      const rows = passageReports
        .map((report) => report.auxFuel.find((row) => row.key === key))
        .filter((row): row is ScSultanAuxSummaryRow => !!row);
      return {
        key,
        label: rows[0]?.label || (key === 'center' ? 'Ctr. A/E' : `${key} A/E`),
        runningHours: rows.reduce((sum, row) => sum + row.runningHours, 0),
        fuelUsed: rows.reduce((sum, row) => sum + row.fuelUsed, 0),
      } satisfies ScSultanAuxSummaryRow;
    });
    const passageDistanceNm = passageReports.reduce((sum, report) => sum + report.distanceNm, 0);
    const passageAverageSpeedWeight = passageReports.reduce(
      (sum, report) => sum + (report.averageSpeed !== null ? Math.max(report.distanceNm, 0.01) : 0),
      0,
    );
    const passageSummary: ScSultanPassageSummary = {
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
    const tracking: ScSultanTrackingSummary = {
      begin: reports.find((report) => !!report.tracking.begin)?.tracking.begin || null,
      end: [...reports].reverse().find((report) => !!report.tracking.end)?.tracking.end || null,
      distanceNm: reports.reduce((sum, report) => sum + report.tracking.distanceNm, 0),
      route,
    };

    const hourly = Array.from({ length: 24 }, (_, hour): ScSultanHourlyRow => {
      const rows = reports
        .map((report) => report.hourly.find((row) => row.hour === hour))
        .filter((row): row is ScSultanHourlyRow => !!row && row.active);
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
          portMainEngineLoad: null,
          centerMainEngineLoad: null,
          starboardMainEngineLoad: null,
          totalFuel: null,
        };
      }

      const sumNullable = (selector: (row: ScSultanHourlyRow) => number | null): number =>
        rows.reduce((sum, row) => sum + (selector(row) || 0), 0);
      const averageNullable = (selector: (row: ScSultanHourlyRow) => number | null): number | null => {
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
        portMainEngineLoad: averageNullable((row) => row.portMainEngineLoad ?? null),
        centerMainEngineLoad: averageNullable((row) => row.centerMainEngineLoad ?? null),
        starboardMainEngineLoad: averageNullable((row) => row.starboardMainEngineLoad ?? null),
        totalFuel: sumNullable((row) => row.totalFuel),
      };
    });

    const allSpeedPoints = reports.flatMap((report) => report.speedSeries || []);
    const speedSeries = this.downsampleSpeedPoints(allSpeedPoints, 420);
    const dailyTrend: ScSultanDailyTrendRow[] = reports.map((report) => ({
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
  ): ScSultanDailyUiReport {
    const series = this.extractHistorianSeries(response, ALL_TAGS);
    const minuteStart = this.floorToMinute(periodStart).getTime();
    const minuteEnd = Math.max(minuteStart + MINUTE_MS, this.floorToMinute(periodEnd).getTime());
    const minuteCount = Math.max(1, Math.floor((minuteEnd - minuteStart) / MINUTE_MS) + 1);
    // Keep the same completed-Daily test used by loadDetailedDailyReport().
    // This local flag is required because buildDetailedDailyReport() has its own scope.
    const completedDaily =
      periodStart.getHours() === 0 &&
      periodStart.getMinutes() === 0 &&
      periodEnd.getHours() === 23 &&
      periodEnd.getMinutes() === 59 &&
      minuteEnd - minuteStart >= 23 * 60 * 60 * 1000;

    const gpsSpeed = this.buildInstantMap(series.get(this.tagKey(TAGS.gpsSpeed)) || []);
    const gpsLat = this.buildInstantMap(series.get(this.tagKey(TAGS.gpsLat)) || []);
    const gpsLong = this.buildInstantMap(series.get(this.tagKey(TAGS.gpsLong)) || []);
    const gpsHead = this.buildInstantMap(series.get(this.tagKey(TAGS.gpsHead)) || []);
    const modeCodePoints = series.get(this.tagKey(TAGS.mode)) || [];
    const modeCode = completedDaily
      ? buildExactMinuteValueMap(modeCodePoints, MINUTE_MS)
      : this.buildInstantMap(modeCodePoints);
    // SC SULTAN historian stores every engine/shaft speed tag in 0.1 RPM units
    // (for example 4724 means 472.4 RPM). The legacy PDF divides these tags by 10
    // before calculating Average/Max and running hours. Keeping the raw values here
    // made M/E Average/Max disappear (> 1200 RPM filter) and made shaft/A-E running
    // hours become 0 because their raw x10 values exceeded the valid RPM ranges.
    const pmeRpm = this.buildScaledInstantMap(series.get(this.tagKey(TAGS.pmeSpeed)) || [], 0.1);
    const smeRpm = this.buildScaledInstantMap(series.get(this.tagKey(TAGS.smeSpeed)) || [], 0.1);
    const ppsRpm = this.buildScaledInstantMap(series.get(this.tagKey(TAGS.ppsSpeed)) || [], 0.1);
    const spsRpm = this.buildScaledInstantMap(series.get(this.tagKey(TAGS.spsSpeed)) || [], 0.1);
    const paeRpm = this.buildScaledInstantMap(series.get(this.tagKey(TAGS.paeSpeed)) || [], 0.1);
    const caeRpm = this.buildScaledInstantMap(series.get(this.tagKey(TAGS.caeSpeed)) || [], 0.1);
    const saeRpm = this.buildScaledInstantMap(series.get(this.tagKey(TAGS.saeSpeed)) || [], 0.1);
    const pmeEngineLoad = this.buildInstantMap(series.get(this.tagKey(TAGS.pmeEngineLoad)) || []);
    const smeEngineLoad = this.buildInstantMap(series.get(this.tagKey(TAGS.smeEngineLoad)) || []);

    const pmeFuel = this.buildFuelMap(
      series.get(this.tagKey(TAGS.pmeFuelIn)) || [],
      series.get(this.tagKey(TAGS.pmeFuelOut)) || [],
      300,
    );
    const smeFuel = this.buildFuelMap(
      series.get(this.tagKey(TAGS.smeFuelIn)) || [],
      series.get(this.tagKey(TAGS.smeFuelOut)) || [],
      300,
    );
    const paeFuel = this.buildFuelMap(
      series.get(this.tagKey(TAGS.paeFuelIn)) || [],
      series.get(this.tagKey(TAGS.paeFuelOut)) || [],
      300,
    );
    const caeFuel = this.buildFuelMap(
      series.get(this.tagKey(TAGS.caeFuelIn)) || [],
      series.get(this.tagKey(TAGS.caeFuelOut)) || [],
      300,
    );
    const saeFuel = this.buildFuelMap(
      series.get(this.tagKey(TAGS.saeFuelIn)) || [],
      series.get(this.tagKey(TAGS.saeFuelOut)) || [],
      300,
    );

    const pmeDailyFuel = this.buildLegacyDailyFuelTotal(
      series.get(this.tagKey(TAGS.pmeFuelIn)) || [],
      series.get(this.tagKey(TAGS.pmeFuelOut)) || [],
    );
    const smeDailyFuel = this.buildLegacyDailyFuelTotal(
      series.get(this.tagKey(TAGS.smeFuelIn)) || [],
      series.get(this.tagKey(TAGS.smeFuelOut)) || [],
    );
    const paeDailyFuel = this.buildLegacyDailyFuelTotal(
      series.get(this.tagKey(TAGS.paeFuelIn)) || [],
      series.get(this.tagKey(TAGS.paeFuelOut)) || [],
    );
    const caeDailyFuel = this.buildLegacyDailyFuelTotal(
      series.get(this.tagKey(TAGS.caeFuelIn)) || [],
      series.get(this.tagKey(TAGS.caeFuelOut)) || [],
    );
    const saeDailyFuel = this.buildLegacyDailyFuelTotal(
      series.get(this.tagKey(TAGS.saeFuelIn)) || [],
      series.get(this.tagKey(TAGS.saeFuelOut)) || [],
    );

    // PDF page-2 Mode fuel must use the legacy SCReportingService raw totalizer deltas.
    // Do not interpolate totalizer gaps: a gap can move fuel into the wrong vessel Mode.
    const pmePdfModeFuel = buildLegacyPdfFuelDeltaMap(
      series.get(this.tagKey(TAGS.pmeFuelIn)) || [],
      series.get(this.tagKey(TAGS.pmeFuelOut)) || [],
      { supplyMaxDelta: 300, returnMaxDelta: 300, recoverAfterRejectedJump: true },
    );
    const smePdfModeFuel = buildLegacyPdfFuelDeltaMap(
      series.get(this.tagKey(TAGS.smeFuelIn)) || [],
      series.get(this.tagKey(TAGS.smeFuelOut)) || [],
      { supplyMaxDelta: 300, returnMaxDelta: 300, recoverAfterRejectedJump: true },
    );
    const paePdfModeFuel = buildLegacyPdfFuelDeltaMap(
      series.get(this.tagKey(TAGS.paeFuelIn)) || [],
      series.get(this.tagKey(TAGS.paeFuelOut)) || [],
      { supplyMaxDelta: 300, returnMaxDelta: 300, recoverAfterRejectedJump: true },
    );
    const caePdfModeFuel = buildLegacyPdfFuelDeltaMap(
      series.get(this.tagKey(TAGS.caeFuelIn)) || [],
      series.get(this.tagKey(TAGS.caeFuelOut)) || [],
      { supplyMaxDelta: 300, returnMaxDelta: 300, recoverAfterRejectedJump: true },
    );
    const saePdfModeFuel = buildLegacyPdfFuelDeltaMap(
      series.get(this.tagKey(TAGS.saeFuelIn)) || [],
      series.get(this.tagKey(TAGS.saeFuelOut)) || [],
      { supplyMaxDelta: 300, returnMaxDelta: 300, recoverAfterRejectedJump: true },
    );

    const elapsedHours = Math.max(
      MINUTE_MS / 3_600_000,
      (minuteEnd - minuteStart + MINUTE_MS) / 3_600_000,
    );
    const engineSummary: ScSultanEngineSummaryRow[] = [
      this.buildEngineSummary('port', 'Port M/E', pmeRpm, pmeDailyFuel, pmeEngineLoad),
      this.buildEngineSummary('starboard', 'Stb. M/E', smeRpm, smeDailyFuel, smeEngineLoad),
    ];
    const shaftSummary: ScSultanShaftSummaryRow[] = [
      this.buildShaftSummary('port', 'Port Shaft', ppsRpm, pmeRpm),
      this.buildShaftSummary('starboard', 'Stb. Shaft', spsRpm, smeRpm),
    ];
    const auxSummary: ScSultanAuxSummaryRow[] = [
      this.buildAuxSummary('port', 'Port A/E', paeRpm, paeDailyFuel),
      this.buildAuxSummary('center', 'Ctr. A/E', caeRpm, caeDailyFuel),
      this.buildAuxSummary('starboard', 'Stb. A/E', saeRpm, saeDailyFuel),
    ];

    const mainEngineFuelTotal = pmeDailyFuel + smeDailyFuel;
    const auxiliaryFuelTotal = paeDailyFuel + caeDailyFuel + saeDailyFuel;
    const totalFuelUsed = mainEngineFuelTotal + auxiliaryFuelTotal;

    const portEngine = engineSummary.find((row) => row.key === 'port')!;
    const starboardEngine = engineSummary.find((row) => row.key === 'starboard')!;
    const portShaft = shaftSummary.find((row) => row.key === 'port')!;
    const starboardShaft = shaftSummary.find((row) => row.key === 'starboard')!;
    const utilization: ScSultanUtilizationRow[] = [
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
      portMainEngineLoadSum: 0,
      portMainEngineLoadCount: 0,
      starboardMainEngineLoadSum: 0,
      starboardMainEngineLoadCount: 0,
    }));

    const modeMap = new Map<string, ScSultanModeSummaryRow>();
    const modeMinuteKeys = new Map<string, number[]>();
    for (const mode of SC_SULTAN_REPORT_PROFILE.modes) {
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
      modeMinuteKeys.set(mode.key, []);
    }

    let gpsAvailableMinutes = 0;
    let modeAvailableMinutes = 0;

    for (let bucket = minuteStart; bucket <= minuteEnd; bucket += MINUTE_MS) {
      const date = new Date(bucket);
      const hourData = hourlyAccumulators[date.getHours()];
      const speedValue = gpsSpeed.get(bucket);
      const speed = speedValue !== undefined && Number.isFinite(speedValue) ? Math.max(0, speedValue) : null;
      if (speed !== null) {
        gpsAvailableMinutes += 1;
        hourData.speedSum += speed;
        hourData.speedCount += 1;
      }
      const distance = speed !== null ? speed / 60 : 0;
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
      const pmeLoad = pmeEngineLoad.get(bucket);
      const smeLoad = smeEngineLoad.get(bucket);
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
        spsRpm.has(bucket) ||
        pmeEngineLoad.has(bucket) ||
        smeEngineLoad.has(bucket);
      if (hasMinuteTelemetry) hourData.active = true;

      if (pme >= 50 && pme <= 1200) hourData.portMainRunMinutes += 1;
      if (sme >= 50 && sme <= 1200) hourData.starboardMainRunMinutes += 1;
      if (pae >= 50 && pae <= 2000) hourData.portAuxRunMinutes += 1;
      if (cae >= 50 && cae <= 2000) hourData.centerAuxRunMinutes += 1;
      if (sae >= 50 && sae <= 2000) hourData.starboardAuxRunMinutes += 1;
      if (pps >= 50 && pps <= 1000 && pme >= 50 && pme <= 1000) hourData.portShaftRunMinutes += 1;
      if (sps >= 50 && sps <= 1000 && sme >= 50 && sme <= 1000) hourData.starboardShaftRunMinutes += 1;

      if (pps > 0 && pps <= 500) {
        hourData.portShaftRpmSum += pps;
        hourData.portShaftRpmCount += 1;
      }
      if (sps > 0 && sps <= 500) {
        hourData.starboardShaftRpmSum += sps;
        hourData.starboardShaftRpmCount += 1;
      }
      if (pmeLoad !== undefined && Number.isFinite(pmeLoad) && pmeLoad > 0) {
        hourData.portMainEngineLoadSum += pmeLoad;
        hourData.portMainEngineLoadCount += 1;
      }
      if (smeLoad !== undefined && Number.isFinite(smeLoad) && smeLoad > 0) {
        hourData.starboardMainEngineLoadSum += smeLoad;
        hourData.starboardMainEngineLoadCount += 1;
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
          modeMinuteKeys.get(modeKey)?.push(bucket);
        }
      }
    }

    const rawModeFuelTotal = Array.from(modeMap.values()).reduce((sum, row) => sum + row.fuelUsed, 0);
    const modeFuelScale = rawModeFuelTotal > 0 && totalFuelUsed >= 0 ? totalFuelUsed / rawModeFuelTotal : 0;
    const observedModeHours = Math.max(0, modeAvailableMinutes / 60);
    const rawModeSummary = SC_SULTAN_REPORT_PROFILE.modes.map((profileMode) => {
      const row = modeMap.get(profileMode.key)!;
      const fuelUsed = rawModeFuelTotal > 0 ? row.fuelUsed * modeFuelScale : 0;
      const fuelPercent = totalFuelUsed > 0 ? (fuelUsed / totalFuelUsed) * 100 : 0;
      const runningPercent = observedModeHours > 0 ? (row.runningHours / observedModeHours) * 100 : 0;
      return {
        ...row,
        fuelUsed,
        fuelPercent,
        runningPercent,
        litresPerNm: row.distanceNm >= 0.01 ? fuelUsed / row.distanceNm : null,
        litresPerHour: row.runningHours > 0 ? fuelUsed / row.runningHours : null,
      };
    });
    const normalizedModeSummary = normalizeModeFuelToOfficialTotal<ScSultanModeSummaryRow>(
      rawModeSummary,
      totalFuelUsed,
    );
    // SCSultan.cs has one vessel-specific display correction after proportional
    // fuel scaling: Mode code 9 / standby-2me subtracts 72.44 L. Fuel % remains
    // based on the pre-adjustment raw Mode fuel, matching the legacy PDF.
    const modeSummary = normalizedModeSummary.map((row) => {
      if (row.key !== 'standby-2me' || rawModeFuelTotal === 0) return row;
      const adjustedFuel = row.fuelUsed - 72.44;
      return {
        ...row,
        fuelUsed: roundPdf2(adjustedFuel),
        litresPerNm: row.distanceNm >= 0.01 ? roundPdf2(adjustedFuel / row.distanceNm) : null,
        litresPerHour: row.runningHours > 0 ? roundPdf2(adjustedFuel / row.runningHours) : null,
      };
    });

    const modeDetails: ScSultanModeDetail[] = modeSummary.map((mode) => {
      const rawSummary = this.buildPassageSummary(
        modeMinuteKeys.get(mode.key) || [],
        pmeRpm,
        smeRpm,
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
        pmeEngineLoad,
        smeEngineLoad,
        gpsSpeed,
      );
      return {
        key: mode.key,
        label: mode.label,
        summary: scaleModeDetailFuelToTarget(rawSummary, mode.fuelUsed),
      };
    });

    const dominantMode = [...modeSummary].sort((a, b) => {
      if (Math.abs(b.fuelUsed) !== Math.abs(a.fuelUsed)) return Math.abs(b.fuelUsed) - Math.abs(a.fuelUsed);
      return b.runningHours - a.runningHours;
    })[0];
    const passageSummary =
      modeDetails.find((detail) => detail.key === dominantMode?.key)?.summary ||
      this.buildPassageSummary([], pmeRpm, smeRpm, ppsRpm, spsRpm, paeRpm, caeRpm, saeRpm, pmePdfModeFuel, smePdfModeFuel, paePdfModeFuel, caePdfModeFuel, saePdfModeFuel, pmeEngineLoad, smeEngineLoad, gpsSpeed);

    const tracking = this.buildTrackingSummary(
      minuteStart,
      minuteEnd,
      gpsLat,
      gpsLong,
      gpsSpeed,
      gpsHead,
    );

    const hourly = hourlyAccumulators.map((item, hour): ScSultanHourlyRow => {
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
          portMainEngineLoad: null,
          centerMainEngineLoad: null,
          starboardMainEngineLoad: null,
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
        portShaftRpm: item.portShaftRpmCount > 0 ? item.portShaftRpmSum / item.portShaftRpmCount : 0,
        centerShaftRpm: 0,
        starboardShaftRpm: item.starboardShaftRpmCount > 0 ? item.starboardShaftRpmSum / item.starboardShaftRpmCount : 0,
        portMainEngineLoad: item.portMainEngineLoadCount > 0 ? item.portMainEngineLoadSum / item.portMainEngineLoadCount : 0,
        centerMainEngineLoad: 0,
        starboardMainEngineLoad: item.starboardMainEngineLoadCount > 0 ? item.starboardMainEngineLoadSum / item.starboardMainEngineLoadCount : 0,
        totalFuel: item.mainFuel + item.auxFuel,
      };
    });

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
      modeDetails,
      tracking,
      hourly,
      speedSeries,
    };
  }

  private buildScaledInstantMap(points: readonly NumericPoint[], scale: number): Map<number, number> {
    const raw = this.buildInstantMap(points);
    if (scale === 1) return raw;

    const scaled = new Map<number, number>();
    raw.forEach((value, bucket) => {
      if (Number.isFinite(value)) scaled.set(bucket, value * scale);
    });
    return scaled;
  }

  private buildEngineSummary(
    key: ScSultanEngineSummaryRow['key'],
    label: string,
    rpmMap: Map<number, number>,
    fuelUsed: number,
    engineLoadMap: Map<number, number>,
  ): ScSultanEngineSummaryRow {
    const rpmValues = Array.from(rpmMap.values()).filter((value) => value > 0 && value <= 1200);
    const runningMinutes = Array.from(rpmMap.values()).filter((value) => Number.isFinite(value) && value >= 50).length;
    const loadValues = Array.from(engineLoadMap.values()).filter((value) => value > 0 && Number.isFinite(value));
    return {
      key,
      label,
      averageRpm: this.average(rpmValues),
      maximumRpm: this.maximum(rpmValues),
      runningHours: Math.min(24, runningMinutes / 60),
      fuelUsed: Math.max(0, fuelUsed),
      engineLoad: this.average(loadValues),
    };
  }

  private buildShaftSummary(
    key: ScSultanShaftSummaryRow['key'],
    label: string,
    rpmMap: Map<number, number>,
    mainEngineRpm: Map<number, number>,
  ): ScSultanShaftSummaryRow {
    const rpmValues = Array.from(rpmMap.values()).filter((value) => value > 0 && value <= 500);
    let runningMinutes = 0;
    rpmMap.forEach((value, bucket) => {
      const me = mainEngineRpm.get(bucket) || 0;
      if (value >= 50 && value <= 1000 && me >= 50 && me <= 1000) runningMinutes += 1;
    });
    return {
      key,
      label,
      averageRpm: this.average(rpmValues),
      maximumRpm: this.maximum(rpmValues),
      runningHours: Math.min(24, runningMinutes / 60),
    };
  }

  private buildAuxSummary(
    key: ScSultanAuxSummaryRow['key'],
    label: string,
    rpmMap: Map<number, number>,
    fuelUsed: number,
  ): ScSultanAuxSummaryRow {
    const runningMinutes = Array.from(rpmMap.values()).filter((value) => value >= 50 && value <= 2000).length;
    return {
      key,
      label,
      runningHours: Math.min(24, runningMinutes / 60),
      fuelUsed: Math.max(0, fuelUsed),
    };
  }

  private buildPassageSummary(
    minuteKeys: readonly number[],
    pmeRpm: Map<number, number>,
    smeRpm: Map<number, number>,
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
    pmeEngineLoad: Map<number, number>,
    smeEngineLoad: Map<number, number>,
    gpsSpeed: Map<number, number>,
  ): ScSultanPassageSummary {
    const selectValues = (map: Map<number, number>, minInclusive = 0, maxInclusive = Number.POSITIVE_INFINITY) =>
      minuteKeys
        .map((bucket) => map.get(bucket))
        .filter((value): value is number => value !== undefined && Number.isFinite(value) && value >= minInclusive && value <= maxInclusive);
    const fuelFor = (map: Map<number, number>) => minuteKeys.reduce((sum, bucket) => sum + (map.get(bucket) || 0), 0);
    const runningHoursForAux = (map: Map<number, number>) =>
      minuteKeys.reduce((sum, bucket) => sum + ((map.get(bucket) || 0) >= 50 ? 1 / 60 : 0), 0);
    const coupledShaftValues = (shaft: Map<number, number>, engine: Map<number, number>) =>
      minuteKeys
        .filter((bucket) => {
          const shaftValue = shaft.get(bucket) || 0;
          const engineValue = engine.get(bucket) || 0;
          return shaftValue >= 50 && shaftValue <= 1000 && engineValue >= 50 && engineValue <= 1000;
        })
        .map((bucket) => shaft.get(bucket) || 0)
        .filter((value) => value > 0 && value <= 500);

    const pmeFuelValue = fuelFor(pmeFuel);
    const smeFuelValue = fuelFor(smeFuel);
    const paeFuelValue = fuelFor(paeFuel);
    const caeFuelValue = fuelFor(caeFuel);
    const saeFuelValue = fuelFor(saeFuel);
    const pmeValues = selectValues(pmeRpm, 0, 1200).filter((value) => value > 0);
    const smeValues = selectValues(smeRpm, 0, 1200).filter((value) => value > 0);
    const speedValues = selectValues(gpsSpeed, 0);
    const pmeLoadValues = selectValues(pmeEngineLoad, 0).filter((value) => value > 0);
    const smeLoadValues = selectValues(smeEngineLoad, 0).filter((value) => value > 0);

    return {
      mainEngines: [
        {
          key: 'port',
          label: 'Port M/E',
          averageRpm: this.average(pmeValues),
          maximumRpm: this.maximum(pmeValues),
          runningHours: pmeValues.filter((value) => value >= 50).length / 60,
          fuelUsed: pmeFuelValue,
          engineLoad: this.average(pmeLoadValues),
        },
        {
          key: 'starboard',
          label: 'Stb. M/E',
          averageRpm: this.average(smeValues),
          maximumRpm: this.maximum(smeValues),
          runningHours: smeValues.filter((value) => value >= 50).length / 60,
          fuelUsed: smeFuelValue,
          engineLoad: this.average(smeLoadValues),
        },
      ],
      shafts: [
        {
          key: 'port',
          label: 'Port Shaft',
          averageRpm: this.average(coupledShaftValues(ppsRpm, pmeRpm)),
          maximumRpm: this.maximum(coupledShaftValues(ppsRpm, pmeRpm)),
          runningHours: coupledShaftValues(ppsRpm, pmeRpm).length / 60,
        },
        {
          key: 'starboard',
          label: 'Stb. Shaft',
          averageRpm: this.average(coupledShaftValues(spsRpm, smeRpm)),
          maximumRpm: this.maximum(coupledShaftValues(spsRpm, smeRpm)),
          runningHours: coupledShaftValues(spsRpm, smeRpm).length / 60,
        },
      ],
      auxFuel: [
        { key: 'port', label: 'Port A/E', runningHours: runningHoursForAux(paeRpm), fuelUsed: paeFuelValue },
        { key: 'center', label: 'Ctr. A/E', runningHours: runningHoursForAux(caeRpm), fuelUsed: caeFuelValue },
        { key: 'starboard', label: 'Stb. A/E', runningHours: runningHoursForAux(saeRpm), fuelUsed: saeFuelValue },
      ],
      mainEngineFuelTotal: pmeFuelValue + smeFuelValue,
      auxiliaryFuelTotal: paeFuelValue + caeFuelValue + saeFuelValue,
      averageSpeed: this.average(speedValues),
      distanceNm: speedValues.reduce((sum, speed) => sum + speed / 60, 0),
    };
  }

  private buildTrackingSummary(
    minuteStart: number,
    minuteEnd: number,
    latitude: Map<number, number>,
    longitude: Map<number, number>,
    speed: Map<number, number>,
    heading: Map<number, number>,
  ): ScSultanTrackingSummary {
    const route: ScSultanTrackingPoint[] = [];
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

  private buildLegacyDailyFuelTotal(inPoints: readonly NumericPoint[], outPoints: readonly NumericPoint[]): number {
    const scan = (points: readonly NumericPoint[], totalRangeLimit: number): { min: number; max: number } => {
      let min = 0;
      let max = 0;
      for (const point of [...points].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())) {
        const value = point.value;
        if (!Number.isFinite(value) || value <= 0) continue;
        if (min === 0) {
          if (value < 100_000_000) min = value;
          continue;
        }
        if (value - min >= totalRangeLimit) continue;
        if (max > 0) {
          const step = value - max;
          if (step >= 0 && step <= 300) max = value;
        } else {
          const step = value - min;
          if (step >= 0 && step <= 300) max = value;
        }
      }
      return { min, max };
    };

    const input = scan(inPoints, 21_000);
    const output = scan(outPoints, 20_000);
    const total = (input.max - input.min) - (output.max - output.min);
    return Number.isFinite(total) && total > 0 ? total : 0;
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
        const bucket = previousBucket + (minute - 1) * MINUTE_MS;
        result.set(bucket, (result.get(bucket) || 0) + perMinute);
      }
    }
    return result;
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
        const timestamp = this.parseDate(this.getRecordTimestamp(record));
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
        const timestamp = this.parseDate(this.getRecordTimestamp(series));
        const value = this.parseNumber(this.getRecordValue(series));
        if (timestamp && value !== null && tagName) {
          this.pushSeriesPoint(result, tagName, timestamp, value);
        }
        return;
      }

      records.forEach((record: any) => {
        const timestamp = this.parseDate(this.getRecordTimestamp(record));
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

  private downsampleSpeedSeries(
    speed: Map<number, number>,
    start: number,
    end: number,
    maxPoints: number,
  ): ScSultanSpeedPoint[] {
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
    source: readonly ScSultanSpeedPoint[],
    maxPoints: number,
  ): ScSultanSpeedPoint[] {
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

  private downsampleRoute(route: readonly ScSultanTrackingPoint[], maxPoints: number): ScSultanTrackingPoint[] {
    if (route.length <= maxPoints) return [...route];
    const step = Math.max(1, Math.ceil(route.length / maxPoints));
    const result = route.filter((_, index) => index % step === 0);
    const last = route[route.length - 1];
    if (result[result.length - 1] !== last) result.push(last);
    return result;
  }

  private resolveModeProfileKey(label: string): string {
    const normalized = this.normalizeIdentity(label);
    const mode = SC_SULTAN_REPORT_PROFILE.modes.find(
      (item) => this.normalizeIdentity(item.label) === normalized,
    );
    return mode?.key || SC_SULTAN_REPORT_PROFILE.modes[0].key;
  }

  private resolveModeFromCode(rawValue: unknown): string | null {
    const numeric = this.parseNumber(rawValue);
    if (numeric === null) return null;
    const code = legacyConvertToInt32(numeric);
    if (code === null || code < 1 || code > 10) return null;
    const mode = SC_SULTAN_REPORT_PROFILE.modes.find((item) =>
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

  private isScSultanProfile(id: unknown, aliases: unknown, prefixes: unknown): boolean {
    const candidates = [
      id,
      ...(Array.isArray(aliases) ? aliases : []),
      ...(Array.isArray(prefixes) ? prefixes : []),
    ];
    return candidates.some((value) => {
      const normalized = this.normalizeIdentity(value);
      return normalized === 'scsultan' || normalized === 'scenasultan';
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
