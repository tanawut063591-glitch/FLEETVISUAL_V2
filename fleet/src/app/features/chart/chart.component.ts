import { Component, OnDestroy, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { DatePipe } from '@angular/common';
import type Highcharts from 'highcharts';
import { NewHttpClientService } from '../../shared/services/http-client1.service';
import { Subscription } from 'rxjs';

interface ChartPoint {
    x: number;
    y: number;
}

interface ChartSeriesItem {
    id: string;
    name: string;
    label: string;
    group: string;
    unit: string;
    color: string;
    data: any[];
    rawData: ChartPoint[];
}

interface ChartGroupItem {
    key: string;
    label: string;
    count: number;
    chartOptions: Highcharts.Options;
    seriesNames: string[];
}

@Component({
    selector: 'app-chart',
    templateUrl: './chart.component.html',
    styleUrls: ['./chart.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class ChartComponent implements OnInit, OnDestroy {

    loading: boolean = false;
    errorMessage: string = '';

    mainChartOptions: Highcharts.Options | null = null;
    groupCharts: ChartGroupItem[] = [];

    displayMode: string = 'all';
    chartType: string = 'line';
    autoRefresh: boolean = false;

    selectedTags: any[] = [];
    selectedSeries: ChartSeriesItem[] = [];
    selectedEvent: any = null;

    lastStartLabel: string = '';
    lastEndLabel: string = '';
    lastUpdatedLabel: string = '';

    private refreshTimer: ReturnType<typeof setInterval> | null = null;
    private requestSub: Subscription | null = null;
    private requestVersion = 0;

    private readonly refreshMs: number = 60000;
    private readonly maxRenderedPoints: number = 2000;

    private readonly palette: string[] = [
        '#2563eb', '#16a34a', '#f97316', '#8b5cf6', '#ef4444', '#06b6d4',
        '#f59e0b', '#14b8a6', '#ec4899', '#64748b', '#22c55e', '#3b82f6'
    ];

    constructor(
        private datePipe: DatePipe,
        private newHttp: NewHttpClientService,
        private cd: ChangeDetectorRef
    ) { }

    ngOnInit() { }

    ngOnDestroy() {
        this.clearRefreshTimer();
        if (this.requestSub) {
            this.requestSub.unsubscribe();
        }
        this.requestVersion++;
    }

    showLogger(event: any) {
        this.loadChart(event, false);
    }

    loadChart(event: any, silent: boolean, exportAfterLoad: boolean = false) {
        if (!event || !event.start || !event.end || !event.tags || event.tags.length === 0) {
            alert('Please select start date, end date and tags.');
            return;
        }

        var requestVersion = ++this.requestVersion;

        this.selectedEvent = event;
        this.selectedTags = (event.tags || []).slice(0, 10);
        this.errorMessage = '';

        var start = this.toRequestTime(event.start);
        var end = this.toRequestTime(event.end);

        this.lastStartLabel = this.toDisplayTime(event.start);
        this.lastEndLabel = this.toDisplayTime(event.end);

        if (!silent) {
            this.loading = true;
            this.markView();
        }

        if (this.requestSub) {
            this.requestSub.unsubscribe();
        }

        this.requestSub = this.newHttp.getHistorianValues(start, end, this.selectedTags).subscribe({
            next: (res: any) => {
                if (requestVersion !== this.requestVersion) {
                    return;
                }

                var raw = this.extractSeriesEntries(res, this.selectedTags);
                this.selectedSeries = this.buildSeries(raw, this.selectedTags);
                this.rebuildCharts();
                this.lastUpdatedLabel = this.toDisplayTime(new Date());
                this.loading = false;

                if (this.selectedSeries.length === 0) {
                    this.errorMessage = 'No historian values were found for the selected range.';
                }

                if (exportAfterLoad && this.selectedSeries.length > 0) {
                    this.downloadSelectedSeriesCsv();
                }

                this.markView();
            },
            error: (error: any) => {
                if (requestVersion !== this.requestVersion) {
                    return;
                }

                this.errorMessage = 'Cannot load chart data from server.';
                this.selectedSeries = [];
                this.mainChartOptions = null;
                this.groupCharts = [];
                this.loading = false;
                this.markView();

                if (typeof console !== 'undefined' && console.warn) {
                    console.warn('ChartGetHistorianValues error:', error);
                }
            }
        });
    }

    setDisplayMode(mode: string) {
        if (this.displayMode === mode) {
            return;
        }

        this.displayMode = mode;
        this.rebuildCharts();
        this.markView();
    }

    setChartType(type: string) {
        if (this.chartType === type) {
            return;
        }

        this.chartType = type;
        this.rebuildCharts();
        this.markView();
    }

    toggleAutoRefresh() {
        this.autoRefresh = !this.autoRefresh;

        if (this.autoRefresh) {
            this.startRefreshTimer();
        } else {
            this.clearRefreshTimer();
        }

        this.markView();
    }

    refreshNow() {
        if (this.selectedEvent) {
            this.loadChart(this.selectedEvent, false);
        }
    }

    clearChart() {
        this.clearRefreshTimer();
        this.autoRefresh = false;
        this.selectedEvent = null;
        this.selectedTags = [];
        this.selectedSeries = [];
        this.mainChartOptions = null;
        this.groupCharts = [];
        this.errorMessage = '';
        this.lastStartLabel = '';
        this.lastEndLabel = '';
        this.lastUpdatedLabel = '';
        this.markView();
    }

    exportChartCsv(event?: any) {
        if (event && event.start && event.end && event.tags && event.tags.length > 0) {
            this.loadChart(event, false, true);
            return;
        }

        if (!this.selectedSeries || this.selectedSeries.length === 0) {
            alert('Please apply chart data before export.');
            return;
        }

        this.downloadSelectedSeriesCsv();
    }

    private downloadSelectedSeriesCsv(): void {
        var rows: string[] = [];
        rows.push(['Time', 'Parameter', 'Value', 'Unit'].join(','));

        for (var i = 0; i < this.selectedSeries.length; i++) {
            var series = this.selectedSeries[i];
            for (var p = 0; p < series.rawData.length; p++) {
                rows.push([
                    this.csvEscape(this.toDisplayTime(series.rawData[p].x)),
                    this.csvEscape(series.label),
                    this.csvEscape(String(series.rawData[p].y)),
                    this.csvEscape(series.unit || '')
                ].join(','));
            }
        }

        var suffix = this.datePipe.transform(new Date(), 'yyyyMMdd-HHmmss') || 'export';
        this.downloadTextFile(rows.join('\n'), 'fleet-chart-' + suffix + '.csv', 'text/csv;charset=utf-8;');
    }

    getSelectedLabel(): string {
        if (!this.selectedTags || this.selectedTags.length === 0) {
            return 'No tags selected';
        }

        return this.selectedTags.length + ' Tags Selected';
    }

    getModeLabel(): string {
        return this.displayMode === 'groups' ? 'Separate Groups' : 'All Lines';
    }

    trackBySeries(index: number, item: ChartSeriesItem) {
        return item ? item.id : index;
    }

    trackByGroup(index: number, item: ChartGroupItem) {
        return item ? item.key : index;
    }

    // ============================================================
    // Data mapping
    // ============================================================

    private buildSeries(raw: any[], tags: any[]): ChartSeriesItem[] {
        var items: ChartSeriesItem[] = [];

        if (!raw || raw.length === 0) {
            return items;
        }

        for (var i = 0; i < raw.length; i++) {
            var entry = raw[i];
            var tagFromRequest = this.findRequestedTag(entry, tags, i);
            var name = this.getSeriesName(entry, tagFromRequest, i);
            var records = this.getRecords(entry);
            var rawData: ChartPoint[] = [];

            for (var j = 0; j < records.length; j++) {
                var rec = records[j];
                var x = this.getRecordTime(rec);
                var y = this.getRecordValue(rec);

                if (isNaN(x) || isNaN(y)) {
                    continue;
                }

                rawData.push({ x: x, y: y });
            }

            rawData = this.sortAndDeduplicatePoints(rawData);

            if (rawData.length === 0) {
                continue;
            }

            var rendered = this.downsampleMinMax(rawData, this.maxRenderedPoints);
            var data = rendered.map((point: ChartPoint) => [point.x, point.y]);
            var group = this.getTagGroup(name);
            var color = this.palette[items.length % this.palette.length];

            items.push({
                id: this.normalizeTagName(name) + '_' + i,
                name: name,
                label: this.getCleanLabel(name),
                group: group,
                unit: this.getEntryUnit(entry) || this.getTagUnit(name),
                color: color,
                data: data,
                rawData: rawData
            });
        }

        return items;
    }

    private extractSeriesEntries(response: any, tags: any[]): any[] {
        var source = response;

        if (typeof source === 'string') {
            var text = source.trim();
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
            var candidates = [
                source.data, source.result, source.results, source.records, source.items,
                source.values, source.Data, source.Result, source.HistorianValues,
                source.historianValues, source.history, source.History, source.payload, source.Payload
            ];

            for (var i = 0; i < candidates.length; i++) {
                if (Array.isArray(candidates[i])) {
                    source = candidates[i];
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
            var mapped: any[] = [];
            Object.keys(source).forEach((key: string) => {
                var value = source[key];
                if (Array.isArray(value)) {
                    mapped.push({ TagName: key, records: value });
                } else if (value && typeof value === 'object') {
                    var records = this.getRecords(value);
                    if (records.length > 0) {
                        mapped.push(Object.assign({ TagName: key }, value));
                    }
                }
            });
            return mapped;
        }

        return [];
    }

    private looksLikeFlatRecord(item: any): boolean {
        if (!item || typeof item !== 'object') {
            return false;
        }

        var hasTime = item.TimeStamp !== undefined || item.timestamp !== undefined ||
            item.time !== undefined || item.Time !== undefined || item.DateTime !== undefined;
        var hasValue = item.Value !== undefined || item.value !== undefined ||
            item.Data !== undefined || item.data !== undefined || item.y !== undefined;
        var hasTag = !!this.getTagNameFromAny(item);

        return hasTime && hasValue && hasTag;
    }

    private groupFlatRecords(records: any[]): any[] {
        var groups: { [key: string]: any[] } = {};
        var order: string[] = [];

        for (var i = 0; i < records.length; i++) {
            var name = this.getTagNameFromAny(records[i]) || 'Parameter';
            if (!groups[name]) {
                groups[name] = [];
                order.push(name);
            }
            groups[name].push(records[i]);
        }

        return order.map((name: string) => ({ TagName: name, records: groups[name] }));
    }

    private findRequestedTag(entry: any, tags: any[], fallbackIndex: number): any {
        var entryName = this.normalizeTagName(this.getTagNameFromAny(entry));

        if (entryName && tags) {
            for (var i = 0; i < tags.length; i++) {
                var requestName = this.normalizeTagName(this.getTagNameFromAny(tags[i]));
                if (requestName === entryName || requestName.endsWith('_' + entryName) || entryName.endsWith('_' + requestName)) {
                    return tags[i];
                }
            }
        }

        return tags && tags[fallbackIndex] ? tags[fallbackIndex] : null;
    }

    private getEntryUnit(entry: any): string {
        if (!entry || typeof entry !== 'object') {
            return '';
        }
        return entry.Unit || entry.unit || entry.EngineeringUnit || entry.engineeringUnit || '';
    }

    private sortAndDeduplicatePoints(points: ChartPoint[]): ChartPoint[] {
        var sorted = points.slice().sort((a: ChartPoint, b: ChartPoint) => a.x - b.x);
        var result: ChartPoint[] = [];

        for (var i = 0; i < sorted.length; i++) {
            var point = sorted[i];
            var previous = result.length > 0 ? result[result.length - 1] : null;
            if (previous && previous.x === point.x) {
                previous.y = point.y;
            } else {
                result.push({ x: point.x, y: point.y });
            }
        }

        return result;
    }

    private downsampleMinMax(points: ChartPoint[], limit: number): ChartPoint[] {
        if (!points || points.length <= limit || limit < 4) {
            return points ? points.slice() : [];
        }

        var result: ChartPoint[] = [points[0]];
        var interiorLimit = limit - 2;
        var bucketCount = Math.max(1, Math.floor(interiorLimit / 2));
        var bucketSize = (points.length - 2) / bucketCount;

        for (var bucket = 0; bucket < bucketCount; bucket++) {
            var from = 1 + Math.floor(bucket * bucketSize);
            var to = Math.min(points.length - 1, 1 + Math.floor((bucket + 1) * bucketSize));
            if (to <= from) {
                continue;
            }

            var minPoint = points[from];
            var maxPoint = points[from];

            for (var i = from + 1; i < to; i++) {
                if (points[i].y < minPoint.y) { minPoint = points[i]; }
                if (points[i].y > maxPoint.y) { maxPoint = points[i]; }
            }

            if (minPoint.x <= maxPoint.x) {
                result.push(minPoint);
                if (maxPoint.x !== minPoint.x) { result.push(maxPoint); }
            } else {
                result.push(maxPoint);
                if (maxPoint.x !== minPoint.x) { result.push(minPoint); }
            }
        }

        result.push(points[points.length - 1]);
        return result.slice(0, limit);
    }

    private getSeriesName(entry: any, fallbackTag: any, index: number): string {
        var name = this.getTagNameFromAny(entry);

        if (!name) {
            name = this.getTagNameFromAny(fallbackTag);
        }

        if (!name && entry && entry.point && entry.point.name) {
            name = entry.point.name;
        }

        return name || ('Parameter ' + (index + 1));
    }

    private getRecords(entry: any): any[] {
        if (!entry) {
            return [];
        }

        var candidates = [
            entry.records, entry.Records, entry.values, entry.Values,
            Array.isArray(entry.Value) ? entry.Value : null,
            entry.data, entry.Data, entry.items, entry.Items,
            entry.points, entry.Points, entry.history, entry.History,
            entry.HistorianValues, entry.historianValues,
            entry.ValueList, entry.valueList
        ];

        for (var i = 0; i < candidates.length; i++) {
            if (Array.isArray(candidates[i])) {
                return candidates[i];
            }
        }

        return [];
    }

    private getRecordTime(rec: any): number {
        if (!rec) {
            return NaN;
        }

        var value = rec.TimeStamp ?? rec.Timestamp ?? rec.timeStamp ?? rec.timestamp ??
            rec.time ?? rec.Time ?? rec.DateTime ?? rec.datetime ?? rec.Date ?? rec.date ?? rec.x;

        if (value === null || value === undefined || value === '') {
            return NaN;
        }

        if (typeof value === 'number') {
            return Math.abs(value) < 100000000000 ? value * 1000 : value;
        }

        var text = String(value).trim();
        var dotNetDate = text.match(/^\/Date\((-?\d+)(?:[+-]\d{4})?\)\/$/);
        if (dotNetDate) {
            return Number(dotNetDate[1]);
        }

        if (/^-?\d+(?:\.\d+)?$/.test(text)) {
            var numeric = Number(text);
            return Math.abs(numeric) < 100000000000 ? numeric * 1000 : numeric;
        }

        return new Date(text).getTime();
    }

    private getRecordValue(rec: any): number {
        if (!rec) {
            return NaN;
        }

        var value = rec.Value;

        if (value === undefined) {
            value = rec.value;
        }

        if (value === undefined) {
            value = rec.Data;
        }

        if (value === undefined) {
            value = rec.data;
        }

        if (value === undefined) {
            value = rec.Val;
        }

        if (value === undefined) {
            value = rec.val;
        }

        if (value === undefined) {
            value = rec.NumericValue;
        }

        if (value === undefined) {
            value = rec.numericValue;
        }

        if (value === undefined) {
            value = rec.y;
        }

        var num = parseFloat(value);
        return num;
    }

    private getTagNameFromAny(item: any): string {
        if (!item) {
            return '';
        }

        if (typeof item === 'string') {
            return item;
        }

        return item.Name ||
            item.name ||
            item.TagName ||
            item.tagName ||
            item.HistorianTagName ||
            item.historianTagName ||
            item.HistorianTag ||
            item.historianTag ||
            item.PointName ||
            item.pointName ||
            item.Tag ||
            item.tag ||
            item.label ||
            item.Label ||
            '';
    }

    private normalizeTagName(value: string): string {
        return (value || '').toUpperCase().replace(/[^A-Z0-9]+/g, '_');
    }

    private getTagGroup(name: string): string {
        var upper = this.normalizeTagName(name);

        if (upper.indexOf('VES') === 0 || upper.indexOf('GPS') >= 0 || upper.indexOf('NAV') >= 0 || upper.indexOf('SPEED') >= 0 || upper.indexOf('LAT') >= 0 || upper.indexOf('LONG') >= 0) {
            return 'Vessel / Navigation';
        }

        if (upper.indexOf('DG1') >= 0 || upper.indexOf('GEN1') >= 0) {
            return 'DG1';
        }

        if (upper.indexOf('DG2') >= 0 || upper.indexOf('GEN2') >= 0) {
            return 'DG2';
        }

        if (upper.indexOf('DG3') >= 0 || upper.indexOf('GEN3') >= 0) {
            return 'DG3';
        }

        if (upper.indexOf('DG4') >= 0 || upper.indexOf('GEN4') >= 0) {
            return 'DG4';
        }

        if (upper.indexOf('PME') >= 0 || upper.indexOf('SME') >= 0 || upper.indexOf('ENGINE') >= 0 || upper.indexOf('RPM') >= 0 || upper.indexOf('LOAD') >= 0) {
            return 'Main Engine';
        }

        if (upper.indexOf('FUEL') >= 0 || upper.indexOf('FIN') >= 0 || upper.indexOf('FOUT') >= 0 || upper.indexOf('CONS') >= 0) {
            return 'Fuel Flow';
        }

        if (upper.indexOf('TEMP') >= 0 || upper.indexOf('PRESS') >= 0 || upper.indexOf('OIL') >= 0) {
            return 'Temperature / Pressure';
        }

        if (upper.indexOf('ALIVE') >= 0 || upper.indexOf('STATUS') >= 0) {
            return 'System Status';
        }

        return 'Other Sensors';
    }

    private getCleanLabel(name: string): string {
        var text = (name || '').replace(/_/g, '-');
        var parts = text.split('-');

        if (parts.length <= 1) {
            return text;
        }

        var prefix = parts[0];
        var label = parts.slice(1).join(' ');
        return prefix + ' ' + label;
    }

    private getTagUnit(name: string): string {
        var upper = this.normalizeTagName(name);

        if (upper.indexOf('RPM') >= 0) { return 'rpm'; }
        if (upper.indexOf('SPEED') >= 0 || upper.indexOf('SPD') >= 0) { return 'knots'; }
        if (upper.indexOf('TEMP') >= 0) { return '°C'; }
        if (upper.indexOf('PRESS') >= 0) { return 'bar'; }
        if (upper.indexOf('FLOW') >= 0 || upper.indexOf('RATE') >= 0) { return 'L/h'; }
        if (upper.indexOf('CONS') >= 0 || upper.indexOf('TOTAL') >= 0) { return 'L'; }
        if (upper.indexOf('LOAD') >= 0) { return '%'; }
        if (upper.indexOf('VOLT') >= 0) { return 'V'; }
        if (upper.indexOf('CURRENT') >= 0 || upper.indexOf('AMP') >= 0) { return 'A'; }
        if (upper.indexOf('LAT') >= 0 || upper.indexOf('LONG') >= 0) { return '°'; }

        return '';
    }

    // ============================================================
    // Chart building
    // ============================================================

    private rebuildCharts() {
        this.mainChartOptions = null;
        this.groupCharts = [];

        if (!this.selectedSeries || this.selectedSeries.length === 0) {
            return;
        }

        this.mainChartOptions = this.createChartOptions('All Selected Parameters', this.selectedSeries, 440);
        this.groupCharts = this.createGroupedCharts(this.selectedSeries);
    }

    private createGroupedCharts(series: ChartSeriesItem[]): ChartGroupItem[] {
        var result: ChartGroupItem[] = [];
        var groupIndex: { [key: string]: ChartSeriesItem[] } = {};
        var order: string[] = [];

        for (var i = 0; i < series.length; i++) {
            var key = series[i].group;
            if (!groupIndex[key]) {
                groupIndex[key] = [];
                order.push(key);
            }
            groupIndex[key].push(series[i]);
        }

        for (var j = 0; j < order.length; j++) {
            var groupName = order[j];
            var groupSeries = groupIndex[groupName];
            result.push({
                key: this.normalizeTagName(groupName),
                label: groupName,
                count: groupSeries.length,
                chartOptions: this.createChartOptions(groupName, groupSeries, 260),
                seriesNames: groupSeries.map((x: ChartSeriesItem) => x.label)
            });
        }

        return result;
    }

    private createChartOptions(title: string, seriesItems: ChartSeriesItem[], height: number): Highcharts.Options {
        var highSeries: any[] = [];

        for (var i = 0; i < seriesItems.length; i++) {
            var item = seriesItems[i];
            highSeries.push({
                type: this.chartType === 'area' ? 'area' : 'line',
                name: item.label + (item.unit ? ' (' + item.unit + ')' : ''),
                data: item.data,
                color: item.color,
                fillColor: this.chartType === 'area' ? this.hexToRgba(item.color, 0.15) : undefined,
                lineWidth: 2,
                turboThreshold: 0,
                marker: {
                    enabled: false,
                    symbol: 'circle',
                    radius: 2
                }
            });
        }

        var options: any = {
            credits: { enabled: false },
            exporting: { enabled: true, fallbackToExportServer: false },
            chart: {
                type: this.chartType === 'area' ? 'area' : 'line',
                height: height,
                zoomType: 'x',
                backgroundColor: '#ffffff',
                spacingTop: 16,
                spacingRight: 20,
                spacingBottom: 12,
                spacingLeft: 8
            },
            title: { text: null },
            subtitle: { text: null },
            xAxis: {
                type: 'datetime',
                gridLineWidth: 1,
                lineColor: '#dbeafe',
                tickColor: '#dbeafe',
                labels: {
                    style: { color: '#64748b', fontSize: '11px' }
                }
            },
            yAxis: {
                title: { text: null },
                gridLineColor: '#e8eef7',
                labels: {
                    style: { color: '#64748b', fontSize: '11px' }
                }
            },
            legend: {
                enabled: true,
                align: 'center',
                verticalAlign: 'top',
                itemStyle: {
                    color: '#0f172a',
                    fontWeight: '600',
                    fontSize: '11px'
                }
            },
            tooltip: {
                shared: true,
                split: false,
                useHTML: true,
                xDateFormat: '%d %b %Y %H:%M',
                backgroundColor: '#ffffff',
                borderColor: '#dbeafe',
                borderRadius: 10,
                shadow: true,
                valueDecimals: 2
            },
            plotOptions: {
                series: {
                    animation: false,
                    states: { hover: { lineWidthPlus: 1 } }
                },
                area: {
                    threshold: null
                }
            },
            series: highSeries
        };

        return options as Highcharts.Options;
    }

    // ============================================================
    // Timer / helpers
    // ============================================================

    private startRefreshTimer() {
        this.clearRefreshTimer();
        this.refreshTimer = setInterval(() => {
            if (this.autoRefresh && this.selectedEvent) {
                this.loadChart(this.selectedEvent, true);
            }
        }, this.refreshMs);
    }

    private clearRefreshTimer() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    private toRequestTime(value: any): string {
        var date = new Date(value);
        return this.datePipe.transform(date, 'yyyy-MM-dd HH:mm:00') || '';
    }

    private toDisplayTime(value: any): string {
        var date = new Date(value);
        return this.datePipe.transform(date, 'dd MMM yyyy HH:mm') || '';
    }

    private hexToRgba(hex: string, alpha: number): string {
        var clean = (hex || '#2563eb').replace('#', '');

        if (clean.length === 3) {
            clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
        }

        var bigint = parseInt(clean, 16);
        var r = (bigint >> 16) & 255;
        var g = (bigint >> 8) & 255;
        var b = bigint & 255;

        return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
    }

    private csvEscape(value: string): string {
        var text = value || '';
        if (text.indexOf(',') >= 0 || text.indexOf('"') >= 0 || text.indexOf('\n') >= 0) {
            return '"' + text.replace(/"/g, '""') + '"';
        }
        return text;
    }

    private downloadTextFile(content: string, filename: string, type: string) {
        var blob = new Blob([content], { type: type });
        var url = window.URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }

    private markView() {
        if (this.cd) {
            this.cd.markForCheck();
        }
    }
}
