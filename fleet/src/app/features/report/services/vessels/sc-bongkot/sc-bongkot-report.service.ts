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
  isCompletedDailyWindow,
  normalizeModeFuelToOfficialTotal,
} from '../../common/pdf-mode-parity';
import { calculateLegacyDailyFuelTotal, exactMinutePoints } from '../../common/legacy-daily-fuel';
import {
  SC_BONGKOT_MODE_HISTORIAN_TAG,
  SC_BONGKOT_REPORT_PROFILE,
} from './sc-bongkot-report.profile';

export interface ScBongkotEngineSummaryRow {
  key: 'port' | 'center' | 'starboard';
  label: string;
  averageRpm: number | null;
  maximumRpm: number | null;
  runningHours: number;
  fuelUsed: number;
}

export interface ScBongkotShaftSummaryRow {
  key: 'port' | 'center' | 'starboard';
  label: string;
  averageRpm: number | null;
  maximumRpm: number | null;
  runningHours: number;
}

export interface ScBongkotAuxSummaryRow {
  key: 'port' | 'center' | 'starboard' | 'fourth';
  label: string;
  runningHours: number;
  fuelUsed: number;
  averageRpm: number | null;
  maximumRpm: number | null;
}

export interface ScBongkotUtilizationRow {
  label: string;
  port: number;
  center: number;
  starboard: number;
}

export interface ScBongkotModeSummaryRow {
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

export interface ScBongkotPassageSummary {
  mainEngines: ScBongkotEngineSummaryRow[];
  shafts: ScBongkotShaftSummaryRow[];
  auxFuel: ScBongkotAuxSummaryRow[];
  mainEngineFuelTotal: number;
  auxiliaryFuelTotal: number;
  averageSpeed: number | null;
  distanceNm: number;
}

export interface ScBongkotModeDetail {
  key: string;
  label: string;
  summary: ScBongkotPassageSummary;
}

export interface ScBongkotTrackingPoint {
  timestamp: Date;
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
}

export interface ScBongkotTrackingSummary {
  begin: ScBongkotTrackingPoint | null;
  end: ScBongkotTrackingPoint | null;
  distanceNm: number;
  route: ScBongkotTrackingPoint[];
}

export interface ScBongkotHourlyRow {
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

export interface ScBongkotSpeedPoint {
  timestamp: Date;
  speed: number;
}

export interface ScBongkotDailyUiReport {
  periodStart: Date;
  periodEnd: Date;
  loadedAt: Date;
  coveragePercent: number;
  averageSpeed: number | null;
  maximumSpeed: number | null;
  engineSummary: ScBongkotEngineSummaryRow[];
  shaftSummary: ScBongkotShaftSummaryRow[];
  auxSummary: ScBongkotAuxSummaryRow[];
  utilization: ScBongkotUtilizationRow[];
  mainEngineFuelTotal: number;
  auxiliaryFuelTotal: number;
  totalFuelUsed: number;
  modeSummary: ScBongkotModeSummaryRow[];
  passageSummary: ScBongkotPassageSummary;
  modeDetails?: ScBongkotModeDetail[];
  tracking: ScBongkotTrackingSummary;
  hourly: ScBongkotHourlyRow[];
  speedSeries: ScBongkotSpeedPoint[];
}

export type ScBongkotUiPeriodKind = 'day' | 'range' | 'month';

export interface ScBongkotDailyTrendRow {
  date: Date;
  totalFuelUsed: number;
  mainEngineFuelTotal: number;
  auxiliaryFuelTotal: number;
  distanceNm: number;
  coveragePercent: number;
  modeRunningHours: number;
}

export interface ScBongkotPeriodUiReport extends ScBongkotDailyUiReport {
  periodKind: ScBongkotUiPeriodKind;
  dayCount: number;
  dailyTrend: ScBongkotDailyTrendRow[];
}

interface NumericPoint {
  timestamp: Date;
  value: number;
}

interface ReportCacheEntry {
  value: ScBongkotDailyUiReport;
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
const CACHE_TTL_MS = 5 * 60_000;
const MAX_INTERPOLATION_GAP_MINUTES = 5;
const MAX_PERIOD_DAYS = 31;

const TAGS = {
  gpsSpeed: 'A06-VES-GPS-SPEED',
  gpsLat: 'A06-VES-GPS-LAT',
  gpsLong: 'A06-VES-GPS-LONG',
  gpsHead: 'A06-VES-GPS-HEAD',
  mode: 'A06-VES-MODE',
  ae1Speed: 'A06-PME-SPD',
  ae2Speed: 'A06-SME-SPD',
  portMainSpeed: 'A06-PPS-SPD',
  starboardMainSpeed: 'A06-SPS-SPD',
  ae3Speed: 'A06-PAE-SPD',
  ae4Speed: 'A06-SAE-SPD',
  ae1FuelIn: 'A06-PME-FIN-VTOTAL',
  ae1FuelOut: 'A06-PME-FOUT-VTOTAL',
  ae2FuelIn: 'A06-SME-FIN-VTOTAL',
  ae2FuelOut: 'A06-SME-FOUT-VTOTAL',
  ae3FuelIn: 'A06-PAE-FIN-VTOTAL',
  ae3FuelOut: 'A06-PAE-FOUT-VTOTAL',
  ae4FuelIn: 'A06-SAE-FIN-VTOTAL',
  ae4FuelOut: 'A06-SAE-FOUT-VTOTAL',
} as const;

const ALL_TAGS = Object.values(TAGS);

@Injectable({ providedIn: 'root' })
export class ScBongkotReportService implements VesselReportAdapter {
  readonly id = 'sc-bongkot';
  readonly serviceLabel = 'SC BONGKOT Report Service';
  readonly profileLabel = SC_BONGKOT_REPORT_PROFILE.label;

  private readonly detailedReportCache = new Map<string, ReportCacheEntry>();
  private readonly detailedReportInFlight = new Map<string, Observable<ScBongkotDailyUiReport>>();
  private readonly periodReportCache = new Map<string, { value: ScBongkotPeriodUiReport; expiresAt: number }>();
  private readonly periodReportInFlight = new Map<string, Observable<ScBongkotPeriodUiReport>>();

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
      return normalized === 'scbongkot' || normalized === 'a06';
    });
  }

  prepareProfileDocument(baseDocument: LiveReportProfileDocument): LiveReportProfileDocument {
    const profiles = (baseDocument?.profiles || []).filter(
      (profile) => !this.isScBongkotProfile(profile?.id, profile?.aliases, profile?.prefixes),
    );

    return {
      ...baseDocument,
      profiles: [...profiles, SC_BONGKOT_REPORT_PROFILE],
    };
  }

  enhanceSnapshot(
    snapshot: LiveReportSnapshot,
    currentData: Record<string, any> | null | undefined,
  ): LiveReportSnapshot {
    const rawMode = this.findCurrentTagValue(currentData, SC_BONGKOT_MODE_HISTORIAN_TAG);
    const modeLabel = this.resolveModeFromCode(rawMode);

    if (!modeLabel) {
      return {
        ...snapshot,
        profileLabel: this.profileLabel,
        sourceReport: SC_BONGKOT_REPORT_PROFILE.sourceReport || snapshot.sourceReport,
        currentMode: null,
        currentModeRawValue: rawMode === null || rawMode === undefined ? null : String(rawMode),
        modeSourceTag: SC_BONGKOT_MODE_HISTORIAN_TAG,
        modeSource: 'unavailable',
        modeConfidence: null,
        modeReason: 'SC BONGKOT mode requires a valid A06-VES-MODE value (1-15).',
        modes: SC_BONGKOT_REPORT_PROFILE.modes.map((mode) => ({
          key: mode.key,
          label: mode.label,
          isCurrent: false,
        })),
      };
    }

    return {
      ...snapshot,
      profileLabel: this.profileLabel,
      sourceReport: SC_BONGKOT_REPORT_PROFILE.sourceReport || snapshot.sourceReport,
      currentMode: modeLabel,
      currentModeRawValue: String(rawMode),
      modeSourceTag: SC_BONGKOT_MODE_HISTORIAN_TAG,
      modeSource: 'verified-tag',
      modeConfidence: 'high',
      modeReason: `Verified from ${SC_BONGKOT_MODE_HISTORIAN_TAG}: ${String(rawMode)} = ${modeLabel}.`,
      modes: SC_BONGKOT_REPORT_PROFILE.modes.map((mode) => ({
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
      sourceTag: SC_BONGKOT_MODE_HISTORIAN_TAG,
      eyebrow: 'SC BONGKOT DAILY REPORT',
      title: 'Mode Summary',
      description: 'Mode values are read directly from the A06-VES-MODE historian tag.',
      qualityLabel: 'Verified · A06-VES-MODE',
    };
  }

  resolveHistorianModeLabel(rawValue: unknown): string | null {
    return this.resolveModeFromCode(rawValue);
  }

  loadDetailedDailyReport(
    periodStart: Date,
    periodEnd: Date,
    force = false,
  ): Observable<ScBongkotDailyUiReport> {
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
      start.getFullYear() === end.getFullYear() &&
      start.getMonth() === end.getMonth() &&
      start.getDate() === end.getDate();
    const historianEnd = completedDaily ? new Date(start.getTime() + 24 * 60 * MINUTE_MS) : end;
    const requestStartText = this.formatHistorianRequestTime(start);
    const requestEndText = this.formatHistorianRequestTime(historianEnd);
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
    periodKind: ScBongkotUiPeriodKind = 'range',
    force = false,
  ): Observable<ScBongkotPeriodUiReport> {
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
    reports: readonly ScBongkotDailyUiReport[],
    periodStart: Date,
    periodEnd: Date,
    periodKind: ScBongkotUiPeriodKind,
  ): ScBongkotPeriodUiReport {
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
        .filter((row): row is ScBongkotEngineSummaryRow => !!row);
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
      } satisfies ScBongkotEngineSummaryRow;
    });

    const shaftSummary: ScBongkotShaftSummaryRow[] = [];

    const auxSummary = (['port', 'center', 'starboard', 'fourth'] as const).map((key) => {
      const rows = reports
        .map((report) => report.auxSummary.find((row) => row.key === key))
        .filter((row): row is ScBongkotAuxSummaryRow => !!row);
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
      } satisfies ScBongkotAuxSummaryRow;
    });

    const mainEngineFuelTotal = 0;
    const auxiliaryFuelTotal = auxSummary.reduce((sum, row) => sum + row.fuelUsed, 0);
    const totalFuelUsed = mainEngineFuelTotal + auxiliaryFuelTotal;

    const portEngine = engineSummary.find((row) => row.key === 'port');
    const starboardEngine = engineSummary.find((row) => row.key === 'starboard');
    const utilization: ScBongkotUtilizationRow[] = [
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
    const modeSummary = SC_BONGKOT_REPORT_PROFILE.modes.map((profileMode) => {
      const rows = reports
        .map((report) => report.modeSummary.find((row) => row.key === profileMode.key))
        .filter((row): row is ScBongkotModeSummaryRow => !!row);
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
      } satisfies ScBongkotModeSummaryRow;
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
        .filter((row): row is ScBongkotEngineSummaryRow => !!row);
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
      } satisfies ScBongkotEngineSummaryRow;
    });
    const passageShafts: ScBongkotShaftSummaryRow[] = [];
    const passageAuxFuel = (['port', 'center', 'starboard', 'fourth'] as const).map((key) => {
      const rows = passageReports
        .map((report) => report.auxFuel.find((row) => row.key === key))
        .filter((row): row is ScBongkotAuxSummaryRow => !!row);
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
      } satisfies ScBongkotAuxSummaryRow;
    });
    const passageDistanceNm = passageReports.reduce((sum, report) => sum + report.distanceNm, 0);
    const passageAverageSpeedWeight = passageReports.reduce(
      (sum, report) => sum + (report.averageSpeed !== null ? Math.max(report.distanceNm, 0.01) : 0),
      0,
    );
    const passageSummary: ScBongkotPassageSummary = {
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
    const tracking: ScBongkotTrackingSummary = {
      begin: reports.find((report) => !!report.tracking.begin)?.tracking.begin || null,
      end: [...reports].reverse().find((report) => !!report.tracking.end)?.tracking.end || null,
      distanceNm: reports.reduce((sum, report) => sum + report.tracking.distanceNm, 0),
      route,
    };

    const hourly = Array.from({ length: 24 }, (_, hour): ScBongkotHourlyRow => {
      const rows = reports
        .map((report) => report.hourly.find((row) => row.hour === hour))
        .filter((row): row is ScBongkotHourlyRow => !!row && row.active);
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

      const sumNullable = (selector: (row: ScBongkotHourlyRow) => number | null): number =>
        rows.reduce((sum, row) => sum + (selector(row) || 0), 0);
      const averageNullable = (selector: (row: ScBongkotHourlyRow) => number | null): number | null => {
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
    const dailyTrend: ScBongkotDailyTrendRow[] = reports.map((report) => ({
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
  ): ScBongkotDailyUiReport {
    const series = this.extractHistorianSeries(response, ALL_TAGS);
    const minuteStart = this.floorToMinute(periodStart).getTime();
    const minuteEnd = Math.max(minuteStart + MINUTE_MS, this.floorToMinute(periodEnd).getTime());
    const completedDaily = isCompletedDailyWindow(
      this.floorToMinute(periodStart),
      this.floorToMinute(periodEnd),
      MINUTE_MS,
    );
    const boundaryBucket = minuteEnd + MINUTE_MS;
    const pdfDataEnd = completedDaily ? boundaryBucket : minuteEnd;
    const minuteCount = Math.max(1, Math.floor((minuteEnd - minuteStart) / MINUTE_MS) + 1);

    const gpsSpeed = this.buildInstantMap(series.get(this.tagKey(TAGS.gpsSpeed)) || []);
    const gpsLat = this.buildInstantMap(series.get(this.tagKey(TAGS.gpsLat)) || []);
    const gpsLong = this.buildInstantMap(series.get(this.tagKey(TAGS.gpsLong)) || []);
    const gpsHead = this.buildInstantMap(series.get(this.tagKey(TAGS.gpsHead)) || []);
    const modeCodePoints = series.get(this.tagKey(TAGS.mode)) || [];
    const modeCode = completedDaily
      ? buildExactMinuteValueMap(modeCodePoints, MINUTE_MS)
      : this.buildInstantMap(modeCodePoints);

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

    // Engine Summary in SCBongkot.cs uses CalFLowTotalSME, not the interpolated
    // map above.  Preserve its very large accepted step (20,000), ignored 999999
    // sentinel, 26,000 span and negative-total clamp exactly.
    const bongkotFuelRule = {
      input: { totalRangeLimit: 26_000, stepLimit: 20_000, stepInclusive: false, initialValueLimit: 100_000_000 },
      output: { totalRangeLimit: 26_000, stepLimit: 20_000, stepInclusive: true, initialValueLimit: 100_000_000 },
      ignoredValues: [999_999],
      clampNegative: true,
    } as const;
    const pdfFuelPoints = (tag: string) => exactMinutePoints(
      series.get(this.tagKey(tag)) || [], minuteStart, pdfDataEnd,
    );
    const ae1DailyFuel = calculateLegacyDailyFuelTotal(pdfFuelPoints(TAGS.ae1FuelIn), pdfFuelPoints(TAGS.ae1FuelOut), bongkotFuelRule);
    const ae2DailyFuel = calculateLegacyDailyFuelTotal(pdfFuelPoints(TAGS.ae2FuelIn), pdfFuelPoints(TAGS.ae2FuelOut), bongkotFuelRule);
    const ae3DailyFuel = calculateLegacyDailyFuelTotal(pdfFuelPoints(TAGS.ae3FuelIn), pdfFuelPoints(TAGS.ae3FuelOut), bongkotFuelRule);
    const ae4DailyFuel = calculateLegacyDailyFuelTotal(pdfFuelPoints(TAGS.ae4FuelIn), pdfFuelPoints(TAGS.ae4FuelOut), bongkotFuelRule);

    // PDF page-2 Mode fuel must use the legacy SCReportingService raw totalizer deltas.
    // Do not interpolate totalizer gaps: a gap can move fuel into the wrong vessel Mode.
    const ae1PdfModeFuel = buildLegacyPdfFuelDeltaMap(
      series.get(this.tagKey(TAGS.ae1FuelIn)) || [],
      series.get(this.tagKey(TAGS.ae1FuelOut)) || [],
      { supplyMaxDelta: 550, returnMaxDelta: 550, recoverAfterRejectedJump: true },
    );
    const ae2PdfModeFuel = buildLegacyPdfFuelDeltaMap(
      series.get(this.tagKey(TAGS.ae2FuelIn)) || [],
      series.get(this.tagKey(TAGS.ae2FuelOut)) || [],
      { supplyMaxDelta: 550, returnMaxDelta: 550, recoverAfterRejectedJump: true },
    );
    const ae3PdfModeFuel = buildLegacyPdfFuelDeltaMap(
      series.get(this.tagKey(TAGS.ae3FuelIn)) || [],
      series.get(this.tagKey(TAGS.ae3FuelOut)) || [],
      { supplyMaxDelta: 550, returnMaxDelta: 550, recoverAfterRejectedJump: true },
    );
    const ae4PdfModeFuel = buildLegacyPdfFuelDeltaMap(
      series.get(this.tagKey(TAGS.ae4FuelIn)) || [],
      series.get(this.tagKey(TAGS.ae4FuelOut)) || [],
      { supplyMaxDelta: 550, returnMaxDelta: 550, recoverAfterRejectedJump: true },
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

    const engineSummary: ScBongkotEngineSummaryRow[] = [
      this.buildEngineSummary('port', 'Port M/E', portMainRpm, new Map<number, number>(), elapsedHours, 500),
      this.buildEngineSummary('starboard', 'Stb. M/E', starboardMainRpm, new Map<number, number>(), elapsedHours, 500),
    ];
    const shaftSummary: ScBongkotShaftSummaryRow[] = [];
    const auxSummary: ScBongkotAuxSummaryRow[] = [
      { ...this.buildAuxSummary('port', 'A/E1', ae1Rpm, ae1Fuel), fuelUsed: ae1DailyFuel },
      { ...this.buildAuxSummary('center', 'A/E2', ae2Rpm, ae2Fuel), fuelUsed: ae2DailyFuel },
      { ...this.buildAuxSummary('starboard', 'A/E3', ae3Rpm, ae3Fuel), fuelUsed: ae3DailyFuel },
      { ...this.buildAuxSummary('fourth', 'A/E4', ae4Rpm, ae4Fuel), fuelUsed: ae4DailyFuel },
    ];

    const mainEngineFuelTotal = 0;
    const auxiliaryFuelTotal = auxSummary.reduce((sum, row) => sum + row.fuelUsed, 0);
    const totalFuelUsed = auxiliaryFuelTotal;
    const portEngine = engineSummary.find((row) => row.key === 'port')!;
    const starboardEngine = engineSummary.find((row) => row.key === 'starboard')!;
    const utilization: ScBongkotUtilizationRow[] = [
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

    const modeMap = new Map<string, ScBongkotModeSummaryRow>();
    for (const mode of SC_BONGKOT_REPORT_PROFILE.modes) {
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

    const modeMinuteKeys = new Map<string, number[]>();
    for (const mode of SC_BONGKOT_REPORT_PROFILE.modes) {
      modeMinuteKeys.set(mode.key, []);
    }
    let gpsAvailableMinutes = 0;

    for (let bucket = minuteStart; bucket <= minuteEnd; bucket += MINUTE_MS) {
      const hourData = hourlyAccumulators[new Date(bucket).getHours()];
      const rawSpeed = gpsSpeed.get(bucket);
      const speed = rawSpeed !== undefined && Number.isFinite(rawSpeed) ? Math.max(0, rawSpeed) : null;
      const rawModeCode = modeCode.get(bucket);
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

      const hasMinuteTelemetry = speed !== null || rawModeCode !== undefined || ae1Fuel.has(bucket) || ae2Fuel.has(bucket) ||
        ae3Fuel.has(bucket) || ae4Fuel.has(bucket) || portMainRpm.has(bucket) || starboardMainRpm.has(bucket) ||
        ae1Rpm.has(bucket) || ae2Rpm.has(bucket) || ae3Rpm.has(bucket) || ae4Rpm.has(bucket);
      if (hasMinuteTelemetry) hourData.active = true;

      if (portMain >= 500) hourData.portMainRunMinutes += 1;
      if (starboardMain >= 500) hourData.starboardMainRunMinutes += 1;
      if (ae1 > 0) hourData.portAuxRunMinutes += 1;
      if (ae2 > 0) hourData.centerAuxRunMinutes += 1;
      if (ae3 > 0) hourData.starboardAuxRunMinutes += 1;
      if (ae4 > 0) hourData.fourthAuxRunMinutes += 1;

      const modeLabel = this.resolveModeFromCode(rawModeCode);
      if (modeLabel) {
        const modeKey = this.resolveModeProfileKey(modeLabel);
        const mode = modeMap.get(modeKey);
        if (mode) {
          const pdfModeMinuteFuel = (ae1PdfModeFuel.get(bucket) || 0) + (ae2PdfModeFuel.get(bucket) || 0) + (ae3PdfModeFuel.get(bucket) || 0) + (ae4PdfModeFuel.get(bucket) || 0);
          mode.fuelUsed += pdfModeMinuteFuel;
          mode.runningHours += 1 / 60;
          mode.distanceNm += distance;
        }
        modeMinuteKeys.get(modeKey)?.push(bucket);
      }
    }

    const rawModeFuelTotal = Array.from(modeMap.values()).reduce((sum, row) => sum + row.fuelUsed, 0);
    const modeFuelScale = rawModeFuelTotal > 0 && totalFuelUsed > 0 ? totalFuelUsed / rawModeFuelTotal : 1;
    const standbyKey = 'standby';
    const nonStandbyHours = Array.from(modeMap.values())
      .filter((row) => row.key !== standbyKey)
      .reduce((sum, row) => sum + row.runningHours, 0);
    const standby = modeMap.get(standbyKey);
    if (standby) {
      standby.runningHours = Math.max(0, elapsedHours - nonStandbyHours);
    }

    const rawModeSummary = SC_BONGKOT_REPORT_PROFILE.modes.map((profileMode) => {
      const row = modeMap.get(profileMode.key)!;
      const fuelUsed = rawModeFuelTotal > 0 ? row.fuelUsed * modeFuelScale : 0;
      const runningHours = row.runningHours;
      return {
        ...row,
        fuelUsed,
        fuelPercent: totalFuelUsed > 0 ? (fuelUsed / totalFuelUsed) * 100 : 0,
        runningHours,
        runningPercent: elapsedHours > 0 ? (runningHours / elapsedHours) * 100 : 0,
        litresPerNm: row.distanceNm > 0 ? fuelUsed / row.distanceNm : null,
        litresPerHour: runningHours > 0 ? fuelUsed / runningHours : null,
      };
    });
    const modeSummary = normalizeModeFuelToOfficialTotal<ScBongkotModeSummaryRow>(
      rawModeSummary,
      totalFuelUsed,
    );

    const modeDetails: ScBongkotModeDetail[] = modeSummary.map((mode) => ({
      key: mode.key,
      label: mode.label,
      summary: this.buildPassageSummary(
        modeMinuteKeys.get(mode.key) || [],
        portMainRpm,
        starboardMainRpm,
        ae1Rpm,
        ae2Rpm,
        ae3Rpm,
        ae4Rpm,
        ae1PdfModeFuel,
        ae2PdfModeFuel,
        ae3PdfModeFuel,
        ae4PdfModeFuel,
        gpsSpeed,
        mode.fuelUsed,
      ),
    }));

    const dominantMode = modeSummary.reduce<ScBongkotModeSummaryRow | null>(
      (best, row) => !best || Math.abs(row.fuelUsed) > Math.abs(best.fuelUsed) ? row : best,
      null,
    );
    const passageSummary =
      modeDetails.find((detail) => detail.key === dominantMode?.key)?.summary ||
      this.buildPassageSummary(
        [], portMainRpm, starboardMainRpm, ae1Rpm, ae2Rpm, ae3Rpm, ae4Rpm,
        ae1PdfModeFuel, ae2PdfModeFuel, ae3PdfModeFuel, ae4PdfModeFuel, gpsSpeed, 0,
      );
    const tracking = this.buildTrackingSummary(minuteStart, minuteEnd, gpsLat, gpsLong, gpsSpeed, gpsHead);

    const hourly: ScBongkotHourlyRow[] = hourlyAccumulators.map((item, hour) => {
      if (!item.active) {
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
      return {
        hour, active: true,
        distanceNm: item.distanceNm,
        speedKnots: item.speedCount > 0 ? item.speedSum / item.speedCount : null,
        mainFuel: 0,
        auxFuel: item.auxFuel,
        portMainFuel: 0,
        centerMainFuel: 0,
        starboardMainFuel: 0,
        portAuxFuel: item.portAuxFuel,
        centerAuxFuel: item.centerAuxFuel,
        starboardAuxFuel: item.starboardAuxFuel,
        fourthAuxFuel: item.fourthAuxFuel,
        portMainRunningHours: item.portMainRunMinutes / 60,
        centerMainRunningHours: 0,
        starboardMainRunningHours: item.starboardMainRunMinutes / 60,
        portAuxRunningHours: item.portAuxRunMinutes / 60,
        centerAuxRunningHours: item.centerAuxRunMinutes / 60,
        starboardAuxRunningHours: item.starboardAuxRunMinutes / 60,
        fourthAuxRunningHours: item.fourthAuxRunMinutes / 60,
        portShaftRunningHours: 0,
        centerShaftRunningHours: 0,
        starboardShaftRunningHours: 0,
        portShaftRpm: 0,
        centerShaftRpm: 0,
        starboardShaftRpm: 0,
        totalFuel: item.auxFuel,
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
      modeSummary, passageSummary, modeDetails, tracking, hourly, speedSeries,
    };
  }

  private buildEngineSummary(
    key: ScBongkotEngineSummaryRow['key'],
    label: string,
    rpmMap: Map<number, number>,
    fuelMap: Map<number, number>,
    _elapsedHours: number,
    runningThreshold = 500,
  ): ScBongkotEngineSummaryRow {
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
    key: ScBongkotShaftSummaryRow['key'],
    label: string,
    rpmMap: Map<number, number>,
    mainEngineRpm: Map<number, number>,
  ): ScBongkotShaftSummaryRow {
    const rpmValues = Array.from(rpmMap.values()).filter((value) => value >= 0 && value <= 1600);
    let runningMinutes = 0;
    rpmMap.forEach((value, bucket) => {
      if (value > 0 && (mainEngineRpm.get(bucket) || 0) > 0) runningMinutes += 1;
    });
    return { key, label, averageRpm: this.average(rpmValues.filter((value) => value > 0)), maximumRpm: this.maximum(rpmValues), runningHours: runningMinutes / 60 };
  }

  private buildAuxSummary(
    key: ScBongkotAuxSummaryRow['key'],
    label: string,
    rpmMap: Map<number, number>,
    fuelMap: Map<number, number>,
  ): ScBongkotAuxSummaryRow {
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
  ): ScBongkotPassageSummary {
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
    key: ScBongkotEngineSummaryRow['key'], label: string, rpmValues: number[], fuelUsed: number, runningThreshold = 500,
  ): ScBongkotEngineSummaryRow {
    return { key, label, averageRpm: this.average(rpmValues), maximumRpm: this.maximum(rpmValues), runningHours: rpmValues.filter((value) => value >= runningThreshold).length / 60, fuelUsed };
  }

  private buildFilteredShaftSummary(
    key: ScBongkotShaftSummaryRow['key'], label: string, rpmValues: number[],
  ): ScBongkotShaftSummaryRow {
    return { key, label, averageRpm: this.average(rpmValues), maximumRpm: this.maximum(rpmValues), runningHours: rpmValues.length / 60 };
  }

  private buildTrackingSummary(
    minuteStart: number,
    minuteEnd: number,
    latitude: Map<number, number>,
    longitude: Map<number, number>,
    speed: Map<number, number>,
    heading: Map<number, number>,
  ): ScBongkotTrackingSummary {
    const route: ScBongkotTrackingPoint[] = [];
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
  ): ScBongkotSpeedPoint[] {
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
    source: readonly ScBongkotSpeedPoint[],
    maxPoints: number,
  ): ScBongkotSpeedPoint[] {
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

  private downsampleRoute(route: readonly ScBongkotTrackingPoint[], maxPoints: number): ScBongkotTrackingPoint[] {
    if (route.length <= maxPoints) return [...route];
    const step = Math.max(1, Math.ceil(route.length / maxPoints));
    const result = route.filter((_, index) => index % step === 0);
    const last = route[route.length - 1];
    if (result[result.length - 1] !== last) result.push(last);
    return result;
  }

  private resolveModeProfileKey(label: string): string {
    const normalized = this.normalizeIdentity(label);
    const mode = SC_BONGKOT_REPORT_PROFILE.modes.find(
      (item) => this.normalizeIdentity(item.label) === normalized,
    );
    return mode?.key || SC_BONGKOT_REPORT_PROFILE.modes[0].key;
  }

  private resolveModeFromCode(rawValue: unknown): string | null {
    const numeric = this.parseNumber(rawValue);
    if (numeric === null) return null;
    const code = legacyConvertToInt32(numeric);
    if (code === null || code < 1 || code > 15) return null;
    const mode = SC_BONGKOT_REPORT_PROFILE.modes.find((item) =>
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

  private isScBongkotProfile(id: unknown, aliases: unknown, prefixes: unknown): boolean {
    const candidates = [
      id,
      ...(Array.isArray(aliases) ? aliases : []),
      ...(Array.isArray(prefixes) ? prefixes : []),
    ];
    return candidates.some((value) => {
      const normalized = this.normalizeIdentity(value);
      return normalized === 'scbongkot' || normalized === 'a06';
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
