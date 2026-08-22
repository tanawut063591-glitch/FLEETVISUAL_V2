import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  NgZone,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { NewHttpClientService } from '../../shared/services/http-client1.service';
import * as XLSX from 'xlsx';

import {
  DataLoggerHeader,
  DataLoggerRow,
  DataLoggerStatus,
  DataLoggerStatusSummary,
  DataLoggerSortColumnType,
  DataLoggerSortDirection,
} from './data-logger.model';

import { getThresholdFromTag } from './data-logger-threshold.util';

@Component({
  selector: 'app-data-logger',
  standalone: false,
  templateUrl: './data-logger.component.html',
  styleUrls: ['./data-logger.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataLoggerComponent implements OnInit, OnDestroy {
  datahis: DataLoggerRow[] = [];
  tableRows: DataLoggerRow[] = [];

  headers: DataLoggerHeader[] = [];
  visibleHeaders: DataLoggerHeader[] = [];

  loading: boolean = false;
  errorMessage: string = '';
  autoRefresh: boolean = false;
  isRealtimeRange: boolean = false;
  lastUpdatedLabel: string = '';

  start: Date = new Date();
  end: Date = new Date();
  tags: any[] = [];

  pageRow: number = 50;
  rowOptions: number[] = [50, 100, 200];

  pages: (string | number)[] = [];
  pageActive: number = 1;
  pageCount: number = 0;
  totalRows: number = 0;

  selectedIntervalMs: number = 60000;

  intervalOptions = [
    { label: '10s interval', value: 10000 },
    { label: '30s interval', value: 30000 },
    { label: '1m interval', value: 60000 },
  ];

  quickTags = [
    { key: 'engine', label: 'Engine' },
    { key: 'fuel', label: 'Fuel' },
    { key: 'generator', label: 'Generator' },
    { key: 'navigation', label: 'Navigation' },
    { key: 'cargo', label: 'Cargo' },
    { key: 'environment', label: 'Environment' },
    { key: 'electrical', label: 'Electrical' },
    { key: 'hydraulic', label: 'Hydraulic' },
    { key: 'pump', label: 'Pump' },
    { key: 'cooling', label: 'Cooling' },
  ];

  selectedQuickTag: string = 'engine';

  private sortDesc: boolean = true;
  private requestSub: Subscription | null = null;
  private requestVersion = 0;
  private requestPending = false;
  private selectedEvent: any = null;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private readonly refreshMs: number = 30000;

  sortColumnType: DataLoggerSortColumnType = 'time';
  sortHeaderIndex: number = -1;
  sortDirection: DataLoggerSortDirection = 'desc';

  timeFilter: string = '';
  columnFilters: any = {};

  statusSummary: DataLoggerStatusSummary = {
    normal: 0,
    warning: 0,
    alarm: 0,
    nodata: 0,
  };

  constructor(
    private newHttp: NewHttpClientService,
    private changeDetectorRef: ChangeDetectorRef,
    private ngZone: NgZone,
  ) {}

  ngOnInit() {}

  ngOnDestroy(): void {
    this.clearRefreshTimer();
    this.requestSub?.unsubscribe();
    this.requestVersion += 1;
  }

  showLogger(event: any) {
    this.loadLogger(event, false);
  }

  private loadLogger(event: any, silent: boolean) {
    if (!event || !event.start || !event.end || !event.tags || event.tags.length === 0) {
      if (!silent) {
        alert('Please select start date, end date and tags.');
      }
      return;
    }

    if (!silent) {
      this.selectedEvent = {
        ...event,
        tags: (event.tags || []).slice(0),
      };
    }

    const sourceEvent = this.selectedEvent || event;
    const requestEvent = this.resolveRequestEvent(sourceEvent);

    this.isRealtimeRange = requestEvent.movingWindow === true;
    this.start = new Date(requestEvent.start);
    this.end = new Date(requestEvent.end);
    this.tags = (requestEvent.tags || []).slice(0);

    this.start.setSeconds(0);
    this.start.setMilliseconds(0);
    this.end.setSeconds(0);
    this.end.setMilliseconds(0);

    if (this.end.getTime() < this.start.getTime()) {
      if (!silent) {
        alert('End date must be greater than start date.');
      }
      return;
    }

    if (!silent) {
      this.autoRefresh = this.isRealtimeRange;
      if (!this.autoRefresh) {
        this.clearRefreshTimer();
      }
      this.resetTableState();
    } else if (this.isRealtimeRange) {
      this.pageActive = 1;
    }

    this.rebuildPagination();
    this.setDatetime(this.pageActive, silent);
  }

  setDatetime(pageNum: number, silent: boolean = false) {
    if (!this.start || !this.end || !this.tags || this.tags.length === 0) {
      return;
    }

    this.rebuildPagination();

    const startRow = (pageNum - 1) * this.pageRow;
    const endRow = Math.min(startRow + this.pageRow - 1, this.totalRows - 1);

    let pageStartTime: Date;
    let pageEndTime: Date;

    if (this.sortDesc) {
      pageEndTime = new Date(this.end.getTime() - startRow * this.selectedIntervalMs);
      pageStartTime = new Date(this.end.getTime() - endRow * this.selectedIntervalMs);
    } else {
      pageStartTime = new Date(this.start.getTime() + startRow * this.selectedIntervalMs);
      pageEndTime = new Date(this.start.getTime() + endRow * this.selectedIntervalMs);
    }

    const startTime = this.formatRequestTime(pageStartTime);
    const endTime = this.formatRequestTime(pageEndTime);

    this.getData(startTime, endTime, this.tags, silent);
  }

  private rebuildPagination() {
    this.totalRows =
      Math.floor((this.end.getTime() - this.start.getTime()) / this.selectedIntervalMs) + 1;
    this.pageCount = Math.max(1, Math.ceil(this.totalRows / this.pageRow));

    if (this.pageActive > this.pageCount) {
      this.pageActive = this.pageCount;
    }

    if (this.pageActive < 1) {
      this.pageActive = 1;
    }

    this.pages = this.pagination(this.pageActive, this.pageCount);
  }

  getData(startTime: string, endTime: string, tags: any[], silent: boolean = false) {
    const requestVersion = ++this.requestVersion;
    this.requestSub?.unsubscribe();
    this.requestPending = true;

    if (!silent) {
      this.loading = true;
    }
    this.errorMessage = '';

    this.headers = this.createHeaders(tags);
    if (!silent) {
      this.visibleHeaders = this.headers.slice(0);
      this.datahis = [];
      this.tableRows = [];
      this.resetStatusSummary();
      this.changeDetectorRef.detectChanges();
    }

    this.ngZone.runOutsideAngular(() => {
      this.requestSub = this.newHttp.getHistorianValues(startTime, endTime, tags).subscribe(
        (res: any) => {
          if (requestVersion !== this.requestVersion) {
            return;
          }

          const rawData = this.extractResponseArray(res);
          const dictionary = this.buildDataDictionary(rawData);

          if (rawData.length === 0 || dictionary.size === 0) {
            this.errorMessage =
              'No historian data returned for the selected vessel, tags and time range.';
          }

          const stArr = this.parseDateValue(startTime).getTime();
          const enArr = this.parseDateValue(endTime).getTime();

          const reportValue = this.processTimeSeries(stArr, enArr, this.headers, dictionary);

          this.ngZone.run(() => {
            this.datahis = reportValue;
            this.refreshVisibleColumns();
            this.applyTableState();
            this.lastUpdatedLabel = this.formatDisplayTime(new Date());
            this.requestPending = false;
            this.finishLoading();

            if (this.autoRefresh) {
              this.ensureRefreshTimer();
            }
          });
        },
        () => {
          if (requestVersion !== this.requestVersion) {
            return;
          }

          this.ngZone.run(() => {
            this.errorMessage = 'Cannot load data from server.';
            this.requestPending = false;
            if (!silent) {
              alert(this.errorMessage);
            }
            this.finishLoading();
          });
        },
      );
    });
  }

  toggleAutoRefresh(): void {
    if (!this.selectedEvent) {
      return;
    }

    this.autoRefresh = !this.autoRefresh;
    if (this.autoRefresh) {
      this.startRefreshTimer();
      this.refreshNow();
    } else {
      this.clearRefreshTimer();
    }

    this.changeDetectorRef.detectChanges();
  }

  refreshNow(): void {
    if (!this.selectedEvent || this.loading || this.requestPending) {
      return;
    }

    this.loadLogger(this.selectedEvent, true);
  }

  clearTable(): void {
    this.clearRefreshTimer();
    this.autoRefresh = false;
    this.isRealtimeRange = false;
    this.selectedEvent = null;
    this.requestSub?.unsubscribe();
    this.requestSub = null;
    this.requestPending = false;
    this.requestVersion += 1;

    this.datahis = [];
    this.tableRows = [];
    this.headers = [];
    this.visibleHeaders = [];
    this.tags = [];
    this.loading = false;
    this.errorMessage = '';
    this.lastUpdatedLabel = '';
    this.totalRows = 0;
    this.pageCount = 0;
    this.pageActive = 1;
    this.pages = [];
    this.resetTableState();
    this.changeDetectorRef.detectChanges();
  }

  private ensureRefreshTimer(): void {
    if (!this.refreshTimer) {
      this.startRefreshTimer();
    }
  }

  private startRefreshTimer(): void {
    this.clearRefreshTimer();
    this.refreshTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) {
        return;
      }

      if (this.autoRefresh && this.selectedEvent && !this.loading && !this.requestPending) {
        this.loadLogger(this.selectedEvent, true);
      }
    }, this.refreshMs);
  }

  private clearRefreshTimer(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private resolveRequestEvent(event: any): any {
    const start = Number(event.start);
    const end = Number(event.end);
    const now = Date.now();
    const period = String(event.period || '').toUpperCase();
    const movingWindow = event.movingWindow === true || Math.abs(now - end) <= 2 * 60 * 1000;

    if (!movingWindow || period === 'Y') {
      return { ...event, start, end, movingWindow: false };
    }

    const nextEnd = now;
    let nextStart = start;
    let numeric = parseFloat(period.replace(/[^0-9.]+/g, ''));
    if (!Number.isFinite(numeric) || numeric <= 0) {
      numeric = 1;
    }

    if (period === 'T') {
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      nextStart = today.getTime();
    } else if (period === 'M') {
      const month = new Date(now);
      month.setDate(1);
      month.setHours(0, 0, 0, 0);
      nextStart = month.getTime();
    } else if (/H$/.test(period)) {
      nextStart = nextEnd - numeric * 60 * 60 * 1000;
    } else if (/W$/.test(period)) {
      nextStart = nextEnd - numeric * 7 * 24 * 60 * 60 * 1000;
    } else {
      const duration = Math.max(60 * 1000, end - start);
      nextStart = nextEnd - duration;
    }

    return { ...event, start: nextStart, end: nextEnd, movingWindow: true };
  }

  downloadLogger(event: any) {
    if (!event || !event.start || !event.end || !event.tags || event.tags.length === 0) {
      alert('Please select start date, end date and tags.');
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.changeDetectorRef.detectChanges();

    const tags = event.tags;
    const headersDef = this.createHeaders(tags);

    const startDate = new Date(event.start);
    const endDate = new Date(event.end);

    startDate.setSeconds(0);
    startDate.setMilliseconds(0);
    endDate.setSeconds(0);
    endDate.setMilliseconds(0);

    const startStr = this.formatRequestTime(startDate);
    const endStr = this.formatRequestTime(endDate);

    this.ngZone.runOutsideAngular(() => {
      this.newHttp.getHistorianValues(startStr, endStr, tags).subscribe(
        (res: any) => {
          const rawData = this.extractResponseArray(res);
          const dictionary = this.buildDataDictionary(rawData);

          const stArr = this.parseDateValue(startStr).getTime();
          const enArr = this.parseDateValue(endStr).getTime();

          const reportValue = this.processTimeSeries(stArr, enArr, headersDef, dictionary);

          const workbook = XLSX.utils.book_new();

          const headerNames = ['Time', ...headersDef.map((x: DataLoggerHeader) => x.name)];

          const rows = reportValue.map((x: DataLoggerRow) => {
            return [x.timestamp, ...x.values.map((v: any) => this.exportValue(v))];
          });

          const sheet = XLSX.utils.aoa_to_sheet([headerNames, ...rows]);

          XLSX.utils.book_append_sheet(workbook, sheet, 'Data Logger');

          const csvBuffer = XLSX.write(workbook, {
            bookType: 'csv',
            type: 'array',
          });

          this.ngZone.run(() => {
            this.saveAsCsvFile(csvBuffer, 'data-logger');
            this.finishLoading();
          });
        },
        () => {
          this.ngZone.run(() => {
            this.errorMessage = 'Cannot load data from server.';
            alert(this.errorMessage);
            this.finishLoading();
          });
        },
      );
    });
  }

  private extractResponseArray(response: any): any[] {
    let source = response;

    if (typeof source === 'string') {
      const text = source.trim();
      if (!text) {
        return [];
      }

      try {
        source = JSON.parse(text);
      } catch {
        return [];
      }
    }

    if (source && !Array.isArray(source) && typeof source === 'object') {
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

      for (const candidate of candidates) {
        if (Array.isArray(candidate)) {
          source = candidate;
          break;
        }
      }
    }

    if (Array.isArray(source)) {
      if (source.length > 0 && this.looksLikeFlatRecord(source[0])) {
        return this.groupFlatRecords(source);
      }
      return source;
    }

    if (source && typeof source === 'object') {
      return Object.keys(source).reduce((result: any[], key: string) => {
        const value = source[key];
        if (Array.isArray(value)) {
          result.push({ TagName: key, records: value });
        } else if (value && typeof value === 'object') {
          const records = this.extractRecords(value);
          if (records.length > 0) {
            result.push({ ...value, TagName: this.getTagNameFromAny(value) || key });
          }
        }
        return result;
      }, []);
    }

    return [];
  }

  private looksLikeFlatRecord(item: any): boolean {
    if (!item || typeof item !== 'object') {
      return false;
    }
    const hasTime = this.getRecordTimestamp(item) !== '';
    const hasValue = this.getRecordValue(item) !== '';
    return hasTime && hasValue && !!this.getTagNameFromAny(item);
  }

  private groupFlatRecords(records: any[]): any[] {
    const groups = new Map<string, any[]>();
    records.forEach((record: any) => {
      const name = this.getTagNameFromAny(record) || 'Parameter';
      if (!groups.has(name)) {
        groups.set(name, []);
      }
      groups.get(name)!.push(record);
    });
    return Array.from(groups.entries()).map(([TagName, values]) => ({ TagName, records: values }));
  }

  private extractRecords(tag: any): any[] {
    const candidates = [
      tag?.records,
      tag?.Records,
      tag?.values,
      tag?.Values,
      Array.isArray(tag?.Value) ? tag.Value : null,
      tag?.data,
      tag?.Data,
      tag?.items,
      tag?.Items,
      tag?.points,
      tag?.Points,
      tag?.history,
      tag?.History,
      tag?.HistorianValues,
      tag?.historianValues,
      tag?.ValueList,
      tag?.valueList,
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate;
      }
    }

    return [];
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
      ''
    );
  }

  private stripVesselPrefix(name: string): string {
    if (!name) {
      return '';
    }

    const selected = this.tags?.[0];
    const prefix = selected?.vesselPrefix || selected?.prefix || '';
    const text = String(name).trim();

    if (prefix && text.toUpperCase().startsWith(String(prefix).toUpperCase() + '-')) {
      return text.substring(String(prefix).length + 1);
    }

    return text;
  }

  private createHeaders(tags: any[]): DataLoggerHeader[] {
    if (!tags || !Array.isArray(tags)) {
      return [];
    }

    return tags.map((x: any, index: number) => {
      const name = this.getTagNameFromAny(x);

      return {
        index: index,
        name: name,
        key: this.normalizeTagName(name),
        group: this.getTagGroup(name),
        label: this.getTagLabel(name),
        unit: this.getTagUnit(name),
        category: this.getTagCategory(name),
        threshold: getThresholdFromTag(x, name),
      };
    });
  }

  private buildDataDictionary(rawData: any[]): Map<string, Map<number, any>> {
    const dictionary = new Map<string, Map<number, any>>();

    if (!Array.isArray(rawData)) {
      return dictionary;
    }

    rawData.forEach((series: any, index: number) => {
      const fallbackName = this.getTagNameFromAny(this.tags[index]);
      const seriesName = this.getTagNameFromAny(series) || fallbackName;
      const valueMap = new Map<number, any>();
      const records = this.extractRecords(series);

      records.forEach((record: any) => {
        const time = this.parseDateValue(this.getRecordTimestamp(record)).getTime();
        if (isNaN(time)) {
          return;
        }
        const bucket = this.alignTimestamp(time);
        valueMap.set(bucket, this.getRecordValue(record));
      });

      this.getTagKeyAliases(seriesName).forEach((key: string) => dictionary.set(key, valueMap));
      if (fallbackName) {
        this.getTagKeyAliases(fallbackName).forEach((key: string) => {
          if (!dictionary.has(key)) {
            dictionary.set(key, valueMap);
          }
        });
      }
    });

    return dictionary;
  }

  private processTimeSeries(
    stArr: number,
    enArr: number,
    headers: DataLoggerHeader[],
    dictionary: Map<string, Map<number, any>>,
  ): DataLoggerRow[] {
    const rows: DataLoggerRow[] = [];

    if (isNaN(stArr) || isNaN(enArr)) {
      return rows;
    }

    if (this.sortDesc) {
      for (let t = enArr; t >= stArr; t -= this.selectedIntervalMs) {
        rows.push(this.createRow(t, headers, dictionary));
      }
    } else {
      for (let t = stArr; t <= enArr; t += this.selectedIntervalMs) {
        rows.push(this.createRow(t, headers, dictionary));
      }
    }

    return rows;
  }

  private createRow(
    timeNumber: number,
    headers: DataLoggerHeader[],
    dictionary: Map<string, Map<number, any>>,
  ): DataLoggerRow {
    const currentDate = new Date(timeNumber);
    const bucket = this.alignTimestamp(timeNumber);

    const values = headers.map((header: DataLoggerHeader) => {
      let tagRecords: Map<number, any> | undefined;
      for (const key of this.getTagKeyAliases(header.name)) {
        tagRecords = dictionary.get(key);
        if (tagRecords) {
          break;
        }
      }

      if (!tagRecords || !tagRecords.has(bucket)) {
        return '';
      }

      const value = tagRecords.get(bucket);
      return value === null || value === undefined || value === '' ? '' : value;
    });

    return {
      timestamp: this.formatDisplayTime(currentDate),
      values: values,
    };
  }

  private alignTimestamp(timestamp: number): number {
    return Math.floor(timestamp / this.selectedIntervalMs) * this.selectedIntervalMs;
  }

  private getTagKeyAliases(name: string): string[] {
    const result: string[] = [];
    const text = String(name || '').trim();
    const add = (value: string) => {
      const key = this.normalizeTagName(value);
      if (key && result.indexOf(key) === -1) {
        result.push(key);
      }
    };

    add(text);
    add(this.stripVesselPrefix(text));

    const firstDash = text.indexOf('-');
    if (firstDash > 0 && firstDash < text.length - 1) {
      add(text.substring(firstDash + 1));
    }

    return result;
  }

  private getTagNameFromAny(item: any): string {
    if (!item) {
      return '';
    }

    if (typeof item === 'string') {
      return item;
    }

    return (
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
      item.label ||
      item.Label ||
      ''
    );
  }

  private getRecordValue(rec: any): any {
    if (!rec) {
      return '';
    }

    if (rec.Value !== undefined) {
      return rec.Value;
    }

    if (rec.value !== undefined) {
      return rec.value;
    }

    if (rec.Data !== undefined) {
      return rec.Data;
    }

    if (rec.data !== undefined) {
      return rec.data;
    }

    if (rec.Val !== undefined) {
      return rec.Val;
    }

    if (rec.val !== undefined) {
      return rec.val;
    }

    if (rec.NumericValue !== undefined) {
      return rec.NumericValue;
    }

    if (rec.numericValue !== undefined) {
      return rec.numericValue;
    }

    if (rec.y !== undefined) {
      return rec.y;
    }

    return '';
  }

  setQuickTag(key: string) {
    this.selectedQuickTag = key;
    this.refreshVisibleColumns();
    this.applyTableState();
    this.changeDetectorRef.detectChanges();
  }

  private refreshVisibleColumns() {
    if (!this.headers || this.headers.length === 0) {
      this.visibleHeaders = [];
      return;
    }

    if (this.selectedQuickTag === 'engine') {
      this.visibleHeaders = this.headers.slice(0);
      return;
    }

    const result: DataLoggerHeader[] = [];

    for (let i = 0; i < this.headers.length; i++) {
      if (this.headers[i].category === this.selectedQuickTag) {
        result.push(this.headers[i]);
      }
    }

    this.visibleHeaders = result.length > 0 ? result : this.headers.slice(0);
  }

  sortByTime() {
    if (this.sortColumnType === 'time') {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumnType = 'time';
      this.sortHeaderIndex = -1;
      this.sortDirection = 'desc';
    }

    this.sortDesc = this.sortDirection === 'desc';
    this.pageActive = 1;

    if (this.start && this.end && this.tags && this.tags.length > 0) {
      this.setDatetime(this.pageActive);
      return;
    }

    this.applyTableState();
    this.changeDetectorRef.detectChanges();
  }

  sortByHeader(header: DataLoggerHeader) {
    if (!header) {
      return;
    }

    if (this.sortColumnType === 'tag' && this.sortHeaderIndex === header.index) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumnType = 'tag';
      this.sortHeaderIndex = header.index;
      this.sortDirection = 'asc';
    }

    this.applyTableState();
    this.changeDetectorRef.detectChanges();
  }

  getTimeSortIcon(): string {
    if (this.sortColumnType !== 'time') {
      return '↕';
    }

    return this.sortDirection === 'asc' ? '↑' : '↓';
  }

  getHeaderSortIcon(header: DataLoggerHeader): string {
    if (!header || this.sortColumnType !== 'tag' || this.sortHeaderIndex !== header.index) {
      return '↕';
    }

    return this.sortDirection === 'asc' ? '↑' : '↓';
  }

  onFilterChange() {
    this.applyTableState();
    this.changeDetectorRef.detectChanges();
  }

  clearTableFilter() {
    this.timeFilter = '';
    this.columnFilters = {};
    this.applyTableState();
    this.changeDetectorRef.detectChanges();
  }

  private resetTableState() {
    this.timeFilter = '';
    this.columnFilters = {};
    this.sortColumnType = 'time';
    this.sortHeaderIndex = -1;
    this.sortDirection = this.sortDesc ? 'desc' : 'asc';
    this.pageActive = 1;
    this.resetStatusSummary();
  }

  private applyTableState() {
    let rows = this.datahis ? this.datahis.slice(0) : [];

    rows = this.filterRows(rows);
    rows = this.sortRows(rows);

    this.tableRows = rows;
    this.recalculateStatusSummary();
  }

  private filterRows(rows: DataLoggerRow[]): DataLoggerRow[] {
    const timeText = (this.timeFilter || '').toString().toLowerCase().trim();

    return rows.filter((row: DataLoggerRow) => {
      if (timeText) {
        const rowTime = (row.timestamp || '').toString().toLowerCase();

        if (rowTime.indexOf(timeText) === -1) {
          return false;
        }
      }

      for (let i = 0; i < this.visibleHeaders.length; i++) {
        const h = this.visibleHeaders[i];
        const filterValue = (this.columnFilters[h.index] || '').toString().toLowerCase().trim();

        if (!filterValue) {
          continue;
        }

        const cellText = this.displayValue(row.values[h.index]).toLowerCase();

        if (cellText.indexOf(filterValue) === -1) {
          return false;
        }
      }

      return true;
    });
  }

  private sortRows(rows: DataLoggerRow[]): DataLoggerRow[] {
    const direction = this.sortDirection === 'asc' ? 1 : -1;

    rows.sort((a: DataLoggerRow, b: DataLoggerRow) => {
      let valueA: any;
      let valueB: any;

      if (this.sortColumnType === 'time') {
        valueA = this.parseDisplayTime(a.timestamp);
        valueB = this.parseDisplayTime(b.timestamp);
      } else {
        valueA = this.getComparableValue(a.values[this.sortHeaderIndex]);
        valueB = this.getComparableValue(b.values[this.sortHeaderIndex]);
      }

      if (valueA < valueB) {
        return -1 * direction;
      }

      if (valueA > valueB) {
        return 1 * direction;
      }

      return 0;
    });

    return rows;
  }

  private getComparableValue(value: any): any {
    if (value === null || value === undefined || value === '') {
      return 0;
    }

    const num = Number(value);

    if (!isNaN(num)) {
      return num;
    }

    return value.toString().toLowerCase();
  }

  private parseDisplayTime(value: string): number {
    if (!value) {
      return 0;
    }

    const parts = value.split(' ');

    if (parts.length < 2) {
      return 0;
    }

    const dateParts = parts[0].split('-');
    const timeParts = parts[1].split(':');

    if (dateParts.length < 3 || timeParts.length < 2) {
      return 0;
    }

    const monthMap: any = {
      Jan: 0,
      Feb: 1,
      Mar: 2,
      Apr: 3,
      May: 4,
      Jun: 5,
      Jul: 6,
      Aug: 7,
      Sep: 8,
      Oct: 9,
      Nov: 10,
      Dec: 11,
    };

    const day = Number(dateParts[0]);
    const month = monthMap[dateParts[1]];
    const year = Number(dateParts[2]);
    const hour = Number(timeParts[0]);
    const minute = Number(timeParts[1]);
    const second = timeParts[2] ? Number(timeParts[2]) : 0;

    const date = new Date(year, month, day, hour, minute, second);
    return date.getTime();
  }

  getCellClass(value: any, header: DataLoggerHeader): string {
    const status = this.getCellStatus(value, header);

    if (status === 'Alarm') {
      return 'cell-alarm';
    }

    if (status === 'Warning') {
      return 'cell-warning';
    }

    if (status === 'No Data') {
      return 'cell-nodata';
    }

    return 'cell-normal';
  }

  getCellStatus(value: any, header: DataLoggerHeader): DataLoggerStatus {
    if (value === null || value === undefined || value === '') {
      return 'No Data';
    }

    const num = Number(value);

    if (isNaN(num)) {
      return 'Normal';
    }

    if (!header || !header.threshold) {
      return 'Normal';
    }

    const t = header.threshold;

    if (t.alarmLow !== undefined && num < t.alarmLow) {
      return 'Alarm';
    }

    if (t.alarmHigh !== undefined && num > t.alarmHigh) {
      return 'Alarm';
    }

    if (t.warningLow !== undefined && num < t.warningLow) {
      return 'Warning';
    }

    if (t.warningHigh !== undefined && num > t.warningHigh) {
      return 'Warning';
    }

    return 'Normal';
  }

  getCellTitle(value: any, header: DataLoggerHeader): string {
    const status = this.getCellStatus(value, header);
    const display = this.displayValue(value);

    if (!header || !header.threshold) {
      return status + ' | Value: ' + display;
    }

    const t = header.threshold;
    const limits: string[] = [];

    if (t.warningLow !== undefined) {
      limits.push('Warning Low: ' + t.warningLow);
    }

    if (t.warningHigh !== undefined) {
      limits.push('Warning High: ' + t.warningHigh);
    }

    if (t.alarmLow !== undefined) {
      limits.push('Alarm Low: ' + t.alarmLow);
    }

    if (t.alarmHigh !== undefined) {
      limits.push('Alarm High: ' + t.alarmHigh);
    }

    return status + ' | Value: ' + display + (limits.length ? ' | ' + limits.join(' / ') : '');
  }

  private recalculateStatusSummary() {
    this.resetStatusSummary();

    for (let r = 0; r < this.tableRows.length; r++) {
      const row = this.tableRows[r];

      for (let h = 0; h < this.visibleHeaders.length; h++) {
        const header = this.visibleHeaders[h];
        const status = this.getCellStatus(row.values[header.index], header);

        if (status === 'Alarm') {
          this.statusSummary.alarm++;
        } else if (status === 'Warning') {
          this.statusSummary.warning++;
        } else if (status === 'No Data') {
          this.statusSummary.nodata++;
        } else {
          this.statusSummary.normal++;
        }
      }
    }
  }

  private resetStatusSummary() {
    this.statusSummary = {
      normal: 0,
      warning: 0,
      alarm: 0,
      nodata: 0,
    };
  }

  pagination(c: number, m: number): (string | number)[] {
    const dep = document.body.clientWidth > 520 ? 2 : 1;
    const range: number[] = [];
    const rangeWithDots: (string | number)[] = [];
    let l = 0;

    if (m <= 0) {
      return [];
    }

    for (let i = 1; i <= m; i++) {
      if (i === 1 || i === m || (i >= c - dep && i <= c + dep)) {
        range.push(i);
      }
    }

    for (let i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }

      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  }

  setActive(pageNum: any) {
    if (pageNum === '...' || pageNum === this.pageActive) {
      return;
    }

    const nextPage = Number(pageNum);

    if (isNaN(nextPage)) {
      return;
    }

    this.pageActive = nextPage;
    this.pages = this.pagination(this.pageActive, this.pageCount);
    this.setDatetime(this.pageActive);
  }

  previous() {
    if (this.pageActive > 1) {
      this.setActive(this.pageActive - 1);
    }
  }

  next() {
    if (this.pageActive < this.pageCount) {
      this.setActive(this.pageActive + 1);
    }
  }

  changeRowsPerPage(event: any) {
    const value = Number(event.target.value);

    if (isNaN(value)) {
      return;
    }

    this.pageRow = value;

    if (this.selectedEvent) {
      this.loadLogger(this.selectedEvent, false);
    }
  }

  changeInterval(event: any) {
    const value = Number(event.target.value);

    if (isNaN(value)) {
      return;
    }

    this.selectedIntervalMs = value;

    if (this.selectedEvent) {
      this.loadLogger(this.selectedEvent, false);
    }
  }

  getRangeLabel(): string {
    if (!this.totalRows || this.totalRows <= 0) {
      return '0 – 0 of 0';
    }

    const from = (this.pageActive - 1) * this.pageRow + 1;
    const to = Math.min(this.pageActive * this.pageRow, this.totalRows);

    return (
      this.formatNumber(from) +
      ' – ' +
      this.formatNumber(to) +
      ' of ' +
      this.formatNumber(this.totalRows)
    );
  }

  getFilteredCountLabel(): string {
    return this.formatNumber(this.tableRows.length) + ' rows shown';
  }

  displayValue(value: any): string {
    if (value === null || value === undefined || value === '') {
      return '—';
    }

    const num = Number(value);

    if (isNaN(num)) {
      return value.toString();
    }

    return num.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  private exportValue(value: any): any {
    if (value === null || value === undefined || value === '') {
      return '';
    }

    return value;
  }

  trackByHeader(index: number, item: DataLoggerHeader) {
    return item ? item.name + '_' + item.index : index;
  }

  trackByRow(index: number, item: DataLoggerRow) {
    return item ? item.timestamp : index;
  }

  trackByPage(_index: number, item: any) {
    return item;
  }

  trackByQuickTag(index: number, item: any) {
    return item ? item.key : index;
  }

  private getTagGroup(name: string): string {
    const upper = (name || '').toUpperCase();

    const dg = upper.match(/DG\d+/);
    if (dg) {
      return dg[0];
    }

    const me = upper.match(/ME\d+/);
    if (me) {
      return me[0];
    }

    const ae = upper.match(/AE\d+/);
    if (ae) {
      return ae[0];
    }

    const gen = upper.match(/GEN\d*/);
    if (gen) {
      return gen[0];
    }

    if (upper.indexOf('GPS') !== -1) {
      return 'GPS';
    }

    if (upper.indexOf('VES') !== -1) {
      return 'VES';
    }

    if (upper.indexOf('PUMP') !== -1) {
      return 'PUMP';
    }

    if (upper.indexOf('HYD') !== -1) {
      return 'HYD';
    }

    return 'DATA';
  }

  private getTagLabel(name: string): string {
    if (!name) {
      return '-';
    }

    let text = name;
    const upper = name.toUpperCase();
    const group = this.getTagGroup(name);

    if (group !== 'DATA') {
      const index = upper.indexOf(group);

      if (index !== -1) {
        text = name.substring(index + group.length);
      }
    }

    text = text
      .replace(/^[-_]+/, '')
      .replace(/[-_]+/g, ' ')
      .replace(/\bRPM\b/gi, 'RPM')
      .replace(/\bFIN\b/gi, 'FUEL IN')
      .replace(/\bFOUT\b/gi, 'FUEL OUT')
      .replace(/\bRAW\b/gi, '')
      .replace(/\bVTOTAL\b/gi, 'TOTAL')
      .replace(/\bCONS\b/gi, 'CONSUMPTION')
      .replace(/\bDIS\b/gi, 'DISTANCE')
      .replace(/\bLAT\b/gi, 'LATITUDE')
      .replace(/\bLONG\b/gi, 'LONGITUDE')
      .replace(/\bLNG\b/gi, 'LONGITUDE')
      .replace(/\bVES\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    return text || name;
  }

  private getTagUnit(name: string): string {
    const lower = (name || '').toLowerCase();

    if (lower.indexOf('rpm') !== -1) {
      return '(rpm)';
    }

    if (
      lower.indexOf('fuel') !== -1 ||
      lower.indexOf('fin') !== -1 ||
      lower.indexOf('fout') !== -1 ||
      lower.indexOf('rate') !== -1
    ) {
      return '(L/h)';
    }

    if (lower.indexOf('temp') !== -1) {
      return '(°C)';
    }

    if (lower.indexOf('press') !== -1) {
      return '(bar)';
    }

    if (lower.indexOf('volt') !== -1 || lower.indexOf('battery') !== -1) {
      return '(V)';
    }

    if (lower.indexOf('load') !== -1) {
      return '(%)';
    }

    if (lower.indexOf('speed') !== -1 || lower.indexOf('sog') !== -1) {
      return '(knot)';
    }

    if (lower.indexOf('pitch') !== -1) {
      return '(°)';
    }

    if (
      lower.indexOf('lat') !== -1 ||
      lower.indexOf('long') !== -1 ||
      lower.indexOf('lng') !== -1
    ) {
      return '(°)';
    }

    if (lower.indexOf('total') !== -1 || lower.indexOf('cons') !== -1) {
      return '(L)';
    }

    return '';
  }

  private getTagCategory(name: string): string {
    const lower = (name || '').toLowerCase();

    if (
      lower.indexOf('fuel') !== -1 ||
      lower.indexOf('fin') !== -1 ||
      lower.indexOf('fout') !== -1 ||
      lower.indexOf('cons') !== -1
    ) {
      return 'fuel';
    }

    if (
      lower.indexOf('gps') !== -1 ||
      lower.indexOf('lat') !== -1 ||
      lower.indexOf('long') !== -1 ||
      lower.indexOf('lng') !== -1 ||
      lower.indexOf('speed') !== -1 ||
      lower.indexOf('sog') !== -1 ||
      lower.indexOf('cog') !== -1 ||
      lower.indexOf('distance') !== -1
    ) {
      return 'navigation';
    }

    if (
      lower.indexOf('gen') !== -1 ||
      lower.indexOf('generator') !== -1 ||
      lower.indexOf('dg') !== -1
    ) {
      return 'generator';
    }

    if (
      lower.indexOf('volt') !== -1 ||
      lower.indexOf('battery') !== -1 ||
      lower.indexOf('amp') !== -1
    ) {
      return 'electrical';
    }

    if (lower.indexOf('hyd') !== -1) {
      return 'hydraulic';
    }

    if (lower.indexOf('pump') !== -1) {
      return 'pump';
    }

    if (lower.indexOf('cool') !== -1 || lower.indexOf('temp') !== -1) {
      return 'cooling';
    }

    if (lower.indexOf('cargo') !== -1) {
      return 'cargo';
    }

    if (
      lower.indexOf('env') !== -1 ||
      lower.indexOf('air') !== -1 ||
      lower.indexOf('humidity') !== -1
    ) {
      return 'environment';
    }

    return 'engine';
  }

  private parseDateValue(value: any): Date {
    if (value instanceof Date) {
      return new Date(value.getTime());
    }

    if (typeof value === 'number') {
      const milliseconds = Math.abs(value) < 100000000000 ? value * 1000 : value;
      return new Date(milliseconds);
    }

    if (typeof value === 'string') {
      const text = value.trim();

      const dotNetDate = text.match(/^\/Date\((-?\d+)(?:[+-]\d{4})?\)\/$/);
      if (dotNetDate) {
        return new Date(Number(dotNetDate[1]));
      }

      if (/^-?\d+(?:\.\d+)?$/.test(text)) {
        const numeric = Number(text);
        const milliseconds = Math.abs(numeric) < 100000000000 ? numeric * 1000 : numeric;
        return new Date(milliseconds);
      }

      if (text.match(/Z$/) || text.match(/[+-]\d{2}:?\d{2}$/)) {
        return new Date(text);
      }

      const match = text.match(
        /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?/,
      );

      if (match) {
        return new Date(
          Number(match[1]),
          Number(match[2]) - 1,
          Number(match[3]),
          Number(match[4]),
          Number(match[5]),
          match[6] ? Number(match[6]) : 0,
          match[7] ? Number(match[7].padEnd(3, '0')) : 0,
        );
      }
    }

    return new Date(value);
  }

  private formatRequestTime(date: Date): string {
    return this.formatKeyTime(date);
  }

  private formatKeyTime(date: Date): string {
    return (
      date.getFullYear() +
      '-' +
      this.pad(date.getMonth() + 1) +
      '-' +
      this.pad(date.getDate()) +
      ' ' +
      this.pad(date.getHours()) +
      ':' +
      this.pad(date.getMinutes()) +
      ':' +
      this.pad(date.getSeconds())
    );
  }

  private formatDisplayTime(date: Date): string {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    return (
      this.pad(date.getDate()) +
      '-' +
      months[date.getMonth()] +
      '-' +
      date.getFullYear() +
      ' ' +
      this.pad(date.getHours()) +
      ':' +
      this.pad(date.getMinutes()) +
      ':' +
      this.pad(date.getSeconds())
    );
  }

  private pad(value: number): string {
    return value < 10 ? '0' + value : '' + value;
  }

  private normalizeTagName(value: string): string {
    return (value || '').replace(/\s+/g, '').toUpperCase();
  }

  private formatNumber(value: number): string {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  private finishLoading() {
    this.loading = false;
    this.changeDetectorRef.detectChanges();
  }

  private saveAsCsvFile(buffer: any, fileName: string): void {
    const data = new Blob([buffer], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = window.URL.createObjectURL(data);
    const link = document.createElement('a');

    link.href = url;
    link.download = fileName + '.csv';
    link.click();

    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 100);
  }
}
