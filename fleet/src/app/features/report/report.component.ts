import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  QueryList,
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
} from './live-report.model';
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

type ReportType = 'd' | 'm';

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

  activeTab: LiveReportTab = 'live';
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

  private reportProfileDocument: LiveReportProfileDocument | null = null;
  private modeHistorySubscription: Subscription | null = null;
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
    private changeDetector: ChangeDetectorRef,
  ) {
    const defaultDate = this.dateFormat.addDays(new Date(), -1);
    this.selectedDate = this.dateFormat.formatDateInput(defaultDate);
    this.selectedMonth = this.dateFormat.formatMonthInput(defaultDate);
  }

  ngOnInit(): void {
    this.loadStoredVessel();
    this.watchActiveVessel();
    this.watchLiveReport();
    this.watchLocalArchiveAvailability();
    this.syncRealtimePolling();
    this.refreshLocalArchiveAvailability();
  }

  ngOnDestroy(): void {
    this.reportRequestCancel$.next();
    this.realtimeService.stop();
    this.modeHistorySubscription?.unsubscribe();
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

    return String(image || 'assets/images/vessel/notfound.png');
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
    return this.dateFormat.formatMonthInput(new Date());
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
    this.refreshLocalArchiveAvailability(true);
    this.setActiveTab('files');
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
      this.refreshLocalArchiveAvailability(true);
    } else {
      this.maybeLoadModeHistory(this.selectedVessel, this.reportProfileDocument, false);
    }
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
    if (!this.verifiedModeAvailable || this.modeHistoryLoading) {
      return;
    }

    this.maybeLoadModeHistory(this.selectedVessel, this.reportProfileDocument, true);
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
    this.refreshLocalArchiveAvailability(this.activeTab === 'files');
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
          this.activeTab === 'files' &&
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
        this.reportProfileDocument = profileDocument;

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

          this.liveSnapshot = this.liveReportService.buildSnapshot(
            vessel,
            displayData,
            effectiveUpdatedAt,
            profileDocument,
          );
        } else {
          this.liveSnapshot = null;
        }

        // Mode UI/history is enabled only when BOTH the vessel profile explicitly
        // declares a direct mode tag and the current telemetry actually resolved
        // from that tag. Vessels without a real mode tag stay on the general
        // machinery/fuel/navigation report and never query mode historian.
        this.verifiedModeAvailable = !!(
          vessel &&
          this.liveSnapshot?.modeSource === 'verified-tag' &&
          this.liveReportService.supportsVerifiedModeHistorian(vessel, profileDocument)
        );

        if (!this.verifiedModeAvailable) {
          this.clearModeHistoryView();
        }

        this.updateDerivedLiveState();
        this.maybeLoadModeHistory(vessel, profileDocument, false);
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
    this.resetPreviewState();
    this.refreshLocalArchiveAvailability(this.activeTab === 'files');
    this.changeDetector.markForCheck();
  }

  private loadStoredVessel(): void {
    const vessel = this.vesselStorage.getStoredVessel();
    this.selectedVessel = vessel;
    this.selectedVesselName = this.vesselStorage.extractVesselName(vessel);
    this.selectedVesselSource.next(vessel);
  }

  private maybeLoadModeHistory(
    vessel: any,
    document: LiveReportProfileDocument | null,
    force: boolean,
  ): void {
    if (!vessel || !document || this.activeTab !== 'live' || !this.liveSnapshot) {
      return;
    }

    // Server-safety gate: do not touch historian unless the current vessel has a
    // verified direct mode tag in live telemetry. This prevents generic profiles
    // from generating guessed VES-MODE tags and triggering fallback API calls.
    if (!this.verifiedModeAvailable || this.liveSnapshot.modeSource !== 'verified-tag') {
      this.clearModeHistoryView();
      return;
    }

    const periodStart = new Date(this.liveSnapshot.periodStart);
    const periodEnd = new Date(this.liveSnapshot.periodEnd || new Date());
    const sourceTag = this.liveReportService.getModeHistorianTag(
      vessel,
      document,
      this.liveSnapshot.modeSourceTag,
    );

    if (!sourceTag) {
      this.clearModeHistoryView('Verified mode telemetry is not available for this vessel.');
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
          : 'No verified mode history was returned. The empty result is cached to protect the historian server.';
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
          console.warn('[Report] Unable to load vessel mode historian.', error);
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
            'No verified mode history was returned. Fleet Visual will wait before trying this historian tag again.';
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
        const label = this.liveReportService.resolveHistorianModeLabel(vessel, rawValue, document);

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
      const color = MODE_HISTORY_COLORS[nextColorIndex % MODE_HISTORY_COLORS.length];
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

    const snapshot = this.liveSnapshot;
    this.exportEnginePages = this.chunkItems(snapshot?.engines || [], 5);
    this.exportModePages = this.verifiedModeAvailable ? this.chunkItems(snapshot?.modes || [], 14) : [];
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