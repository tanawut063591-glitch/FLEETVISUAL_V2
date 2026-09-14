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
  buildGpsPdfParityModeSummary,
  buildLegacyPdfFuelDeltaMap,
  isCompletedDailyWindow,
} from '../../common/pdf-mode-parity';
import {
  SC_GLORY_2_MODE_HISTORIAN_TAG,
  SC_GLORY_2_REPORT_PROFILE,
} from './sc-glory-2-report.profile';

export interface ScGlory2EngineSummaryRow {
  key: 'port' | 'center' | 'starboard';
  label: string;
  averageRpm: number | null;
  maximumRpm: number | null;
  runningHours: number;
  fuelUsed: number;
}

export interface ScGlory2ShaftSummaryRow {
  key: 'port' | 'center' | 'starboard';
  label: string;
  averageRpm: number | null;
  maximumRpm: number | null;
  runningHours: number;
}

export interface ScGlory2AuxSummaryRow {
  key: 'port' | 'starboard';
  label: string;
  runningHours: number;
  fuelUsed: number;
}

export interface ScGlory2UtilizationRow {
  label: string;
  port: number;
  center: number;
  starboard: number;
}

export interface ScGlory2ModeSummaryRow {
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

export interface ScGlory2PassageSummary {
  mainEngines: ScGlory2EngineSummaryRow[];
  shafts: ScGlory2ShaftSummaryRow[];
  auxFuel: ScGlory2AuxSummaryRow[];
  mainEngineFuelTotal: number;
  auxiliaryFuelTotal: number;
  averageSpeed: number | null;
  distanceNm: number;
}

export interface ScGlory2TrackingPoint {
  timestamp: Date;
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
}

export interface ScGlory2TrackingSummary {
  begin: ScGlory2TrackingPoint | null;
  end: ScGlory2TrackingPoint | null;
  distanceNm: number;
  route: ScGlory2TrackingPoint[];
}

export interface ScGlory2HourlyRow {
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

export interface ScGlory2SpeedPoint {
  timestamp: Date;
  speed: number;
}

export interface ScGlory2DailyUiReport {
  periodStart: Date;
  periodEnd: Date;
  loadedAt: Date;
  coveragePercent: number;
  averageSpeed: number | null;
  maximumSpeed: number | null;
  engineSummary: ScGlory2EngineSummaryRow[];
  shaftSummary: ScGlory2ShaftSummaryRow[];
  auxSummary: ScGlory2AuxSummaryRow[];
  utilization: ScGlory2UtilizationRow[];
  mainEngineFuelTotal: number;
  auxiliaryFuelTotal: number;
  totalFuelUsed: number;
  modeSummary: ScGlory2ModeSummaryRow[];
  passageSummary: ScGlory2PassageSummary;
  tracking: ScGlory2TrackingSummary;
  hourly: ScGlory2HourlyRow[];
  speedSeries: ScGlory2SpeedPoint[];
}

export type ScGlory2UiPeriodKind = 'day' | 'range' | 'month';

export interface ScGlory2DailyTrendRow {
  date: Date;
  totalFuelUsed: number;
  mainEngineFuelTotal: number;
  auxiliaryFuelTotal: number;
  distanceNm: number;
  coveragePercent: number;
  modeRunningHours: number;
}

export interface ScGlory2PeriodUiReport extends ScGlory2DailyUiReport {
  periodKind: ScGlory2UiPeriodKind;
  dayCount: number;
  dailyTrend: ScGlory2DailyTrendRow[];
}

interface NumericPoint {
  timestamp: Date;
  value: number;
}

interface ReportCacheEntry {
  value: ScGlory2DailyUiReport;
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
const CACHE_TTL_MS = 5 * 60_000;
const MAX_INTERPOLATION_GAP_MINUTES = 5;
const MAX_PERIOD_DAYS = 31;

const TAGS = {
  gpsSpeed: 'A02-VES-GPS-SPEED',
  gpsLat: 'A02-VES-GPS-LAT',
  gpsLong: 'A02-VES-GPS-LONG',
  gpsHead: 'A02-VES-GPS-HEAD',
  pmeSpeed: 'A02-PME-SPD',
  cmeSpeed: 'A02-CME-SPD',
  smeSpeed: 'A02-SME-SPD',
  ppsSpeed: 'A02-PPS-SPD',
  cpsSpeed: 'A02-CPS-SPD',
  spsSpeed: 'A02-SPS-SPD',
  paeSpeed: 'A02-PAE-SPD',
  saeSpeed: 'A02-SAE-SPD',
  pmeFuelIn: 'A02-PME-FIN-VTOTAL',
  pmeFuelOut: 'A02-PME-FOUT-VTOTAL',
  cmeFuelIn: 'A02-CME-FIN-VTOTAL',
  cmeFuelOut: 'A02-CME-FOUT-VTOTAL',
  smeFuelIn: 'A02-SME-FIN-VTOTAL',
  smeFuelOut: 'A02-SME-FOUT-VTOTAL',
  paeFuelIn: 'A02-PAE-FIN-VTOTAL',
  paeFuelOut: 'A02-PAE-FOUT-VTOTAL',
  saeFuelIn: 'A02-SAE-FIN-VTOTAL',
  saeFuelOut: 'A02-SAE-FOUT-VTOTAL',
} as const;

const ALL_TAGS = Object.values(TAGS);

@Injectable({ providedIn: 'root' })
export class ScGlory2ReportService implements VesselReportAdapter {
  readonly id = 'sc-glory-2';
  readonly serviceLabel = 'SC GLORY 2 Report Service';
  readonly profileLabel = SC_GLORY_2_REPORT_PROFILE.label;

  private readonly detailedReportCache = new Map<string, ReportCacheEntry>();
  private readonly detailedReportInFlight = new Map<string, Observable<ScGlory2DailyUiReport>>();
  private readonly periodReportCache = new Map<string, { value: ScGlory2PeriodUiReport; expiresAt: number }>();
  private readonly periodReportInFlight = new Map<string, Observable<ScGlory2PeriodUiReport>>();

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
      const identity = this.normalizeIdentity(value);
      return identity === 'scglory2' || identity === 'a02';
    });
  }

  prepareProfileDocument(baseDocument: LiveReportProfileDocument): LiveReportProfileDocument {
    const profiles = (baseDocument?.profiles || []).filter(
      (profile) => !this.isScGlory2Profile(profile?.id, profile?.aliases, profile?.prefixes),
    );

    return {
      ...baseDocument,
      profiles: [...profiles, SC_GLORY_2_REPORT_PROFILE],
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
        sourceReport: SC_GLORY_2_REPORT_PROFILE.sourceReport || snapshot.sourceReport,
        currentMode: null,
        currentModeRawValue: speed === null ? null : String(speed),
        modeSourceTag: SC_GLORY_2_MODE_HISTORIAN_TAG,
        modeSource: 'unavailable',
        modeConfidence: null,
        modeReason: 'SC GLORY 2 mode requires a valid A02 GPS speed value.',
        modes: SC_GLORY_2_REPORT_PROFILE.modes.map((mode) => ({
          key: mode.key,
          label: mode.label,
          isCurrent: false,
        })),
      };
    }

    return {
      ...snapshot,
      profileLabel: this.profileLabel,
      sourceReport: SC_GLORY_2_REPORT_PROFILE.sourceReport || snapshot.sourceReport,
      currentMode: modeLabel,
      currentModeRawValue: speed === null ? null : String(speed),
      modeSourceTag: SC_GLORY_2_MODE_HISTORIAN_TAG,
      modeSource: 'estimated-telemetry',
      modeConfidence: 'high',
      modeReason: this.buildModeReason(speed, modeLabel),
      modes: SC_GLORY_2_REPORT_PROFILE.modes.map((mode) => ({
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
      sourceTag: enabled ? SC_GLORY_2_MODE_HISTORIAN_TAG : null,
      eyebrow: 'SC GLORY 2 DAILY REPORT',
      title: 'Mode Summary',
      description: 'Mode values are aggregated inside the full daily historian report.',
      qualityLabel: 'Derived · SC GLORY 2 report rule',
    };
  }

  resolveHistorianModeLabel(rawValue: unknown): string | null {
    return this.resolveModeFromGpsSpeed(this.parseNumber(rawValue));
  }

  loadDetailedDailyReport(
    periodStart: Date,
    periodEnd: Date,
    force = false,
  ): Observable<ScGlory2DailyUiReport> {
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
    const completedDaily = isCompletedDailyWindow(start, end, MINUTE_MS);
    const historianEnd = completedDaily
      ? new Date(start.getTime() + 24 * 60 * MINUTE_MS)
      : end;
    const requestStartText = this.formatHistorianRequestTime(start);
    const requestEndText = this.formatHistorianRequestTime(historianEnd);

    // Completed Daily UI must read the historian exactly like SCReportingService/PDF:
    // one tag per loggergethistorianvalues request, including next-day 00:00.
    const historianRequest$: Observable<any> = completedDaily
      ? from(ALL_TAGS).pipe(
          mergeMap(
            (tagName) =>
              this.newHttp.getRawData(requestStartText, requestEndText, [{ name: tagName, tagName }]).pipe(
                map((response) => ({ __legacyTagName: tagName, __legacyResponse: response })),
              ),
            1,
          ),
          toArray(),
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
        shareReplay({ bufferSize: 1, refCount: false }),
      );

    this.detailedReportInFlight.set(key, request$);
    return request$;
  }

  loadPeriodReport(
    periodStart: Date,
    periodEnd: Date,
    periodKind: ScGlory2UiPeriodKind = 'range',
    force = false,
  ): Observable<ScGlory2PeriodUiReport> {
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
      // without asking the backend for a very large 25-tag, 31-day payload at once.
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
      shareReplay({ bufferSize: 1, refCount: false }),
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
    reports: readonly ScGlory2DailyUiReport[],
    periodStart: Date,
    periodEnd: Date,
    periodKind: ScGlory2UiPeriodKind,
  ): ScGlory2PeriodUiReport {
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
        .filter((row): row is ScGlory2EngineSummaryRow => !!row);
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
      } satisfies ScGlory2EngineSummaryRow;
    });

    const shaftSummary = (['port', 'center', 'starboard'] as const).map((key) => {
      const rows = reports
        .map((report) => report.shaftSummary.find((row) => row.key === key))
        .filter((row): row is ScGlory2ShaftSummaryRow => !!row);
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
      } satisfies ScGlory2ShaftSummaryRow;
    });

    const auxSummary = (['port', 'starboard'] as const).map((key) => {
      const rows = reports
        .map((report) => report.auxSummary.find((row) => row.key === key))
        .filter((row): row is ScGlory2AuxSummaryRow => !!row);
      return {
        key,
        label: rows[0]?.label || `${key} A/E`,
        runningHours: rows.reduce((sum, row) => sum + row.runningHours, 0),
        fuelUsed: rows.reduce((sum, row) => sum + row.fuelUsed, 0),
      } satisfies ScGlory2AuxSummaryRow;
    });

    const mainEngineFuelTotal = engineSummary.reduce((sum, row) => sum + row.fuelUsed, 0);
    const auxiliaryFuelTotal = auxSummary.reduce((sum, row) => sum + row.fuelUsed, 0);
    const totalFuelUsed = mainEngineFuelTotal + auxiliaryFuelTotal;

    const utilization: ScGlory2UtilizationRow[] = [
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
    const modeSummary = SC_GLORY_2_REPORT_PROFILE.modes.map((profileMode) => {
      const rows = reports
        .map((report) => report.modeSummary.find((row) => row.key === profileMode.key))
        .filter((row): row is ScGlory2ModeSummaryRow => !!row);
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
      } satisfies ScGlory2ModeSummaryRow;
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
        .filter((row): row is ScGlory2EngineSummaryRow => !!row);
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
      } satisfies ScGlory2EngineSummaryRow;
    });
    const passageShafts = (['port', 'center', 'starboard'] as const).map((key) => {
      const rows = passageReports
        .map((report) => report.shafts.find((row) => row.key === key))
        .filter((row): row is ScGlory2ShaftSummaryRow => !!row);
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
      } satisfies ScGlory2ShaftSummaryRow;
    });
    const passageAuxFuel = (['port', 'starboard'] as const).map((key) => {
      const rows = passageReports
        .map((report) => report.auxFuel.find((row) => row.key === key))
        .filter((row): row is ScGlory2AuxSummaryRow => !!row);
      return {
        key,
        label: rows[0]?.label || `${key} A/E`,
        runningHours: rows.reduce((sum, row) => sum + row.runningHours, 0),
        fuelUsed: rows.reduce((sum, row) => sum + row.fuelUsed, 0),
      } satisfies ScGlory2AuxSummaryRow;
    });
    const passageDistanceNm = passageReports.reduce((sum, report) => sum + report.distanceNm, 0);
    const passageAverageSpeedWeight = passageReports.reduce(
      (sum, report) => sum + (report.averageSpeed !== null ? Math.max(report.distanceNm, 0.01) : 0),
      0,
    );
    const passageSummary: ScGlory2PassageSummary = {
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
    const tracking: ScGlory2TrackingSummary = {
      begin: reports.find((report) => !!report.tracking.begin)?.tracking.begin || null,
      end: [...reports].reverse().find((report) => !!report.tracking.end)?.tracking.end || null,
      distanceNm: reports.reduce((sum, report) => sum + report.tracking.distanceNm, 0),
      route,
    };

    const hourly = Array.from({ length: 24 }, (_, hour): ScGlory2HourlyRow => {
      const rows = reports
        .map((report) => report.hourly.find((row) => row.hour === hour))
        .filter((row): row is ScGlory2HourlyRow => !!row && row.active);
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

      const sumNullable = (selector: (row: ScGlory2HourlyRow) => number | null): number =>
        rows.reduce((sum, row) => sum + (selector(row) || 0), 0);
      const averageNullable = (selector: (row: ScGlory2HourlyRow) => number | null): number | null => {
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
    const dailyTrend: ScGlory2DailyTrendRow[] = reports.map((report) => ({
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
  ): ScGlory2DailyUiReport {
    const series = this.extractHistorianSeries(response, ALL_TAGS);
    const minuteStart = this.floorToMinute(periodStart).getTime();
    const minuteEnd = Math.max(minuteStart + MINUTE_MS, this.floorToMinute(periodEnd).getTime());
    const completedDaily = isCompletedDailyWindow(
      this.floorToMinute(periodStart),
      this.floorToMinute(periodEnd),
      MINUTE_MS,
    );
    const pdfModeDataEnd = completedDaily
      ? minuteStart + 24 * 60 * MINUTE_MS
      : minuteEnd;
    const minuteCount = Math.max(1, Math.floor((minuteEnd - minuteStart) / MINUTE_MS) + 1);

    const gpsSpeed = this.buildInstantMap(series.get(this.tagKey(TAGS.gpsSpeed)) || []);
    const gpsLat = this.buildInstantMap(series.get(this.tagKey(TAGS.gpsLat)) || []);
    const gpsLong = this.buildInstantMap(series.get(this.tagKey(TAGS.gpsLong)) || []);
    const gpsHead = this.buildInstantMap(series.get(this.tagKey(TAGS.gpsHead)) || []);

    const pmeRpm = this.buildCounterRateMap(series.get(this.tagKey(TAGS.pmeSpeed)) || [], 8, 2000);
    const cmeRpm = this.buildCounterRateMap(series.get(this.tagKey(TAGS.cmeSpeed)) || [], 8, 2000);
    const smeRpm = this.buildCounterRateMap(series.get(this.tagKey(TAGS.smeSpeed)) || [], 8, 2000);
    const ppsRpm = this.buildCounterRateMap(series.get(this.tagKey(TAGS.ppsSpeed)) || [], 12, 800);
    const cpsRpm = this.buildCounterRateMap(series.get(this.tagKey(TAGS.cpsSpeed)) || [], 12, 800);
    const spsRpm = this.buildCounterRateMap(series.get(this.tagKey(TAGS.spsSpeed)) || [], 12, 800);
    const paeRpm = this.buildCounterRateMap(series.get(this.tagKey(TAGS.paeSpeed)) || [], 4, 2000);
    const saeRpm = this.buildCounterRateMap(series.get(this.tagKey(TAGS.saeSpeed)) || [], 4, 2000);

    const pmeFuel = this.buildFuelMap(
      series.get(this.tagKey(TAGS.pmeFuelIn)) || [],
      series.get(this.tagKey(TAGS.pmeFuelOut)) || [],
      100,
    );
    const cmeFuel = this.buildFuelMap(
      series.get(this.tagKey(TAGS.cmeFuelIn)) || [],
      series.get(this.tagKey(TAGS.cmeFuelOut)) || [],
      100,
    );
    const smeFuel = this.buildFuelMap(
      series.get(this.tagKey(TAGS.smeFuelIn)) || [],
      series.get(this.tagKey(TAGS.smeFuelOut)) || [],
      200,
    );
    const paeFuel = this.buildFuelMap(
      series.get(this.tagKey(TAGS.paeFuelIn)) || [],
      series.get(this.tagKey(TAGS.paeFuelOut)) || [],
      100,
    );
    const saeFuel = this.buildFuelMap(
      series.get(this.tagKey(TAGS.saeFuelIn)) || [],
      series.get(this.tagKey(TAGS.saeFuelOut)) || [],
      100,
    );

    const elapsedHours = Math.max(MINUTE_MS / 3_600_000, (minuteEnd - minuteStart + MINUTE_MS) / 3_600_000);
    const engineSummary: ScGlory2EngineSummaryRow[] = [
      this.buildEngineSummary('port', 'Port M/E', pmeRpm, pmeFuel, elapsedHours),
      this.buildEngineSummary('center', 'Ctr. M/E', cmeRpm, cmeFuel, elapsedHours),
      this.buildEngineSummary('starboard', 'Stb. M/E', smeRpm, smeFuel, elapsedHours),
    ];

    const shaftSummary: ScGlory2ShaftSummaryRow[] = [
      this.buildShaftSummary('port', 'Port Shaft', ppsRpm, pmeRpm),
      this.buildShaftSummary('center', 'Ctr. Shaft', cpsRpm, cmeRpm),
      this.buildShaftSummary('starboard', 'Stb. Shaft', spsRpm, smeRpm),
    ];

    const auxSummary: ScGlory2AuxSummaryRow[] = [
      this.buildAuxSummary('port', 'Port A/E', paeRpm, paeFuel),
      this.buildAuxSummary('starboard', 'Stb. A/E', saeRpm, saeFuel),
    ];

    const mainEngineFuelTotal = engineSummary.reduce((sum, row) => sum + row.fuelUsed, 0);
    const auxiliaryFuelTotal = auxSummary.reduce((sum, row) => sum + row.fuelUsed, 0);
    const totalFuelUsed = mainEngineFuelTotal + auxiliaryFuelTotal;

    const utilization: ScGlory2UtilizationRow[] = [
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

    const modeMap = new Map<string, ScGlory2ModeSummaryRow>();
    for (const mode of SC_GLORY_2_REPORT_PROFILE.modes) {
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

      if (speed !== null) {
        const modeLabel = this.resolveModeFromGpsSpeed(speed);
        if (modeLabel) {
          const modeKey = this.resolveModeProfileKey(modeLabel);
          const mode = modeMap.get(modeKey);
          if (mode) {
            mode.fuelUsed += minuteFuel;
            mode.runningHours += 1 / 60;
            mode.distanceNm += distance;
          }
          if (modeLabel === 'Passage') {
            passageMinuteKeys.push(bucket);
          }
        }
      }
    }

    const pdfModePMEFuel = buildLegacyPdfFuelDeltaMap(
      series.get(this.tagKey(TAGS.pmeFuelIn)) || [],
      series.get(this.tagKey(TAGS.pmeFuelOut)) || [],
      { supplyMaxDelta: 100, returnMaxDelta: 100, recoverAfterRejectedJump: false, minuteMs: MINUTE_MS },
    );
    const pdfModeCMEFuel = buildLegacyPdfFuelDeltaMap(
      series.get(this.tagKey(TAGS.cmeFuelIn)) || [],
      series.get(this.tagKey(TAGS.cmeFuelOut)) || [],
      { supplyMaxDelta: 100, returnMaxDelta: 100, recoverAfterRejectedJump: false, minuteMs: MINUTE_MS },
    );
    const pdfModeSMEFuel = buildLegacyPdfFuelDeltaMap(
      series.get(this.tagKey(TAGS.smeFuelIn)) || [],
      series.get(this.tagKey(TAGS.smeFuelOut)) || [],
      { supplyMaxDelta: 100, returnMaxDelta: 100, recoverAfterRejectedJump: false, minuteMs: MINUTE_MS },
    );
    const pdfModePAEFuel = buildLegacyPdfFuelDeltaMap(
      series.get(this.tagKey(TAGS.paeFuelIn)) || [],
      series.get(this.tagKey(TAGS.paeFuelOut)) || [],
      { supplyMaxDelta: 1000, returnMaxDelta: 1000, recoverAfterRejectedJump: false, minuteMs: MINUTE_MS },
    );
    const pdfModeSAEFuel = buildLegacyPdfFuelDeltaMap(
      series.get(this.tagKey(TAGS.saeFuelIn)) || [],
      series.get(this.tagKey(TAGS.saeFuelOut)) || [],
      { supplyMaxDelta: 1000, returnMaxDelta: 1000, recoverAfterRejectedJump: false, minuteMs: MINUTE_MS },
    );

    const pdfParityMode = buildGpsPdfParityModeSummary({
      modes: SC_GLORY_2_REPORT_PROFILE.modes,
      minuteStart,
      dataEnd: pdfModeDataEnd,
      completedDaily,
      minuteMs: MINUTE_MS,
      officialTotalFuel: totalFuelUsed,
      gpsSpeed,
      minuteFuelAt: (minute) =>
        (pdfModePMEFuel.get(minute) || 0) +
        (pdfModeCMEFuel.get(minute) || 0) +
        (pdfModeSMEFuel.get(minute) || 0) +
        (pdfModePAEFuel.get(minute) || 0) +
        (pdfModeSAEFuel.get(minute) || 0),
      resolveModeLabel: (speed) => this.resolveModeFromGpsSpeed(speed),
      resolveModeKey: (label) => this.resolveModeProfileKey(label),
      standbyLabel: 'Standby',
    });
    const modeSummary = pdfParityMode.modeSummary as ScGlory2ModeSummaryRow[];

    const passageSummary = this.buildPassageSummary(
      passageMinuteKeys,
      pmeRpm,
      cmeRpm,
      smeRpm,
      ppsRpm,
      cpsRpm,
      spsRpm,
      pmeFuel,
      cmeFuel,
      smeFuel,
      paeFuel,
      saeFuel,
      gpsSpeed,
    );

    const tracking = this.buildTrackingSummary(
      minuteStart,
      minuteEnd,
      gpsLat,
      gpsLong,
      gpsSpeed,
      gpsHead,
    );

    const hourly = hourlyAccumulators.map((item, hour): ScGlory2HourlyRow => {
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

    const speedSeries = this.downsampleSpeedSeries(gpsSpeed, minuteStart, minuteEnd, 1600);
    const validSpeedValues = Array.from(gpsSpeed.entries())
      .filter(
        ([bucket, value]) =>
          bucket >= minuteStart && bucket <= minuteEnd && value >= 0 && Number.isFinite(value),
      )
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

  private buildEngineSummary(
    key: ScGlory2EngineSummaryRow['key'],
    label: string,
    rpmMap: Map<number, number>,
    fuelMap: Map<number, number>,
    _elapsedHours: number,
  ): ScGlory2EngineSummaryRow {
    const rpmValues = Array.from(rpmMap.values()).filter((value) => value >= 0 && value <= 2000);
    const runningMinutes = rpmValues.filter((value) => value >= 100).length;
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
    key: ScGlory2ShaftSummaryRow['key'],
    label: string,
    rpmMap: Map<number, number>,
    mainEngineRpm: Map<number, number>,
  ): ScGlory2ShaftSummaryRow {
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
    key: ScGlory2AuxSummaryRow['key'],
    label: string,
    rpmMap: Map<number, number>,
    fuelMap: Map<number, number>,
  ): ScGlory2AuxSummaryRow {
    const runningMinutes = Array.from(rpmMap.values()).filter((value) => value >= 100).length;
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
    cmeRpm: Map<number, number>,
    smeRpm: Map<number, number>,
    ppsRpm: Map<number, number>,
    cpsRpm: Map<number, number>,
    spsRpm: Map<number, number>,
    pmeFuel: Map<number, number>,
    cmeFuel: Map<number, number>,
    smeFuel: Map<number, number>,
    paeFuel: Map<number, number>,
    saeFuel: Map<number, number>,
    gpsSpeed: Map<number, number>,
  ): ScGlory2PassageSummary {
    const selectValues = (map: Map<number, number>, min = 0) =>
      minuteKeys
        .map((bucket) => map.get(bucket))
        .filter((value): value is number => value !== undefined && Number.isFinite(value) && value > min);
    const fuelFor = (map: Map<number, number>) =>
      minuteKeys.reduce((sum, bucket) => sum + (map.get(bucket) || 0), 0);

    const pmeFuelValue = fuelFor(pmeFuel);
    const cmeFuelValue = fuelFor(cmeFuel);
    const smeFuelValue = fuelFor(smeFuel);
    const paeFuelValue = fuelFor(paeFuel);
    const saeFuelValue = fuelFor(saeFuel);
    const speedValues = selectValues(gpsSpeed, 0);

    return {
      mainEngines: [
        this.buildFilteredEngineSummary('port', 'Port M/E', selectValues(pmeRpm, 0), pmeFuelValue),
        this.buildFilteredEngineSummary('center', 'Ctr. M/E', selectValues(cmeRpm, 0), cmeFuelValue),
        this.buildFilteredEngineSummary('starboard', 'Stb. M/E', selectValues(smeRpm, 0), smeFuelValue),
      ],
      shafts: [
        this.buildFilteredShaftSummary('port', 'Port Shaft', selectValues(ppsRpm, 0)),
        this.buildFilteredShaftSummary('center', 'Ctr. Shaft', selectValues(cpsRpm, 0)),
        this.buildFilteredShaftSummary('starboard', 'Stb. Shaft', selectValues(spsRpm, 0)),
      ],
      auxFuel: [
        { key: 'port', label: 'Port A/E', runningHours: 0, fuelUsed: paeFuelValue },
        { key: 'starboard', label: 'Stb. A/E', runningHours: 0, fuelUsed: saeFuelValue },
      ],
      mainEngineFuelTotal: pmeFuelValue + cmeFuelValue + smeFuelValue,
      auxiliaryFuelTotal: paeFuelValue + saeFuelValue,
      averageSpeed: this.average(speedValues),
      distanceNm: speedValues.reduce((sum, speed) => sum + speed / 60, 0),
    };
  }

  private buildFilteredEngineSummary(
    key: ScGlory2EngineSummaryRow['key'],
    label: string,
    rpmValues: number[],
    fuelUsed: number,
  ): ScGlory2EngineSummaryRow {
    return {
      key,
      label,
      averageRpm: this.average(rpmValues),
      maximumRpm: this.maximum(rpmValues),
      runningHours: rpmValues.length / 60,
      fuelUsed,
    };
  }

  private buildFilteredShaftSummary(
    key: ScGlory2ShaftSummaryRow['key'],
    label: string,
    rpmValues: number[],
  ): ScGlory2ShaftSummaryRow {
    return {
      key,
      label,
      averageRpm: this.average(rpmValues),
      maximumRpm: this.maximum(rpmValues),
      runningHours: rpmValues.length / 60,
    };
  }

  private buildTrackingSummary(
    minuteStart: number,
    minuteEnd: number,
    latitude: Map<number, number>,
    longitude: Map<number, number>,
    speed: Map<number, number>,
    heading: Map<number, number>,
  ): ScGlory2TrackingSummary {
    const route: ScGlory2TrackingPoint[] = [];
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
    maxDeltaPerMinute = 100,
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
    maxDeltaPerMinute: number,
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
      if (perMinute > maxDeltaPerMinute) {
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
  ): ScGlory2SpeedPoint[] {
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
    source: readonly ScGlory2SpeedPoint[],
    maxPoints: number,
  ): ScGlory2SpeedPoint[] {
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

  private downsampleRoute(route: readonly ScGlory2TrackingPoint[], maxPoints: number): ScGlory2TrackingPoint[] {
    if (route.length <= maxPoints) return [...route];
    const step = Math.max(1, Math.ceil(route.length / maxPoints));
    const result = route.filter((_, index) => index % step === 0);
    const last = route[route.length - 1];
    if (result[result.length - 1] !== last) result.push(last);
    return result;
  }

  private resolveModeProfileKey(label: string): string {
    const normalized = this.normalizeIdentity(label);
    const mode = SC_GLORY_2_REPORT_PROFILE.modes.find(
      (item) => this.normalizeIdentity(item.label) === normalized,
    );
    return mode?.key || SC_GLORY_2_REPORT_PROFILE.modes[0].key;
  }

  private resolveModeFromGpsSpeed(speed: number | null): string | null {
    if (speed === null || !Number.isFinite(speed) || speed < 0 || speed > 80) return null;
    if (speed <= 2) return 'Standby';
    if (speed <= 3.5) return 'Cargo Operation';
    if (speed <= 10) return 'Manoeuvring';
    if (speed <= 12) return 'Sea Passage Economics';
    return 'Passage';
  }

  private buildModeReason(speed: number | null, mode: string): string {
    if (speed === null) return 'SC GLORY 2 mode is unavailable because GPS speed is missing.';
    return `Derived from ${SC_GLORY_2_MODE_HISTORIAN_TAG}: ${speed.toFixed(2)} kn matches the SC GLORY 2 report rule for ${mode}.`;
  }

  private parseNumber(rawValue: unknown): number | null {
    if (rawValue === null || rawValue === undefined || rawValue === '') return null;
    const value = Number(String(rawValue).replace(/,/g, '').trim());
    return Number.isFinite(value) ? value : null;
  }

  private isScGlory2Profile(id: unknown, aliases: unknown, prefixes: unknown): boolean {
    const candidates = [
      id,
      ...(Array.isArray(aliases) ? aliases : []),
      ...(Array.isArray(prefixes) ? prefixes : []),
    ];
    return candidates.some((value) => {
      const identity = this.normalizeIdentity(value);
      return identity === 'scglory2' || identity === 'a02';
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
