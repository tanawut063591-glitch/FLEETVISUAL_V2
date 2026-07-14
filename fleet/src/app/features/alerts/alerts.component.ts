import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription, timer } from 'rxjs';

import {
  AlertRecord,
  AlertSeverity,
  AlertState,
} from '../../shared/models/alert.model';
import { AlertStateService } from '../../shared/services/alert-state.service';
import { AlertsService } from '../../shared/services/alerts.service';

interface AlertSummaryCard {
  label: string;
  value: number;
  icon: string;
  tone: 'critical' | 'major' | 'warning' | 'info' | 'resolved';
  caption: string;
}

type RangePreset = '24h' | '3d' | '7d' | 'custom';

@Component({
  selector: 'app-alerts',
  templateUrl: './alerts.component.html',
  styleUrls: ['./alerts.component.css'],
  standalone: false,
})
export class AlertsComponent implements OnInit, OnDestroy {
  alerts: AlertRecord[] = [];
  selectedAlert: AlertRecord | null = null;

  loading = false;
  refreshing = false;
  errorMessage = '';
  backendEndpoint = '';
  lastUpdatedAt = '';

  rangePreset: RangePreset = '24h';
  startInput = '';
  endInput = '';

  searchTerm = '';
  severityFilter: AlertSeverity | 'all' = 'all';
  stateFilter: AlertState | 'all' = 'active';
  vesselFilter = 'all';

  autoRefresh = true;
  refreshSeconds = 30;

  page = 1;
  pageSize = 25;
  readonly pageSizeOptions = [10, 25, 50, 100];

  private autoRefreshSub?: Subscription;
  private requestSub?: Subscription;
  private configSub?: Subscription;

  constructor(
    private alertsService: AlertsService,
    private alertState: AlertStateService
  ) {}

  ngOnInit(): void {
    this.applyPreset('24h', false);

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
  }

  get filteredAlerts(): AlertRecord[] {
    const search = this.searchTerm.trim().toLowerCase();

    return this.alerts.filter((alert) => {
      if (this.severityFilter !== 'all' && alert.severity !== this.severityFilter) {
        return false;
      }

      if (this.stateFilter !== 'all' && alert.state !== this.stateFilter) {
        return false;
      }

      if (this.vesselFilter !== 'all' && alert.vesselName !== this.vesselFilter) {
        return false;
      }

      if (!search) {
        return true;
      }

      const haystack = [
        alert.title,
        alert.message,
        alert.vesselName,
        alert.tagName,
        alert.equipment,
        alert.severity,
        alert.state,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(search);
    });
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

  get vesselOptions(): string[] {
    return Array.from(new Set(this.alerts.map((alert) => alert.vesselName)))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }

  get activeCount(): number {
    return this.alerts.filter((alert) => alert.state === 'active').length;
  }

  get summaryCards(): AlertSummaryCard[] {
    return [
      {
        label: 'Active Alerts',
        value: this.activeCount,
        icon: 'fa fa-bell',
        tone: 'critical',
        caption: 'Requires attention',
      },
      {
        label: 'Critical / Major',
        value: this.countSeverity('critical') + this.countSeverity('major'),
        icon: 'fa fa-exclamation-triangle',
        tone: 'major',
        caption: 'Highest priority',
      },
      {
        label: 'Warning',
        value: this.countSeverity('warning'),
        icon: 'fa fa-warning',
        tone: 'warning',
        caption: 'Operational warning',
      },
      {
        label: 'Information',
        value: this.countSeverity('info'),
        icon: 'fa fa-info-circle',
        tone: 'info',
        caption: 'Advisory events',
      },
      {
        label: 'Resolved',
        value: this.alerts.filter((alert) => alert.state === 'resolved').length,
        icon: 'fa fa-check-circle',
        tone: 'resolved',
        caption: 'Cleared in range',
      },
    ];
  }

  applyPreset(preset: RangePreset, load = true): void {
    this.rangePreset = preset;

    if (preset !== 'custom') {
      const end = new Date();
      const start = new Date(end);

      if (preset === '24h') start.setHours(end.getHours() - 24);
      if (preset === '3d') start.setDate(end.getDate() - 3);
      if (preset === '7d') start.setDate(end.getDate() - 7);

      this.startInput = this.toDateTimeLocal(start);
      this.endInput = this.toDateTimeLocal(end);
    }

    this.page = 1;
    if (load) this.loadAlerts();
  }

  applyCustomRange(): void {
    if (!this.startInput || !this.endInput) {
      this.errorMessage = 'Select both start and end date/time.';
      return;
    }

    const start = new Date(this.startInput).getTime();
    const end = new Date(this.endInput).getTime();

    if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
      this.errorMessage = 'The start date/time must be earlier than the end date/time.';
      return;
    }

    this.rangePreset = 'custom';
    this.page = 1;
    this.loadAlerts();
  }

  loadAlerts(silent = false): void {
    if (!this.startInput || !this.endInput) return;

    this.requestSub?.unsubscribe();
    this.errorMessage = '';

    if (silent) {
      this.refreshing = true;
    } else {
      this.loading = true;
    }

    const query = {
      startTime: new Date(this.startInput).toISOString(),
      endTime: new Date(this.endInput).toISOString(),
      page: 1,
      pageSize: 5000,
    };

    this.requestSub = this.alertsService.fetchAlerts(query).subscribe({
      next: (result) => {
        this.alerts = result.alerts;
        this.backendEndpoint = result.endpoint;
        this.lastUpdatedAt = result.fetchedAt;
        this.loading = false;
        this.refreshing = false;
        this.page = Math.min(this.page, this.totalPages);

        const currentSelected = this.selectedAlert
          ? this.alerts.find((alert) => alert.id === this.selectedAlert?.id)
          : null;

        this.selectedAlert = currentSelected || this.filteredAlerts[0] || this.alerts[0] || null;
        this.alertState.setActiveCount(this.activeCount);
      },
      error: (error) => {
        this.alerts = [];
        this.selectedAlert = null;
        this.loading = false;
        this.refreshing = false;
        this.alertState.setActiveCount(0);
        this.errorMessage = error?.message || 'Unable to load alerts from the backend.';
      },
    });
  }

  toggleAutoRefresh(): void {
    this.autoRefresh = !this.autoRefresh;
    this.restartAutoRefresh();
  }

  selectAlert(alert: AlertRecord): void {
    this.selectedAlert = alert;
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.severityFilter = 'all';
    this.stateFilter = 'all';
    this.vesselFilter = 'all';
    this.page = 1;
  }

  onFilterChanged(): void {
    this.page = 1;
    this.selectedAlert = this.filteredAlerts[0] || null;
  }

  onPageSizeChanged(): void {
    this.page = 1;
  }

  previousPage(): void {
    this.page = Math.max(1, this.page - 1);
  }

  nextPage(): void {
    this.page = Math.min(this.totalPages, this.page + 1);
  }

  exportCsv(): void {
    const rows = this.filteredAlerts;
    if (rows.length === 0) return;

    const headers = [
      'Occurred At',
      'Severity',
      'State',
      'Vessel',
      'Title',
      'Message',
      'Equipment',
      'Tag',
      'Value',
      'Unit',
      'Source',
    ];

    const lines = rows.map((alert) => [
      this.formatDateTime(alert.occurredAt),
      alert.severity,
      alert.state,
      alert.vesselName,
      alert.title,
      alert.message,
      alert.equipment,
      alert.tagName,
      alert.value ?? '',
      alert.unit ?? '',
      alert.source ?? '',
    ]);

    const csv = [headers, ...lines]
      .map((row) => row.map((value) => this.escapeCsv(value)).join(','))
      .join('\r\n');

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `fleet-alerts-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  severityLabel(severity: AlertSeverity): string {
    return severity === 'unknown'
      ? 'Unclassified'
      : severity.charAt(0).toUpperCase() + severity.slice(1);
  }

  stateLabel(state: AlertState): string {
    return state.charAt(0).toUpperCase() + state.slice(1);
  }

  formatDateTime(value: string): string {
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

  trackByAlert(_: number, alert: AlertRecord): string {
    return alert.id;
  }

  private countSeverity(severity: AlertSeverity): number {
    return this.alerts.filter(
      (alert) => alert.severity === severity && alert.state !== 'resolved'
    ).length;
  }

  private restartAutoRefresh(): void {
    this.autoRefreshSub?.unsubscribe();

    if (!this.autoRefresh) return;

    this.autoRefreshSub = timer(this.refreshSeconds * 1000, this.refreshSeconds * 1000)
      .subscribe(() => this.loadAlerts(true));
  }

  private toDateTimeLocal(date: Date): string {
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
      `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  private escapeCsv(value: unknown): string {
    const text = String(value ?? '');
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }
}
