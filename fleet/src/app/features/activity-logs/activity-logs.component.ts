import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Subscription, timer } from 'rxjs';

import { DateRangeToolbarComponent } from '../../shared/components/date-range-toolbar/date-range-toolbar.component';
import {
  ActivityLogRecord,
  ActivityLogSeverity,
  SystemStatusItem,
} from '../../shared/models/activity-log.model';
import { DateRangeSelection } from '../../shared/models/date-range.model';
import { ActivityLogsService } from '../../shared/services/activity-logs.service';

@Component({
  selector: 'app-activity-logs',
  templateUrl: './activity-logs.component.html',
  styleUrls: ['./activity-logs.component.css'],
  standalone: false,
})
export class ActivityLogsComponent implements OnInit, OnDestroy {
  @ViewChild('dateRange') dateRange?: DateRangeToolbarComponent;

  logs: ActivityLogRecord[] = [];
  statuses: SystemStatusItem[] = [];
  loading = false;
  refreshing = false;
  errorMessage = '';
  backendConnected = false;
  source = '';
  sourceType: 'database' | 'alert-fallback' | '' = '';
  lastUpdatedAt = '';
  currentRange: DateRangeSelection | null = null;

  searchTerm = '';
  severityFilter: ActivityLogSeverity | 'all' = 'all';
  categoryFilter = 'all';
  page = 1;
  pageSize = 10;
  autoRefresh = true;

  private requestSub?: Subscription;
  private timerSub?: Subscription;
  private filteredCacheSource?: ActivityLogRecord[];
  private filteredCacheKey = '';
  private filteredCache: ActivityLogRecord[] = [];
  private derivedCacheSource?: ActivityLogRecord[];
  private categoriesCache: string[] = [];
  private criticalCountCache = 0;
  private warningCountCache = 0;
  private successRateCache = 0;

  constructor(private activityLogs: ActivityLogsService) {}

  ngOnInit(): void {
    this.restartTimer();
  }

  ngOnDestroy(): void {
    this.requestSub?.unsubscribe();
    this.timerSub?.unsubscribe();
  }

  get filteredLogs(): ActivityLogRecord[] {
    const key = [
      this.searchTerm.trim().toLowerCase(),
      this.severityFilter,
      this.categoryFilter,
    ].join('|');

    if (this.filteredCacheSource === this.logs && this.filteredCacheKey === key) {
      return this.filteredCache;
    }

    const search = this.searchTerm.trim().toLowerCase();
    this.filteredCache = this.logs.filter((row) => {
      if (this.severityFilter !== 'all' && row.severity !== this.severityFilter) return false;
      if (this.categoryFilter !== 'all' && row.category !== this.categoryFilter) return false;
      if (!search) return true;
      return [
        row.message,
        row.detail,
        row.vesselName,
        row.user,
        row.module,
        row.category,
        row.source,
      ]
        .join(' ')
        .toLowerCase()
        .includes(search);
    });
    this.filteredCacheSource = this.logs;
    this.filteredCacheKey = key;
    return this.filteredCache;
  }

  get pagedLogs(): ActivityLogRecord[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredLogs.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredLogs.length / this.pageSize));
  }

  get pageNumbers(): number[] {
    const count = Math.min(5, this.totalPages);
    let start = Math.max(1, this.page - 2);
    start = Math.min(start, Math.max(1, this.totalPages - count + 1));
    return Array.from({ length: count }, (_, index) => start + index);
  }

  get pageStart(): number {
    return this.filteredLogs.length ? (this.page - 1) * this.pageSize + 1 : 0;
  }

  get pageEnd(): number {
    return Math.min(this.page * this.pageSize, this.filteredLogs.length);
  }

  get categories(): string[] {
    this.ensureLogDerivatives();
    return this.categoriesCache;
  }

  get criticalCount(): number {
    this.ensureLogDerivatives();
    return this.criticalCountCache;
  }

  get warningCount(): number {
    this.ensureLogDerivatives();
    return this.warningCountCache;
  }

  get successRate(): number {
    this.ensureLogDerivatives();
    return this.successRateCache;
  }

  get connectionLabel(): string {
    if (this.sourceType === 'database') return 'Database activity connected';
    if (this.sourceType === 'alert-fallback') return 'Verified server fallback connected';
    return this.backendConnected ? 'Backend data connected' : 'Backend disconnected';
  }

  get feedDescription(): string {
    return this.sourceType === 'database'
      ? 'Persisted audit and activity records returned by the database API'
      : 'Verified server events derived from the current alert source';
  }

  get rangeLabel(): string {
    return this.currentRange?.label || 'Last 24 Hours';
  }

  onRangeChange(range: DateRangeSelection): void {
    const isInitialRange = !this.currentRange;
    this.currentRange = range;
    this.page = 1;
    if (isInitialRange) this.loadLogs();
  }

  onRangeApplied(range: DateRangeSelection): void {
    this.currentRange = range;
    this.page = 1;
    this.loadLogs();
  }

  onRangeError(message: string): void {
    this.errorMessage = message;
  }

  loadLogs(silent = false): void {
    if (silent && (this.loading || this.refreshing)) return;

    if (silent) {
      const refreshedRange = this.dateRange?.getSelection(true);
      if (refreshedRange) this.currentRange = refreshedRange;
    }

    if (!this.currentRange) return;

    this.requestSub?.unsubscribe();
    this.errorMessage = '';
    const keepVisibleData = silent || this.logs.length > 0;
    if (keepVisibleData) {
      this.refreshing = true;
    } else {
      this.loading = true;
      this.logs = [];
      this.statuses = [];
      this.source = '';
      this.sourceType = '';
      this.backendConnected = false;
      this.lastUpdatedAt = '';
    }

    this.requestSub = this.activityLogs
      .fetch(
        {
          startTime: this.currentRange.startTime,
          endTime: this.currentRange.endTime,
          page: 1,
          pageSize: 1000,
        },
        silent,
      )
      .subscribe({
        next: (result) => {
          this.logs = result.logs;
          this.statuses = result.statuses;
          this.source = result.source;
          this.backendConnected = result.backendConnected;
          this.lastUpdatedAt = result.fetchedAt;
          this.sourceType = result.sourceType || 'alert-fallback';
          this.loading = false;
          this.refreshing = false;
          this.page = Math.min(this.page, this.totalPages);
        },
        error: (error) => {
          this.loading = false;
          this.refreshing = false;
          this.logs = [];
          this.statuses = [];
          this.source = '';
          this.sourceType = '';
          this.lastUpdatedAt = '';
          this.backendConnected = false;
          this.errorMessage = error?.message || 'Unable to load activity from the backend.';
        },
      });
  }

  toggleAutoRefresh(): void {
    this.autoRefresh = !this.autoRefresh;
    this.restartTimer();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.severityFilter = 'all';
    this.categoryFilter = 'all';
    this.page = 1;
  }

  onFilterChange(): void {
    this.page = 1;
  }

  goToPage(page: number): void {
    this.page = Math.max(1, Math.min(this.totalPages, page));
  }

  exportCsv(): void {
    if (!this.filteredLogs.length) return;
    const header = [
      'Timestamp',
      'Severity',
      'Category',
      'Message',
      'Detail',
      'Vessel',
      'Module',
      'Source',
    ];
    const rows = this.filteredLogs.map((row) => [
      this.formatDateTime(row.timestamp),
      row.severity,
      row.category,
      row.message,
      row.detail,
      row.vesselName,
      row.module,
      row.source,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((value) => this.escapeCsv(value)).join(','))
      .join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `fleet-activity-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  formatTime(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? '-'
      : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? '-'
      : date.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatDateTime(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  }

  severityLabel(value: ActivityLogSeverity): string {
    return value === 'success' ? 'Success' : value.charAt(0).toUpperCase() + value.slice(1);
  }

  statusIcon(status: SystemStatusItem): string {
    if (status.state === 'normal') return 'fa fa-check-circle';
    if (status.state === 'warning') return 'fa fa-exclamation-triangle';
    if (status.state === 'critical') return 'fa fa-exclamation-circle';
    return 'fa fa-chain-broken';
  }

  trackByLog(_: number, row: ActivityLogRecord): string {
    return row.id;
  }

  private ensureLogDerivatives(): void {
    if (this.derivedCacheSource === this.logs) return;

    const categories = new Set<string>();
    let critical = 0;
    let warnings = 0;
    let successful = 0;

    for (const row of this.logs) {
      if (row.category) categories.add(row.category);
      if (row.severity === 'critical') critical += 1;
      if (row.severity === 'warning') warnings += 1;
      if (row.severity === 'success' || row.severity === 'info') successful += 1;
    }

    this.categoriesCache = Array.from(categories).sort();
    this.criticalCountCache = critical;
    this.warningCountCache = warnings;
    this.successRateCache = this.logs.length ? (successful / this.logs.length) * 100 : 0;
    this.derivedCacheSource = this.logs;
  }

  private restartTimer(): void {
    this.timerSub?.unsubscribe();
    if (!this.autoRefresh) return;
    this.timerSub = timer(20_000, 20_000).subscribe(() => this.loadLogs(true));
  }

  private escapeCsv(value: unknown): string {
    const text = String(value ?? '').replace(/"/g, '""');
    return `"${text}"`;
  }
}
