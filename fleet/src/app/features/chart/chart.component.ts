import { Component, OnDestroy, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, HostListener } from '@angular/core';
import { DatePipe } from '@angular/common';
import type Highcharts from 'highcharts';
import { NewHttpClientService } from '../../shared/services/http-client1.service';
import { Subscription } from 'rxjs';

type ChartDisplayType = 'line' | 'area' | 'step' | 'column';
type ColumnAggregationMode = 'average' | 'last';

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
    chartsVisible: boolean = true;

    displayMode: string = 'all';
    chartType: ChartDisplayType = 'line';
    autoRefresh: boolean = true;
    isRealtimeRange: boolean = false;
    liveClockLabel: string = '';

    activeChartMenu: string | null = null;
    fullscreenTarget: string | null = null;
    private fullscreenFallbackTarget: string | null = null;
    private previousBodyOverflow: string = '';
    private mainChartInstance: Highcharts.Chart | null = null;
    private groupChartInstances: { [key: string]: Highcharts.Chart } = {};

    selectedTags: any[] = [];
    selectedSeries: ChartSeriesItem[] = [];
    selectedEvent: any = null;

    lastStartLabel: string = '';
    lastEndLabel: string = '';
    lastUpdatedLabel: string = '';

    private refreshTimer: ReturnType<typeof setInterval> | null = null;
    private clockTimer: ReturnType<typeof setInterval> | null = null;
    private chartRebuildTimer: ReturnType<typeof setTimeout> | null = null;
    private chartRangeStart = 0;
    private chartRangeEnd = 0;
    private requestSub: Subscription | null = null;
    private requestVersion = 0;
    private themeObserver: MutationObserver | null = null;

    private readonly refreshMs: number = 30000;
    private readonly maxRenderedPoints: number = 1200;
    private readonly maxStepBucketsPerSeries: number = 320;
    private readonly maxColumnTotalBuckets: number = 180;
    private readonly maxColumnBucketsPerSeries: number = 96;
    private readonly minColumnBucketsPerSeries: number = 36;
    private readonly maxDynamicColumnBucketsPerSeries: number = 360;

    private readonly palette: string[] = [
        '#2563eb', '#16a34a', '#f97316', '#8b5cf6', '#ef4444', '#06b6d4',
        '#f59e0b', '#14b8a6', '#ec4899', '#64748b', '#22c55e', '#3b82f6'
    ];

    constructor(
        private datePipe: DatePipe,
        private newHttp: NewHttpClientService,
        private cd: ChangeDetectorRef
    ) { }

    ngOnInit() {
        this.updateLiveClock();
        this.clockTimer = setInterval(() => {
            this.updateLiveClock();
            this.markView();
        }, 1000);

        if (typeof document !== 'undefined' && typeof MutationObserver !== 'undefined') {
            this.themeObserver = new MutationObserver(() => {
                if (this.selectedSeries.length > 0) {
                    this.rebuildCharts();
                    this.markView();
                }
            });

            this.themeObserver.observe(document.documentElement, {
                attributes: true,
                attributeFilter: ['data-theme']
            });
        }
    }

    ngOnDestroy() {
        this.clearRefreshTimer();
        if (this.chartRebuildTimer) {
            clearTimeout(this.chartRebuildTimer);
            this.chartRebuildTimer = null;
        }
        if (this.clockTimer) {
            clearInterval(this.clockTimer);
            this.clockTimer = null;
        }
        if (this.requestSub) {
            this.requestSub.unsubscribe();
        }
        this.requestVersion++;
        this.themeObserver?.disconnect();
        this.themeObserver = null;
        this.mainChartInstance = null;
        this.groupChartInstances = {};
        this.activeChartMenu = null;
        this.clearFullscreenFallback();
        this.fullscreenTarget = null;
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

        this.selectedEvent = {
            ...event,
            tags: (event.tags || []).slice(0, 10)
        };
        this.selectedTags = this.selectedEvent.tags;
        this.errorMessage = '';

        var requestEvent = this.resolveRequestEvent(this.selectedEvent);
        this.isRealtimeRange = !!requestEvent.movingWindow;
        this.chartRangeStart = Number(requestEvent.start) || 0;
        this.chartRangeEnd = Number(requestEvent.end) || 0;

        var start = this.toRequestTime(requestEvent.start);
        var end = this.toRequestTime(requestEvent.end);

        this.lastStartLabel = this.toDisplayTime(requestEvent.start);
        this.lastEndLabel = this.toDisplayTime(requestEvent.end);

        if (!silent) {
            this.autoRefresh = this.isRealtimeRange;
            if (!this.autoRefresh) {
                this.clearRefreshTimer();
            }
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
                this.lastUpdatedLabel = this.toDisplayTimeWithSeconds(new Date());
                this.loading = false;

                if (this.autoRefresh && this.isRealtimeRange) {
                    this.ensureRefreshTimer();
                } else if (!this.autoRefresh) {
                    this.clearRefreshTimer();
                }

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

    setChartType(type: ChartDisplayType) {
        if (this.chartType === type) {
            return;
        }

        this.chartType = type;
        this.recreateChartsForTypeChange();
    }

    /**
     * Highcharts can keep the existing line-series renderer when a chart is
     * updated from Line to Area in place. In that case the button changes but
     * the SVG area path is never created, so Area looks identical to Line.
     *
     * Remove the chart components for one render cycle and create fresh chart
     * instances. This is deterministic for every type transition and avoids
     * stale series graphics, event handlers and clipped SVG paths.
     */
    private recreateChartsForTypeChange(): void {
        if (this.chartRebuildTimer) {
            clearTimeout(this.chartRebuildTimer);
            this.chartRebuildTimer = null;
        }

        this.chartsVisible = false;
        this.mainChartOptions = null;
        this.groupCharts = [];
        this.mainChartInstance = null;
        this.groupChartInstances = {};
        this.markView();

        this.chartRebuildTimer = setTimeout(() => {
            this.chartRebuildTimer = null;
            this.chartsVisible = true;
            this.rebuildCharts();
            this.markView();
        }, 0);
    }

    onMainChartInstance(chart: Highcharts.Chart): void {
        this.mainChartInstance = chart;
        this.enforceAreaRendering(chart);
        if (this.fullscreenTarget === 'main') {
            this.scheduleFullscreenResize('main');
        }
    }

    onGroupChartInstance(key: string, chart: Highcharts.Chart): void {
        if (!key || !chart) {
            return;
        }
        this.groupChartInstances[key] = chart;
        this.enforceAreaRendering(chart);
        if (this.fullscreenTarget === 'group:' + key) {
            this.scheduleFullscreenResize('group:' + key);
        }
    }

    /**
     * Highcharts normally creates the area path from the supplied options. In a
     * long-lived Angular chart, however, an existing Line series can occasionally
     * survive a type switch and keep only its graph path. Apply the Area options
     * once more to the actual chart instance so the SVG fill path is guaranteed
     * to exist in both All Series and Separate Groups modes.
     */
    private enforceAreaRendering(chart: Highcharts.Chart): void {
        if (!chart || this.chartType !== 'area') {
            return;
        }

        var darkTheme = this.isDarkTheme();
        var fillOpacity = darkTheme ? 0.24 : 0.17;
        var changed = false;

        for (var i = 0; i < chart.series.length; i++) {
            var series = chart.series[i] as any;
            var configuredColor = series && series.options ? series.options.color : null;
            var color = typeof configuredColor === 'string' && configuredColor.charAt(0) === '#'
                ? configuredColor
                : this.palette[i % this.palette.length];

            series.update({
                type: 'area',
                color: color,
                fillColor: this.hexToRgba(color, fillOpacity),
                threshold: null,
                softThreshold: false,
                trackByArea: true,
                lineWidth: 1.9,
                step: undefined
            }, false);
            changed = true;
        }

        if (changed) {
            chart.redraw(false);
        }
    }

    toggleChartMenu(target: string, event?: MouseEvent): void {
        event?.stopPropagation();
        this.activeChartMenu = this.activeChartMenu === target ? null : target;
        this.markView();
    }

    @HostListener('document:click')
    closeChartMenus(): void {
        if (this.activeChartMenu !== null) {
            this.activeChartMenu = null;
            this.markView();
        }
    }

    zoomChart(target: string, event?: MouseEvent): void {
        event?.stopPropagation();
        this.activeChartMenu = null;

        var chart = this.getChartInstance(target);
        var axis = chart && chart.xAxis ? chart.xAxis[0] : null;
        if (!chart || !axis) {
            return;
        }

        var extremes = axis.getExtremes();
        var dataMin = Number(extremes.dataMin);
        var dataMax = Number(extremes.dataMax);
        var currentMin = Number(extremes.min);
        var currentMax = Number(extremes.max);

        if (!Number.isFinite(dataMin) || !Number.isFinite(dataMax) || dataMax <= dataMin) {
            return;
        }

        if (!Number.isFinite(currentMin)) {
            currentMin = dataMin;
        }
        if (!Number.isFinite(currentMax)) {
            currentMax = dataMax;
        }

        var currentSpan = Math.max(1, currentMax - currentMin);
        var minimumSpan = Math.max(1000, (dataMax - dataMin) * 0.02);
        var nextSpan = Math.max(minimumSpan, currentSpan * 0.65);
        var centre = currentMin + currentSpan / 2;
        var nextMin = Math.max(dataMin, centre - nextSpan / 2);
        var nextMax = Math.min(dataMax, centre + nextSpan / 2);

        if (nextMax - nextMin < nextSpan) {
            if (nextMin <= dataMin) {
                nextMax = Math.min(dataMax, dataMin + nextSpan);
            } else if (nextMax >= dataMax) {
                nextMin = Math.max(dataMin, dataMax - nextSpan);
            }
        }

        axis.setExtremes(nextMin, nextMax, true, undefined, { trigger: 'fleet-toolbar-zoom' } as any);
    }

    resetChartZoom(target: string, event?: MouseEvent): void {
        event?.stopPropagation();
        this.activeChartMenu = null;

        var chart = this.getChartInstance(target);
        var axis = chart && chart.xAxis ? chart.xAxis[0] : null;
        if (!chart || !axis) {
            return;
        }

        axis.setExtremes(undefined, undefined, true, undefined, { trigger: 'fleet-toolbar-reset' } as any);
        chart.redraw();
        this.markView();
    }

    toggleChartFullscreen(target: string, event?: MouseEvent): void {
        event?.stopPropagation();
        this.activeChartMenu = null;

        var chart = this.getChartInstance(target);
        var card = this.getChartCardElement(target);
        if (!chart || !card || typeof document === 'undefined') {
            return;
        }

        var doc = document as any;
        var nativeFullscreenElement = doc.fullscreenElement || doc.webkitFullscreenElement || null;

        if (nativeFullscreenElement === card) {
            this.exitNativeFullscreen(doc);
            return;
        }

        if (this.fullscreenFallbackTarget === target) {
            this.clearFullscreenFallback();
            this.fullscreenTarget = null;
            this.restoreChartSize(target);
            this.markView();
            return;
        }

        this.clearFullscreenFallback();
        this.fullscreenTarget = target;
        this.markView();

        const fullscreenCard = card;
        var requestFullscreen = (fullscreenCard as any).requestFullscreen || (fullscreenCard as any).webkitRequestFullscreen;
        if (typeof requestFullscreen === 'function') {
            try {
                var requestResult = requestFullscreen.call(fullscreenCard, { navigationUI: 'hide' });
                if (requestResult && typeof requestResult.then === 'function') {
                    requestResult
                        .then(() => this.scheduleFullscreenResize(target))
                        .catch(() => this.enterFullscreenFallback(target, fullscreenCard));
                } else {
                    this.scheduleFullscreenResize(target);
                }
                return;
            } catch (_error) {
                // Continue with the deterministic CSS fallback below.
            }
        }

        this.enterFullscreenFallback(target, fullscreenCard);
    }

    isChartFullscreen(target: string): boolean {
        return this.fullscreenTarget === target;
    }

    @HostListener('document:fullscreenchange')
    @HostListener('document:webkitfullscreenchange')
    onChartFullscreenChange(): void {
        if (typeof document === 'undefined') {
            return;
        }

        var doc = document as any;
        var element = (doc.fullscreenElement || doc.webkitFullscreenElement || null) as HTMLElement | null;
        if (!element) {
            var previousTarget = this.fullscreenTarget;
            this.fullscreenTarget = this.fullscreenFallbackTarget;
            if (!this.fullscreenFallbackTarget && previousTarget) {
                this.restoreChartSize(previousTarget);
            }
            this.markView();
            return;
        }

        var target = element.getAttribute('data-chart-target');
        if (target) {
            this.fullscreenTarget = target;
            this.scheduleFullscreenResize(target);
            this.markView();
        }
    }

    @HostListener('window:resize')
    onChartViewportResize(): void {
        if (this.fullscreenTarget) {
            this.scheduleFullscreenResize(this.fullscreenTarget);
        }
    }

    private getChartCardElement(target: string): HTMLElement | null {
        if (typeof document === 'undefined') {
            return null;
        }

        var cards = document.querySelectorAll<HTMLElement>('[data-chart-target]');
        for (var i = 0; i < cards.length; i++) {
            if (cards[i].getAttribute('data-chart-target') === target) {
                return cards[i];
            }
        }

        return null;
    }

    private enterFullscreenFallback(target: string, card: HTMLElement): void {
        this.clearFullscreenFallback();
        this.fullscreenTarget = target;
        this.fullscreenFallbackTarget = target;
        card.classList.add('chart-card--fullscreen-fallback');

        if (typeof document !== 'undefined' && document.body) {
            this.previousBodyOverflow = document.body.style.overflow || '';
            document.body.style.overflow = 'hidden';
        }

        this.scheduleFullscreenResize(target);
        this.markView();
    }

    private clearFullscreenFallback(): void {
        if (typeof document !== 'undefined') {
            var activeCard = document.querySelector<HTMLElement>('.chart-card--fullscreen-fallback');
            activeCard?.classList.remove('chart-card--fullscreen-fallback');
            if (document.body) {
                document.body.style.overflow = this.previousBodyOverflow;
            }
        }

        this.fullscreenFallbackTarget = null;
        this.previousBodyOverflow = '';
    }

    private exitNativeFullscreen(doc: any): void {
        var exitFullscreen = doc.exitFullscreen || doc.webkitExitFullscreen;
        if (typeof exitFullscreen !== 'function') {
            return;
        }

        var result = exitFullscreen.call(doc);
        if (result && typeof result.catch === 'function') {
            result.catch(() => undefined);
        }
    }

    private scheduleFullscreenResize(target: string): void {
        var delays = [0, 80, 220, 500];
        for (var i = 0; i < delays.length; i++) {
            setTimeout(() => this.resizeChartForFullscreen(target), delays[i]);
        }
    }

    private resizeChartForFullscreen(target: string): void {
        if (this.fullscreenTarget !== target) {
            return;
        }

        var chart = this.getChartInstance(target);
        var card = this.getChartCardElement(target);
        if (!chart || !card) {
            return;
        }

        var header = card.querySelector<HTMLElement>('.chart-card-head');
        var headerHeight = header ? header.getBoundingClientRect().height : 64;
        var cardHeight = Math.max(card.clientHeight, typeof window !== 'undefined' ? window.innerHeight : 720);
        var chartHeight = Math.max(360, Math.floor(cardHeight - headerHeight - 10));

        chart.setSize(null, chartHeight, false);
        chart.reflow();
    }

    private restoreChartSize(target: string): void {
        var chart = this.getChartInstance(target);
        if (!chart) {
            return;
        }

        var normalHeight = target === 'main' ? 550 : 300;
        const activeChart = chart;
        activeChart.setSize(null, normalHeight, false);
        setTimeout(() => activeChart.reflow(), 80);
    }

    downloadChartPng(target: string, event?: MouseEvent): void {
        event?.stopPropagation();
        this.activeChartMenu = null;

        var chart = this.getChartInstance(target) as any;
        if (!chart) {
            return;
        }

        var suffix = this.datePipe.transform(new Date(), 'yyyyMMdd-HHmmss') || 'chart';
        var isGroupChart = target.indexOf('group:') === 0;
        var groupSuffix = isGroupChart ? '-' + target.substring(6) : '';

        // Export every chart as a wide 2:1 landscape image. Highcharts normally
        // uses the on-screen chart size (600 x 550 for All Lines), which creates
        // an almost portrait PNG. An explicit source size keeps All Lines and
        // Separate Groups consistent, wide and presentation-ready.
        var sourceWidth = 1800;
        var sourceHeight = 900;
        var exportOptions = {
            type: 'image/png',
            filename: 'fleet-chart' + groupSuffix + '-' + suffix,
            sourceWidth: sourceWidth,
            sourceHeight: sourceHeight,
            scale: 1,
            fallbackToExportServer: false
        };

        var exportChartOptions: Highcharts.Options = {
            chart: {
                width: sourceWidth,
                height: sourceHeight
            },
            legend: {
                enabled: true,
                align: 'center',
                verticalAlign: 'top',
                layout: 'horizontal',
                itemDistance: 24,
                itemMarginBottom: 8,
                itemStyle: {
                    fontSize: isGroupChart ? '14px' : '13px',
                    fontWeight: '700'
                }
            }
        };

        if (typeof chart.exportChartLocal === 'function') {
            chart.exportChartLocal(exportOptions, exportChartOptions);
        } else if (typeof chart.exportChart === 'function') {
            chart.exportChart(exportOptions, exportChartOptions);
        }
    }

    private getChartInstance(target: string): Highcharts.Chart | null {
        if (target === 'main') {
            return this.mainChartInstance;
        }

        if (target && target.indexOf('group:') === 0) {
            return this.groupChartInstances[target.substring(6)] || null;
        }

        return null;
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
        this.mainChartInstance = null;
        this.groupChartInstances = {};
        this.activeChartMenu = null;
        this.errorMessage = '';
        this.lastStartLabel = '';
        this.lastEndLabel = '';
        this.lastUpdatedLabel = '';
        this.isRealtimeRange = false;
        this.chartRangeStart = 0;
        this.chartRangeEnd = 0;
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
        return this.displayMode === 'groups' ? 'Separate Groups' : 'All Series';
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
        if (!this.selectedSeries || this.selectedSeries.length === 0) {
            this.mainChartOptions = null;
            this.groupCharts = [];
            return;
        }

        // Update the existing tracked chart cards in place. Keeping the card
        // element stable prevents the browser from leaving Fullscreen whenever
        // Auto Refresh replaces the Highcharts options/data.
        this.mainChartOptions = this.createChartOptions('All Selected Parameters', this.selectedSeries, 550);
        this.groupCharts = this.createGroupedCharts(this.selectedSeries);

        if (this.fullscreenTarget) {
            this.scheduleFullscreenResize(this.fullscreenTarget);
        }
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
                chartOptions: this.createChartOptions(groupName, groupSeries, 300),
                seriesNames: groupSeries.map((x: ChartSeriesItem) => x.label)
            });
        }

        return result;
    }

    private createChartOptions(title: string, seriesItems: ChartSeriesItem[], height: number): Highcharts.Options {
        var highSeries: any[] = [];
        var darkTheme = this.isDarkTheme();
        var chartBackground = darkTheme ? '#070b12' : '#ffffff';
        var axisColor = darkTheme ? '#334155' : '#cbd5e1';
        var gridColor = darkTheme ? '#1f2937' : '#e5e7eb';
        var mutedText = darkTheme ? '#a7b4c7' : '#475569';
        var primaryText = darkTheme ? '#f8fafc' : '#0f172a';
        var tooltipBackground = darkTheme ? '#0d1420' : '#ffffff';
        var tooltipBorder = darkTheme ? '#475569' : '#bfdbfe';
        // Keep the hover card compact so it does not cover the chart. When
        // many tags are selected, only the value list scrolls internally.
        var tooltipMaxHeight = Math.max(
            132,
            Math.min(182, (typeof window !== 'undefined' ? window.innerHeight : 900) - 230)
        );
        var escapeTooltipHtml = function (value: any): string {
            return String(value == null ? '' : value)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        };
        var axisLayout = this.createReadableAxisLayout(seriesItems, mutedText, gridColor, axisColor);
        var tickInterval = this.getReadableTimeTickInterval();
        var highchartsType = this.getHighchartsSeriesType();
        var isAreaChart = this.chartType === 'area';
        var isStepChart = this.chartType === 'step';
        var isColumnChart = this.chartType === 'column';
        var fullRangeMs = this.getSeriesCollectionRangeMs(seriesItems);
        var columnBucketMs = isColumnChart
            ? this.getColumnBucketInterval(fullRangeMs, seriesItems.length)
            : undefined;
        var stepBucketMs = isStepChart
            ? this.getStepBucketInterval(fullRangeMs)
            : undefined;

        if (isColumnChart) {
            this.applyColumnAxisBaseline(axisLayout, seriesItems);
        }

        for (var i = 0; i < seriesItems.length; i++) {
            var item = seriesItems[i];
            var chartData = this.getChartData(item, seriesItems.length, columnBucketMs, stepBucketMs);
            highSeries.push({
                type: highchartsType,
                name: item.label + (item.unit ? ' (' + item.unit + ')' : ''),
                data: chartData,
                color: item.color,
                yAxis: axisLayout.seriesAxis[i],
                // Area uses a translucent fill, Step preserves each value until the
                // next sample, and Column renders discrete historian samples.
                step: isStepChart ? 'left' : undefined,
                // Use a solid RGBA fill instead of an SVG gradient. This matches
                // the proven Area rendering used by the original chart and avoids
                // browsers retaining only the line path after a runtime type switch.
                fillColor: isAreaChart
                    ? this.hexToRgba(item.color, darkTheme ? 0.24 : 0.17)
                    : undefined,
                lineWidth: isColumnChart ? undefined : (isAreaChart ? 1.9 : 1.9),
                trackByArea: isAreaChart ? true : undefined,
                pointRange: isColumnChart && columnBucketMs ? columnBucketMs * 0.82 : undefined,
                // Every Column series uses the same visual zero baseline. This keeps
                // columns with very different units/scales anchored to the bottom of
                // the plot instead of floating around an automatically selected axis
                // threshold when historian data contains negative/outlier values.
                threshold: isAreaChart ? null : (isColumnChart ? 0 : undefined),
                softThreshold: (isAreaChart || isColumnChart) ? false : undefined,
                borderColor: isColumnChart ? this.hexToRgba(item.color, 0.9) : undefined,
                borderWidth: isColumnChart ? 0 : undefined,
                turboThreshold: 5000,
                connectNulls: false,
                marker: isColumnChart ? undefined : {
                    enabled: false,
                    symbol: 'circle',
                    radius: 2.5,
                    states: { hover: { enabled: true, radius: 4.5 } }
                }
            });
        }

        var options: any = {
            time: { useUTC: false },
            credits: { enabled: false },
            exporting: { enabled: false, fallbackToExportServer: false },
            chart: {
                type: highchartsType,
                height: height,
                zoomType: 'x',
                panning: { enabled: true, type: 'x' },
                panKey: 'shift',
                backgroundColor: chartBackground,
                alignTicks: false,
                spacingTop: 10,
                spacingRight: 20 + axisLayout.rightOffset,
                spacingBottom: 10,
                spacingLeft: 12 + axisLayout.leftOffset
            },
            title: { text: null },
            subtitle: { text: null },
            xAxis: {
                type: 'datetime',
                min: this.chartRangeStart || undefined,
                max: this.chartRangeEnd || undefined,
                lineColor: axisColor,
                tickColor: axisColor,
                tickInterval: tickInterval,
                tickPixelInterval: 115,
                gridLineWidth: 0,
                minorGridLineWidth: 0,
                dateTimeLabelFormats: {
                    millisecond: '%H:%M:%S',
                    second: '%H:%M:%S',
                    minute: '%H:%M',
                    hour: '%H:%M',
                    day: '%e %b',
                    week: '%e %b',
                    month: '%b %Y',
                    year: '%Y'
                },
                crosshair: {
                    width: 1,
                    color: darkTheme ? '#64748b' : '#94a3b8',
                    dashStyle: 'ShortDash'
                },
                labels: {
                    autoRotation: [-35],
                    style: { color: mutedText, fontSize: '11px', fontWeight: '600' },
                    formatter: function (this: any) {
                        var date = new Date(Number(this.value));
                        var hh = String(date.getHours()).padStart(2, '0');
                        var mm = String(date.getMinutes()).padStart(2, '0');
                        if (date.getHours() === 0 && date.getMinutes() === 0) {
                            return date.getDate() + ' ' + date.toLocaleString('en-US', { month: 'short' });
                        }
                        return hh + ':' + mm;
                    }
                },
                events: {
                    afterSetExtremes: (event: any) => {
                        var chart = event && event.target ? event.target.chart as Highcharts.Chart : null;
                        var min = Number(event && event.min);
                        var max = Number(event && event.max);
                        if (chart && Number.isFinite(min) && Number.isFinite(max) && max > min) {
                            this.refreshVisibleChartDensity(chart, seriesItems, min, max);
                        }
                    }
                },
                plotLines: this.isRealtimeRange && this.chartRangeEnd
                    ? [{
                        value: this.chartRangeEnd,
                        color: '#22c55e',
                        width: 1,
                        dashStyle: 'ShortDash',
                        zIndex: 4,
                        label: {
                            text: 'LIVE',
                            rotation: 0,
                            align: 'right',
                            x: -5,
                            y: 12,
                            style: { color: '#16a34a', fontSize: '10px', fontWeight: '800' }
                        }
                    }]
                    : []
            },
            yAxis: axisLayout.axes,
            legend: {
                enabled: true,
                align: 'center',
                verticalAlign: 'top',
                layout: 'horizontal',
                symbolWidth: 24,
                itemDistance: 18,
                itemMarginBottom: 5,
                itemStyle: {
                    color: primaryText,
                    fontWeight: '700',
                    fontSize: '11px',
                    textOverflow: 'ellipsis'
                },
                itemHoverStyle: { color: '#2563eb' }
            },
            tooltip: {
                shared: true,
                split: false,
                useHTML: true,
                outside: true,
                stickOnContact: true,
                hideDelay: 550,
                className: 'fleet-chart-tooltip',
                backgroundColor: tooltipBackground,
                borderColor: tooltipBorder,
                borderRadius: 10,
                borderWidth: 1,
                padding: 8,
                shadow: true,
                style: {
                    color: primaryText,
                    fontSize: '11px',
                    pointerEvents: 'auto'
                },
                positioner: function (this: any, labelWidth: number, labelHeight: number, point: any) {
                    var chart = this.chart;
                    var chartPosition = chart.pointer && chart.pointer.getChartPosition
                        ? chart.pointer.getChartPosition()
                        : { left: 0, top: 0 };
                    var viewportWidth = typeof document !== 'undefined'
                        ? document.documentElement.clientWidth
                        : chart.chartWidth;
                    var viewportHeight = typeof window !== 'undefined'
                        ? window.innerHeight
                        : chart.chartHeight;
                    var anchorX = Number(point && point.plotX) || 0;
                    var anchorY = Number(point && point.plotY) || 0;
                    var chartX = anchorX + chart.plotLeft;
                    var chartY = anchorY + chart.plotTop;
                    var minimumX = 12 - chartPosition.left;
                    var maximumX = viewportWidth - chartPosition.left - labelWidth - 12;
                    var minimumY = 12 - chartPosition.top;
                    var maximumY = viewportHeight - chartPosition.top - labelHeight - 12;
                    var rightX = chartX + 18;
                    var leftX = chartX - labelWidth - 18;
                    var x = rightX <= maximumX ? rightX : leftX;
                    var aboveY = chartY - labelHeight - 18;
                    var belowY = chartY + 18;
                    var y = aboveY >= minimumY ? aboveY : belowY;

                    x = Math.max(minimumX, Math.min(x, Math.max(minimumX, maximumX)));
                    y = Math.max(minimumY, Math.min(y, Math.max(minimumY, maximumY)));
                    return { x: x, y: y };
                },
                formatter: function (this: any) {
                    var date = new Date(Number(this.x));
                    var timestamp = date.toLocaleString('en-GB', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
                    });
                    var points = this.points || [];
                    var rows = points.map((point: any) => {
                        var rawName = String(point.series.name || '');
                        var unitMatch = rawName.match(/\(([^()]*)\)\s*$/);
                        var unit = unitMatch ? unitMatch[1] : '';
                        var value = Number(point.y);
                        var decimals = Math.abs(value) >= 100 ? 0 : Math.abs(value) >= 10 ? 1 : 2;
                        var formatted = Number.isFinite(value)
                            ? value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: decimals })
                            : '-';
                        var label = rawName.replace(/\s*\([^()]*\)\s*$/, '');
                        return '<div class="fleet-tooltip-row">' +
                            '<span class="fleet-tooltip-dot" style="background:' + escapeTooltipHtml(point.color) + '"></span>' +
                            '<span class="fleet-tooltip-name">' + escapeTooltipHtml(label) + '</span>' +
                            '<strong class="fleet-tooltip-value">' + escapeTooltipHtml(formatted + (unit ? ' ' + unit : '')) + '</strong>' +
                            '</div>';
                    }).join('');
                    return '<div class="fleet-tooltip-card" style="--fleet-tooltip-max-height:' + tooltipMaxHeight + 'px;color:' + primaryText + '">' +
                        '<div class="fleet-tooltip-time">' + escapeTooltipHtml(timestamp) + '</div>' +
                        '<div class="fleet-tooltip-scroll">' + rows + '</div></div>';
                }
            },
            plotOptions: {
                series: {
                    animation: false,
                    states: {
                        hover: { lineWidthPlus: 0.8, halo: { size: 5 } },
                        inactive: { opacity: 0.16 }
                    }
                },
                line: {
                    linecap: 'round'
                },
                area: {
                    // null fills from each line to its own Y-axis minimum, which is
                    // visually the bottom edge of the shared plotting area.
                    threshold: null,
                    softThreshold: false,
                    fillOpacity: darkTheme ? 0.24 : 0.17,
                    lineWidth: 1.9,
                    trackByArea: true,
                    states: {
                        hover: { lineWidthPlus: 0.7 },
                        inactive: { opacity: 0.32 }
                    }
                },
                column: {
                    grouping: true,
                    threshold: 0,
                    softThreshold: false,
                    groupPadding: seriesItems.length > 6 ? 0.08 : 0.14,
                    pointPadding: seriesItems.length > 6 ? 0.015 : 0.035,
                    maxPointWidth: seriesItems.length > 4 ? 14 : 24,
                    minPointLength: 1,
                    borderWidth: 0,
                    borderRadius: 2,
                    shadow: false
                }
            },
            series: highSeries
        };

        return options as Highcharts.Options;
    }

    private getHighchartsSeriesType(): 'line' | 'area' | 'column' {
        if (this.chartType === 'area') {
            return 'area';
        }

        if (this.chartType === 'column') {
            return 'column';
        }

        // Step Chart is a Highcharts line series with step interpolation.
        return 'line';
    }

    private getChartData(
        item: ChartSeriesItem,
        seriesCount: number,
        columnBucketMs?: number,
        stepBucketMs?: number
    ): any[] {
        if (this.chartType === 'column') {
            var columnInterval = columnBucketMs || this.getColumnBucketInterval(
                this.getPointsRangeMs(item.rawData),
                seriesCount
            );
            return this.aggregateColumnBuckets(
                item.rawData,
                columnInterval,
                this.getColumnAggregationMode(item)
            );
        }

        if (this.chartType === 'step') {
            var stepInterval = stepBucketMs || this.getStepBucketInterval(this.getPointsRangeMs(item.rawData));
            return this.sampleStepBuckets(item.rawData, stepInterval);
        }

        return item.data;
    }

    /**
     * Uses the visible time span to select a finer resolution after zooming.
     * The complete requested range remains in every series, so reset zoom and
     * panning continue to work without downloading historian data again.
     */
    private refreshVisibleChartDensity(
        chart: Highcharts.Chart,
        seriesItems: ChartSeriesItem[],
        min: number,
        max: number
    ): void {
        if (this.chartType !== 'column' && this.chartType !== 'step') {
            return;
        }

        var chartState = chart as any;
        if (chartState.__fleetDensityUpdating) {
            return;
        }

        var visibleRangeMs = Math.max(1, max - min);
        var fullRangeMs = this.getSeriesCollectionRangeMs(seriesItems);
        var requestedInterval = this.chartType === 'column'
            ? this.getColumnBucketInterval(visibleRangeMs, seriesItems.length)
            : this.getStepBucketInterval(visibleRangeMs);
        var safeFullRangeInterval = this.chartType === 'column'
            ? this.getNiceTimeInterval(fullRangeMs / this.maxDynamicColumnBucketsPerSeries)
            : this.getNiceTimeInterval(fullRangeMs / this.maxRenderedPoints);
        var intervalMs = Math.max(requestedInterval, safeFullRangeInterval);
        var densityKey = this.chartType + ':' + intervalMs;

        if (chartState.__fleetDensityKey === densityKey) {
            return;
        }

        chartState.__fleetDensityUpdating = true;
        chartState.__fleetDensityKey = densityKey;

        try {
            for (var i = 0; i < seriesItems.length && i < chart.series.length; i++) {
                var source = seriesItems[i].rawData;
                var nextData = this.chartType === 'column'
                    ? this.aggregateColumnBuckets(source, intervalMs, this.getColumnAggregationMode(seriesItems[i]))
                    : this.sampleStepBuckets(source, intervalMs);
                var chartSeries = chart.series[i] as any;

                if (this.chartType === 'column') {
                    chartSeries.update({ pointRange: intervalMs * 0.82 }, false);
                }
                chartSeries.setData(nextData, false, false, false);
            }

            chart.redraw(false);
        } finally {
            chartState.__fleetDensityUpdating = false;
        }
    }

    private aggregateColumnBuckets(
        points: ChartPoint[],
        bucketMs: number,
        mode: ColumnAggregationMode
    ): any[] {
        if (!points || points.length === 0) {
            return [];
        }

        var safeBucketMs = Math.max(1, bucketMs);
        var origin = this.getBucketOrigin(safeBucketMs, points);
        var buckets: { [key: string]: { sum: number; count: number; lastY: number } } = {};
        var order: number[] = [];

        for (var i = 0; i < points.length; i++) {
            var point = points[i];
            var bucketIndex = Math.floor((point.x - origin) / safeBucketMs);
            var key = String(bucketIndex);

            if (!buckets[key]) {
                buckets[key] = { sum: 0, count: 0, lastY: point.y };
                order.push(bucketIndex);
            }

            buckets[key].sum += point.y;
            buckets[key].count++;
            buckets[key].lastY = point.y;
        }

        order.sort((a: number, b: number) => a - b);
        return order.map((bucketIndex: number) => {
            var bucket = buckets[String(bucketIndex)];
            var x = origin + (bucketIndex * safeBucketMs) + (safeBucketMs / 2);
            var y = mode === 'last' ? bucket.lastY : bucket.sum / Math.max(1, bucket.count);
            return [x, y];
        });
    }

    private sampleStepBuckets(points: ChartPoint[], bucketMs: number): any[] {
        if (!points || points.length === 0) {
            return [];
        }

        if (points.length <= this.maxStepBucketsPerSeries) {
            return points.map((point: ChartPoint) => [point.x, point.y]);
        }

        var safeBucketMs = Math.max(1, bucketMs);
        var origin = this.getBucketOrigin(safeBucketMs, points);
        var latestByBucket: { [key: string]: ChartPoint } = {};
        var order: number[] = [];

        for (var i = 0; i < points.length; i++) {
            var point = points[i];
            var bucketIndex = Math.floor((point.x - origin) / safeBucketMs);
            var key = String(bucketIndex);
            if (!latestByBucket[key]) {
                order.push(bucketIndex);
            }
            latestByBucket[key] = point;
        }

        order.sort((a: number, b: number) => a - b);
        var sampled: ChartPoint[] = [];
        var first = points[0];
        sampled.push(first);

        for (var o = 0; o < order.length; o++) {
            var candidate = latestByBucket[String(order[o])];
            var previous = sampled[sampled.length - 1];
            if (!previous || previous.x !== candidate.x) {
                sampled.push(candidate);
            }
        }

        var last = points[points.length - 1];
        if (sampled[sampled.length - 1].x !== last.x) {
            sampled.push(last);
        }

        return sampled.map((point: ChartPoint) => [point.x, point.y]);
    }

    private getColumnAggregationMode(item: ChartSeriesItem): ColumnAggregationMode {
        var normalized = this.normalizeTagName(item.name + ' ' + item.label);

        // Cumulative counters must show the latest value in each interval. Instantaneous
        // sensors and rates are represented by their interval average to reduce noise.
        if (
            normalized.indexOf('TOTAL') >= 0 ||
            normalized.indexOf('TODAY') >= 0 ||
            normalized.indexOf('COUNTER') >= 0 ||
            normalized.indexOf('ACCUM') >= 0 ||
            normalized.indexOf('METER') >= 0
        ) {
            return 'last';
        }

        return 'average';
    }

    private getColumnBucketInterval(rangeMs: number, seriesCount: number): number {
        var safeSeriesCount = Math.max(1, seriesCount);
        var targetPerSeries = Math.floor(this.maxColumnTotalBuckets / safeSeriesCount);
        targetPerSeries = Math.max(
            this.minColumnBucketsPerSeries,
            Math.min(this.maxColumnBucketsPerSeries, targetPerSeries)
        );
        return this.getNiceTimeInterval(Math.max(1, rangeMs) / targetPerSeries);
    }

    private getStepBucketInterval(rangeMs: number): number {
        return this.getNiceTimeInterval(
            Math.max(1, rangeMs) / this.maxStepBucketsPerSeries
        );
    }

    private getNiceTimeInterval(rawMs: number): number {
        var intervals = [
            250, 500,
            1000, 2000, 5000, 10000, 15000, 30000,
            60000, 120000, 300000, 600000, 900000, 1800000,
            3600000, 7200000, 10800000, 21600000, 43200000, 86400000
        ];

        for (var i = 0; i < intervals.length; i++) {
            if (intervals[i] >= rawMs) {
                return intervals[i];
            }
        }

        var dayMs = 86400000;
        return Math.ceil(rawMs / dayMs) * dayMs;
    }

    private getSeriesCollectionRangeMs(seriesItems: ChartSeriesItem[]): number {
        if (this.chartRangeEnd > this.chartRangeStart) {
            return this.chartRangeEnd - this.chartRangeStart;
        }

        var min = Number.POSITIVE_INFINITY;
        var max = Number.NEGATIVE_INFINITY;

        for (var i = 0; i < seriesItems.length; i++) {
            var points = seriesItems[i].rawData || [];
            if (points.length === 0) {
                continue;
            }
            min = Math.min(min, points[0].x);
            max = Math.max(max, points[points.length - 1].x);
        }

        return Number.isFinite(min) && Number.isFinite(max) && max > min ? max - min : 1;
    }

    private getPointsRangeMs(points: ChartPoint[]): number {
        if (!points || points.length < 2) {
            return 1;
        }
        return Math.max(1, points[points.length - 1].x - points[0].x);
    }

    private getBucketOrigin(bucketMs: number, points: ChartPoint[]): number {
        var start = this.chartRangeEnd > this.chartRangeStart
            ? this.chartRangeStart
            : points[0].x;
        return Math.floor(start / bucketMs) * bucketMs;
    }

    getMainChartDescription(): string {
        if (!this.selectedSeries || this.selectedSeries.length === 0) {
            return 'Combined trend view with every selected tag in one chart.';
        }

        var rangeMs = this.getSeriesCollectionRangeMs(this.selectedSeries);
        if (this.chartType === 'column') {
            var columnInterval = this.getColumnBucketInterval(rangeMs, this.selectedSeries.length);
            return 'Auto-grouped into ' + this.formatDurationLabel(columnInterval) +
                ' intervals with every axis anchored at zero. Rates use averages; counters use the latest value. Zoom for finer detail.';
        }

        if (this.chartType === 'step') {
            var stepInterval = this.getStepBucketInterval(rangeMs);
            return 'Step density is optimized at about ' + this.formatDurationLabel(stepInterval) +
                ' per sample. Zoom automatically reveals finer detail.';
        }

        if (this.chartType === 'area') {
            return 'Translucent fills extend from every trend line to the bottom of its Y-axis, matching the original Area view.';
        }

        return 'Combined trend view with every selected tag in one chart.';
    }

    private formatDurationLabel(milliseconds: number): string {
        if (milliseconds < 1000) {
            return milliseconds + ' ms';
        }
        if (milliseconds < 60000) {
            return Math.round(milliseconds / 1000) + ' sec';
        }
        if (milliseconds < 3600000) {
            return Math.round(milliseconds / 60000) + ' min';
        }
        if (milliseconds < 86400000) {
            return Math.round((milliseconds / 3600000) * 10) / 10 + ' hr';
        }
        return Math.round((milliseconds / 86400000) * 10) / 10 + ' day';
    }

    private applyColumnAxisBaseline(
        axisLayout: { axes: any[]; seriesAxis: number[] },
        seriesItems: ChartSeriesItem[]
    ): void {
        // Column comparison is easiest to read when every independent Y axis starts
        // at the same visual origin. Use an exact zero floor for every populated
        // axis, even when raw historian data contains a negative spike/outlier.
        // This rule is intentionally limited to Column Chart; Line, Area and Step
        // continue to show their complete positive/negative ranges.
        var populatedAxes: boolean[] = axisLayout.axes.map(() => false);

        for (var i = 0; i < seriesItems.length; i++) {
            var axisIndex = axisLayout.seriesAxis[i] ?? 0;
            if (axisIndex >= 0 && axisIndex < populatedAxes.length) {
                populatedAxes[axisIndex] = true;
            }
        }

        for (var axis = 0; axis < axisLayout.axes.length; axis++) {
            if (!populatedAxes[axis]) {
                continue;
            }

            var options = axisLayout.axes[axis];
            options.min = 0;
            options.softMin = 0;
            options.floor = 0;
            options.minPadding = 0;
            options.startOnTick = true;
            options.endOnTick = true;
            options.softThreshold = false;

            // Remove a negative range hint calculated for Line/Area/Step axes. The
            // upper bound remains automatic so each parameter keeps its own useful
            // scale while all zero labels line up along the bottom edge.
            if (typeof options.softMax === 'number' && options.softMax < 0) {
                delete options.softMax;
            }
        }
    }

    private createReadableAxisLayout(
        seriesItems: ChartSeriesItem[],
        mutedText: string,
        gridColor: string,
        axisColor: string
    ): { axes: any[]; seriesAxis: number[]; leftOffset: number; rightOffset: number } {
        // With four parameters or fewer, each line receives its own axis. This keeps
        // counters, rates and totals readable even when their numeric ranges differ.
        if (seriesItems.length <= 4) {
            var dedicatedAxes: any[] = [];
            var dedicatedMap: number[] = [];
            var leftCount = 0;
            var rightCount = 0;
            var compactFormatter = (value: number) => this.formatCompactNumber(value);

            for (var i = 0; i < seriesItems.length; i++) {
                var item = seriesItems[i];
                var opposite = i % 2 === 1;
                var sideIndex = opposite ? rightCount++ : leftCount++;
                var stats = this.getSeriesRange(item.rawData);

                dedicatedMap[i] = i;
                dedicatedAxes.push({
                    title: {
                        text: item.unit || null,
                        margin: 8,
                        style: { color: item.color, fontSize: '10px', fontWeight: '800' }
                    },
                    opposite: opposite,
                    offset: sideIndex * 54,
                    lineWidth: 1,
                    lineColor: item.color || axisColor,
                    tickColor: item.color || axisColor,
                    tickWidth: 1,
                    tickLength: 4,
                    gridLineColor: i === 0 ? gridColor : 'transparent',
                    gridLineWidth: i === 0 ? 1 : 0,
                    minorGridLineWidth: 0,
                    labels: {
                        x: opposite ? 6 : -6,
                        reserveSpace: true,
                        style: { color: item.color || mutedText, fontSize: '11px', fontWeight: '700' },
                        formatter: function (this: any) { return compactFormatter(Number(this.value)); }
                    },
                    minPadding: 0.08,
                    maxPadding: 0.12,
                    softMin: stats.softMin,
                    softMax: stats.softMax,
                    tickAmount: 6,
                    startOnTick: true,
                    endOnTick: true,
                    softThreshold: false,
                    showEmpty: false
                });
            }

            return {
                axes: dedicatedAxes,
                seriesAxis: dedicatedMap,
                leftOffset: Math.max(0, leftCount - 1) * 54,
                rightOffset: Math.max(0, rightCount - 1) * 54
            };
        }

        // For larger selections, group compatible units/scales so the chart does not
        // create too many axes around the plotting area.
        var groups: Array<{ unit: string; bucket: number; color: string; series: number[] }> = [];
        var seriesAxis: number[] = [];

        for (var s = 0; s < seriesItems.length; s++) {
            var seriesItem = seriesItems[s];
            var scale = this.getSeriesScale(seriesItem.rawData);
            var unit = seriesItem.unit || 'value';
            var bestIndex = -1;
            var bestDistance = Number.POSITIVE_INFINITY;

            for (var g = 0; g < groups.length; g++) {
                var distance = Math.abs(groups[g].bucket - scale);
                if (groups[g].unit === unit && distance <= 1 && distance < bestDistance) {
                    bestIndex = g;
                    bestDistance = distance;
                }
            }

            if (bestIndex < 0 && groups.length < 4) {
                bestIndex = groups.length;
                groups.push({ unit: unit, bucket: scale, color: seriesItem.color, series: [] });
            }

            if (bestIndex < 0) {
                for (var fallback = 0; fallback < groups.length; fallback++) {
                    var fallbackDistance = Math.abs(groups[fallback].bucket - scale) +
                        (groups[fallback].unit === unit ? 0 : 3);
                    if (fallbackDistance < bestDistance) {
                        bestIndex = fallback;
                        bestDistance = fallbackDistance;
                    }
                }
            }

            groups[bestIndex].series.push(s);
            seriesAxis[s] = bestIndex;
        }

        var formatAxisValue = (value: number) => this.formatCompactNumber(value);
        var axes = groups.map((group, index) => {
            var opposite = index % 2 === 1;
            var sidePosition = Math.floor(index / 2);
            return {
                title: {
                    text: group.unit === 'value' ? null : group.unit,
                    style: { color: group.color, fontSize: '10px', fontWeight: '800' }
                },
                opposite: opposite,
                offset: sidePosition * 54,
                lineWidth: 1,
                lineColor: group.color || axisColor,
                tickColor: group.color || axisColor,
                gridLineColor: index === 0 ? gridColor : 'transparent',
                gridLineWidth: index === 0 ? 1 : 0,
                minorGridLineWidth: 0,
                labels: {
                    x: opposite ? 6 : -6,
                    style: { color: group.color || mutedText, fontSize: '11px', fontWeight: '700' },
                    formatter: function (this: any) { return formatAxisValue(Number(this.value)); }
                },
                minPadding: 0.08,
                maxPadding: 0.12,
                tickAmount: 6,
                startOnTick: true,
                endOnTick: true,
                softThreshold: false,
                showEmpty: false
            };
        });

        var leftAxes = groups.filter((_, index) => index % 2 === 0).length;
        var rightAxes = groups.filter((_, index) => index % 2 === 1).length;
        return {
            axes: axes.length > 0 ? axes : [{ title: { text: null }, gridLineColor: gridColor }],
            seriesAxis: seriesAxis,
            leftOffset: Math.max(0, leftAxes - 1) * 54,
            rightOffset: Math.max(0, rightAxes - 1) * 54
        };
    }

    private getSeriesRange(points: ChartPoint[]): { softMin?: number; softMax?: number } {
        if (!points || points.length === 0) {
            return {};
        }

        var min = Number.POSITIVE_INFINITY;
        var max = Number.NEGATIVE_INFINITY;

        for (var i = 0; i < points.length; i++) {
            var value = Number(points[i].y);
            if (!Number.isFinite(value)) {
                continue;
            }
            min = Math.min(min, value);
            max = Math.max(max, value);
        }

        if (!Number.isFinite(min) || !Number.isFinite(max)) {
            return {};
        }

        var span = Math.max(Math.abs(max - min), Math.max(Math.abs(max), Math.abs(min), 1) * 0.08);
        var pad = span * 0.08;
        var softMin = min - pad;
        var softMax = max + pad;

        if (min >= 0 && softMin < 0 && min <= span * 0.15) {
            softMin = 0;
        }

        return { softMin: softMin, softMax: softMax };
    }

    private getReadableTimeTickInterval(): number | undefined {
        var duration = Math.max(0, this.chartRangeEnd - this.chartRangeStart);
        var minute = 60 * 1000;
        var hour = 60 * minute;
        var day = 24 * hour;

        if (!duration) { return undefined; }
        if (duration <= 2 * hour) { return 15 * minute; }
        if (duration <= 6 * hour) { return 30 * minute; }
        if (duration <= 24 * hour) { return 2 * hour; }
        if (duration <= 3 * day) { return 6 * hour; }
        if (duration <= 7 * day) { return 12 * hour; }
        if (duration <= 31 * day) { return day; }
        return 7 * day;
    }

    private getSeriesScale(points: ChartPoint[]): number {
        var max = 0;
        for (var i = 0; i < points.length; i++) {
            max = Math.max(max, Math.abs(Number(points[i].y) || 0));
        }
        return max > 0 ? Math.floor(Math.log(max) / Math.LN10) : 0;
    }

    private formatCompactNumber(value: number): string {
        if (!Number.isFinite(value)) return '-';
        var abs = Math.abs(value);
        if (abs >= 1000000000) return (value / 1000000000).toFixed(abs >= 10000000000 ? 0 : 1) + 'B';
        if (abs >= 1000000) return (value / 1000000).toFixed(abs >= 10000000 ? 0 : 1) + 'M';
        if (abs >= 1000) return (value / 1000).toFixed(abs >= 10000 ? 0 : 1) + 'k';
        if (abs >= 100) return Math.round(value).toString();
        return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
    }

    private isDarkTheme(): boolean {
        if (typeof document === 'undefined') {
            return false;
        }

        return document.documentElement.getAttribute('data-theme') === 'dark';
    }

    // ============================================================
    // Timer / helpers
    // ============================================================

    private ensureRefreshTimer() {
        if (!this.refreshTimer) {
            this.startRefreshTimer();
        }
    }

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

    private resolveRequestEvent(event: any): any {
        var start = Number(event.start);
        var end = Number(event.end);
        var now = Date.now();
        var period = String(event.period || '').toUpperCase();
        var movingWindow = event.movingWindow === true || Math.abs(now - end) <= 2 * 60 * 1000;

        if (!movingWindow || period === 'Y') {
            return { ...event, start: start, end: end, movingWindow: false };
        }

        var nextEnd = now;
        var nextStart = start;
        var numeric = parseFloat(period.replace(/[^0-9.]+/g, ''));
        if (!Number.isFinite(numeric) || numeric <= 0) numeric = 1;

        if (period === 'T') {
            var today = new Date(now);
            today.setHours(0, 0, 0, 0);
            nextStart = today.getTime();
        } else if (period === 'M') {
            var month = new Date(now);
            month.setDate(1);
            month.setHours(0, 0, 0, 0);
            nextStart = month.getTime();
        } else if (/H$/.test(period)) {
            nextStart = nextEnd - numeric * 60 * 60 * 1000;
        } else if (/W$/.test(period)) {
            nextStart = nextEnd - numeric * 7 * 24 * 60 * 60 * 1000;
        } else {
            var duration = Math.max(60 * 1000, end - start);
            nextStart = nextEnd - duration;
        }

        return { ...event, start: nextStart, end: nextEnd, movingWindow: true };
    }

    private updateLiveClock(): void {
        this.liveClockLabel = this.toDisplayTimeWithSeconds(new Date());
    }

    private toRequestTime(value: any): string {
        var date = new Date(value);
        return this.datePipe.transform(date, 'yyyy-MM-dd HH:mm:00') || '';
    }

    private toDisplayTime(value: any): string {
        var date = new Date(value);
        return this.datePipe.transform(date, 'dd MMM yyyy HH:mm') || '';
    }

    private toDisplayTimeWithSeconds(value: any): string {
        var date = new Date(value);
        return this.datePipe.transform(date, 'dd MMM yyyy HH:mm:ss') || '';
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
