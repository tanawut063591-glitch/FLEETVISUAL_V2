import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { BehaviorSubject, Observable, Subject, Subscription, combineLatest, from, merge, of, throwError } from 'rxjs';
import {
  auditTime,
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  finalize,
  map,
  shareReplay,
  switchMap,
  take,
  takeUntil,
  tap,
  timeout,
} from 'rxjs/operators';

import { HttpClientService } from '../../shared/services/http-client.service';
import { NewHttpClientService } from '../../shared/services/http-client1.service';
import { FvRealtimeService } from '../../shared/services/fv-realtime.service';
import { DateFormatService } from '../../shared/services/date-format.service';
import { PdfFileService } from '../../shared/services/pdf-file.service';
import { VesselStorageService } from '../../shared/services/vessel-storage.service';
import * as fvInfoReducer from '../../store/reducers/fv-info.reducer';
import {
  LiveReportEngineSnapshot,
  LiveReportMetric,
  LiveReportModeSnapshot,
  LiveReportProfileDocument,
  LiveReportSnapshot,
  LiveReportTab,
} from './models/live-report.model';
import { LiveReportService } from '../../shared/services/live-report.service';
import {
  ReportPdfCacheService,
  ReportPdfCacheValue,
} from '../../shared/services/report-pdf-cache.service';
import { ClientPdfExportService } from '../../shared/services/client-pdf-export.service';
import {
  OfficialReportArchiveEntry,
  OfficialReportLibraryService,
} from '../../shared/services/official-report-library.service';
import {
  VesselModeHistoryConfig,
  VesselReportAdapter,
} from './services/common/vessel-report-adapter';
import { ReportVesselServiceResolver } from './services/report-vessel-service-resolver.service';
import { PremiumPieChartPoint } from './components/premium-pie-chart/premium-pie-chart.component';
import {
  ScGlory1HourlyRow,
  ScGlory1ModeSummaryRow,
  ScGlory1SpeedPoint,
  ScGlory1TrackingPoint,
  ScGlory1PeriodUiReport,
  ScGlory1ReportService,
  ScGlory1UiPeriodKind,
} from './services/vessels/sc-glory-1/sc-glory-1-report.service';
import { ScGlory2ReportService } from './services/vessels/sc-glory-2/sc-glory-2-report.service';
import { ScGlory3ReportService } from './services/vessels/sc-glory-3/sc-glory-3-report.service';
import { ScEmeraldReportService } from './services/vessels/sc-emerald/sc-emerald-report.service';

declare const google: any;

type ReportType = 'd' | 'm';
type HistoricalUiPeriodMode = 'day' | 'range' | 'month';
type FileReportView = 'history' | 'pdf';

interface ReportOption {
  value: ReportType;
  label: string;
  shortLabel: string;
  description: string;
  icon: string;
}

interface ReportMetaItem {
  label: string;
  value: string;
  icon: string;
}

interface ReportLoadResult {
  blob: Blob;
  source: 'local-archive' | 'server';
  archiveEntry: OfficialReportArchiveEntry | null;
}

interface ReportSpeedChartPoint {
  x: number;
  y: number;
  timestamp: Date;
  speed: number;
}

interface ReportRouteChartPoint {
  x: number;
  y: number;
  timestamp: Date;
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
}

interface FuelBreakdownItem {
  key: 'main' | 'auxiliary' | 'generator' | 'other';
  label: string;
  value: number;
  percent: number;
  color: string;
}

interface ModeHistoryRecord {
  timestamp: Date;
  rawValue: unknown;
  label: string;
}

interface ModeTimelineSegment {
  key: string;
  label: string;
  start: Date;
  end: Date;
  durationMs: number;
  percent: number;
  color: string;
  isCurrent: boolean;
}

interface ModeRunningHourItem {
  key: string;
  label: string;
  durationMs: number;
  percent: number;
  segmentCount: number;
  color: string;
  isCurrent: boolean;
}

interface ModeHistoryCacheEntry {
  records: ModeHistoryRecord[];
  loadedAt: number;
  syncedAt: Date;
}

interface ArchiveLookupRequest {
  reportType: ReportType;
  period: string;
  vessel: string;
  autoLoad: boolean;
}

interface ArchiveLookupCacheValue {
  entry: OfficialReportArchiveEntry | null;
  expiresAt: number;
}

const ARCHIVE_LOOKUP_HIT_TTL_MS = 5 * 60 * 1000;
const ARCHIVE_LOOKUP_MISS_TTL_MS = 30 * 1000;
const MODE_HISTORY_SUCCESS_TTL_MS = 30 * 60 * 1000;
const MODE_HISTORY_EMPTY_TTL_MS = 60 * 60 * 1000;
const EMPTY_FUEL_DONUT_BACKGROUND = 'conic-gradient(#e2e8f0 0deg 360deg)';
const MODE_HISTORY_COLORS = [
  '#2563eb',
  '#16a34a',
  '#f59e0b',
  '#7c3aed',
  '#0891b2',
  '#e11d48',
  '#64748b',
  '#0f766e',
] as const;

const FUEL_GROUPS: ReadonlyArray<Omit<FuelBreakdownItem, 'value' | 'percent'>> = [
  { key: 'main', label: 'Main Engine', color: '#2563eb' },
  { key: 'auxiliary', label: 'Auxiliary Engine', color: '#14b8a6' },
  { key: 'generator', label: 'Generator', color: '#84cc16' },
  { key: 'other', label: 'Other Equipment', color: '#f59e0b' },
];

@Component({
  selector: 'app-report',
  standalone: false,
  templateUrl: './report.component.html',
  styleUrls: ['./report.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportComponent implements OnInit, OnDestroy {
  @ViewChildren('pdfPage') private pdfPages!: QueryList<ElementRef<HTMLElement>>;
  @ViewChild('dailyGoogleMap') private dailyGoogleMapElement?: ElementRef<HTMLDivElement>;
  readonly reportOptions: ReportOption[] = [
    {
      value: 'd',
      label: 'Daily Report',
      shortLabel: 'Daily',
      description: 'Daily PDF report for the selected vessel.',
      icon: 'fa fa-calendar-check-o',
    },
    {
      value: 'm',
      label: 'Monthly Report',
      shortLabel: 'Monthly',
      description: 'Monthly summary PDF report for the selected vessel.',
      icon: 'fa fa-calendar',
    },
  ];

  readonly liveRefreshSeconds = 60;

  // Report page opens on the completed historian web report. Realtime report UI is intentionally disabled.
  activeTab: LiveReportTab = 'files';
  fileReportView: FileReportView = 'history';
  liveSnapshot: LiveReportSnapshot | null = null;
  liveLoading = false;

  selectedReportType: ReportType = 'd';
  selectedDate = '';
  selectedMonth = '';
  selectedVesselName = '';

  pdfUrl: string | null = null;
  pdfBlob: Blob | null = null;
  reportFileName = '';

  loading = false;
  errorMessage = '';
  successMessage = '';

  loadedAt: Date | null = null;
  pdfZoom = 1;
  pdfFromCache = false;
  pdfFromLocalArchive = false;
  localArchiveEntry: OfficialReportArchiveEntry | null = null;
  loadedArchiveEntry: OfficialReportArchiveEntry | null = null;
  showAllModes = false;

  exportingLivePdf = false;
  pdfExportVisible = false;
  liveExportErrorMessage = '';
  liveExportSuccessMessage = '';

  // Derived view state is calculated only when the live snapshot changes.
  // This avoids rebuilding arrays/reducing engine data on every Angular change-detection pass.
  visibleModes: LiveReportModeSnapshot[] = [];
  hiddenModeCount = 0;
  headlineMetrics: LiveReportMetric[] = [];
  visibleEngines: LiveReportEngineSnapshot[] = [];
  mainEngineRows: LiveReportEngineSnapshot[] = [];
  supportEngineRows: LiveReportEngineSnapshot[] = [];
  mainEngineRunningCount = 0;
  supportEngineRunningCount = 0;
  mainEngineFuelTotal = 0;
  supportEngineFuelTotal = 0;
  mainEngineFuelRateTotal = 0;
  supportEngineFuelRateTotal = 0;
  engineView: 'all' | 'running' | 'stopped' = 'all';
  exportEnginePages: LiveReportEngineSnapshot[][] = [];
  exportModePages: LiveReportModeSnapshot[][] = [];
  liveExportPageCount = 1;
  liveExportTotalFuelLabel = '—';
  liveExportDistanceLabel = '—';
  liveExportAverageSpeedLabel = '—';
  liveExportMaximumSpeedLabel = '—';
  fuelBreakdown: FuelBreakdownItem[] = [];
  fuelTotalValue = 0;
  fuelTotalLabel = '—';
  fuelDonutBackground = EMPTY_FUEL_DONUT_BACKGROUND;

  modeHistoryLoading = false;
  modeHistoryError = '';
  modeHistorySegments: ModeTimelineSegment[] = [];
  modeRunningHours: ModeRunningHourItem[] = [];
  modeHistoryCoveragePercent = 0;
  modeHistorySourceTag = '';
  modeHistorySyncedAt: Date | null = null;
  verifiedModeAvailable = false;
  modeReportAvailable = false;
  modeHistoryConfig: VesselModeHistoryConfig | null = null;

  scGlory1DailyReport: ScGlory1PeriodUiReport | null = null;
  scGlory1DailyLoading = false;
  scGlory1DailyError = '';
  scGlory1DailySyncedAt: Date | null = null;
  historicalUiPeriodMode: HistoricalUiPeriodMode = 'day';
  historicalDate = '';
  historicalRangeStart = '';
  historicalRangeEnd = '';
  historicalMonth = '';
  historicalValidationError = '';
  historicalPdfDownloading = false;
  speedPerformancePolyline = '';
  speedPerformancePoints: ReportSpeedChartPoint[] = [];
  routePlotPolyline = '';
  routePlotPoints: ReportRouteChartPoint[] = [];
  chartTooltipVisible = false;
  chartTooltipTitle = '';
  chartTooltipLines: string[] = [];
  chartTooltipX = 0;
  chartTooltipY = 0;
  hourlyMaxTotalFuel = 1;
  hourlyMaxMainFuel = 1;
  hourlyMaxAuxFuel = 1;
  hourlyMaxDistance = 1;
  hourlyMaxSpeed = 1;
  hourlyMaxPortMainFuel = 1;
  hourlyMaxCenterMainFuel = 1;
  hourlyMaxStarboardMainFuel = 1;
  readonly scGlory1ModeChartColors = ['#63b5d8', '#6593da', '#6674d9', '#9d60d9', '#c25dd7'] as const;
  modeFuelPieBackground = 'conic-gradient(#e2e8f0 0deg 360deg)';
  modeRunningPieBackground = 'conic-gradient(#e2e8f0 0deg 360deg)';
  modeFuelPieData: PremiumPieChartPoint[] = [];
  modeRunningPieData: PremiumPieChartPoint[] = [];
  dailyFuelSplitBackground = 'conic-gradient(#e2e8f0 0deg 360deg)';
  dailyMainFuelShare = 0;
  dailyAuxFuelShare = 0;
  dailyTotalModeRunningHours = 0;
  dailyAverageEngineUtilization = 0;
  dailyAverageShaftUtilization = 0;
  dailyPeakFuelHour = -1;
  dailyPeakFuelValue = 0;
  dailyEquipmentWithDataCount = 0;
  dailyHasCenterMainEngine = false;
  dailyHasCenterAuxiliary = false;
  dailyDominantModeLabel = '—';
  dailyMapReady = false;
  dailyMapError = '';
  showDetailedDailySections = false;
  dailyVisibleHourlyRows: ScGlory1HourlyRow[] = [];

  private dailyGoogleMap: any = null;
  private dailyGoogleRoute: any = null;
  private dailyGoogleMarkers: any[] = [];
  private dailyMapRenderTimer: ReturnType<typeof setTimeout> | null = null;

  private activeVesselReportAdapter: VesselReportAdapter | null = null;
  private reportProfileDocument: LiveReportProfileDocument | null = null;
  private modeHistorySubscription: Subscription | null = null;
  private scGlory1DailySubscription: Subscription | null = null;
  private readonly modeHistoryCache = new Map<string, ModeHistoryCacheEntry>();
  // Keeps the last usable telemetry values per vessel so a transient empty/partial
  // realtime response never blanks the report while the next refresh is in flight.
  // The cache is display-only and never causes an additional server request.
  private readonly liveDisplayDataCache = new Map<string, Record<string, any>>();

  private selectedVessel: any = null;
  private readonly selectedVesselSource = new BehaviorSubject<any>(null);
  private readonly reportRequestCancel$ = new Subject<void>();
  private readonly destroy$ = new Subject<void>();
  private readonly archiveLookupRequest$ = new Subject<ArchiveLookupRequest>();
  private readonly archiveLookupCache = new Map<string, ArchiveLookupCacheValue>();
  private readonly archiveLookupInFlight = new Map<
    string,
    Observable<OfficialReportArchiveEntry | null>
  >();

  constructor(
    private http: HttpClientService,
    private newHttp: NewHttpClientService,
    private realtimeService: FvRealtimeService,
    private store: Store<any>,
    private dateFormat: DateFormatService,
    private pdfFile: PdfFileService,
    private vesselStorage: VesselStorageService,
    private liveReportService: LiveReportService,
    private reportPdfCache: ReportPdfCacheService,
    private clientPdfExport: ClientPdfExportService,
    private officialReportLibrary: OfficialReportLibraryService,
    private vesselReportResolver: ReportVesselServiceResolver,
    private scGlory1ReportService: ScGlory1ReportService,
    private scGlory2ReportService: ScGlory2ReportService,
    private scGlory3ReportService: ScGlory3ReportService,
    private scEmeraldReportService: ScEmeraldReportService,
    private changeDetector: ChangeDetectorRef,
  ) {
    const now = new Date();
    const defaultDate = this.dateFormat.addDays(now, -1);
    const lastCompletedMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    this.selectedDate = this.dateFormat.formatDateInput(defaultDate);
    this.selectedMonth = this.dateFormat.formatMonthInput(lastCompletedMonth);
    this.historicalDate = this.dateFormat.formatDateInput(defaultDate);
    this.historicalRangeStart = this.dateFormat.formatDateInput(this.dateFormat.addDays(defaultDate, -6));
    this.historicalRangeEnd = this.dateFormat.formatDateInput(defaultDate);
    this.historicalMonth = this.dateFormat.formatMonthInput(lastCompletedMonth);
  }

  ngOnInit(): void {
    this.loadStoredVessel();
    this.watchActiveVessel();
    // Realtime report rendering/polling is intentionally not started on the Report page.
    // Historical UI and official PDF loading are isolated from live telemetry to reduce server load.
    this.watchLocalArchiveAvailability();
    this.syncRealtimePolling();
    this.refreshLocalArchiveAvailability();
  }

  ngOnDestroy(): void {
    this.clearDailyGoogleMap();
    this.reportRequestCancel$.next();
    this.realtimeService.stop();
    this.modeHistorySubscription?.unsubscribe();
    this.scGlory1DailySubscription?.unsubscribe();
    this.revokePdfUrl();
    
    this.selectedVesselSource.complete();
    this.archiveLookupRequest$.complete();
    this.reportRequestCancel$.complete();
    this.destroy$.next();
    this.destroy$.complete();

    this.archiveLookupCache.clear();
    this.archiveLookupInFlight.clear();
    this.liveDisplayDataCache.clear();
  }

  @HostListener('document:visibilitychange')
  onDocumentVisibilityChange(): void {
    this.syncRealtimePolling();
  }

  get selectedReport(): ReportOption {
    return (
      this.reportOptions.find((item) => item.value === this.selectedReportType) ||
      this.reportOptions[0]
    );
  }

  get selectedReportLabel(): string {
    return this.selectedReport.label;
  }

  get selectedReportDescription(): string {
    return this.selectedReport.description;
  }

  get selectedReportIcon(): string {
    return this.selectedReport.icon;
  }

  get selectedVesselImage(): string {
    const vessel = this.selectedVessel || {};
    const fvInfo = vessel?.fvInfo || vessel?.fv || vessel || {};

    // Keep the report hero on the exact same vessel artwork priority as the
    // sidebar. Some vessel payloads expose more than one image field; the old
    // report-specific priority could therefore pick a close-up asset while the
    // sidebar showed the normal vessel thumbnail.
    const image =
      fvInfo?.img ||
      fvInfo?.image ||
      vessel?.img ||
      vessel?.image ||
      vessel?.imageUrl;

    if (image) {
      return String(image);
    }

    return this.resolveReportVesselFallbackImage(
      fvInfo?.name || vessel?.name || fvInfo?.prefix || vessel?.prefix || this.selectedVesselName || '',
    );
  }

  get selectedVesselCardStatus(): 'online' | 'offline' | 'idle' | 'empty' {
    if (!this.selectedVesselName) {
      return 'empty';
    }

    const state = this.liveSnapshot?.telemetryState;
    if (state === 'offline' || state === 'stale') {
      return 'offline';
    }

    return 'online';
  }

  get selectedTimestamp(): string {
    return this.dateFormat.buildBackendTimestamp(
      this.selectedReportType,
      this.selectedDate,
      this.selectedMonth,
    );
  }

  get selectedPeriodLabel(): string {
    if (this.selectedReportType === 'm') {
      return this.selectedMonth || '-';
    }

    return this.selectedDate || '-';
  }

  get maxDailyReportDate(): string {
    return this.dateFormat.formatDateInput(this.dateFormat.addDays(new Date(), -1));
  }

  get maxMonthlyReportPeriod(): string {
    const now = new Date();
    return this.dateFormat.formatMonthInput(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  }

  get selectedPeriodIsFuture(): boolean {
    const selected = this.selectedReportType === 'd' ? this.selectedDate : this.selectedMonth;
    const maximum =
      this.selectedReportType === 'd' ? this.maxDailyReportDate : this.maxMonthlyReportPeriod;
    return !!selected && selected > maximum;
  }

  get canStepToNextPeriod(): boolean {
    const selected = this.selectedReportType === 'd' ? this.selectedDate : this.selectedMonth;
    const maximum =
      this.selectedReportType === 'd' ? this.maxDailyReportDate : this.maxMonthlyReportPeriod;
    return !!selected && selected < maximum;
  }

  get officialLoadButtonLabel(): string {
    if (this.loading) {
      return 'Loading PDF';
    }
    return this.localArchiveAvailable ? 'Open Completed PDF' : 'Load Report';
  }

  get canLoadReport(): boolean {
    return (
      !this.loading &&
      !this.selectedPeriodIsFuture &&
      !!this.selectedVesselName &&
      !!this.selectedTimestamp
    );
  }

  get pdfSizeLabel(): string {
    return this.pdfFile.formatBlobSize(this.pdfBlob);
  }

  get loadedAtLabel(): string {
    return this.dateFormat.formatLoadedAt(this.loadedAt);
  }

  get hasPdf(): boolean {
    return !!this.pdfUrl;
  }

  get localArchiveAvailable(): boolean {
    return !!this.localArchiveEntry;
  }

  get officialPdfSourceLabel(): string {
    if (this.pdfFromLocalArchive) {
      return 'Local official archive';
    }
    if (this.pdfFromCache) {
      return 'Short-term cache';
    }
    return this.hasPdf ? 'Official report service' : 'Not loaded';
  }

  get officialPdfPageLabel(): string {
    const pageCount = this.loadedArchiveEntry?.pageCount || this.localArchiveEntry?.pageCount;
    return pageCount ? `${pageCount} pages` : 'Page count from PDF';
  }

  get pdfMetaItems(): ReportMetaItem[] {
    return [
      {
        label: 'Report Type',
        value: this.selectedReportLabel,
        icon: 'fa fa-file-text-o',
      },
      {
        label: 'Period',
        value: this.selectedPeriodLabel,
        icon: 'fa fa-calendar-o',
      },
      {
        label: 'Vessel',
        value: this.selectedVesselName || '-',
        icon: 'fa fa-ship',
      },
      {
        label: 'File Size',
        value: this.pdfSizeLabel,
        icon: 'fa fa-hdd-o',
      },
    ];
  }
  get livePeriodLabel(): string {
    if (!this.liveSnapshot) {
      return '00:00 → current time';
    }

    return `${this.formatDateTime(this.liveSnapshot.periodStart)} → ${this.formatTime(
      this.liveSnapshot.periodEnd,
    )}`;
  }

  get liveUpdatedLabel(): string {
    const updatedAt = this.liveSnapshot?.updatedAt;
    return updatedAt ? this.formatTime(updatedAt, true) : 'Waiting for telemetry';
  }

  get maxHistoricalDate(): string {
    // Web Report is for completed days only; today belongs to Realtime/Data Logger, not Report.
    return this.dateFormat.formatDateInput(this.dateFormat.addDays(new Date(), -1));
  }

  get maxHistoricalMonth(): string {
    const now = new Date();
    return this.dateFormat.formatMonthInput(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  }

  get historicalReportType(): ReportType {
    return this.historicalUiPeriodMode === 'month' ? 'm' : 'd';
  }

  get historicalReportTitle(): string {
    return this.historicalUiPeriodMode === 'month'
      ? 'Completed monthly report'
      : 'Completed daily report';
  }

  get historicalReportDescription(): string {
    return this.historicalUiPeriodMode === 'month'
      ? 'Defaults to the previous completed month. Select an older month when you need a historical summary.'
      : 'Defaults to yesterday, 00:00–23:59. Select an older completed day when you need to review history.';
  }

  get historicalQuickPeriodLabel(): string {
    return this.historicalUiPeriodMode === 'month' ? 'Previous month' : 'Yesterday';
  }

  get historicalQuickPeriodTitle(): string {
    return this.historicalUiPeriodMode === 'month'
      ? 'Use the latest fully completed month'
      : 'Use yesterday (00:00–23:59)';
  }

  get historicalPeriodLabel(): string {
    if (this.historicalUiPeriodMode === 'month') {
      return this.historicalMonth || 'Select month';
    }
    if (this.historicalUiPeriodMode === 'range') {
      if (!this.historicalRangeStart || !this.historicalRangeEnd) return 'Select date range';
      return `${this.historicalRangeStart} → ${this.historicalRangeEnd}`;
    }
    return this.historicalDate || 'Select date';
  }

  get historicalModeLabel(): string {
    switch (this.historicalUiPeriodMode) {
      case 'month':
        return 'Monthly';
      case 'range':
        return 'Date range';
      default:
        return 'Daily';
    }
  }

  get isHistoricalUiView(): boolean {
    return (
      this.activeTab === 'files' &&
      this.dedicatedReportServiceActive &&
      this.fileReportView === 'history'
    );
  }

  get isOfficialPdfView(): boolean {
    return (
      this.activeTab === 'files' &&
      (!this.dedicatedReportServiceActive || this.fileReportView === 'pdf')
    );
  }

  get reportTemplateSnapshot(): LiveReportSnapshot | null {
    if (this.liveSnapshot) return this.liveSnapshot;
    // Historical dedicated-vessel data comes from the historian service and does not
    // require a current realtime packet. The dedicated template does not read
    // realtime fields when this lightweight placeholder is used.
    if (this.isHistoricalUiView && this.selectedVesselName) {
      return {} as LiveReportSnapshot;
    }
    return null;
  }

  get detailedReportAverageSpeed(): number | null {
    return this.scGlory1DailyReport?.averageSpeed ?? null;
  }

  get detailedReportMaximumSpeed(): number | null {
    return this.scGlory1DailyReport?.maximumSpeed ?? null;
  }

  get detailedReportDayCount(): number {
    return this.scGlory1DailyReport?.dayCount || 1;
  }

  get detailedPeriodKindLabel(): string {
    switch (this.scGlory1DailyReport?.periodKind) {
      case 'month':
        return 'Monthly report';
      case 'range':
        return 'Period report';
      default:
        return this.isHistoricalUiView ? 'Daily historical report' : 'Live daily report';
    }
  }

  get currentModeLabel(): string {
    return this.liveSnapshot?.currentMode || 'Mode unavailable';
  }

  get currentModeIsVerified(): boolean {
    return this.liveSnapshot?.modeSource === 'verified-tag';
  }

  get currentModeIsEstimated(): boolean {
    return this.liveSnapshot?.modeSource === 'estimated-telemetry';
  }

  get currentModeIsReported(): boolean {
    return this.liveSnapshot?.modeSource === 'vessel-record';
  }

  get currentModeSourceLabel(): string {
    switch (this.liveSnapshot?.modeSource) {
      case 'verified-tag': {
        const tag = this.liveSnapshot?.modeSourceTag || 'vessel mode telemetry';
        const raw = this.liveSnapshot?.currentModeRawValue;
        return raw ? `Verified from ${tag} · mode ${raw}` : `Verified from ${tag}`;
      }
      case 'vessel-record':
        return 'Reported by vessel record · awaiting direct mode-tag verification';
      case 'estimated-telemetry':
        if (this.modeHistoryConfig?.kind === 'derived' && this.liveSnapshot?.modeSourceTag) {
          return `Derived from ${this.liveSnapshot.modeSourceTag} using the dedicated vessel report rule`;
        }
        return 'Estimated from GPS and machinery telemetry';
      default:
        return 'Direct vessel mode is unavailable';
    }
  }

  get currentModeConfidenceLabel(): string {
    const confidence = this.liveSnapshot?.modeConfidence;
    return confidence
      ? `${confidence.charAt(0).toUpperCase()}${confidence.slice(1)} confidence`
      : '';
  }

  get currentModeReason(): string {
    return this.liveSnapshot?.modeReason || '';
  }

  get telemetryStateLabel(): string {
    switch (this.liveSnapshot?.telemetryState) {
      case 'live':
        return 'Live telemetry';
      case 'delayed':
        return 'Telemetry delayed';
      case 'stale':
        return 'Telemetry stale';
      default:
        return 'Waiting for telemetry';
    }
  }

  get telemetryAgeLabel(): string {
    const age = this.liveSnapshot?.telemetryAgeSeconds;
    if (age === null || age === undefined) {
      return 'No timestamp';
    }
    if (age < 60) {
      return `${age}s ago`;
    }
    return `${Math.floor(age / 60)}m ${age % 60}s ago`;
  }

  get hasTrackingPosition(): boolean {
    return (
      !!this.liveSnapshot &&
      this.liveSnapshot.tracking.latitude !== null &&
      this.liveSnapshot.tracking.longitude !== null
    );
  }

  get latitudeLabel(): string {
    return this.formatCoordinate(this.liveSnapshot?.tracking.latitude, 'N', 'S');
  }

  get longitudeLabel(): string {
    return this.formatCoordinate(this.liveSnapshot?.tracking.longitude, 'E', 'W');
  }

  get reportSourceLabel(): string {
    return this.liveSnapshot?.sourceReport || 'Generic vessel profile';
  }

  get activeReportServiceLabel(): string {
    return this.activeVesselReportAdapter?.serviceLabel || 'Standard Report Service';
  }

  get dedicatedReportServiceActive(): boolean {
    return !!this.activeVesselReportAdapter;
  }

  private get activeHistoricalReportService(): Pick<ScGlory1ReportService, 'loadPeriodReport'> | null {
    switch (this.activeVesselReportAdapter?.id) {
      case 'sc-glory-1':
        return this.scGlory1ReportService;
      case 'sc-glory-2':
        return this.scGlory2ReportService;
      case 'sc-glory-3':
        return this.scGlory3ReportService;
      case 'sc-emerald':
        return this.scEmeraldReportService;
      default:
        return null;
    }
  }

  get modeHistoryEyebrow(): string {
    return this.modeHistoryConfig?.eyebrow || 'VERIFIED MODE HISTORY';
  }

  get modeHistoryTitle(): string {
    return this.modeHistoryConfig?.title || 'Today Mode Timeline';
  }

  get modeHistoryDescription(): string {
    return (
      this.modeHistoryConfig?.description ||
      'Historian is queried only when a configured vessel mode source is available.'
    );
  }

  get modeHistoryQualityLabel(): string {
    return this.modeHistoryConfig?.qualityLabel || this.modeSourceQualityLabel;
  }

  get livePeriodStartTimeLabel(): string {
    const start = this.liveSnapshot?.periodStart;
    return start ? this.formatTime(start) : '—';
  }

  get liveElapsedLabel(): string {
    const start = this.liveSnapshot?.periodStart;
    const end = this.liveSnapshot?.periodEnd;
    if (!start || !end) {
      return '—';
    }

    const durationMs = Math.max(0, end.getTime() - start.getTime());
    const totalMinutes = Math.floor(durationMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }

  get dataQualityDonutBackground(): string {
    const completeness = Math.max(0, Math.min(100, this.liveSnapshot?.dataCompleteness || 0));
    return `conic-gradient(#16a34a 0% ${completeness}%, #e8eef5 ${completeness}% 100%)`;
  }

  get dataQualityGrade(): string {
    const completeness = this.liveSnapshot?.dataCompleteness || 0;
    if (completeness >= 95) {
      return 'Excellent';
    }
    if (completeness >= 80) {
      return 'Good';
    }
    if (completeness >= 60) {
      return 'Partial';
    }
    return 'Limited';
  }

  get engineSpeedValidationLabel(): string {
    const invalidCount = this.liveSnapshot?.invalidEngineSpeedCount || 0;
    return invalidCount > 0
      ? `${invalidCount} raw value${invalidCount === 1 ? '' : 's'} filtered`
      : 'Validated';
  }

  get canExportLivePdf(): boolean {
    return !!this.liveSnapshot && !this.exportingLivePdf;
  }

  get liveExportFileName(): string {
    const vessel = this.selectedVesselName || this.liveSnapshot?.vesselName || 'Vessel';
    const date = this.liveSnapshot?.periodStart || new Date();
    return `${vessel}-Live-Daily-Report-${this.dateFormat.formatDateInput(date)}`;
  }

  get liveExportGeneratedAtLabel(): string {
    return new Date().toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }

  get modeSourceQualityLabel(): string {
    if (this.currentModeIsVerified) {
      return 'Verified';
    }

    if (this.currentModeIsReported) {
      return 'Reported · Not verified';
    }

    if (this.currentModeIsEstimated) {
      if (this.modeHistoryConfig?.kind === 'derived') {
        return this.modeHistoryConfig.qualityLabel;
      }
      return `Estimated · ${this.currentModeConfidenceLabel || 'Telemetry based'}`;
    }

    return 'Unavailable';
  }


  get modeHistoryHasData(): boolean {
    return this.modeHistorySegments.length > 0;
  }

  get modeHistoryCoverageLabel(): string {
    return `${Math.round(this.modeHistoryCoveragePercent)}%`;
  }

  get modeHistorySyncedLabel(): string {
    return this.modeHistorySyncedAt ? this.formatTime(this.modeHistorySyncedAt, true) : 'Not synced';
  }

  get modeHistoryActiveModeCount(): number {
    return this.modeRunningHours.length;
  }

  async exportLivePdf(): Promise<void> {
    if (!this.liveSnapshot || this.exportingLivePdf) {
      return;
    }

    this.liveExportErrorMessage = '';
    this.liveExportSuccessMessage = '';
    this.exportingLivePdf = true;
    this.pdfExportVisible = true;
    this.changeDetector.detectChanges();

    try {
      await this.waitForExportLayout();
      const elements = this.pdfPages?.toArray().map((item) => item.nativeElement) || [];
      const result = await this.clientPdfExport.exportElements(elements, {
        fileName: this.liveExportFileName,
        backgroundColor: '#ffffff',
        scale: 1.45,
        imageQuality: 0.9,
        maxPages: 40,
      });
      
      this.liveExportSuccessMessage = `Live daily PDF exported successfully (${result.pageCount} pages, ${this.pdfFile.formatBytes(
        result.sizeBytes,
      )}). No report-generation request was sent to the server.`;
    } catch (error: unknown) {
      console.error('[ReportComponent] live PDF export error:', error);
      this.liveExportErrorMessage = this.resolveLiveExportError(error);
    } finally {
      this.pdfExportVisible = false;
      this.exportingLivePdf = false;
      this.changeDetector.detectChanges();
    }
  }

  openOfficialDailyReport(): void {
    const completedDate = this.dateFormat.addDays(new Date(), -1);
    this.selectedReportType = 'd';
    this.selectedDate = this.dateFormat.formatDateInput(completedDate);
    this.resetPreviewState();
    this.openOfficialPdfReport();
  }

  toggleAllModes(): void {
    this.showAllModes = !this.showAllModes;
    this.updateVisibleModes();
  }

  setEngineView(view: 'all' | 'running' | 'stopped'): void {
    if (this.engineView === view) {
      return;
    }

    this.engineView = view;
    this.updateVisibleEngines();
  }

  clearLiveExportError(): void {
    this.liveExportErrorMessage = '';
  }

  clearLiveExportSuccess(): void {
    this.liveExportSuccessMessage = '';
  }

  trackByPdfPage(index: number): number {
    return index;
  }

  setActiveTab(tab: LiveReportTab): void {
    if (this.activeTab === tab) {
      return;
    }

    this.activeTab = tab;
    this.syncRealtimePolling();

    if (tab === 'files') {
      if (this.dedicatedReportServiceActive) {
        this.fileReportView = 'history';
        this.resetScGlory1DailyReport();
        this.showDetailedDailySections = true;
        this.loadHistoricalUiReport(false);
      } else {
        this.refreshLocalArchiveAvailability(true);
      }
    } else if (this.dedicatedReportServiceActive) {
      this.resetScGlory1DailyReport();
      this.maybeLoadScGlory1DailyReport(false);
    } else {
      this.maybeLoadModeHistory(this.selectedVessel, this.reportProfileDocument, false);
    }
  }

  openHistoricalReport(): void {
    if (!this.dedicatedReportServiceActive) {
      this.openOfficialPdfReport();
      return;
    }

    // Keep the web report aligned with the selected official PDF period when returning from the file viewer.
    if (this.isOfficialPdfView) {
      if (this.selectedReportType === 'm' && this.selectedMonth) {
        this.historicalUiPeriodMode = 'month';
        this.historicalMonth = this.selectedMonth;
      } else if (this.selectedDate) {
        this.historicalUiPeriodMode = 'day';
        this.historicalDate = this.selectedDate;
      }
      this.historicalValidationError = '';
    }

    const alreadyOpen = this.isHistoricalUiView;
    this.fileReportView = 'history';
    this.activeTab = 'files';
    this.syncRealtimePolling();

    if (!alreadyOpen) {
      this.resetScGlory1DailyReport();
      this.showDetailedDailySections = true;
    }

    if (!this.scGlory1DailyReport && !this.scGlory1DailyLoading) {
      this.loadHistoricalUiReport(false);
    }

    this.changeDetector.markForCheck();
  }

  openOfficialPdfReport(): void {
    // Keep the original PDF workspace on the exact same completed web-report period.
    if (this.isHistoricalUiView) {
      if (this.historicalUiPeriodMode === 'month' && this.historicalMonth) {
        this.selectedReportType = 'm';
        this.selectedMonth = this.historicalMonth;
      } else if (this.historicalDate) {
        this.selectedReportType = 'd';
        this.selectedDate = this.historicalDate;
      }
    }

    const alreadyOpen = this.isOfficialPdfView;
    this.fileReportView = 'pdf';
    this.activeTab = 'files';
    this.syncRealtimePolling();

    if (this.dedicatedReportServiceActive) {
      this.scGlory1DailySubscription?.unsubscribe();
      this.scGlory1DailyLoading = false;
    }

    this.refreshLocalArchiveAvailability(!alreadyOpen);
    this.changeDetector.markForCheck();
  }

  refreshLive(): void {
    if (this.liveLoading || !this.selectedVesselName) {
      return;
    }

    // Refresh current telemetry only. Historian is intentionally isolated from
    // the normal Refresh action so one click cannot create an expensive history
    // query for every vessel.
    this.realtimeService.refreshNow();
  }

  syncModeHistory(): void {
    if (this.dedicatedReportServiceActive) {
      this.maybeLoadScGlory1DailyReport(true);
      return;
    }

    if (!this.modeReportAvailable || this.modeHistoryLoading) {
      return;
    }

    this.maybeLoadModeHistory(this.selectedVessel, this.reportProfileDocument, true);
  }

  syncDetailedDailyReport(): void {
    if (this.isHistoricalUiView) {
      this.loadHistoricalUiReport(true);
      return;
    }
    this.maybeLoadScGlory1DailyReport(true);
  }

  selectHistoricalReportType(type: ReportType): void {
    if (this.scGlory1DailyLoading || (type !== 'd' && type !== 'm')) {
      return;
    }

    const nextMode: HistoricalUiPeriodMode = type === 'm' ? 'month' : 'day';
    if (this.historicalUiPeriodMode === nextMode) {
      return;
    }

    this.historicalUiPeriodMode = nextMode;
    this.historicalValidationError = '';
    this.resetScGlory1DailyReport();
    this.showDetailedDailySections = true;
    this.changeDetector.markForCheck();
  }

  useHistoricalLatestCompletedPeriod(): void {
    if (this.historicalUiPeriodMode === 'month') {
      const now = new Date();
      const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      this.historicalMonth = this.dateFormat.formatMonthInput(previousMonth);
      this.historicalValidationError = '';
      this.loadHistoricalUiReport(false);
      return;
    }

    this.useHistoricalYesterday();
  }

  downloadHistoricalOfficialPdf(): void {
    if (this.historicalPdfDownloading || this.scGlory1DailyLoading) {
      return;
    }

    if (!this.selectedVesselName.trim()) {
      this.historicalValidationError = 'Please select a vessel before downloading the PDF.';
      this.changeDetector.markForCheck();
      return;
    }

    if (this.historicalUiPeriodMode === 'range') {
      this.historicalValidationError =
        'Original PDF download is available for Daily Report and Monthly Report periods only.';
      this.changeDetector.markForCheck();
      return;
    }

    const reportType: ReportType = this.historicalUiPeriodMode === 'month' ? 'm' : 'd';
    const period = reportType === 'm' ? this.historicalMonth : this.historicalDate;
    const maximum = reportType === 'm' ? this.maxHistoricalMonth : this.maxHistoricalDate;

    if (!period) {
      this.historicalValidationError =
        reportType === 'm' ? 'Please select a report month.' : 'Please select a report date.';
      this.changeDetector.markForCheck();
      return;
    }

    if (period > maximum) {
      this.historicalValidationError =
        reportType === 'm'
          ? 'Only fully completed months can be downloaded.'
          : 'Only completed days can be downloaded. The latest available day is yesterday.';
      this.changeDetector.markForCheck();
      return;
    }

    this.selectedReportType = reportType;
    if (reportType === 'm') {
      this.selectedMonth = period;
    } else {
      this.selectedDate = period;
    }

    const timestamp = this.selectedTimestamp;
    const vessel = this.selectedVesselName.trim();
    if (!timestamp) {
      this.historicalValidationError = 'The selected report period is invalid.';
      this.changeDetector.markForCheck();
      return;
    }

    this.historicalValidationError = '';
    this.historicalPdfDownloading = true;
    this.changeDetector.markForCheck();

    this.requestSelectedReport(reportType, timestamp, vessel)
      .pipe(
        take(1),
        timeout(30_000),
        finalize(() => {
          this.historicalPdfDownloading = false;
          this.changeDetector.markForCheck();
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (result) => {
          const url = this.pdfFile.createObjectUrl(result.blob);
          const fileName =
            result.archiveEntry?.fileName ||
            this.pdfFile.buildFileName(
              vessel,
              reportType === 'm' ? 'Monthly Report' : 'Daily Report',
              period,
            );

          const downloaded = this.pdfFile.download(url, fileName);
          window.setTimeout(() => this.pdfFile.revokeObjectUrl(url), 1500);

          if (!downloaded) {
            this.historicalValidationError = 'The PDF was loaded but the browser could not start the download.';
          }
          this.changeDetector.markForCheck();
        },
        error: (error: unknown) => {
          console.warn('[Report] Unable to download original historical PDF.', error);
          this.historicalValidationError =
            'No completed PDF could be downloaded for this vessel and period. Open Original PDF to verify availability.';
          this.changeDetector.markForCheck();
        },
      });
  }

  setHistoricalUiPeriodMode(mode: HistoricalUiPeriodMode): void {
    if (this.historicalUiPeriodMode === mode || this.scGlory1DailyLoading) {
      return;
    }
    this.historicalUiPeriodMode = mode;
    this.historicalValidationError = '';
    this.changeDetector.markForCheck();
  }

  onHistoricalDateChange(value: string, field: 'day' | 'start' | 'end' | 'month'): void {
    const previousValue =
      field === 'day'
        ? this.historicalDate
        : field === 'start'
          ? this.historicalRangeStart
          : field === 'end'
            ? this.historicalRangeEnd
            : this.historicalMonth;

    if (field === 'day') this.historicalDate = value;
    if (field === 'start') this.historicalRangeStart = value;
    if (field === 'end') this.historicalRangeEnd = value;
    if (field === 'month') this.historicalMonth = value;
    this.historicalValidationError = '';

    // Never leave data from the previously loaded period under a newly selected
    // date/month. The user explicitly loads the new period, which keeps server
    // traffic controlled and prevents a visual/report-period mismatch.
    if (value !== previousValue && this.scGlory1DailyReport) {
      this.resetScGlory1DailyReport();
      this.showDetailedDailySections = true;
    }

    this.changeDetector.markForCheck();
  }

  useHistoricalYesterday(): void {
    const yesterday = this.dateFormat.addDays(new Date(), -1);
    this.historicalUiPeriodMode = 'day';
    this.historicalDate = this.dateFormat.formatDateInput(yesterday);
    this.historicalValidationError = '';
    this.loadHistoricalUiReport(false);
  }

  useHistoricalLast7Days(): void {
    const end = new Date();
    const start = this.dateFormat.addDays(end, -6);
    this.historicalUiPeriodMode = 'range';
    this.historicalRangeStart = this.dateFormat.formatDateInput(start);
    this.historicalRangeEnd = this.dateFormat.formatDateInput(end);
    this.historicalValidationError = '';
    this.loadHistoricalUiReport(false);
  }

  useHistoricalCurrentMonth(): void {
    const now = new Date();
    this.historicalUiPeriodMode = 'month';
    this.historicalMonth = this.dateFormat.formatMonthInput(
      new Date(now.getFullYear(), now.getMonth() - 1, 1),
    );
    this.historicalValidationError = '';
    this.loadHistoricalUiReport(false);
  }

  loadHistoricalUiReport(force = false): void {
    const dedicatedService = this.activeHistoricalReportService;
    if (!dedicatedService || this.scGlory1DailyLoading) {
      return;
    }

    const period = this.resolveHistoricalUiPeriod();
    if (!period) {
      this.changeDetector.markForCheck();
      return;
    }

    this.scGlory1DailySubscription?.unsubscribe();
    this.scGlory1DailyLoading = true;
    this.scGlory1DailyError = '';
    this.historicalValidationError = '';
    this.changeDetector.markForCheck();

    this.scGlory1DailySubscription = dedicatedService
      .loadPeriodReport(period.start, period.end, period.kind, force)
      .pipe(
        take(1),
        timeout(period.kind === 'day' ? 35000 : 120000),
        catchError((error: unknown) => {
          console.warn(`[Report] Unable to load ${this.selectedVesselName || 'dedicated vessel'} historical UI report.`, error);
          const text = String((error as any)?.message || error || '');
          this.scGlory1DailyError = text.includes('EXCEEDS_31_DAYS')
            ? 'The selected range is longer than 31 days. Choose a shorter range or select a month.'
            : 'Historical historian data could not be loaded for the selected period. Please verify the backend connection and try again.';
          return of(null);
        }),
        finalize(() => {
          this.scGlory1DailyLoading = false;
          this.changeDetector.markForCheck();
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((report) => {
        if (!report || !this.isHistoricalUiView) return;
        this.scGlory1DailyReport = report;
        this.scGlory1DailySyncedAt = report.loadedAt;
        this.showDetailedDailySections = true;
        this.updateScGlory1DailyChartState(report);
        this.changeDetector.markForCheck();
      });
  }

  toggleDetailedDailySections(): void {
    this.showDetailedDailySections = !this.showDetailedDailySections;
    this.changeDetector.markForCheck();
  }

  trackByHourlyRow(_index: number, row: ScGlory1HourlyRow): number {
    return row.hour;
  }

  trackBySpeedPoint(_index: number, point: ReportSpeedChartPoint): number {
    return point.timestamp.getTime();
  }

  trackByRoutePoint(_index: number, point: ReportRouteChartPoint): number {
    return point.timestamp.getTime();
  }

  showFuelMixOverviewTooltip(event: MouseEvent, report: ScGlory1PeriodUiReport): void {
    this.openChartTooltip(event, report.dayCount > 1 ? 'Period Fuel Mix' : 'Daily Fuel Mix', [
      `Main Engine: ${this.formatDailyValue(report.mainEngineFuelTotal, 2)} L (${this.formatDailyValue(this.dailyMainFuelShare, 1)}%)`,
      `Auxiliary Engine: ${this.formatDailyValue(report.auxiliaryFuelTotal, 2)} L (${this.formatDailyValue(this.dailyAuxFuelShare, 1)}%)`,
      `Total Fuel: ${this.formatDailyValue(report.totalFuelUsed, 2)} L`,
    ]);
  }

  showUtilizationOverviewTooltip(event: MouseEvent): void {
    this.openChartTooltip(event, 'Average Utilization', [
      `M/E Engine: ${this.formatDailyValue(this.dailyAverageEngineUtilization, 1)}%`,
      `Shaft: ${this.formatDailyValue(this.dailyAverageShaftUtilization, 1)}%`,
    ]);
  }

  showCoverageOverviewTooltip(event: MouseEvent, report: ScGlory1PeriodUiReport): void {
    this.openChartTooltip(event, 'Historian Coverage', [
      `Coverage: ${this.formatDailyValue(report.coveragePercent, 0)}%`,
      `Mode Hours: ${this.formatDailyValue(this.dailyTotalModeRunningHours, 1)} h`,
      `Equipment With Data: ${this.dailyEquipmentWithDataCount}/${report.engineSummary.length + report.auxSummary.length}`,
      `Last Sync: ${this.scGlory1DetailedSyncedLabel}`,
    ]);
  }

  showDailyTrendTooltip(event: MouseEvent, row: ScGlory1PeriodUiReport['dailyTrend'][number]): void {
    this.openChartTooltip(event, this.formatChartDate(row.date), [
      `M/E Fuel: ${this.formatDailyValue(row.mainEngineFuelTotal, 2)} L`,
      `A/E Fuel: ${this.formatDailyValue(row.auxiliaryFuelTotal, 2)} L`,
      `Total Fuel: ${this.formatDailyValue(row.totalFuelUsed, 2)} L`,
      `Distance: ${this.formatDailyValue(row.distanceNm, 2)} NM`,
      `Coverage: ${this.formatDailyValue(row.coveragePercent, 0)}%`,
    ]);
  }

  showHourlyPerformanceTooltip(event: MouseEvent, row: ScGlory1HourlyRow): void {
    if (!row.active) {
      this.openChartTooltip(event, `${this.padHour(row.hour)}:00`, ['No historian data for this hour']);
      return;
    }
    this.openChartTooltip(event, `${this.padHour(row.hour)}:00`, [
      `Distance: ${this.formatDailyValue(row.distanceNm, 2)} NM`,
      `Speed: ${this.formatDailyValue(row.speedKnots, 2)} kn`,
      `M/E Fuel: ${this.formatDailyValue(row.mainFuel, 2)} L`,
      `A/E Fuel: ${this.formatDailyValue(row.auxFuel, 2)} L`,
      `Total Fuel: ${this.formatDailyValue(row.totalFuel, 2)} L`,
    ]);
  }

  showMainFuelTooltip(event: MouseEvent, row: ScGlory1HourlyRow): void {
    const entries: Array<[string, number | null]> = [
      ['Port M/E', row.portMainFuel],
      ['Starboard M/E', row.starboardMainFuel],
    ];
    if (this.dailyHasCenterMainEngine) {
      entries.push(['Center M/E', row.centerMainFuel]);
    }
    entries.push(['Total M/E', row.mainFuel]);
    this.openHourlyFuelTooltip(event, row, entries);
  }

  showMachineryFuelTooltip(event: MouseEvent, row: ScGlory1HourlyRow, machinery: any): void {
    const fuel = Number((row as any)[machinery.fuel]);
    const meRun = Number((row as any)[machinery.meRun]);
    const shaftRun = Number((row as any)[machinery.shaftRun]);
    const shaftRpm = Number((row as any)[machinery.shaftRpm]);
    this.openChartTooltip(event, `${machinery.title} · ${this.padHour(row.hour)}:00`, row.active ? [
      `Fuel: ${this.formatDailyValue(Number.isFinite(fuel) ? fuel : null, 2)} L`,
      `M/E Running: ${this.formatDailyValue(Number.isFinite(meRun) ? meRun : null, 2)} h`,
      `Shaft Running: ${this.formatDailyValue(Number.isFinite(shaftRun) ? shaftRun : null, 2)} h`,
      `Shaft RPM: ${this.formatDailyValue(Number.isFinite(shaftRpm) ? shaftRpm : null, 2)}`,
    ] : ['No historian data for this hour']);
  }

  showAuxFuelTooltip(event: MouseEvent, row: ScGlory1HourlyRow): void {
    const entries: Array<[string, number | null]> = [
      ['Port A/E', row.portAuxFuel],
    ];
    if (this.dailyHasCenterAuxiliary) {
      entries.push(['Center A/E', (row as any).centerAuxFuel ?? null]);
    }
    entries.push(['Starboard A/E', row.starboardAuxFuel], ['Total A/E', row.auxFuel]);
    this.openHourlyFuelTooltip(event, row, entries);
  }

  showAuxiliaryFuelTooltip(event: MouseEvent, row: ScGlory1HourlyRow, auxiliary: any): void {
    const fuel = Number((row as any)[auxiliary.fuel]);
    const running = Number((row as any)[auxiliary.run]);
    this.openChartTooltip(event, `${auxiliary.title} · ${this.padHour(row.hour)}:00`, row.active ? [
      `Fuel: ${this.formatDailyValue(Number.isFinite(fuel) ? fuel : null, 2)} L`,
      `Running Hours: ${this.formatDailyValue(Number.isFinite(running) ? running : null, 2)} h`,
    ] : ['No historian data for this hour']);
  }

  showTotalFuelTooltip(event: MouseEvent, row: ScGlory1HourlyRow): void {
    this.openChartTooltip(event, `Total Fuel · ${this.padHour(row.hour)}:00`, row.active ? [
      `M/E Fuel: ${this.formatDailyValue(row.mainFuel, 2)} L`,
      `A/E Fuel: ${this.formatDailyValue(row.auxFuel, 2)} L`,
      `Total Fuel: ${this.formatDailyValue(row.totalFuel, 2)} L`,
    ] : ['No historian data for this hour']);
  }

  showSpeedPointTooltip(event: MouseEvent, point: ReportSpeedChartPoint): void {
    this.openChartTooltip(event, this.formatChartDateTime(point.timestamp), [
      `Speed: ${this.formatDailyValue(point.speed, 2)} kn`,
    ]);
  }

  showRoutePointTooltip(event: MouseEvent, point: ReportRouteChartPoint): void {
    const lines = [
      `Latitude: ${this.formatDailyCoordinate(point.latitude, true)}`,
      `Longitude: ${this.formatDailyCoordinate(point.longitude, false)}`,
    ];
    if (point.speed !== null && Number.isFinite(point.speed)) {
      lines.push(`Speed: ${this.formatDailyValue(point.speed, 2)} kn`);
    }
    if (point.heading !== null && Number.isFinite(point.heading)) {
      lines.push(`Heading: ${this.formatDailyValue(point.heading, 0)}°`);
    }
    this.openChartTooltip(event, this.formatChartDateTime(point.timestamp), lines);
  }

  moveChartTooltip(event: MouseEvent): void {
    if (!this.chartTooltipVisible) return;
    this.positionChartTooltip(event);
  }

  hideChartTooltip(): void {
    this.chartTooltipVisible = false;
  }

  private openHourlyFuelTooltip(
    event: MouseEvent,
    row: ScGlory1HourlyRow,
    values: ReadonlyArray<readonly [string, number | null]>,
  ): void {
    const lines = row.active
      ? values.map(([label, value]) => `${label}: ${this.formatDailyValue(value, 2)} L`)
      : ['No historian data for this hour'];
    this.openChartTooltip(event, `${this.padHour(row.hour)}:00`, lines);
  }

  private openChartTooltip(event: MouseEvent, title: string, lines: string[]): void {
    this.chartTooltipTitle = title;
    this.chartTooltipLines = lines;
    this.chartTooltipVisible = true;
    this.positionChartTooltip(event);
  }

  private positionChartTooltip(event: MouseEvent): void {
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1440;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 900;
    const tooltipWidth = 270;
    const tooltipHeight = 160;
    this.chartTooltipX = Math.max(12, Math.min(event.clientX + 16, viewportWidth - tooltipWidth - 12));
    this.chartTooltipY = Math.max(12, Math.min(event.clientY + 16, viewportHeight - tooltipHeight - 12));
  }

  private padHour(hour: number): string {
    return Math.max(0, Math.min(23, Math.floor(hour))).toString().padStart(2, '0');
  }

  private formatChartDate(value: Date): string {
    return value.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private formatChartDateTime(value: Date): string {
    return value.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }

  trackByDetailedMode(_index: number, row: ScGlory1ModeSummaryRow): string {
    return row.key;
  }

  modeChartColor(index: number): string {
    return this.scGlory1ModeChartColors[index % this.scGlory1ModeChartColors.length];
  }

  formatDailyValue(value: number | null | undefined, digits = 2): string {
    if (value === null || value === undefined || !Number.isFinite(value)) {
      return '—';
    }
    return value.toLocaleString('en-US', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  }

  formatDailyCoordinate(value: number | null | undefined, isLatitude: boolean): string {
    if (value === null || value === undefined || !Number.isFinite(value)) {
      return '—';
    }
    return this.formatCoordinate(value, isLatitude ? 'N' : 'E', isLatitude ? 'S' : 'W');
  }

  formatDailyTime(value: Date | null | undefined): string {
    return value ? this.formatTime(value, false) : '—';
  }

  hourlyBarPercent(value: number | null | undefined, maxValue: number): number {
    if (value === null || value === undefined || !Number.isFinite(value) || maxValue <= 0) {
      return 0;
    }
    return Math.max(0, Math.min(100, (value / maxValue) * 100));
  }

  get historicalDailyTrendMaxFuel(): number {
    return Math.max(
      1,
      ...(this.scGlory1DailyReport?.dailyTrend || []).map((row) => Number(row.totalFuelUsed) || 0),
    );
  }

  dailyTrendBarPercent(value: number | null | undefined): number {
    return this.hourlyBarPercent(value, this.historicalDailyTrendMaxFuel);
  }

  trackByDailyTrend(_index: number, row: { date: Date }): number {
    return row.date.getTime();
  }

  get scGlory1DetailedPeriodLabel(): string {
    const report = this.scGlory1DailyReport;
    if (!report) return this.livePeriodLabel;
    return `${this.formatDateTime(report.periodStart)} → ${this.formatDateTime(report.periodEnd)}`;
  }

  get scGlory1DetailedSyncedLabel(): string {
    return this.scGlory1DailySyncedAt ? this.formatTime(this.scGlory1DailySyncedAt, true) : '—';
  }

  get scGlory1DetailedCoverageLabel(): string {
    return this.scGlory1DailyReport
      ? `${this.scGlory1DailyReport.coveragePercent.toFixed(0)}%`
      : '—';
  }

  trackByMetric(_index: number, metric: { key: string }): string {
    return metric.key;
  }

  trackByEngine(_index: number, engine: LiveReportEngineSnapshot): string {
    return engine.key;
  }

  trackByMode(_index: number, mode: { key: string }): string {
    return mode.key;
  }


  trackByModeHistorySegment(_index: number, segment: ModeTimelineSegment): string {
    return segment.key;
  }

  trackByModeRunningHour(_index: number, item: ModeRunningHourItem): string {
    return item.key;
  }

  formatModeDuration(durationMs: number): string {
    const safeMs = Math.max(0, Number(durationMs) || 0);
    const totalMinutes = Math.max(0, Math.round(safeMs / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours <= 0) {
      return `${minutes}m`;
    }

    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  }

  trackByFuelGroup(_index: number, item: FuelBreakdownItem): string {
    return item.key;
  }

  formatLiveValue(value: number | null, digits = 2): string {
    return this.liveReportService.formatNumber(value, digits);
  }

  engineStateLabel(engine: LiveReportEngineSnapshot): string {
    switch (engine.state) {
      case 'running':
        return 'Running';
      case 'stopped':
        return 'Stopped';
      case 'no-data':
        return 'No data';
    }
  }

  engineTypeLabel(engine: LiveReportEngineSnapshot): string {
    switch (engine.kind) {
      case 'main':
        return 'Main engine';
      case 'auxiliary':
        return 'Auxiliary engine';
      case 'generator':
        return 'Generator';
      case 'motor':
        return 'Electric motor';
      case 'other':
        return 'Equipment';
    }
  }

  engineLoadPercent(engine: LiveReportEngineSnapshot): number {
    const value = engine.load;
    if (value === null || !Number.isFinite(value)) {
      return 0;
    }
    return Math.max(0, Math.min(100, value));
  }

  engineSpeedSourceLabel(engine: LiveReportEngineSnapshot): string {
    if (engine.speedQuality === 'invalid') {
      return 'Raw value filtered';
    }

    if (engine.speedQuality === 'no-data') {
      return 'No valid speed signal';
    }

    const source = String(engine.speedSourceTag || '').toUpperCase();
    return source.endsWith('_CALC') ? 'Calculated RPM signal' : 'Validated RPM signal';
  }

  engineSpeedNote(engine: LiveReportEngineSnapshot): string {
    if (engine.speedQuality === 'invalid') {
      return `Out-of-range raw telemetry was filtered (valid range 0-${engine.speedLimitRpm.toLocaleString('en-US')} RPM).`;
    }

    if (engine.speedQuality === 'no-data') {
      return 'No valid live speed tag is available.';
    }

    return `${this.engineSpeedSourceLabel(engine)}${engine.speedSourceTag ? ` · ${engine.speedSourceTag}` : ''}.`;
  }

  selectReportType(type: ReportType): void {
    if (this.selectedReportType === type || this.loading) {
      return;
    }

    this.selectedReportType = type;
    this.onReportTypeChange();
  }

  onReportTypeChange(): void {
    this.resetPreviewState();
    this.refreshLocalArchiveAvailability();
  }

  onReportDateChange(value: string, type: ReportType): void {
    if (type === 'd') {
      this.selectedDate = value;
    } else {
      this.selectedMonth = value;
    }

    this.resetPreviewState();
    this.refreshLocalArchiveAvailability();
  }

  shiftOfficialPeriod(direction: -1 | 1): void {
    if (this.selectedReportType === 'd') {
      const base =
        this.parseLocalDate(this.selectedDate) || this.dateFormat.addDays(new Date(), -1);
      const next = this.dateFormat.addDays(base, direction);
      const nextValue = this.dateFormat.formatDateInput(next);
      this.selectedDate = nextValue > this.maxDailyReportDate ? this.maxDailyReportDate : nextValue;
    } else {
      const base = this.parseLocalMonth(this.selectedMonth) || new Date();
      const next = new Date(base.getFullYear(), base.getMonth() + direction, 1);
      const nextValue = this.dateFormat.formatMonthInput(next);
      this.selectedMonth =
        nextValue > this.maxMonthlyReportPeriod ? this.maxMonthlyReportPeriod : nextValue;
    }

    this.resetPreviewState();
    this.refreshLocalArchiveAvailability();
  }

  useLatestCompletedPeriod(): void {
    if (this.selectedReportType === 'd') {
      this.selectedDate = this.maxDailyReportDate;
    } else {
      this.selectedMonth = this.maxMonthlyReportPeriod;
    }

    this.resetPreviewState();
    this.refreshLocalArchiveAvailability(this.isOfficialPdfView);
  }

  clearError(): void {
    this.errorMessage = '';
  }

  clearSuccess(): void {
    this.successMessage = '';
  }

  loadReport(): void {
    if (this.loading) {
      return;
    }

    this.reportRequestCancel$.next();
    this.clearMessages();
    this.revokePdfUrl();

    const fvName = this.selectedVesselName.trim();
    const timestamp = this.selectedTimestamp;

    if (this.selectedPeriodIsFuture) {
      this.errorMessage =
        'Future report periods are blocked. Select a completed date before loading a report.';
      return;
    }

    if (!fvName) {
      this.errorMessage = 'Please select a vessel from the sidebar before loading a report.';
      return;
    }

    if (!timestamp) {
      this.errorMessage = 'Please select a valid report period.';
      return;
    }

    this.loadedAt = null;
    this.reportFileName = this.buildReportFileName();
    this.pdfFromCache = false;

    const cacheKey = this.buildReportCacheKey(this.selectedReportType, timestamp, fvName);
    const cachedReport = this.reportPdfCache.get(cacheKey);
    if (cachedReport) {
      this.reportFileName = cachedReport.fileName || this.reportFileName;
      this.presentPdf(cachedReport.blob, true, cachedReport.source, cachedReport.archiveEntry);
      return;
    }

    this.loading = true;
    this.changeDetector.markForCheck();

    this.requestSelectedReport(this.selectedReportType, timestamp, fvName)
      .pipe(
        takeUntil(this.reportRequestCancel$),
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
          this.changeDetector.markForCheck();
        }),
      )
      .subscribe({
        next: (result: ReportLoadResult) => {
          const cacheValue: ReportPdfCacheValue = {
            blob: result.blob,
            source: result.source,
            archiveEntry: result.archiveEntry,
            fileName: result.archiveEntry?.fileName || this.reportFileName,
          };
          this.reportPdfCache.set(cacheKey, cacheValue);
          this.presentPdf(result.blob, false, result.source, result.archiveEntry);
        },
        error: (error: unknown) => {
          console.error('[ReportComponent] load report error:', error);
          this.errorMessage = this.resolveReportErrorMessage(error);
          this.changeDetector.markForCheck();
        },
      });
  }

  reloadReport(): void {
    if (this.canLoadReport) {
      this.loadReport();
    }
  }

  download(): void {
    if (!this.pdfFile.download(this.pdfUrl, this.reportFileName || 'fleet-report.pdf')) {
      this.errorMessage = 'There is no PDF file available to download.';
    }
  }

  openPdfNewTab(): void {
    if (!this.pdfFile.openNewTab(this.pdfUrl)) {
      this.errorMessage = 'There is no PDF file available to open.';
    }
  }

  zoomIn(): void {
    this.pdfZoom = Math.min(2.5, Number((this.pdfZoom + 0.15).toFixed(2)));
  }

  zoomOut(): void {
    this.pdfZoom = Math.max(0.5, Number((this.pdfZoom - 0.15).toFixed(2)));
  }

  resetZoom(): void {
    this.pdfZoom = 1;
  }

  onPdfError(error: unknown): void {
    console.warn('[ReportComponent] PDF viewer error:', error);
    this.errorMessage =
      'Unable to preview this PDF. Please try downloading it or reload the report.';
  }

  private requestSelectedReport(
    reportType: ReportType,
    timestamp: string,
    fvName: string,
  ): Observable<ReportLoadResult> {
    const period = this.selectedPeriodLabel;

    return this.getArchiveEntry$(reportType, period, fvName).pipe(
      switchMap((entry) => {
        if (!entry) {
          return this.requestReport(reportType, timestamp, fvName).pipe(
            map((blob) => ({ blob, source: 'server' as const, archiveEntry: null })),
          );
        }

        return this.officialReportLibrary.loadReport(entry).pipe(
          timeout(8_000),
          switchMap((blob) => this.validatePdfBlob(blob, 'LOCAL_ARCHIVE')),
          map((blob) => ({ blob, source: 'local-archive' as const, archiveEntry: entry })),
          catchError((localError) => {
            console.warn(
              '[ReportComponent] Local official archive failed; using report service fallback.',
              localError,
            );
            return this.requestReport(reportType, timestamp, fvName).pipe(
              map((blob) => ({ blob, source: 'server' as const, archiveEntry: null })),
            );
          }),
        );
      }),
    );
  }

  private requestReport(
    reportType: ReportType,
    timestamp: string,
    fvName: string,
  ): Observable<Blob> {
    return this.newHttp.getReport(reportType, timestamp, fvName).pipe(
      timeout(15_000),
      switchMap((blob: Blob) => this.validatePdfBlob(blob, 'API2')),
      catchError((firstError: unknown) => {
        if (!this.shouldUseGatewayFallback(firstError)) {
          return throwError(() => firstError);
        }

        console.warn(
          '[ReportComponent] Direct report API failed; using gateway fallback.',
          firstError,
        );

        return this.http.getReport(reportType, timestamp, fvName).pipe(
          timeout(20_000),
          switchMap((blob: Blob) => this.validatePdfBlob(blob, 'API1')),
        );
      }),
    );
  }

  private presentPdf(
    blob: Blob,
    fromCache: boolean,
    source: ReportLoadResult['source'],
    archiveEntry: OfficialReportArchiveEntry | null,
  ): void {
    this.revokePdfUrl();
    this.pdfBlob = blob;
    this.pdfUrl = this.pdfFile.createObjectUrl(blob);
    this.loadedAt = new Date();
    this.pdfFromCache = fromCache;
    this.pdfFromLocalArchive = source === 'local-archive';
    this.loadedArchiveEntry = archiveEntry;

    if (archiveEntry?.fileName) {
      this.reportFileName = archiveEntry.fileName;
    }

    this.successMessage =
      this.pdfFromLocalArchive || fromCache ? '' : 'Report PDF loaded and validated successfully.';
    this.changeDetector.markForCheck();
  }

  private validatePdfBlob(blob: Blob, source: string): Observable<Blob> {
    return from(this.pdfFile.validatePdfBlob(blob)).pipe(
      switchMap((result) =>
        result.valid ? of(blob) : throwError(() => new Error(`${source}:${result.reason}`)),
      ),
    );
  }

  private refreshLocalArchiveAvailability(autoLoad = false): void {
    const period = this.selectedPeriodLabel;
    const vessel = this.selectedVesselName.trim();

    if (!period || !vessel || this.selectedPeriodIsFuture) {
      this.localArchiveEntry = null;
      this.changeDetector.markForCheck();
      return;
    }

    this.archiveLookupRequest$.next({
      reportType: this.selectedReportType,
      period,
      vessel,
      autoLoad,
    });
  }

  private watchLocalArchiveAvailability(): void {
    this.archiveLookupRequest$
      .pipe(
        debounceTime(100),
        distinctUntilChanged(
          (previous, current) =>
            previous.reportType === current.reportType &&
            previous.period === current.period &&
            previous.vessel === current.vessel &&
            previous.autoLoad === current.autoLoad,
        ),
        switchMap((request) =>
          this.getArchiveEntry$(request.reportType, request.period, request.vessel).pipe(
            map((entry) => ({ request, entry })),
            catchError((error: unknown) => {
              console.warn('[ReportComponent] Local archive lookup failed:', error);
              return of({ request, entry: null as OfficialReportArchiveEntry | null });
            }),
          ),
        ),
        takeUntil(this.destroy$),
      )
      .subscribe(({ request, entry }) => {
        this.localArchiveEntry = entry;

        if (
          request.autoLoad &&
          entry &&
          this.isOfficialPdfView &&
          !this.hasPdf &&
          !this.loading
        ) {
          this.loadReport();
          return;
        }

        this.changeDetector.markForCheck();
      });
  }

  private getArchiveEntry$(
    reportType: ReportType,
    period: string,
    vessel: string,
  ): Observable<OfficialReportArchiveEntry | null> {
    const key = this.buildArchiveLookupKey(reportType, period, vessel);
    const cached = this.archiveLookupCache.get(key);
    const now = Date.now();

    if (cached && cached.expiresAt > now) {
      return of(cached.entry);
    }

    if (cached) {
      this.archiveLookupCache.delete(key);
    }

    const inFlight = this.archiveLookupInFlight.get(key);
    if (inFlight) {
      return inFlight;
    }

    const request$ = this.officialReportLibrary.findReport(reportType, period, vessel).pipe(
      take(1),
      tap((entry) => {
        this.archiveLookupCache.set(key, {
          entry,
          expiresAt:
            Date.now() + (entry ? ARCHIVE_LOOKUP_HIT_TTL_MS : ARCHIVE_LOOKUP_MISS_TTL_MS),
        });
      }),
      finalize(() => {
        this.archiveLookupInFlight.delete(key);
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    this.archiveLookupInFlight.set(key, request$);
    return request$;
  }

  private buildArchiveLookupKey(reportType: ReportType, period: string, vessel: string): string {
    return [reportType, period, vessel.trim().toLowerCase()].join('|');
  }

  private buildReportCacheKey(
    reportType: ReportType,
    timestamp: string,
    vesselName: string,
  ): string {
    return [reportType, timestamp, vesselName.trim().toLowerCase()].join('|');
  }

  private shouldUseGatewayFallback(error: unknown): boolean {
    const message = this.getErrorText(error).toLowerCase();

    // A second route will return the same oversized PDF, so avoid duplicating
    // expensive server/network work for this deterministic validation failure.
    if (message.includes('too-large')) {
      return false;
    }

    // Preserve the existing gateway fallback for network/HTTP/direct-route failures.
    return true;
  }

  private resolveReportErrorMessage(error: unknown): string {
    const text = this.getErrorText(error).toLowerCase();

    if (text.includes('timeout')) {
      return 'The report server took too long to respond. The request was stopped safely; please try again.';
    }

    if (text.includes('too-large')) {
      return 'The returned PDF is larger than the safe preview limit. Please contact the report administrator.';
    }

    if (text.includes('invalid-signature')) {
      return 'The server returned a non-PDF response. The file was blocked to protect the viewer.';
    }

    return 'Report not found, or the backend did not return a valid PDF file for this period.';
  }

  private watchActiveVessel(): void {
    merge(
      this.store.select(fvInfoReducer.getFvInfosActive),
      this.realtimeService.activeVessel$,
    )
      .pipe(
        filter((vessel: any) => !!this.vesselStorage.extractVesselName(vessel)),
        distinctUntilChanged(
          (previous: any, current: any) =>
            this.getVesselIdentity(previous) === this.getVesselIdentity(current),
        ),
        takeUntil(this.destroy$),
      )
      .subscribe((vessel: any) => {
        this.setSelectedVessel(vessel);
      });
  }

  private watchLiveReport(): void {
    this.realtimeService.loading$
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((loading) => {
        this.liveLoading = loading;
        this.changeDetector.markForCheck();
      });

    combineLatest([
      this.selectedVesselSource,
      this.realtimeService.currentData$,
      this.realtimeService.lastUpdated$,
      this.liveReportService.profileDocument$,
    ])
      .pipe(
        // currentData$ and lastUpdated$ commonly emit in the same refresh cycle.
        // Coalesce them so buildSnapshot() runs once for that cycle.
        auditTime(0),
        takeUntil(this.destroy$),
      )
      .subscribe(([vessel, data, updatedAt, profileDocument]) => {
        this.activeVesselReportAdapter = vessel ? this.vesselReportResolver.resolve(vessel) : null;
        const effectiveProfileDocument = this.activeVesselReportAdapter
          ? this.activeVesselReportAdapter.prepareProfileDocument(profileDocument)
          : profileDocument;
        this.reportProfileDocument = effectiveProfileDocument;

        if (vessel) {
          const vesselIdentity = this.getVesselIdentity(vessel);
          const previousSnapshot =
            this.liveSnapshot &&
            this.getVesselIdentity(this.selectedVessel) === vesselIdentity &&
            this.liveSnapshot.vesselName === this.vesselStorage.extractVesselName(vessel)
              ? this.liveSnapshot
              : null;
          const displayData = this.mergeLiveDataForDisplay(vessel, data);
          const hasFreshData = this.hasUsableRealtimeData(data);
          const effectiveUpdatedAt = hasFreshData
            ? updatedAt
            : previousSnapshot?.updatedAt || updatedAt;

          let snapshot = this.liveReportService.buildSnapshot(
            vessel,
            displayData,
            effectiveUpdatedAt,
            effectiveProfileDocument,
          );

          if (this.activeVesselReportAdapter) {
            snapshot = this.activeVesselReportAdapter.enhanceSnapshot(snapshot, displayData);
          }

          this.liveSnapshot = snapshot;
        } else {
          this.liveSnapshot = null;
        }

        this.verifiedModeAvailable = !!(
          vessel &&
          this.liveSnapshot?.modeSource === 'verified-tag' &&
          this.liveReportService.supportsVerifiedModeHistorian(vessel, effectiveProfileDocument)
        );

        this.modeHistoryConfig = this.activeVesselReportAdapter && this.liveSnapshot
          ? this.activeVesselReportAdapter.getModeHistoryConfig(this.liveSnapshot)
          : this.verifiedModeAvailable
            ? {
                enabled: true,
                kind: 'direct',
                sourceTag: this.liveReportService.getModeHistorianTag(
                  vessel,
                  effectiveProfileDocument,
                  this.liveSnapshot?.modeSourceTag,
                ),
                eyebrow: 'VERIFIED MODE HISTORY',
                title: 'Today Mode Timeline',
                description: 'Historian data from the vessel direct operating-mode tag.',
                qualityLabel: 'Verified · Direct mode tag',
              }
            : null;

        this.modeReportAvailable = !!this.modeHistoryConfig?.enabled;

        if (!this.modeReportAvailable) {
          this.clearModeHistoryView();
        }

        this.updateDerivedLiveState();
        if (this.dedicatedReportServiceActive) {
          if (this.isHistoricalUiView && !this.scGlory1DailyReport) {
            this.loadHistoricalUiReport(false);
          } else if (this.activeTab === 'live') {
            this.maybeLoadScGlory1DailyReport(false);
          }
        } else {
          this.maybeLoadModeHistory(vessel, effectiveProfileDocument, false);
        }
        this.changeDetector.markForCheck();
      });
  }

  private setSelectedVessel(vessel: any): void {
    const name = this.vesselStorage.extractVesselName(vessel);

    if (!name) {
      return;
    }

    const previousIdentity = this.getVesselIdentity(this.selectedVessel);
    const nextIdentity = this.getVesselIdentity(vessel);

    if (previousIdentity === nextIdentity && this.selectedVesselName === name) {
      return;
    }

    this.selectedVessel = vessel;
    this.selectedVesselName = name;
    this.vesselStorage.setSelectedVessel(vessel, 'reportVessel');
    this.selectedVesselSource.next(vessel);
    this.showAllModes = false;
    this.engineView = 'all';
    this.resetModeHistory();
    // Resolve the vessel-specific report service immediately. Historical UI
    // must remain available even when current realtime telemetry is offline.
    this.activeVesselReportAdapter = this.vesselReportResolver.resolve(vessel);
    this.resetScGlory1DailyReport();
    this.resetPreviewState();
    this.refreshLocalArchiveAvailability(this.isOfficialPdfView);

    // If the user is already on the History Report tab, selecting a dedicated vessel
    // should load its historian UI immediately; do not wait for a realtime
    // polling cycle because historical reports are independent of live data.
    if (this.isHistoricalUiView) {
      this.showDetailedDailySections = true;
      this.loadHistoricalUiReport(false);
    }

    this.changeDetector.markForCheck();
  }

  private loadStoredVessel(): void {
    const vessel = this.vesselStorage.getStoredVessel();
    this.selectedVessel = vessel;
    this.selectedVesselName = this.vesselStorage.extractVesselName(vessel);
    this.activeVesselReportAdapter = vessel ? this.vesselReportResolver.resolve(vessel) : null;
    this.selectedVesselSource.next(vessel);
  }

  private maybeLoadScGlory1DailyReport(force: boolean): void {
    const dedicatedService = this.activeHistoricalReportService;
    if (
      !dedicatedService ||
      !this.liveSnapshot ||
      this.activeTab !== 'live' ||
      this.scGlory1DailyLoading
    ) {
      return;
    }

    const periodStart = new Date(this.liveSnapshot.periodStart);
    const periodEnd = new Date(this.liveSnapshot.periodEnd || new Date());

    this.scGlory1DailySubscription?.unsubscribe();
    this.scGlory1DailyLoading = true;
    this.scGlory1DailyError = '';
    this.changeDetector.markForCheck();

    this.scGlory1DailySubscription = dedicatedService
      .loadPeriodReport(periodStart, periodEnd, 'day', force)
      .pipe(
        take(1),
        timeout(30000),
        catchError((error: unknown) => {
          console.warn(`[Report] Unable to load ${this.selectedVesselName || 'dedicated vessel'} detailed daily report.`, error);
          this.scGlory1DailyError =
            'Detailed historian data could not be loaded. Live summary values are still available above.';
          return of(null);
        }),
        finalize(() => {
          this.scGlory1DailyLoading = false;
          this.changeDetector.markForCheck();
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((report) => {
        if (!report) return;
        this.scGlory1DailyReport = report;
        this.scGlory1DailySyncedAt = report.loadedAt;
        this.updateScGlory1DailyChartState(report);
        this.changeDetector.markForCheck();
      });
  }

  private resetScGlory1DailyReport(): void {
    this.scGlory1DailySubscription?.unsubscribe();
    this.scGlory1DailySubscription = null;
    this.scGlory1DailyReport = null;
    this.scGlory1DailyLoading = false;
    this.scGlory1DailyError = '';
    this.scGlory1DailySyncedAt = null;
    this.speedPerformancePolyline = '';
    this.speedPerformancePoints = [];
    this.routePlotPolyline = '';
    this.routePlotPoints = [];
    this.hideChartTooltip();
    this.hourlyMaxTotalFuel = 1;
    this.hourlyMaxMainFuel = 1;
    this.hourlyMaxAuxFuel = 1;
    this.hourlyMaxDistance = 1;
    this.hourlyMaxSpeed = 1;
    this.hourlyMaxPortMainFuel = 1;
    this.hourlyMaxCenterMainFuel = 1;
    this.hourlyMaxStarboardMainFuel = 1;
    this.modeFuelPieBackground = 'conic-gradient(#e2e8f0 0deg 360deg)';
    this.modeRunningPieBackground = 'conic-gradient(#e2e8f0 0deg 360deg)';
    this.modeFuelPieData = [];
    this.modeRunningPieData = [];
    this.dailyFuelSplitBackground = 'conic-gradient(#e2e8f0 0deg 360deg)';
    this.dailyMainFuelShare = 0;
    this.dailyAuxFuelShare = 0;
    this.dailyTotalModeRunningHours = 0;
    this.dailyAverageEngineUtilization = 0;
    this.dailyAverageShaftUtilization = 0;
    this.dailyPeakFuelHour = -1;
    this.dailyPeakFuelValue = 0;
    this.dailyEquipmentWithDataCount = 0;
    this.dailyHasCenterMainEngine = false;
    this.dailyHasCenterAuxiliary = false;
    this.dailyDominantModeLabel = '—';
    this.showDetailedDailySections = false;
    this.dailyVisibleHourlyRows = [];
    this.clearDailyGoogleMap();
  }

  private updateScGlory1DailyChartState(report: ScGlory1PeriodUiReport): void {
    const reportEnd = new Date(report.periodEnd);
    const endHour = Number.isFinite(reportEnd.getTime()) ? reportEnd.getHours() : 23;
    // A one-day live report hides future hours. Multi-day and monthly reports
    // aggregate by clock hour across all loaded days, so all 24 buckets remain useful.
    this.dailyVisibleHourlyRows =
      report.dayCount > 1 ? [...report.hourly] : report.hourly.filter((row) => row.hour <= endHour);

    const active = report.hourly.filter((row) => row.active);
    const maxOf = (selector: (row: ScGlory1HourlyRow) => number | null): number =>
      Math.max(1, ...active.map((row) => selector(row) || 0));

    this.hourlyMaxTotalFuel = maxOf((row) => row.totalFuel);
    this.hourlyMaxMainFuel = maxOf((row) => row.mainFuel);
    this.hourlyMaxAuxFuel = maxOf((row) => row.auxFuel);
    this.hourlyMaxDistance = maxOf((row) => row.distanceNm);
    this.hourlyMaxSpeed = maxOf((row) => row.speedKnots);
    this.hourlyMaxPortMainFuel = maxOf((row) => row.portMainFuel);
    this.hourlyMaxCenterMainFuel = maxOf((row) => row.centerMainFuel);
    this.hourlyMaxStarboardMainFuel = maxOf((row) => row.starboardMainFuel);
    this.speedPerformancePoints = this.buildSpeedChartPoints(report.speedSeries, 680, 180, 10);
    this.speedPerformancePolyline = this.speedPerformancePoints
      .map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`)
      .join(' ');
    this.routePlotPoints = this.buildRouteChartPoints(report.tracking.route, 680, 250, 18);
    this.routePlotPolyline = this.routePlotPoints
      .map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`)
      .join(' ');
    this.modeFuelPieBackground = this.buildModePieGradient(
      report.modeSummary,
      (row) => row.fuelPercent,
    );
    this.modeRunningPieBackground = this.buildModePieGradient(
      report.modeSummary,
      (row) => row.runningPercent,
    );
    this.modeFuelPieData = report.modeSummary
      .map((row, index) => ({
        name: row.label,
        value: Math.max(0, Number(row.fuelUsed) || 0),
        color: this.scGlory1ModeChartColors[index % this.scGlory1ModeChartColors.length],
      }))
      .filter((item) => item.value > 0);
    this.modeRunningPieData = report.modeSummary
      .map((row, index) => ({
        name: row.label,
        value: Math.max(0, Number(row.runningHours) || 0),
        color: this.scGlory1ModeChartColors[index % this.scGlory1ModeChartColors.length],
      }))
      .filter((item) => item.value > 0);

    const totalFuel = Math.max(0, Number(report.totalFuelUsed) || 0);
    const mainFuel = Math.max(0, Number(report.mainEngineFuelTotal) || 0);
    const auxFuel = Math.max(0, Number(report.auxiliaryFuelTotal) || 0);
    this.dailyMainFuelShare = totalFuel > 0 ? (mainFuel / totalFuel) * 100 : 0;
    this.dailyAuxFuelShare = totalFuel > 0 ? (auxFuel / totalFuel) * 100 : 0;
    this.dailyFuelSplitBackground = totalFuel > 0
      ? `conic-gradient(#2563eb 0% ${this.dailyMainFuelShare.toFixed(3)}%, #14b8a6 ${this.dailyMainFuelShare.toFixed(3)}% 100%)`
      : 'conic-gradient(#e2e8f0 0deg 360deg)';
    this.dailyTotalModeRunningHours = report.modeSummary.reduce(
      (sum, row) => sum + Math.max(0, Number(row.runningHours) || 0),
      0,
    );
    this.dailyDominantModeLabel = report.modeSummary.reduce<ScGlory1ModeSummaryRow | null>(
      (dominant, row) =>
        !dominant || (Number(row.fuelUsed) || 0) > (Number(dominant.fuelUsed) || 0) ? row : dominant,
      null,
    )?.label || '—';

    const engineUtil = report.utilization.find((row) => /M\/E Engine Utilized/i.test(row.label));
    const shaftUtil = report.utilization.find((row) => /^Shaft Utilized/i.test(row.label));
    const average = (values: number[]): number => {
      const finite = values.filter((value) => Number.isFinite(value));
      return finite.length ? finite.reduce((sum, value) => sum + value, 0) / finite.length : 0;
    };
    this.dailyAverageEngineUtilization = engineUtil
      ? average([engineUtil.port, engineUtil.center, engineUtil.starboard])
      : 0;
    this.dailyAverageShaftUtilization = shaftUtil
      ? average([shaftUtil.port, shaftUtil.center, shaftUtil.starboard])
      : 0;

    const peakFuel = active.reduce<ScGlory1HourlyRow | null>((peak, row) => {
      const value = Number(row.totalFuel) || 0;
      return !peak || value > (Number(peak.totalFuel) || 0) ? row : peak;
    }, null);
    this.dailyPeakFuelHour = peakFuel?.hour ?? -1;
    this.dailyPeakFuelValue = Math.max(0, Number(peakFuel?.totalFuel) || 0);
    this.dailyHasCenterMainEngine = report.engineSummary.some((row) => row.key === 'center');
    this.dailyHasCenterAuxiliary = report.auxSummary.some((row) => row.key === 'center');
    this.dailyEquipmentWithDataCount =
      report.engineSummary.filter(
        (row) =>
          row.averageRpm !== null ||
          row.maximumRpm !== null ||
          row.runningHours > 0 ||
          row.fuelUsed > 0,
      ).length +
      report.auxSummary.filter((row) => row.runningHours > 0 || row.fuelUsed > 0).length;

    this.scheduleDailyGoogleMap(report);
  }

  private buildModePieGradient(
    rows: readonly ScGlory1ModeSummaryRow[],
    valueSelector: (row: ScGlory1ModeSummaryRow) => number,
  ): string {
    const values = rows.map((row) => Math.max(0, Number(valueSelector(row)) || 0));
    const total = values.reduce((sum, value) => sum + value, 0);
    if (total <= 0) {
      return 'conic-gradient(#e2e8f0 0deg 360deg)';
    }

    let cursor = 0;
    const stops = values.map((value, index) => {
      const start = cursor;
      cursor += (value / total) * 100;
      return `${this.modeChartColor(index)} ${start.toFixed(3)}% ${cursor.toFixed(3)}%`;
    });

    return `conic-gradient(${stops.join(', ')})`;
  }

  private scheduleDailyGoogleMap(report: ScGlory1PeriodUiReport): void {
    if (this.dailyMapRenderTimer !== null) {
      clearTimeout(this.dailyMapRenderTimer);
    }

    this.dailyMapRenderTimer = setTimeout(() => {
      this.dailyMapRenderTimer = null;
      this.renderDailyGoogleMap(report);
    }, 0);
  }

  private renderDailyGoogleMap(report: ScGlory1PeriodUiReport): void {
    this.clearDailyGoogleMap(false);
    this.dailyMapError = '';

    const route = (report.tracking.route || []).filter(
      (point) =>
        Number.isFinite(point.latitude) &&
        Number.isFinite(point.longitude) &&
        Math.abs(point.latitude) <= 90 &&
        Math.abs(point.longitude) <= 180,
    );

    if (route.length === 0) {
      this.dailyMapReady = false;
      this.dailyMapError = 'Map coordinates are not available for this report period.';
      this.changeDetector.markForCheck();
      return;
    }

    if (typeof google === 'undefined' || !google.maps) {
      this.dailyMapReady = false;
      this.dailyMapError = 'Google Maps is unavailable. The route plot on the left remains available.';
      this.changeDetector.markForCheck();
      return;
    }

    const element = this.dailyGoogleMapElement?.nativeElement;
    if (!element) {
      this.dailyMapReady = false;
      this.dailyMapError = 'Map view is preparing…';
      this.changeDetector.markForCheck();
      return;
    }

    try {
      const path = route.map((point) => ({ lat: point.latitude, lng: point.longitude }));
      const bounds = new google.maps.LatLngBounds();
      path.forEach((position) => bounds.extend(position));

      this.dailyGoogleMap = new google.maps.Map(element, {
        center: path[path.length - 1],
        zoom: 8,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        fullscreenControl: true,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: true,
        gestureHandling: 'cooperative',
        backgroundColor: '#e8f4fb',
      });

      const halo = new google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: '#ffffff',
        strokeOpacity: 0.9,
        strokeWeight: 7,
        clickable: false,
        map: this.dailyGoogleMap,
        zIndex: 7,
      });
      const routeLine = new google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: '#315fd4',
        strokeOpacity: 1,
        strokeWeight: 4,
        clickable: false,
        map: this.dailyGoogleMap,
        zIndex: 8,
      });
      this.dailyGoogleRoute = { halo, routeLine };

      const start = path[0];
      const end = path[path.length - 1];
      const startMarker = new google.maps.Marker({
        position: start,
        map: this.dailyGoogleMap,
        title: 'Begin position',
        label: { text: 'S', color: '#ffffff', fontWeight: '700' },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#16a34a',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
        zIndex: 12,
      });
      const endMarker = new google.maps.Marker({
        position: end,
        map: this.dailyGoogleMap,
        title: 'End position',
        label: { text: 'E', color: '#ffffff', fontWeight: '700' },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#ef4444',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
        zIndex: 13,
      });

      const heading = report.tracking.end?.heading;
      const vesselMarker = new google.maps.Marker({
        position: end,
        map: this.dailyGoogleMap,
        title: this.selectedVesselName || 'Fleet vessel',
        icon: {
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 7,
          rotation: Number.isFinite(heading as number) ? Number(heading) : 0,
          fillColor: '#0f3b82',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 1.5,
        },
        zIndex: 14,
      });
      this.dailyGoogleMarkers = [startMarker, endMarker, vesselMarker];

      if (path.length > 1) {
        this.dailyGoogleMap.fitBounds(bounds, 48);
      } else {
        this.dailyGoogleMap.setCenter(end);
        this.dailyGoogleMap.setZoom(12);
      }

      this.dailyMapReady = true;
      this.dailyMapError = '';
    } catch (error) {
      console.warn('[Report] Daily Google Map initialization failed.', error);
      this.dailyMapReady = false;
      this.dailyMapError = 'Map could not be initialized. The route plot on the left remains available.';
    }

    this.changeDetector.markForCheck();
  }

  private clearDailyGoogleMap(clearTimer = true): void {
    if (clearTimer && this.dailyMapRenderTimer !== null) {
      clearTimeout(this.dailyMapRenderTimer);
      this.dailyMapRenderTimer = null;
    }

    if (this.dailyGoogleRoute) {
      this.dailyGoogleRoute.halo?.setMap?.(null);
      this.dailyGoogleRoute.routeLine?.setMap?.(null);
      this.dailyGoogleRoute = null;
    }
    for (const marker of this.dailyGoogleMarkers) {
      marker?.setMap?.(null);
    }
    this.dailyGoogleMarkers = [];
    this.dailyGoogleMap = null;
    this.dailyMapReady = false;
    if (clearTimer) {
      this.dailyMapError = '';
    }
  }

  private buildSpeedChartPoints(
    points: readonly ScGlory1SpeedPoint[],
    width: number,
    height: number,
    padding: number,
  ): ReportSpeedChartPoint[] {
    if (points.length === 0) return [];
    const valid = points.filter(
      (point) =>
        point?.timestamp instanceof Date &&
        Number.isFinite(point.timestamp.getTime()) &&
        Number.isFinite(point.speed),
    );
    if (valid.length === 0) return [];

    const maximum = Math.max(1, ...valid.map((point) => Math.max(0, point.speed)));
    const usableWidth = Math.max(1, width - padding * 2);
    const usableHeight = Math.max(1, height - padding * 2);
    return valid.map((point, index) => ({
      x: padding + (valid.length === 1 ? usableWidth / 2 : (index / (valid.length - 1)) * usableWidth),
      y: padding + usableHeight - (Math.max(0, point.speed) / maximum) * usableHeight,
      timestamp: point.timestamp,
      speed: point.speed,
    }));
  }

  private buildRouteChartPoints(
    route: readonly ScGlory1TrackingPoint[],
    width: number,
    height: number,
    padding: number,
  ): ReportRouteChartPoint[] {
    if (route.length === 0) return [];
    const valid = route.filter(
      (point) =>
        point?.timestamp instanceof Date &&
        Number.isFinite(point.timestamp.getTime()) &&
        Number.isFinite(point.latitude) &&
        Number.isFinite(point.longitude),
    );
    if (valid.length === 0) return [];

    const latitudes = valid.map((point) => point.latitude);
    const longitudes = valid.map((point) => point.longitude);
    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);
    const latSpan = Math.max(0.000001, maxLat - minLat);
    const lngSpan = Math.max(0.000001, maxLng - minLng);
    const usableWidth = Math.max(1, width - padding * 2);
    const usableHeight = Math.max(1, height - padding * 2);

    return valid.map((point) => ({
      x: padding + ((point.longitude - minLng) / lngSpan) * usableWidth,
      y: padding + usableHeight - ((point.latitude - minLat) / latSpan) * usableHeight,
      timestamp: point.timestamp,
      latitude: point.latitude,
      longitude: point.longitude,
      speed: point.speed,
      heading: point.heading,
    }));
  }

  private maybeLoadModeHistory(
    vessel: any,
    document: LiveReportProfileDocument | null,
    force: boolean,
  ): void {
    if (!vessel || !document || this.activeTab !== 'live' || !this.liveSnapshot) {
      return;
    }

    // Server-safety gate: mode historian is enabled only by an explicit source.
    // Generic vessels still fail closed. A dedicated vessel adapter may opt in
    // with a known historian tag (SC GLORY 1 / SC GLORY 2 use GPS-speed history).
    if (!this.modeReportAvailable || !this.modeHistoryConfig?.enabled) {
      this.clearModeHistoryView();
      return;
    }

    const periodStart = new Date(this.liveSnapshot.periodStart);
    const periodEnd = new Date(this.liveSnapshot.periodEnd || new Date());
    const sourceTag =
      this.modeHistoryConfig.kind === 'derived'
        ? this.modeHistoryConfig.sourceTag
        : this.liveReportService.getModeHistorianTag(
            vessel,
            document,
            this.liveSnapshot.modeSourceTag,
          );

    if (!sourceTag) {
      this.clearModeHistoryView('Configured mode historian source is not available for this vessel.');
      return;
    }

    const dayKey = this.dateFormat.formatDateInput(periodStart);
    const requestKey = `${this.getVesselIdentity(vessel)}|${dayKey}|${sourceTag}`;
    const now = Date.now();
    const cached = this.modeHistoryCache.get(requestKey);

    if (!force && cached) {
      const ttl = cached.records.length > 0 ? MODE_HISTORY_SUCCESS_TTL_MS : MODE_HISTORY_EMPTY_TTL_MS;
      if (now - cached.loadedAt < ttl) {
        this.modeHistorySourceTag = sourceTag;
        this.modeHistorySyncedAt = cached.syncedAt;
        this.buildModeHistoryView(cached.records, periodStart, periodEnd);
        this.modeHistoryError = cached.records.length
          ? ''
          : 'No mode history was returned. The empty result is cached to protect the historian server.';
        this.changeDetector.markForCheck();
        return;
      }
    }

    if (this.modeHistoryLoading) {
      return;
    }

    this.modeHistorySubscription?.unsubscribe();
    this.modeHistoryLoading = true;
    this.modeHistoryError = '';
    this.modeHistorySourceTag = sourceTag;
    this.changeDetector.markForCheck();

    const start = this.formatHistorianRequestTime(periodStart);
    const end = this.formatHistorianRequestTime(periodEnd);
    const tags = [{ name: sourceTag, tagName: sourceTag }];

    this.modeHistorySubscription = this.newHttp
      .getHistorianValues(start, end, tags)
      .pipe(
        take(1),
        timeout(15000),
        catchError((error: unknown) => {
          console.warn('[Report] Unable to load configured mode historian.', error);
          return of(null);
        }),
        finalize(() => {
          this.modeHistoryLoading = false;
          this.changeDetector.markForCheck();
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((response: any) => {
        const records = this.extractModeHistoryRecords(response, vessel, document);
        const syncedAt = new Date();

        this.modeHistoryCache.set(requestKey, {
          records,
          loadedAt: Date.now(),
          syncedAt,
        });

        this.buildModeHistoryView(records, periodStart, periodEnd);
        this.modeHistorySyncedAt = syncedAt;

        if (records.length === 0) {
          this.modeHistoryError =
            'No mode history was returned. Fleet Visual will wait before trying this historian source again.';
        }

        this.changeDetector.markForCheck();
      });
  }

  private clearModeHistoryView(message = ''): void {
    this.modeHistorySubscription?.unsubscribe();
    this.modeHistorySubscription = null;
    this.modeHistoryLoading = false;
    this.modeHistoryError = message;
    this.modeHistorySegments = [];
    this.modeRunningHours = [];
    this.modeHistoryCoveragePercent = 0;
    this.modeHistorySourceTag = '';
    this.modeHistorySyncedAt = null;
  }

  private resetModeHistory(): void {
    this.verifiedModeAvailable = false;
    this.modeReportAvailable = false;
    this.modeHistoryConfig = null;
    this.activeVesselReportAdapter = null;
    this.clearModeHistoryView();
  }

  private extractModeHistoryRecords(
    response: any,
    vessel: any,
    document: LiveReportProfileDocument,
  ): ModeHistoryRecord[] {
    const flatRecords: any[] = [];
    const seen = new Set<any>();

    const visit = (node: any): void => {
      if (node === null || node === undefined || seen.has(node)) {
        return;
      }

      if (typeof node === 'string') {
        const text = node.trim();
        if (!text) {
          return;
        }
        try {
          visit(JSON.parse(text));
        } catch {
          // Plain strings can be leaf values; there is nothing to recurse into.
        }
        return;
      }

      if (typeof node !== 'object') {
        return;
      }

      seen.add(node);

      if (Array.isArray(node)) {
        node.forEach(visit);
        return;
      }

      const timestamp = this.readHistorianTimestamp(node);
      const rawValue = this.readHistorianValue(node);
      if (timestamp !== null && rawValue !== undefined) {
        flatRecords.push(node);
        return;
      }

      const preferredContainers = [
        'data',
        'Data',
        'result',
        'Result',
        'results',
        'Results',
        'records',
        'Records',
        'items',
        'Items',
        'values',
        'Values',
        'tags',
        'Tags',
        'HistorianValues',
        'historianValues',
        'history',
        'History',
        'payload',
        'Payload',
        'points',
        'Points',
        'ValueList',
        'valueList',
      ];

      let traversedKnownContainer = false;
      for (const key of preferredContainers) {
        if (node[key] !== undefined && node[key] !== null) {
          traversedKnownContainer = true;
          visit(node[key]);
        }
      }

      if (!traversedKnownContainer) {
        Object.values(node).forEach(visit);
      }
    };

    visit(response);

    const resolved = flatRecords
      .map((record: any): ModeHistoryRecord | null => {
        const timestampValue = this.readHistorianTimestamp(record);
        const timestamp = this.parseHistorianDate(timestampValue);
        const rawValue = this.readHistorianValue(record);
        const label =
          this.modeHistoryConfig?.kind === 'derived' && this.activeVesselReportAdapter
            ? this.activeVesselReportAdapter.resolveHistorianModeLabel(rawValue)
            : this.liveReportService.resolveHistorianModeLabel(vessel, rawValue, document);

        if (!timestamp || !label) {
          return null;
        }

        return { timestamp, rawValue, label };
      })
      .filter((record): record is ModeHistoryRecord => !!record)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const deduped: ModeHistoryRecord[] = [];
    for (const record of resolved) {
      const previous = deduped[deduped.length - 1];
      if (
        previous &&
        previous.timestamp.getTime() === record.timestamp.getTime() &&
        previous.label === record.label
      ) {
        continue;
      }
      deduped.push(record);
    }

    return deduped;
  }

  private buildModeHistoryView(
    records: ModeHistoryRecord[],
    periodStart: Date,
    periodEnd: Date,
  ): void {
    if (records.length === 0) {
      this.modeHistorySegments = [];
      this.modeRunningHours = [];
      this.modeHistoryCoveragePercent = 0;
      return;
    }

    const startMs = periodStart.getTime();
    const endMs = Math.max(startMs + 1, periodEnd.getTime());
    const bounded = records.filter((record) => {
      const time = record.timestamp.getTime();
      return time >= startMs && time <= endMs;
    });

    if (bounded.length === 0) {
      this.modeHistorySegments = [];
      this.modeRunningHours = [];
      this.modeHistoryCoveragePercent = 0;
      return;
    }

    const colorByMode = new Map<string, string>();
    let nextColorIndex = 0;
    const colorFor = (label: string): string => {
      const key = this.normalizeModeKey(label);
      const existing = colorByMode.get(key);
      if (existing) {
        return existing;
      }

      const configuredIndex = (this.liveSnapshot?.modes || []).findIndex(
        (mode) => this.normalizeModeKey(mode.label) === key,
      );
      const color =
        configuredIndex >= 0
          ? MODE_HISTORY_COLORS[configuredIndex % MODE_HISTORY_COLORS.length]
          : MODE_HISTORY_COLORS[nextColorIndex % MODE_HISTORY_COLORS.length];
      nextColorIndex += 1;
      colorByMode.set(key, color);
      return color;
    };

    const collapsed: ModeHistoryRecord[] = [];
    for (const record of bounded) {
      const previous = collapsed[collapsed.length - 1];
      if (previous && this.normalizeModeKey(previous.label) === this.normalizeModeKey(record.label)) {
        continue;
      }
      collapsed.push(record);
    }

    const segments: ModeTimelineSegment[] = [];
    const effectiveStart = Math.max(startMs, collapsed[0].timestamp.getTime());
    const totalWindowMs = Math.max(1, endMs - effectiveStart);

    collapsed.forEach((record, index) => {
      const segmentStart = Math.max(effectiveStart, record.timestamp.getTime());
      const nextStart =
        index < collapsed.length - 1 ? collapsed[index + 1].timestamp.getTime() : endMs;
      const segmentEnd = Math.min(endMs, Math.max(segmentStart, nextStart));
      const durationMs = Math.max(0, segmentEnd - segmentStart);
      if (durationMs <= 0) {
        return;
      }

      const labelKey = this.normalizeModeKey(record.label);
      segments.push({
        key: `${segmentStart}-${labelKey}`,
        label: record.label,
        start: new Date(segmentStart),
        end: new Date(segmentEnd),
        durationMs,
        percent: (durationMs / totalWindowMs) * 100,
        color: colorFor(record.label),
        isCurrent: labelKey === this.normalizeModeKey(this.currentModeLabel),
      });
    });

    this.modeHistorySegments = segments;
    const coveredMs = segments.reduce((sum, segment) => sum + segment.durationMs, 0);
    this.modeHistoryCoveragePercent = Math.max(
      0,
      Math.min(100, ((endMs - effectiveStart) / Math.max(1, endMs - startMs)) * 100),
    );

    const grouped = new Map<
      string,
      { label: string; durationMs: number; segmentCount: number; color: string; isCurrent: boolean }
    >();

    for (const segment of segments) {
      const key = this.normalizeModeKey(segment.label);
      const current = grouped.get(key);
      if (current) {
        current.durationMs += segment.durationMs;
        current.segmentCount += 1;
        current.isCurrent = current.isCurrent || segment.isCurrent;
      } else {
        grouped.set(key, {
          label: segment.label,
          durationMs: segment.durationMs,
          segmentCount: 1,
          color: segment.color,
          isCurrent: segment.isCurrent,
        });
      }
    }

    this.modeRunningHours = Array.from(grouped.entries())
      .map(([key, item]) => ({
        key,
        ...item,
        percent: coveredMs > 0 ? (item.durationMs / coveredMs) * 100 : 0,
      }))
      .sort((a, b) => b.durationMs - a.durationMs);
  }

  private readHistorianTimestamp(record: any): any {
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

  private readHistorianValue(record: any): any {
    if (!record || typeof record !== 'object') {
      return undefined;
    }

    const candidates = [
      record.Value,
      record.value,
      record.Data,
      record.data,
      record.Val,
      record.val,
      record.NumericValue,
      record.numericValue,
      record.IValue,
      record.iValue,
      record.y,
    ];

    return candidates.find((value) => value !== undefined && value !== null && value !== '');
  }

  private parseHistorianDate(value: any): Date | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }

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

    const numeric = Number(text);
    if (Number.isFinite(numeric) && /^\d+(?:\.\d+)?$/.test(text)) {
      const millis = Math.abs(numeric) < 10_000_000_000 ? numeric * 1000 : numeric;
      const date = new Date(millis);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    const direct = new Date(text);
    if (!Number.isNaN(direct.getTime())) {
      return direct;
    }

    const normalized = text.includes('T') ? text : text.replace(' ', 'T');
    const fallback = new Date(normalized);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }

  private formatHistorianRequestTime(value: Date): string {
    const pad = (part: number): string => String(part).padStart(2, '0');
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(
      value.getHours(),
    )}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
  }

  private normalizeModeKey(value: string): string {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');
  }

  private updateDerivedLiveState(): void {
    this.updateVisibleModes();
    this.updateHeadlineMetrics();
    this.updateVisibleEngines();
    this.updateTableEngineSummary();

    const snapshot = this.liveSnapshot;
    this.exportEnginePages = this.chunkItems(snapshot?.engines || [], 5);
    this.exportModePages = this.modeReportAvailable ? this.chunkItems(snapshot?.modes || [], 14) : [];
    this.liveExportPageCount =
      1 + this.exportEnginePages.length + this.exportModePages.length;

    this.liveExportTotalFuelLabel = this.metricValue('fuel');
    this.liveExportDistanceLabel = this.metricValue('distance');
    this.liveExportAverageSpeedLabel = this.metricValue('average');
    this.liveExportMaximumSpeedLabel = this.metricValue('maximum');

    this.updateFuelSummary(snapshot?.engines || []);
  }

  private updateHeadlineMetrics(): void {
    const metrics = this.liveSnapshot?.metrics || [];
    const preferredOrder = ['fuel', 'distance', 'average', 'speed'];

    this.headlineMetrics = preferredOrder
      .map((key) => metrics.find((metric) => metric.key === key))
      .filter((metric): metric is LiveReportMetric => !!metric);
  }

  private updateTableEngineSummary(): void {
    const engines = this.liveSnapshot?.engines || [];
    this.mainEngineRows = engines.filter((engine) => engine.kind === 'main');
    this.supportEngineRows = engines.filter((engine) => engine.kind !== 'main');

    const summarize = (rows: readonly LiveReportEngineSnapshot[]) => ({
      running: rows.filter((engine) => engine.state === 'running').length,
      fuel: rows.reduce(
        (total, engine) => total + (engine.fuelToday !== null && Number.isFinite(engine.fuelToday) ? engine.fuelToday : 0),
        0,
      ),
      rate: rows.reduce(
        (total, engine) => total + (engine.fuelRate !== null && Number.isFinite(engine.fuelRate) ? engine.fuelRate : 0),
        0,
      ),
    });

    const main = summarize(this.mainEngineRows);
    const support = summarize(this.supportEngineRows);
    this.mainEngineRunningCount = main.running;
    this.mainEngineFuelTotal = main.fuel;
    this.mainEngineFuelRateTotal = main.rate;
    this.supportEngineRunningCount = support.running;
    this.supportEngineFuelTotal = support.fuel;
    this.supportEngineFuelRateTotal = support.rate;
  }

  private updateVisibleEngines(): void {
    const engines = this.liveSnapshot?.engines || [];
    if (this.engineView === 'running') {
      this.visibleEngines = engines.filter((engine) => engine.state === 'running');
      return;
    }

    if (this.engineView === 'stopped') {
      this.visibleEngines = engines.filter((engine) => engine.state !== 'running');
      return;
    }

    this.visibleEngines = [...engines];
  }

  private updateVisibleModes(): void {
    const modes = this.liveSnapshot?.modes || [];

    if (this.showAllModes || modes.length <= 6) {
      this.visibleModes = modes;
    } else {
      const visible = modes.slice(0, 6);
      const current = modes.find((mode) => mode.isCurrent);

      if (current && !visible.some((mode) => mode.key === current.key)) {
        visible[visible.length - 1] = current;
      }

      this.visibleModes = visible;
    }

    this.hiddenModeCount = Math.max(0, modes.length - this.visibleModes.length);
  }

  private updateFuelSummary(engines: readonly LiveReportEngineSnapshot[]): void {
    const totals: Record<FuelBreakdownItem['key'], number> = {
      main: 0,
      auxiliary: 0,
      generator: 0,
      other: 0,
    };

    for (const engine of engines) {
      if (engine.fuelToday === null || !Number.isFinite(engine.fuelToday)) {
        continue;
      }

      const value = Math.max(0, engine.fuelToday);
      const key: FuelBreakdownItem['key'] =
        engine.kind === 'main' || engine.kind === 'motor'
          ? 'main'
          : engine.kind === 'auxiliary'
            ? 'auxiliary'
            : engine.kind === 'generator'
              ? 'generator'
              : 'other';

      totals[key] += value;
    }

    const total = Object.values(totals).reduce((sum, value) => sum + value, 0);
    this.fuelTotalValue = total;
    this.fuelTotalLabel = total > 0 ? this.formatLiveValue(total, 0) : '—';

    if (total <= 0) {
      this.fuelBreakdown = [];
      this.fuelDonutBackground = EMPTY_FUEL_DONUT_BACKGROUND;
      return;
    }

    this.fuelBreakdown = FUEL_GROUPS
      .map((group) => ({
        ...group,
        value: totals[group.key],
        percent: (totals[group.key] / total) * 100,
      }))
      .filter((item) => item.value > 0);

    let cursor = 0;
    const segments = this.fuelBreakdown.map((item) => {
      const start = cursor;
      cursor += item.percent;
      return `${item.color} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`;
    });

    this.fuelDonutBackground = `conic-gradient(${segments.join(', ')})`;
  }

  private syncRealtimePolling(): void {
    const shouldPoll = this.activeTab === 'live' && !document.hidden;

    if (shouldPoll) {
      this.realtimeService.ensureStarted(this.liveRefreshSeconds * 1000);
      return;
    }

    // Pause polling without clearing the last successful telemetry snapshot.
    // This prevents the report from visually dropping to empty values when the
    // browser tab is backgrounded and then reopened.
    this.realtimeService.pause();
  }

  private mergeLiveDataForDisplay(
    vessel: any,
    incoming: Record<string, any> | null | undefined,
  ): Record<string, any> {
    const key = this.getVesselIdentity(vessel);
    if (!key) {
      return incoming || {};
    }

    const previous = this.liveDisplayDataCache.get(key) || {};
    const next: Record<string, any> = { ...previous };

    Object.entries(incoming || {}).forEach(([tagKey, item]) => {
      // Preserve the last known value when the backend temporarily returns an
      // empty placeholder for a tag. New usable values always replace old ones.
      if (this.hasUsableRealtimeItem(item) || !(tagKey in next)) {
        next[tagKey] = item;
      }
    });

    if (Object.keys(next).length > 0) {
      this.liveDisplayDataCache.set(key, next);
    }

    return next;
  }

  private hasUsableRealtimeData(data: Record<string, any> | null | undefined): boolean {
    return Object.values(data || {}).some((item) => this.hasUsableRealtimeItem(item));
  }

  private hasUsableRealtimeItem(item: any): boolean {
    if (item === null || item === undefined || item === '') {
      return false;
    }

    if (typeof item !== 'object') {
      return true;
    }

    if (item.hasValue === true) {
      return true;
    }

    const value =
      item.rawValue ??
      item.value ??
      item.Value ??
      item.IValue ??
      item.iValue ??
      item.CurrentValue ??
      item.currentValue ??
      null;

    return value !== null && value !== undefined && value !== '';
  }

  private resolveReportVesselFallbackImage(name: string): string {
    const normalized = String(name || '').toLowerCase();

    if (normalized.includes('intan')) return 'assets/images/vessel/bb_intan.jpg';
    if (normalized.includes('lazurit')) return 'assets/images/vessel/bb_mulia.jpg';
    if (normalized.includes('zamrud')) return 'assets/images/vessel/bb_zamrud.jpg';
    if (normalized.includes('liberty')) return 'assets/images/vessel/bb_liberty209.jpg';
    if (normalized.includes('tongkam')) return 'assets/images/vessel/bb_tongkam.jpg';
    if (normalized.includes('gemia')) return 'assets/images/vessel/mv_gemia.jpg';
    if (normalized.includes('bongkot')) return 'assets/images/vessel/sc_bongkot.jpg';

    return 'assets/images/vessel/notfound.png';
  }

  private getVesselIdentity(vessel: any): string {
    const info = vessel?.fvInfo || vessel?.fv || vessel || {};
    return String(
      info?.prefix || info?.id || info?._id || info?.vesselId || info?.name || info?.Name || '',
    )
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  private parseLocalDate(value: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
    if (!match) {
      return null;
    }

    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private parseLocalMonth(value: string): Date | null {
    const match = /^(\d{4})-(\d{2})$/.exec(String(value || ''));
    if (!match) {
      return null;
    }

    const date = new Date(Number(match[1]), Number(match[2]) - 1, 1);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private resolveHistoricalUiPeriod(): {
    start: Date;
    end: Date;
    kind: ScGlory1UiPeriodKind;
  } | null {
    const now = new Date();
    const endOfDay = (date: Date): Date =>
      new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 0, 0);
    const isToday = (date: Date): boolean =>
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();

    if (this.historicalUiPeriodMode === 'day') {
      const selected = this.parseLocalDate(this.historicalDate);
      if (!selected) {
        this.historicalValidationError = 'Please select a report date.';
        return null;
      }

      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (selected.getTime() >= todayStart.getTime()) {
        this.historicalValidationError = 'Only completed days can be loaded. The latest available day is yesterday.';
        return null;
      }

      return {
        start: selected,
        end: endOfDay(selected),
        kind: 'day',
      };
    }

    if (this.historicalUiPeriodMode === 'month') {
      const month = this.parseLocalMonth(this.historicalMonth);
      if (!month) {
        this.historicalValidationError = 'Please select a report month.';
        return null;
      }
      const monthStart = new Date(month.getFullYear(), month.getMonth(), 1, 0, 0, 0, 0);
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      if (monthStart.getTime() >= currentMonthStart.getTime()) {
        this.historicalValidationError =
          'Only fully completed months can be loaded. The latest available month is the previous month.';
        return null;
      }
      const nextMonth = new Date(month.getFullYear(), month.getMonth() + 1, 1, 0, 0, 0, 0);
      return {
        start: monthStart,
        end: new Date(nextMonth.getTime() - 60_000),
        kind: 'month',
      };
    }

    const start = this.parseLocalDate(this.historicalRangeStart);
    const endDate = this.parseLocalDate(this.historicalRangeEnd);
    if (!start || !endDate) {
      this.historicalValidationError = 'Please select both the start and end date.';
      return null;
    }
    if (start > endDate) {
      this.historicalValidationError = 'The start date must be before or equal to the end date.';
      return null;
    }
    if (start > now || endDate > now) {
      this.historicalValidationError = 'Future dates cannot be included in a historical report.';
      return null;
    }
    const dayCount =
      Math.floor(
        (new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()).getTime() -
          new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime()) /
          86_400_000,
      ) + 1;
    if (dayCount > 31) {
      this.historicalValidationError =
        'A custom date range can contain up to 31 days. Use Monthly for a full month.';
      return null;
    }

    return {
      start,
      end: isToday(endDate) ? now : endOfDay(endDate),
      kind: 'range',
    };
  }

  private formatDateTime(value: Date): string {
    return value.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  private formatTime(value: Date, includeSeconds = false): string {
    return value.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: includeSeconds ? '2-digit' : undefined,
      hour12: false,
    });
  }

  private formatCoordinate(
    value: number | null | undefined,
    positiveHemisphere: string,
    negativeHemisphere: string,
  ): string {
    if (value === null || value === undefined || !Number.isFinite(value)) {
      return 'No position data';
    }

    const hemisphere = value >= 0 ? positiveHemisphere : negativeHemisphere;
    return `${Math.abs(value).toFixed(6)}° ${hemisphere}`;
  }

  private metricValue(key: string): string {
    const metric = this.liveSnapshot?.metrics.find((item) => item.key === key);
    if (!metric || !metric.available) {
      return '—';
    }
    return `${metric.value} ${metric.unit}`.trim();
  }

  private chunkItems<T>(items: readonly T[], size: number): T[][] {
    const chunks: T[][] = [];
    const safeSize = Math.max(1, Math.floor(size));
    for (let index = 0; index < items.length; index += safeSize) {
      chunks.push(items.slice(index, index + safeSize));
    }
    return chunks;
  }

  private async waitForExportLayout(): Promise<void> {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }

  private resolveLiveExportError(error: unknown): string {
    const code = this.getErrorText(error);
    if (code.includes('EXPORT_ALREADY_RUNNING')) {
      return 'A PDF export is already running. Please wait for it to finish.';
    }
    if (code.includes('NO_EXPORT_PAGES')) {
      return 'The export layout is not ready. Refresh the live report and try again.';
    }
    if (code.includes('INVALID_CANVAS_IMAGE')) {
      return 'The browser could not prepare the report image for PDF export.';
    }
    return 'Unable to export the live PDF. The page remains safe; please refresh and try again.';
  }

  private getErrorText(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (error && typeof error === 'object' && 'message' in error) {
      return String((error as { message?: unknown }).message || '');
    }

    return String(error || '');
  }

  private buildReportFileName(): string {
    const dateText = this.selectedReportType === 'd' ? this.selectedDate : this.selectedMonth;
    return this.pdfFile.buildFileName(this.selectedVesselName, this.selectedReportLabel, dateText);
  }

  private resetPreviewState(): void {
    this.reportRequestCancel$.next();
    this.loading = false;
    this.clearMessages();
    this.revokePdfUrl();
    this.reportFileName = '';
    this.loadedAt = null;
    this.pdfZoom = 1;
    this.pdfFromCache = false;
    this.pdfFromLocalArchive = false;
    this.loadedArchiveEntry = null;
  }

  private revokePdfUrl(): void {
    this.pdfFile.revokeObjectUrl(this.pdfUrl);
    this.pdfUrl = null;
    this.pdfBlob = null;
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }
}