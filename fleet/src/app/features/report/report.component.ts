import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChildren,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { BehaviorSubject, Observable, Subject, combineLatest, from, of, throwError } from 'rxjs';
import { catchError, finalize, map, switchMap, take, takeUntil, timeout } from 'rxjs/operators';

import { HttpClientService } from '../../shared/services/http-client.service';
import { NewHttpClientService } from '../../shared/services/http-client1.service';
import { FvRealtimeService } from '../../shared/services/fv-realtime.service';
import { DateFormatService } from '../../shared/services/date-format.service';
import { PdfFileService } from '../../shared/services/pdf-file.service';
import { VesselStorageService } from '../../shared/services/vessel-storage.service';
import * as fvInfoReducer from '../../store/reducers/fv-info.reducer';
import {
  LiveReportEngineSnapshot,
  LiveReportModeSnapshot,
  LiveReportSnapshot,
  LiveReportTab,
} from './live-report.model';
import { LiveReportService } from './live-report.service';
import {
  ReportPdfCacheService,
  ReportPdfCacheValue,
} from './report-pdf-cache.service';
import { ClientPdfExportService } from './client-pdf-export.service';
import {
  OfficialReportArchiveEntry,
  OfficialReportLibraryService,
} from './official-report-library.service';

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

@Component({
  selector: 'app-report',
  standalone: false,
  templateUrl: './report.component.html',
  styleUrls: ['./report.component.css'],
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

  private selectedVessel: any = null;
  private readonly selectedVesselSource = new BehaviorSubject<any>(null);
  private readonly reportRequestCancel$ = new Subject<void>();
  private readonly destroy$ = new Subject<void>();
  private archiveLookupVersion = 0;

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
    private changeDetector: ChangeDetectorRef
  ) {
    const defaultDate = this.dateFormat.addDays(new Date(), -1);
    this.selectedDate = this.dateFormat.formatDateInput(defaultDate);
    this.selectedMonth = this.dateFormat.formatMonthInput(defaultDate);
  }

  ngOnInit(): void {
    this.loadStoredVessel();

    // Report uses one shared current-values request every 60 seconds. It does not
    // regenerate PDFs or download a full historian range on an automatic timer.
    this.realtimeService.ensureStarted(this.liveRefreshSeconds * 1000);

    this.watchActiveVessel();
    this.watchLiveReport();
    this.refreshLocalArchiveAvailability();
  }

  ngOnDestroy(): void {
    this.reportRequestCancel$.next();
    this.revokePdfUrl();
    this.selectedVesselSource.complete();
    this.reportRequestCancel$.complete();
    this.destroy$.next();
    this.destroy$.complete();
  }

  get selectedReport(): ReportOption {
    return this.reportOptions.find((item) => item.value === this.selectedReportType) || this.reportOptions[0];
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

  get selectedTimestamp(): string {
    return this.dateFormat.buildBackendTimestamp(
      this.selectedReportType,
      this.selectedDate,
      this.selectedMonth
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
    const maximum = this.selectedReportType === 'd' ? this.maxDailyReportDate : this.maxMonthlyReportPeriod;
    return !!selected && selected > maximum;
  }

  get canStepToNextPeriod(): boolean {
    const selected = this.selectedReportType === 'd' ? this.selectedDate : this.selectedMonth;
    const maximum = this.selectedReportType === 'd' ? this.maxDailyReportDate : this.maxMonthlyReportPeriod;
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

  get visibleModes(): LiveReportModeSnapshot[] {
    const modes = this.liveSnapshot?.modes || [];
    if (this.showAllModes || modes.length <= 6) {
      return modes;
    }

    const visible = modes.slice(0, 6);
    const current = modes.find((mode) => mode.isCurrent);
    if (current && !visible.some((mode) => mode.key === current.key)) {
      visible[visible.length - 1] = current;
    }
    return visible;
  }

  get hiddenModeCount(): number {
    const total = this.liveSnapshot?.modes.length || 0;
    return Math.max(0, total - this.visibleModes.length);
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
      this.liveSnapshot.periodEnd
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
    return confidence ? `${confidence.charAt(0).toUpperCase()}${confidence.slice(1)} confidence` : '';
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

  get exportEnginePages(): LiveReportEngineSnapshot[][] {
    return this.chunkItems(this.liveSnapshot?.engines || [], 5);
  }

  get exportModePages(): LiveReportModeSnapshot[][] {
    return this.chunkItems(this.liveSnapshot?.modes || [], 14);
  }

  get liveExportPageCount(): number {
    return 1 + this.exportEnginePages.length + this.exportModePages.length;
  }

  get liveExportTotalFuelLabel(): string {
    return this.metricValue('fuel');
  }

  get liveExportDistanceLabel(): string {
    return this.metricValue('distance');
  }

  get liveExportAverageSpeedLabel(): string {
    return this.metricValue('average');
  }

  get liveExportMaximumSpeedLabel(): string {
    return this.metricValue('maximum');
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

  get fuelBreakdown(): FuelBreakdownItem[] {
    const engines = this.liveSnapshot?.engines || [];
    const groups: Array<Omit<FuelBreakdownItem, 'value' | 'percent'>> = [
      { key: 'main', label: 'Main Engine', color: '#2563eb' },
      { key: 'auxiliary', label: 'Auxiliary Engine', color: '#14b8a6' },
      { key: 'generator', label: 'Generator', color: '#84cc16' },
      { key: 'other', label: 'Other Equipment', color: '#f59e0b' },
    ];

    const values = groups.map((group) => {
      const value = engines.reduce((sum, engine) => {
        const matches =
          group.key === 'main'
            ? engine.kind === 'main' || engine.kind === 'motor'
            : group.key === 'other'
              ? engine.kind === 'other'
              : engine.kind === group.key;
        return matches && engine.fuelToday !== null ? sum + Math.max(0, engine.fuelToday) : sum;
      }, 0);

      return { ...group, value };
    });

    const total = values.reduce((sum, item) => sum + item.value, 0);
    if (total <= 0) {
      return [];
    }

    return values
      .filter((item) => item.value > 0)
      .map((item) => ({ ...item, percent: (item.value / total) * 100 }));
  }

  get fuelTotalValue(): number {
    return this.fuelBreakdown.reduce((sum, item) => sum + item.value, 0);
  }

  get fuelTotalLabel(): string {
    return this.fuelTotalValue > 0 ? this.formatLiveValue(this.fuelTotalValue, 0) : '—';
  }

  get fuelDonutBackground(): string {
    const items = this.fuelBreakdown;
    if (items.length === 0) {
      return 'conic-gradient(#e2e8f0 0deg 360deg)';
    }

    let cursor = 0;
    const segments = items.map((item) => {
      const start = cursor;
      cursor += item.percent;
      return `${item.color} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`;
    });

    return `conic-gradient(${segments.join(', ')})`;
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
        result.sizeBytes
      )}). No report-generation request was sent to the server.`;
    } catch (error: any) {
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

    if (tab === 'live') {
      this.realtimeService.ensureStarted(this.liveRefreshSeconds * 1000);
    } else {
      // Stop current-value polling while the user is reading an official file.
      // A bundled/local archive may open automatically without calling the report server.
      this.realtimeService.stop();
      this.refreshLocalArchiveAvailability(true);
    }
  }

  refreshLive(): void {
    if (this.liveLoading || !this.selectedVesselName) {
      return;
    }

    this.realtimeService.refreshNow();
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
      const base = this.parseLocalDate(this.selectedDate) || this.dateFormat.addDays(new Date(), -1);
      const next = this.dateFormat.addDays(base, direction);
      const nextValue = this.dateFormat.formatDateInput(next);
      this.selectedDate = nextValue > this.maxDailyReportDate ? this.maxDailyReportDate : nextValue;
    } else {
      const base = this.parseLocalMonth(this.selectedMonth) || new Date();
      const next = new Date(base.getFullYear(), base.getMonth() + direction, 1);
      const nextValue = this.dateFormat.formatMonthInput(next);
      this.selectedMonth = nextValue > this.maxMonthlyReportPeriod ? this.maxMonthlyReportPeriod : nextValue;
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
      this.errorMessage = 'Future report periods are blocked. Select a completed date before loading a report.';
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
      this.presentPdf(
        cachedReport.blob,
        true,
        cachedReport.source,
        cachedReport.archiveEntry
      );
      return;
    }

    this.loading = true;

    this.requestSelectedReport(this.selectedReportType, timestamp, fvName)
      .pipe(
        takeUntil(this.reportRequestCancel$),
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
        })
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
        error: (error: any) => {
          console.error('[ReportComponent] load report error:', error);
          this.errorMessage = this.resolveReportErrorMessage(error);
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

  onPdfError(error: any): void {
    console.warn('[ReportComponent] PDF viewer error:', error);
    this.errorMessage = 'Unable to preview this PDF. Please try downloading it or reload the report.';
  }

  private requestSelectedReport(
    reportType: ReportType,
    timestamp: string,
    fvName: string
  ): Observable<ReportLoadResult> {
    const period = this.selectedPeriodLabel;

    return this.officialReportLibrary.findReport(reportType, period, fvName).pipe(
      take(1),
      switchMap((entry) => {
        if (!entry) {
          return this.requestReport(reportType, timestamp, fvName).pipe(
            map((blob) => ({ blob, source: 'server' as const, archiveEntry: null }))
          );
        }

        return this.officialReportLibrary.loadReport(entry).pipe(
          timeout(8_000),
          switchMap((blob) => this.validatePdfBlob(blob, 'LOCAL_ARCHIVE')),
          map((blob) => ({ blob, source: 'local-archive' as const, archiveEntry: entry })),
          catchError((localError) => {
            console.warn(
              '[ReportComponent] Local official archive failed; using report service fallback.',
              localError
            );
            return this.requestReport(reportType, timestamp, fvName).pipe(
              map((blob) => ({ blob, source: 'server' as const, archiveEntry: null }))
            );
          })
        );
      })
    );
  }

  private requestReport(
    reportType: ReportType,
    timestamp: string,
    fvName: string
  ): Observable<Blob> {
    return this.newHttp.getReport(reportType, timestamp, fvName).pipe(
      timeout(15_000),
      switchMap((blob: Blob) => this.validatePdfBlob(blob, 'API2')),
      catchError((firstError: any) => {
        console.warn('[ReportComponent] Direct report API failed; using gateway fallback.', firstError);

        return this.http.getReport(reportType, timestamp, fvName).pipe(
          timeout(20_000),
          switchMap((blob: Blob) => this.validatePdfBlob(blob, 'API1'))
        );
      })
    );
  }

  private presentPdf(
    blob: Blob,
    fromCache: boolean,
    source: ReportLoadResult['source'],
    archiveEntry: OfficialReportArchiveEntry | null
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

    // Local archive and cache loads are intentionally silent. The compact
    // command bar already shows the source/status and a success banner would
    // add visual noise every time yesterday's completed report auto-opens.
    this.successMessage = this.pdfFromLocalArchive || fromCache
      ? ''
      : 'Report PDF loaded and validated successfully.';
  }

  private validatePdfBlob(blob: Blob, source: string): Observable<Blob> {
    return from(this.pdfFile.validatePdfBlob(blob)).pipe(
      switchMap((result) =>
        result.valid ? of(blob) : throwError(() => new Error(`${source}:${result.reason}`))
      )
    );
  }

  private refreshLocalArchiveAvailability(autoLoad = false): void {
    const period = this.selectedPeriodLabel;
    const vessel = this.selectedVesselName;
    const lookupVersion = ++this.archiveLookupVersion;

    if (!period || !vessel || this.selectedPeriodIsFuture) {
      this.localArchiveEntry = null;
      return;
    }

    this.officialReportLibrary
      .findReport(this.selectedReportType, period, vessel)
      .pipe(take(1), takeUntil(this.destroy$))
      .subscribe((entry) => {
        if (lookupVersion !== this.archiveLookupVersion) {
          return;
        }

        this.localArchiveEntry = entry;
        if (
          autoLoad &&
          entry &&
          this.activeTab === 'files' &&
          !this.hasPdf &&
          !this.loading
        ) {
          this.loadReport();
        }
      });
  }

  private buildReportCacheKey(reportType: ReportType, timestamp: string, vesselName: string): string {
    return [reportType, timestamp, vesselName].join('|');
  }

  private resolveReportErrorMessage(error: any): string {
    const text = String(error?.message || error || '').toLowerCase();

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
    this.store
      .select(fvInfoReducer.getFvInfosActive)
      .pipe(takeUntil(this.destroy$))
      .subscribe((active: any) => {
        this.setSelectedVessel(active);
      });

    this.realtimeService.activeVessel$
      .pipe(takeUntil(this.destroy$))
      .subscribe((vessel: any) => {
        this.setSelectedVessel(vessel);
      });
  }

  private watchLiveReport(): void {
    combineLatest([
      this.selectedVesselSource,
      this.realtimeService.currentData$,
      this.realtimeService.lastUpdated$,
      this.realtimeService.loading$,
      this.liveReportService.profileDocument$,
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([vessel, data, updatedAt, loading, profileDocument]) => {
        this.liveLoading = loading;
        this.liveSnapshot = vessel
          ? this.liveReportService.buildSnapshot(vessel, data, updatedAt, profileDocument)
          : null;
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
    this.resetPreviewState();
    this.refreshLocalArchiveAvailability(this.activeTab === 'files');
  }

  private loadStoredVessel(): void {
    const vessel = this.vesselStorage.getStoredVessel();
    this.selectedVessel = vessel;
    this.selectedVesselName = this.vesselStorage.extractVesselName(vessel);
    this.selectedVesselSource.next(vessel);
  }

  private getVesselIdentity(vessel: any): string {
    const info = vessel?.fvInfo || vessel?.fv || vessel || {};
    return String(
      info?.prefix ||
        info?.id ||
        info?._id ||
        info?.vesselId ||
        info?.name ||
        info?.Name ||
        ''
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
    negativeHemisphere: string
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

  private resolveLiveExportError(error: any): string {
    const code = String(error?.message || error || '');
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
