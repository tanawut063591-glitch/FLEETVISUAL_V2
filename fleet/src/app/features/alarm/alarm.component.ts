import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, timer } from 'rxjs';

import { AlertRecord, AlertSeverity, AlertState } from '../../shared/models/alert.model';
import { DateRangeToolbarComponent } from '../../shared/components/date-range-toolbar/date-range-toolbar.component';
import { DateRangeSelection } from '../../shared/models/date-range.model';
import { AlertStateService } from '../../shared/services/alert-state.service';
import { AlertsService } from '../../shared/services/alerts.service';
import { FleetVesselDataService } from '../../shared/services/fleet-vessel-data.service';
import { FvRealtimeService } from '../../shared/services/fv-realtime.service';

interface AlertSummaryCard {
  label: string;
  value: number;
  icon: string;
  tone: 'critical' | 'warning' | 'info' | 'resolved';
  caption: string;
}

@Component({
  selector: 'app-alarm',
  templateUrl: './alarm.component.html',
  styleUrls: ['./alarm.component.css'],
  standalone: false,
})
export class AlarmComponent implements OnInit, OnDestroy {
  @ViewChild('dateRange') dateRange?: DateRangeToolbarComponent;
  alerts: AlertRecord[] = [];
  selectedAlert: AlertRecord | null = null;
  detailOpen = false;

  loading = false;
  refreshing = false;
  errorMessage = '';
  backendEndpoint = '';
  lastUpdatedAt = '';
  sourceType: 'database' | 'telemetry' | '' = '';

  currentRange: DateRangeSelection | null = null;

  searchTerm = '';
  severityFilter: AlertSeverity | 'all' = 'all';
  stateFilter: AlertState | 'all' = 'all';
  vesselFilter = 'all';
  moduleFilter = 'all';

  autoRefresh = true;
  refreshSeconds = 15;

  page = 1;
  pageSize = 20;
  readonly pageSizeOptions = [10, 20, 50, 100];

  newAlertNotice = 0;
  latestNewAlert: AlertRecord | null = null;

  private autoRefreshSub?: Subscription;
  private requestSub?: Subscription;
  private configSub?: Subscription;
  private noticeTimer?: ReturnType<typeof setTimeout>;
  private knownActiveAlertIds = new Set<string>();
  private hasLoadedOnce = false;

  private filteredCacheSource?: AlertRecord[];
  private filteredCacheKey = '';
  private filteredCache: AlertRecord[] = [];
  private derivedCacheSource?: AlertRecord[];
  private vesselOptionsCache: string[] = [];
  private moduleOptionsCache: string[] = [];
  private summaryCardsCache: AlertSummaryCard[] = [];
  private activeCountCache = 0;

  constructor(
    private alertsService: AlertsService,
    private alertState: AlertStateService,
    private fleetVesselData: FleetVesselDataService,
    private fvRealtimeService: FvRealtimeService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.autoRefresh = localStorage.getItem('fleet-alert-auto-refresh') !== 'false';
    this.configSub = this.alertsService.getRefreshSeconds().subscribe((seconds) => {
      this.refreshSeconds = seconds;
      this.restartAutoRefresh();
    });

    this.loadAlerts();
  }

  ngOnDestroy(): void {
    this.autoRefreshSub?.unsubscribe();
    this.requestSub?.unsubscribe();
    this.configSub?.unsubscribe();
    if (this.noticeTimer) clearTimeout(this.noticeTimer);
  }

  get filteredAlerts(): AlertRecord[] {
    const key = [
      this.searchTerm.trim().toLowerCase(),
      this.severityFilter,
      this.stateFilter,
      this.vesselFilter,
      this.moduleFilter,
    ].join('|');

    if (this.filteredCacheSource === this.alerts && this.filteredCacheKey === key) {
      return this.filteredCache;
    }

    const search = this.searchTerm.trim().toLowerCase();
    this.filteredCache = this.alerts.filter((alert) => {
      if (this.severityFilter !== 'all' && alert.severity !== this.severityFilter) return false;
      if (this.stateFilter !== 'all' && alert.state !== this.stateFilter) return false;
      if (this.vesselFilter !== 'all' && alert.vesselName !== this.vesselFilter) return false;
      if (this.moduleFilter !== 'all' && this.alertModule(alert) !== this.moduleFilter)
        return false;
      if (!search) return true;

      return [
        alert.title,
        alert.message,
        alert.vesselName,
        alert.tagName,
        alert.equipment,
        alert.source,
        alert.severity,
        alert.state,
      ]
        .join(' ')
        .toLowerCase()
        .includes(search);
    });
    this.filteredCacheSource = this.alerts;
    this.filteredCacheKey = key;
    return this.filteredCache;
  }
  
  get pagedAlerts(): AlertRecord[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredAlerts.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredAlerts.length / this.pageSize));
  }
  
  get pageStart(): number {
    return this.filteredAlerts.length === 0 ? 0 : (this.page - 1) * this.pageSize + 1;
  }

  get pageEnd(): number {
    return Math.min(this.page * this.pageSize, this.filteredAlerts.length);
  }

  get pageNumbers(): number[] {
    const visible = 5;
    let start = Math.max(1, this.page - Math.floor(visible / 2));
    let end = Math.min(this.totalPages, start + visible - 1);
    start = Math.max(1, end - visible + 1);

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }

  get vesselOptions(): string[] {
    this.ensureAlertDerivatives();
    return this.vesselOptionsCache;
  }

  get moduleOptions(): string[] {
    this.ensureAlertDerivatives();
    return this.moduleOptionsCache;
  }

  get activeCount(): number {
    this.ensureAlertDerivatives();
    return this.activeCountCache;
  }

  get summaryCards(): AlertSummaryCard[] {
    this.ensureAlertDerivatives();
    return this.summaryCardsCache;
  }

  get rangeLabel(): string {
    return this.currentRange?.label || 'Last 24 Hours';
  }

  get connectionLabel(): string {
    if (this.sourceType === 'database') return 'Database API connected';
    if (this.sourceType === 'telemetry') return 'Live telemetry connected';
    return this.loading ? 'Connecting to backend' : 'Backend disconnected';
  }

  get feedDescription(): string {
    return this.sourceType === 'database'
      ? 'Persisted alert records returned by the server database API'
      : 'Verified alarms calculated from live vessel status and telemetry returned by the server';
  }

  get connectedHost(): string {
    if (!this.backendEndpoint) return '';
    if (this.backendEndpoint.startsWith('/fleet-api')) return 'fleetvisual.com · live proxy';
    if (this.backendEndpoint.startsWith('/api2')) return 'FleetVisual API2 · live proxy';

    try {
      return new URL(this.backendEndpoint).host;
    } catch {
      return this.backendEndpoint;
    }
  }

  onRangeChange(range: DateRangeSelection): void {
    const isInitialRange = !this.currentRange;
    this.currentRange = range;
    this.page = 1;
    if (isInitialRange) this.loadAlerts();
  }

  onRangeApplied(range: DateRangeSelection): void {
    this.currentRange = range;
    this.page = 1;
    this.loadAlerts();
  }

  onRangeError(message: string): void {
    this.errorMessage = message;
  }

  loadAlerts(silent = false): void {
    if (silent && (this.loading || this.refreshing)) return;

    if (silent) {
      const refreshedRange = this.dateRange?.getSelection(true);
      if (refreshedRange) this.currentRange = refreshedRange;
    }

    if (!this.currentRange) return;

    this.requestSub?.unsubscribe();
    this.errorMessage = '';
    const keepVisibleData = silent || this.hasLoadedOnce;
    if (keepVisibleData) {
      this.refreshing = true;
    } else {
      this.loading = true;
      this.alerts = [];
      this.backendEndpoint = '';
      this.sourceType = '';
      this.lastUpdatedAt = '';
      this.alertState.setActiveAlerts([]);
    }

    const query = {
      startTime: this.currentRange.startTime,
      endTime: this.currentRange.endTime,
      page: 1,
      pageSize: 1000,
    };

    this.requestSub = this.alertsService.fetchAlerts(query, silent).subscribe({
      next: (result) => {
        const incomingActive = result.alerts.filter((alert) => alert.state !== 'resolved');
        const newActiveAlerts = this.hasLoadedOnce
          ? incomingActive.filter((alert) => !this.knownActiveAlertIds.has(alert.id))
          : [];

        this.alerts = result.alerts;
        this.backendEndpoint = result.endpoint;
        this.lastUpdatedAt = result.fetchedAt;
        this.sourceType = result.sourceType || 'telemetry';
        this.loading = false;
        this.refreshing = false;
        this.page = Math.min(this.page, this.totalPages);

        this.knownActiveAlertIds = new Set(incomingActive.map((alert) => alert.id));
        this.hasLoadedOnce = true;

        if (newActiveAlerts.length > 0) {
          this.showNewAlertNotice(newActiveAlerts);
        }

        if (this.selectedAlert) {
          this.selectedAlert =
            this.alerts.find((alert) => alert.id === this.selectedAlert?.id) || this.selectedAlert;
        }

        this.alertState.setActiveAlerts(incomingActive);
      },
      error: (error) => {
        this.loading = false;
        this.refreshing = false;
        this.alerts = [];
        this.backendEndpoint = '';
        this.lastUpdatedAt = '';
        this.knownActiveAlertIds.clear();
        this.selectedAlert = null;
        this.detailOpen = false;
        this.alertState.setActiveAlerts([]);
        this.errorMessage = error?.message || 'Unable to load alarms from the backend.';
      },
    });
  }

  toggleAutoRefresh(): void {
    this.autoRefresh = !this.autoRefresh;
    localStorage.setItem('fleet-alert-auto-refresh', String(this.autoRefresh));
    this.restartAutoRefresh();
  }

  openAlert(alert: AlertRecord, event?: Event): void {
    event?.stopPropagation();
    this.selectedAlert = alert;
    this.detailOpen = true;
  }

  closeAlertDetail(): void {
    this.detailOpen = false;
  }

  /**
   * Open the exact vessel that raised this alarm in the Realtime page.
   * The method resolves the alert's vessel id/name against the shared vessel
   * snapshot first, then publishes the same object used by the Sidebar.
   */
  openAlertRealtime(alert: AlertRecord): void {
    const vessel = this.resolveAlertVessel(alert);

    if (vessel) {
      try {
        localStorage.setItem('selectedVessel', JSON.stringify(vessel));
        localStorage.setItem('realtimeVessel', JSON.stringify(vessel));
      } catch {}

      this.fvRealtimeService.setActiveVessel(vessel);
    }

    this.closeAlertDetail();

    this.router.navigate(['/main/realtime']).then(() => {
      // Re-emit after navigation so a lazy-loaded RealtimeComponent receives
      // the selected vessel even on its first render.
      if (vessel) {
        setTimeout(() => this.fvRealtimeService.setActiveVessel(vessel), 60);
      }
    });
  }

  private resolveAlertVessel(alert: AlertRecord): any | null {
    const rows = this.fleetVesselData.getSnapshot();
    const alertKeys = this.collectAlertVesselKeys(alert);

    const match = rows.find((row: any) => {
      const rowKeys = this.collectVesselKeys(row);
      return Array.from(alertKeys).some((key) => rowKeys.has(key));
    });

    if (match) {
      return match;
    }

    // A safe fallback keeps navigation functional while the vessel snapshot is
    // still loading. Realtime will replace it with the full backend row when available.
    const fallbackPrefix = String(alert.vesselId || alert.vesselName || '').trim();
    if (!fallbackPrefix && !alert.vesselName) {
      return null;
    }

    const info = {
      id: alert.vesselId || fallbackPrefix,
      prefix: fallbackPrefix,
      name: alert.vesselName || fallbackPrefix,
      desc: 'Vessel',
    };

    return { fv: info, fvInfo: info, ...info };
  }

  private collectAlertVesselKeys(alert: AlertRecord): Set<string> {
    const raw = alert.raw && typeof alert.raw === 'object'
      ? (alert.raw as Record<string, any>)
      : {};

    const values: unknown[] = [
      alert.vesselId,
      alert.vesselName,
      raw['VesselID'],
      raw['vesselId'],
      raw['ShipID'],
      raw['shipId'],
      raw['Prefix'],
      raw['prefix'],
      raw['VesselName'],
      raw['vesselName'],
      raw['ShipName'],
      raw['shipName'],
      raw['PointSource'],
      raw['pointSource'],
    ];

    return new Set(
      values
        .map((value) => this.normalizeVesselKey(value))
        .filter((value) => value.length > 0),
    );
  }

  private collectVesselKeys(vessel: any): Set<string> {
    const sources = [vessel, vessel?.fv, vessel?.fvInfo];
    const values: unknown[] = [];

    for (const source of sources) {
      if (!source) continue;
      values.push(
        source.id,
        source._id,
        source.vesselId,
        source.shipId,
        source.prefix,
        source.name,
        source.vesselName,
      );
    }

    return new Set(
      values
        .map((value) => this.normalizeVesselKey(value))
        .filter((value) => value.length > 0),
    );
  }

  private normalizeVesselKey(value: unknown): string {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.severityFilter = 'all';
    this.stateFilter = 'all';
    this.vesselFilter = 'all';
    this.moduleFilter = 'all';
    this.page = 1;
  }

  onFilterChanged(): void {
    this.page = 1;
  }

  onPageSizeChanged(): void {
    this.page = 1;
  }

  goToPage(page: number): void {
    this.page = Math.min(this.totalPages, Math.max(1, page));
  }

  previousPage(): void {
    this.goToPage(this.page - 1);
  }

  nextPage(): void {
    this.goToPage(this.page + 1);
  }

  dismissNewAlertNotice(): void {
    this.newAlertNotice = 0;
    this.latestNewAlert = null;
    if (this.noticeTimer) clearTimeout(this.noticeTimer);
  }

  exportCsv(): void {
    const rows = this.filteredAlerts;
    if (rows.length === 0) return;

    const headers = [
      'Occurred At',
      'Severity',
      'State',
      'Vessel',
      'Module / System',
      'Title',
      'Message',
      'Tag',
      'Value',
      'Unit',
      'Duration',
      'Source',
    ];

    const lines = rows.map((alert) => [
      this.formatDateTime(alert.occurredAt),
      alert.severity,
      alert.state,
      alert.vesselName,
      this.alertModule(alert),
      alert.title,
      alert.message,
      alert.tagName,
      alert.value ?? '',
      alert.unit ?? '',
      this.durationLabel(alert),
      alert.source ?? '',
    ]);

    const csv = [headers, ...lines]
      .map((row) => row.map((value) => this.escapeCsv(value)).join(','))
      .join('\r\n');

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `fleet-alarms-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  alertModule(alert: AlertRecord): string {
    if (alert.equipment) return alert.equipment;
    if (alert.source) return alert.source;

    const tag = String(alert.tagName || '');
    const separator = tag.indexOf('-');
    return separator > 0 ? tag.slice(0, separator) : 'System';
  }

  severityLabel(severity: AlertSeverity): string {
    return severity === 'unknown' ? 'Info' : severity.charAt(0).toUpperCase() + severity.slice(1);
  }

  severityIcon(severity: AlertSeverity): string {
    if (severity === 'critical' || severity === 'major') return 'fa fa-exclamation';
    if (severity === 'warning') return 'fa fa-warning';
    return 'fa fa-info';
  }

  stateLabel(state: AlertState): string {
    return state.charAt(0).toUpperCase() + state.slice(1);
  }

  formatDateTime(value?: string): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date);
  }

  relativeTime(value: string): string {
    const time = new Date(value).getTime();
    if (!Number.isFinite(time)) return '';

    const diffSeconds = Math.round((time - Date.now()) / 1000);
    const abs = Math.abs(diffSeconds);
    const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

    if (abs < 60) return formatter.format(diffSeconds, 'second');
    if (abs < 3600) return formatter.format(Math.round(diffSeconds / 60), 'minute');
    if (abs < 86400) return formatter.format(Math.round(diffSeconds / 3600), 'hour');
    return formatter.format(Math.round(diffSeconds / 86400), 'day');
  }

  durationLabel(alert: AlertRecord): string {
    const start = new Date(alert.occurredAt).getTime();
    if (!Number.isFinite(start)) return '—';

    const endValue = alert.resolvedAt || (alert.state === 'active' ? new Date().toISOString() : '');
    const end = endValue ? new Date(endValue).getTime() : start;
    if (!Number.isFinite(end) || end < start) return '—';

    let seconds = Math.floor((end - start) / 1000);
    const days = Math.floor(seconds / 86400);
    seconds %= 86400;
    const hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    const minutes = Math.floor(seconds / 60);
    seconds %= 60;

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  trackByAlert(_: number, alert: AlertRecord): string {
    return alert.id;
  }

  private ensureAlertDerivatives(): void {
    if (this.derivedCacheSource === this.alerts) return;

    const vessels = new Set<string>();
    const modules = new Set<string>();
    let critical = 0;
    let warnings = 0;
    let information = 0;
    let resolved = 0;
    let active = 0;

    for (const alert of this.alerts) {
      if (alert.vesselName) vessels.add(alert.vesselName);
      const moduleName = this.alertModule(alert);
      if (moduleName) modules.add(moduleName);

      if (alert.state === 'resolved') {
        resolved += 1;
        continue;
      }

      active += 1;
      if (alert.severity === 'critical' || alert.severity === 'major') critical += 1;
      else if (alert.severity === 'warning') warnings += 1;
      else information += 1;
    }

    this.vesselOptionsCache = Array.from(vessels).sort((a, b) => a.localeCompare(b));
    this.moduleOptionsCache = Array.from(modules).sort((a, b) => a.localeCompare(b));
    this.activeCountCache = active;
    this.summaryCardsCache = [
      {
        label: 'Critical Alarms',
        value: critical,
        icon: 'fa fa-exclamation-triangle',
        tone: 'critical',
        caption: 'High-priority events',
      },
      {
        label: 'Warnings',
        value: warnings,
        icon: 'fa fa-warning',
        tone: 'warning',
        caption: 'Operational warnings',
      },
      {
        label: 'Information',
        value: information,
        icon: 'fa fa-info-circle',
        tone: 'info',
        caption: 'System information',
      },
      {
        label: 'Resolved',
        value: resolved,
        icon: 'fa fa-check-circle',
        tone: 'resolved',
        caption: 'Server-confirmed only',
      },
    ];
    this.derivedCacheSource = this.alerts;
  }

  private restartAutoRefresh(): void {
    this.autoRefreshSub?.unsubscribe();
    if (!this.autoRefresh) return;

    this.autoRefreshSub = timer(this.refreshSeconds * 1000, this.refreshSeconds * 1000).subscribe(
      () => this.loadAlerts(true),
    );
  }

  private showNewAlertNotice(alerts: AlertRecord[]): void {
    this.newAlertNotice = alerts.length;
    this.latestNewAlert =
      alerts.find((alert) => alert.severity === 'critical' || alert.severity === 'major') ||
      alerts[0];

    if (this.noticeTimer) clearTimeout(this.noticeTimer);
    this.noticeTimer = setTimeout(() => this.dismissNewAlertNotice(), 8000);
  }

  private escapeCsv(value: unknown): string {
    const text = String(value ?? '');
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }
}
