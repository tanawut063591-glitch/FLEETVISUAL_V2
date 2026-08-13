import {
    Component,
    OnInit,
    OnDestroy,
    OnChanges,
    SimpleChanges,
    Output,
    EventEmitter,
    Input,
    ChangeDetectionStrategy,
    ChangeDetectorRef
} from '@angular/core';

import { Subscription } from 'rxjs';
import { retry } from 'rxjs/operators';

import { Store } from '@ngrx/store';
import { DatePipe } from '@angular/common';

import { FvState } from '../../store/states/app.states';
import * as fvInfoReducer from '../../store/reducers/fv-info.reducer';

import { TagService } from '../../shared/services/tag.service';
import { NewHttpClientService } from '../../shared/services/http-client1.service';
import { FvRealtimeService } from '../../shared/services/fv-realtime.service';

import {
    TimerPayload,
    QuickPeriodOption,
    TagColumnOption,
    TagPresetOption,
    TagGroupBucket,
    SelectedGroupSummary
} from './datetime-control.model';

@Component({
    selector: 'app-datetime-control',
    templateUrl: './datetime-control.component.html',
    styleUrls: ['./datetime-control.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class DatetimeControlComponent implements OnInit, OnDestroy, OnChanges {

    @Output() selectedTimer = new EventEmitter<TimerPayload>();
    @Output() showLoggerEmit = new EventEmitter<TimerPayload>();

    @Input() selectAll = false;
    @Input() searchTitle = 'OK';
    @Input() display = true;
    @Input() loading = false;
    @Input() maxSelection = 0;
    @Input() dialogSubtitle = 'Select sensor parameters for Data Logger';

    @Input() pageTitle = 'DATA LOGGER';
    @Input() pageSubtitle = 'View, export and analyze historical sensor values from the selected vessel.';
    @Input() badgeLabel = 'HISTORICAL SENSOR DATA';
    @Input() parameterText = 'Choose the sensor tags you want to display in the logger table.';
    @Input() compactLegacy = false;

    prefix: string = '';
    vesselInfoActive: any;

    start: Date = new Date();
    end: Date = new Date();

    tags: any[] = [];
    displayDialog = false;
    period: string = '24H';

    searchKeyword: string = '';
    showSelectedOnly = false;

    selectedPresetKey: string = '';
    sideTab: string = 'favorite';

    favoriteTagKeys: string[] = [];
    recentTagKeys: string[] = [];

    pointsLoading = false;
    hasPointError = false;
    pointErrorMessage = '';

    vesselSub: Subscription | null = null;
    private activeVesselSub: Subscription | null = null;
    private pointSub: Subscription | null = null;
    private pointRequestVersion = 0;

    private readonly favoriteStorageKey = 'fleet_visual_data_logger_favorite_tags';
    private readonly recentStorageKey = 'fleet_visual_data_logger_recent_tags';
    private selectionSnapshot: string[] = [];

    quickPeriods: QuickPeriodOption[] = [
        { label: '1H', value: '1H' },
        { label: '3H', value: '3H' },
        { label: '12H', value: '12H' },
        { label: '24H', value: '24H' },
        { label: 'T', value: 'T' },
        { label: 'Y', value: 'Y' },
        { label: 'W', value: '1W' },
        { label: 'M', value: 'M' }
    ];

    tagPresets: TagPresetOption[] = [
        {
            key: 'fuel-daily',
            label: 'Daily Fuel',
            description: 'Fuel rate, fuel total and consumption tags',
            keywords: ['fuel', 'fin', 'fout', 'cons', 'consumption', 'total']
        },
        {
            key: 'navigation',
            label: 'Navigation',
            description: 'Position, speed and course tags',
            keywords: ['gps', 'lat', 'long', 'lng', 'speed', 'sog', 'cog', 'course']
        },
        {
            key: 'engine-basic',
            label: 'Engine Basic',
            description: 'RPM, load, pressure and temperature tags',
            keywords: ['rpm', 'load', 'press', 'pressure', 'temp', 'temperature']
        },
        {
            key: 'system-status',
            label: 'System Status',
            description: 'Alive and status tags',
            keywords: ['alive', 'status', 'online', 'offline', 'active']
        }
    ];

    tagColumns: TagColumnOption[] = [
        { key: 'ves', title: 'VES', subtitle: 'Vessel', icon: 'fa-ship' },
        { key: 'pme', title: 'PME', subtitle: 'Port Main Engine', icon: 'fa-cog' },
        { key: 'sme', title: 'SME', subtitle: 'Starboard Main Engine', icon: 'fa-cog' },
        { key: 'pae', title: 'PAE', subtitle: 'Port Aux Engine', icon: 'fa-bolt' },
        { key: 'sae', title: 'SAE', subtitle: 'Starboard Aux Engine', icon: 'fa-bolt' },
        { key: 'cme', title: 'CME', subtitle: 'Center Main Engine', icon: 'fa-cogs' },
        { key: 'cae', title: 'CAE', subtitle: 'Center Aux Engine', icon: 'fa-cogs' },
        { key: 'dg1', title: 'DG1', subtitle: 'Generator 1', icon: 'fa-microchip' },
        { key: 'dg2', title: 'DG2', subtitle: 'Generator 2', icon: 'fa-microchip' },
        { key: 'dg3', title: 'DG3', subtitle: 'Generator 3', icon: 'fa-microchip' },
        { key: 'dg4', title: 'DG4', subtitle: 'Generator 4', icon: 'fa-microchip' },
        { key: 'status', title: 'STATUS', subtitle: 'Signal Status', icon: 'fa-signal' },
        { key: 'other', title: 'OTHER', subtitle: 'Other Sensors', icon: 'fa-tags' }
    ];

    tagGroup: { [key: string]: TagGroupBucket } = {
        ves: { group: ['VES'], tags: [] },
        pme: { group: ['PME', 'PPS'], tags: [] },
        sme: { group: ['SME', 'SPS'], tags: [] },
        cme: { group: ['CME', 'CPS'], tags: [] },
        pae: { group: ['PAE'], tags: [] },
        cae: { group: ['CAE'], tags: [] },
        sae: { group: ['SAE'], tags: [] },
        dg1: { group: ['DG1'], tags: [] },
        dg2: { group: ['DG2'], tags: [] },
        dg3: { group: ['DG3'], tags: [] },
        dg4: { group: ['DG4'], tags: [] },
        status: { group: ['ALIVE', 'STATUS'], tags: [] },
        other: { group: [], tags: [] }
    };

    headers: any = {
        ves: false,
        pme: false,
        cme: false,
        sme: false,
        pae: false,
        cae: false,
        sae: false,
        dg1: false,
        dg2: false,
        dg3: false,
        dg4: false,
        status: false,
        other: false
    };

    constructor(
        private http: NewHttpClientService,
        private datePipe: DatePipe,
        private store: Store<FvState>,
        private cd: ChangeDetectorRef,
        private tagService: TagService,
        private fvRealtimeService: FvRealtimeService
    ) { }

    ngOnInit() {
        this.setDefaultDateTime();
        this.loadLocalTagMemory();





        this.activeVesselSub = this.fvRealtimeService.activeVessel$
            .subscribe((vessel: any) => this.applyActiveVessel(vessel));

        this.vesselSub = this.store
            .select(fvInfoReducer.getFvInfosActive)
            .pipe(retry(2))
            .subscribe((res: any) => this.applyActiveVessel(res));



        this.applyActiveVessel(this.fvRealtimeService.getActiveVesselSnapshot());
    }

    ngOnChanges(changes: SimpleChanges) {
        if (
            changes &&
            changes['selectAll'] &&
            !changes['selectAll'].firstChange &&
            this.tags &&
            this.tags.length > 0
        ) {
            this.all(!!this.selectAll);
        }
    }

    ngOnDestroy() {
        this.unsubscribeSafe(this.vesselSub);
        this.unsubscribeSafe(this.activeVesselSub);
        this.unsubscribeSafe(this.pointSub);
        this.pointRequestVersion++;
    }

    private unsubscribeSafe(sub: Subscription | null): void {
        if (sub && typeof sub.unsubscribe === 'function') {
            sub.unsubscribe();
        }
    }

    private markView() {
        if (this.cd) {
            this.cd.markForCheck();
        }
    }










    private applyActiveVessel(value: any): void {
        var vessel = this.resolveVesselInfo(value);
        var nextPrefix = this.resolveVesselPrefix(vessel);

        if (!nextPrefix) {
            return;
        }

        var changed = nextPrefix !== this.prefix;

        this.vesselInfoActive = {
            ...(vessel || {}),
            prefix: nextPrefix
        };

        if (!changed) {


            if (this.displayDialog && !this.pointsLoading && this.tags.length === 0) {
                this.hasPointError = false;
                this.pointErrorMessage = '';
                this.getPoints(nextPrefix);
            }

            this.markView();
            return;
        }

        this.prefix = nextPrefix;
        this.hasPointError = false;
        this.pointErrorMessage = '';




        this.processTagsResult([], nextPrefix);
        this.getPoints(nextPrefix);
        this.markView();
    }

    private resolveVesselInfo(value: any): any {
        if (!value) {
            return null;
        }

        return value.fvInfo || value.fv || value.vessel || value;
    }

    private resolveVesselPrefix(value: any): string {
        var sources = [
            value,
            value && value.fvInfo,
            value && value.fv,
            value && value.vessel
        ];

        for (var i = 0; i < sources.length; i++) {
            var source = sources[i];

            if (!source) {
                continue;
            }

            var prefix = source.prefix || source.vesselPrefix || source.shipPrefix || '';

            if (prefix !== null && prefix !== undefined && String(prefix).trim() !== '') {
                return String(prefix).trim();
            }
        }

        return '';
    }

    private restoreActiveVessel(): boolean {
        var snapshot = this.fvRealtimeService.getActiveVesselSnapshot();
        this.applyActiveVessel(snapshot);

        if (this.prefix) {
            return true;
        }

        try {
            var raw = localStorage.getItem('selectedVessel') || localStorage.getItem('realtimeVessel');
            if (raw) {
                this.applyActiveVessel(JSON.parse(raw));
            }
        } catch (error) {
            if (typeof console !== 'undefined' && console.warn) {
                console.warn('[DatetimeControl] restore selected vessel failed:', error);
            }
        }

        return !!this.prefix;
    }

    private setDefaultDateTime() {
        var now = new Date();

        this.end = new Date(now);
        this.start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        this.period = '24H';
    }

    get vesselName(): string {
        return this.vesselInfoActive && this.vesselInfoActive.name
            ? this.vesselInfoActive.name
            : 'No vessel selected';
    }

    get tagCountNumber(): number {
        return this.selectedTags.length;
    }

    get totalTagNumber(): number {
        return this.tags ? this.tags.length : 0;
    }

    get tagCount(): string {
        return this.tagCountNumber === 0
            ? 'Select tags.'
            : 'Selected ' + this.tagCountNumber + ' tags.';
    }

    get selectedTags(): any[] {
        var result: any[] = [];
        var map: any = {};

        for (var key in this.tagGroup) {
            if (this.tagGroup.hasOwnProperty(key) && this.tagGroup[key] && this.tagGroup[key].tags) {
                var checked = this.tagGroup[key].tags.filter((x: any) => x.check);

                for (var i = 0; i < checked.length; i++) {
                    var memoryKey = this.getTagMemoryKey(checked[i]);

                    if (memoryKey && !map[memoryKey]) {
                        map[memoryKey] = true;
                        result.push(checked[i]);
                    }
                }
            }
        }

        return result;
    }

    get favoriteTags(): any[] {
        return this.getTagsFromKeys(this.favoriteTagKeys);
    }

    get recentlyUsedTags(): any[] {
        return this.getTagsFromKeys(this.recentTagKeys);
    }

    get selectedGroupSummary(): SelectedGroupSummary[] {
        var result: SelectedGroupSummary[] = [];

        for (var i = 0; i < this.tagColumns.length; i++) {
            var col = this.tagColumns[i];
            var count = this.getColumnSelectedCount(col.key);

            if (count > 0) {
                result.push({
                    key: col.key,
                    title: col.title,
                    count: count
                });
            }
        }

        return result;
    }

    get displayStartText(): string {
        return this.datePipe.transform(this.start, 'dd/MM/yyyy HH:mm') || '-';
    }

    get displayEndText(): string {
        return this.datePipe.transform(this.end, 'dd/MM/yyyy HH:mm') || '-';
    }

    openDialog() {
        this.selectionSnapshot = this.selectedTags.map((tag: any) => this.getTagMemoryKey(tag));
        this.displayDialog = true;




        this.restoreActiveVessel();



        if (this.prefix && !this.pointsLoading && this.tags.length === 0) {
            this.getPoints(this.prefix, true);
        } else if (!this.prefix) {
            this.hasPointError = true;
            this.pointErrorMessage = 'Vessel data is still loading. Please wait a moment or select a vessel from the sidebar.';
        }

        this.markView();
    }

    retryPoints(): void {
        this.restoreActiveVessel();

        if (!this.prefix) {
            this.hasPointError = true;
            this.pointErrorMessage = 'No vessel is available yet. Select a vessel from the sidebar and retry.';
            this.markView();
            return;
        }

        this.getPoints(this.prefix, true);
    }

    getPoints(prefix: string, forceRefresh: boolean = false) {
        if (!prefix) {
            return;
        }

        var requestVersion = ++this.pointRequestVersion;

        this.pointsLoading = true;
        this.hasPointError = false;
        this.pointErrorMessage = '';

        this.unsubscribeSafe(this.pointSub);

        if (!forceRefresh && this.tagService && this.tagService.hasPoint(prefix)) {
            var cachedPoint = this.tagService.getPoint(prefix);


            if (Array.isArray(cachedPoint) && cachedPoint.length > 0) {
                this.processTagsResult(cachedPoint, prefix);
                this.pointsLoading = false;
                this.markView();
                return;
            }
        }

        this.pointSub = this.http
            .getPoints(prefix)
            .pipe(retry(3))
            .subscribe(
                (res: any[]) => {
                    if (requestVersion !== this.pointRequestVersion) {
                        return;
                    }

                    var next = this.extractArray(res);

                    this.processTagsResult(next, prefix);

                    if (this.tagService && next.length > 0) {
                        this.tagService.addPoint(prefix, next);
                    }

                    this.pointsLoading = false;
                    this.markView();
                },
                (error: any) => {
                    if (requestVersion !== this.pointRequestVersion) {
                        return;
                    }

                    this.pointsLoading = false;
                    this.hasPointError = true;
                    this.pointErrorMessage = 'Cannot load tags for vessel ' + prefix + '.';
                    this.processTagsResult([], prefix);
                    this.markView();

                    if (typeof console !== 'undefined' && console.warn) {
                        console.warn('getPoints error:', error);
                    }
                }
            );
    }

    private extractArray(response: any, depth: number = 0): any[] {
        if (response === null || response === undefined || depth > 8) {
            return [];
        }

        if (typeof response === 'string') {
            var text = response.trim();

            if (!text) {
                return [];
            }

            try {
                return this.extractArray(JSON.parse(text), depth + 1);
            } catch (e) {
                return [];
            }
        }

        if (Array.isArray(response)) {
            return response;
        }

        if (typeof response !== 'object') {
            return [];
        }

        var preferredKeys = [
            'data', 'Data', 'result', 'Result', 'results', 'Results',
            'records', 'Records', 'items', 'Items', 'values', 'Values',
            'points', 'Points', 'tags', 'Tags', 'payload', 'Payload',
            'response', 'Response', 'value', 'Value'
        ];

        for (var i = 0; i < preferredKeys.length; i++) {
            var preferred = response[preferredKeys[i]];
            var preferredResult = this.extractArray(preferred, depth + 1);

            if (preferredResult.length > 0) {
                return preferredResult;
            }
        }


        var keys = Object.keys(response);
        for (var j = 0; j < keys.length; j++) {
            var nestedResult = this.extractArray(response[keys[j]], depth + 1);

            if (nestedResult.length > 0) {
                return nestedResult;
            }
        }

        return [];
    }

    private processTagsResult(rawTags: any[], prefix: string) {
        var normalized: any[] = [];
        var map: any = {};

        if (!rawTags) {
            rawTags = [];
        }

        for (var i = 0; i < rawTags.length; i++) {
            var raw = rawTags[i];
            var rawName = this.getRawTagName(raw);
            var cleanName = this.normalizeTagName(rawName, prefix);

            if (!cleanName) {
                continue;
            }

            var key = cleanName.toUpperCase();

            if (map[key]) {
                continue;
            }

            map[key] = true;

            normalized.push({
                name: cleanName,
                tagName: cleanName,
                check: false,
                unit: raw && (raw.Unit || raw.unit || raw.EngineeringUnit || raw.engineeringUnit) || '',
                description: raw && (raw.Description || raw.description || raw.Display || raw.display) || '',
                source: raw && (raw.PointSource || raw.pointSource || raw.Address || raw.address) || ''
            });
        }

        normalized.sort((a: any, b: any) => {
            var aa = a.tagName || '';
            var bb = b.tagName || '';
            return aa.localeCompare(bb);
        });

        this.tags = normalized;

        this.getTagGroup();
        this.getTagSelected();
        this.syncHeaderState();

        if (this.selectAll) {
            this.all(true);
        } else {
            this.enforceSelectionLimit(false);
        }
    }

    private getRawTagName(row: any): string {
        if (!row) {
            return '';
        }

        return row.TagName || row.tagName || row.Name || row.name ||
            row.Tag || row.tag || row.PointName || row.pointName ||
            row.Address || row.address || row.PointSource || row.pointSource || '';
    }

    private normalizeTagName(rawName: string, prefix: string): string {
        if (!rawName) {
            return '';
        }

        var text = String(rawName).trim();

        if (prefix && text.indexOf(prefix + '-') === 0) {
            text = text.substring((prefix + '-').length);
        }

        return text;
    }

    getTagGroup() {
        var assigned: { [key: string]: boolean } = {};

        for (var key in this.tagGroup) {
            if (this.tagGroup.hasOwnProperty(key) && key !== 'other') {
                this.tagCallBack(key);

                var grouped = this.tagGroup[key].tags || [];
                for (var i = 0; i < grouped.length; i++) {
                    assigned[this.getTagMemoryKey(grouped[i]).toUpperCase()] = true;
                }
            }
        }



        this.tagGroup['other'].tags = this.tags.filter((tag: any) => {
            var memoryKey = this.getTagMemoryKey(tag).toUpperCase();
            return memoryKey && !assigned[memoryKey];
        });
    }

    tagCallBack(key: string) {
        if (!this.tagGroup[key]) {
            return;
        }

        var groupname = this.tagGroup[key].group || [];
        var result: any[] = [];
        var map: any = {};

        this.tagGroup[key].tags = [];

        for (var i = 0; i < this.tags.length; i++) {
            var tag = this.tags[i];
            var tagName = tag && tag.tagName ? String(tag.tagName) : '';

            for (var g = 0; g < groupname.length; g++) {
                if (this.isTagInGroup(tagName, groupname[g])) {
                    var memoryKey = this.getTagMemoryKey(tag).toUpperCase();

                    if (!map[memoryKey]) {
                        map[memoryKey] = true;
                        result.push(tag);
                    }

                    break;
                }
            }
        }

        this.tagGroup[key].tags = result;
    }

    private isTagInGroup(tagName: string, groupName: string): boolean {
        if (!tagName || !groupName) {
            return false;
        }

        var tag = tagName.toUpperCase();
        var group = String(groupName).toUpperCase();

        if (tag === group) {
            return true;
        }

        if (tag.indexOf(group + '_') === 0) {
            return true;
        }

        if (tag.indexOf(group + '-') === 0) {
            return true;
        }

        if (tag.indexOf('_' + group + '_') > -1) {
            return true;
        }

        if (tag.indexOf('-' + group + '-') > -1) {
            return true;
        }

        return tag.indexOf(group) > -1;
    }

    filteredTags(key: string): any[] {
        if (!this.tagGroup[key] || !this.tagGroup[key].tags) {
            return [];
        }

        var list = this.tagGroup[key].tags;

        if (this.showSelectedOnly) {
            list = list.filter((x: any) => x.check);
        }

        if (this.searchKeyword && this.searchKeyword.trim() !== '') {
            var keyword = this.searchKeyword.toLowerCase().trim();

            list = list.filter((x: any) => {
                var searchText = [
                    x.tagName || x.name || '',
                    x.unit || '',
                    x.description || '',
                    x.source || ''
                ].join(' ').toLowerCase();

                return searchText.indexOf(keyword) > -1;
            });
        }

        return list;
    }

    hasVisibleTags(key: string): boolean {
        return this.filteredTags(key).length > 0;
    }

    getColumnTotalCount(key: string): number {
        if (!this.tagGroup[key] || !this.tagGroup[key].tags) {
            return 0;
        }

        return this.tagGroup[key].tags.length;
    }

    getColumnSelectedCount(key: string): number {
        if (!this.tagGroup[key] || !this.tagGroup[key].tags) {
            return 0;
        }

        return this.tagGroup[key].tags.filter((x: any) => x.check).length;
    }

    getColumnVisibleCount(key: string): number {
        return this.filteredTags(key).length;
    }

    isColumnAllSelected(key: string): boolean {
        var visible = this.filteredTags(key);

        if (!visible || visible.length === 0) {
            return false;
        }

        return visible.filter((x: any) => x.check).length === visible.length;
    }

    selectPeriod(period: string) {
        this.period = period;

        var now = new Date();
        var end = new Date(now);
        var start = new Date(now);
        var num = parseFloat(String(period).replace(/[^0-9\.]+/g, ''));

        if (isNaN(num) || num <= 0) {
            num = 1;
        }

        if (period === 'T') {
            start.setHours(0, 0, 0, 0);
        } else if (period === 'Y') {
            start.setDate(start.getDate() - 1);
            start.setHours(0, 0, 0, 0);

            end.setDate(end.getDate() - 1);
            end.setHours(23, 59, 59, 999);
        } else if (period === 'M') {
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
        } else if (period.indexOf('H') > -1) {
            start.setTime(end.getTime() - num * 60 * 60 * 1000);
        } else if (period.indexOf('W') > -1) {
            start.setDate(end.getDate() - num * 7);
            start.setHours(0, 0, 0, 0);
        } else {
            start.setTime(end.getTime() - 24 * 60 * 60 * 1000);
        }

        this.start = start;
        this.end = end;

        this.markView();
    }

    onInput() {
        this.period = '';
        this.markView();
    }

    private isMovingWindow(period: string, endTs: number): boolean {
        if (period === 'Y') {
            return false;
        }

        if (period === 'T' || period === 'M' || /H$/.test(period) || /W$/.test(period)) {
            return true;
        }

        return Math.abs(Date.now() - endTs) <= 2 * 60 * 1000;
    }

    private getValidatedPayload(): TimerPayload | null {
        var startTs = this.start ? this.start.getTime() : NaN;
        var endTs = this.end ? this.end.getTime() : NaN;

        if (isNaN(startTs)) {
            alert('Format start time invalid.');
            return null;
        }

        if (isNaN(endTs)) {
            alert('Format end time invalid.');
            return null;
        }

        if (startTs > endTs) {
            alert('Start time must be before end time.');
            return null;
        }

        var tags = this.addPrefix();

        if (!tags || tags.length === 0) {
            alert('Please select tags.');
            return null;
        }

        return {
            start: startTs,
            end: endTs,
            tags: tags,
            fvInfo: this.vesselInfoActive,
            period: this.period || 'CUSTOM',
            movingWindow: this.isMovingWindow(this.period, endTs)
        };
    }

    serch() {
        this.search();
    }

    search() {
        this.emitPayload(this.selectedTimer);
    }

    showLogger() {
        this.emitPayload(this.showLoggerEmit);
    }

    private emitPayload(emitter: EventEmitter<TimerPayload>) {
        var payload = this.getValidatedPayload();

        if (payload) {
            this.rememberRecentSelectedTags();

            if (emitter) {
                emitter.emit(payload);
            }
        }
    }

    addPrefix(): any[] {
        var tagsRes: any[] = [];
        var selected = this.selectedTags;

        for (var i = 0; i < selected.length; i++) {
            var t = selected[i];

            tagsRes.push({
                name: t.name,
                tagName: this.prefix + '-' + t.tagName
            });
        }

        return tagsRes;
    }

    all(val: boolean) {
        if (!this.tags) {
            return;
        }

        var selectedCount = 0;
        for (var i = 0; i < this.tags.length; i++) {
            if (!val) {
                this.tags[i].check = false;
                continue;
            }

            if (this.maxSelection > 0 && selectedCount >= this.maxSelection) {
                this.tags[i].check = false;
                continue;
            }

            this.tags[i].check = true;
            selectedCount++;
        }

        if (!val) {
            this.clearServiceSelected();
        } else {
            this.rebuildTagServiceSelected();
        }

        this.syncHeaderState();
        this.markView();
    }

    clearListActive() {
        for (var key in this.tagGroup) {
            if (this.tagGroup.hasOwnProperty(key) && this.tagGroup[key].tags) {
                for (var i = 0; i < this.tagGroup[key].tags.length; i++) {
                    this.tagGroup[key].tags[i].check = false;
                }
            }
        }

        this.clearServiceSelected();
        this.selectedPresetKey = '';
        this.syncHeaderState();
        this.markView();
    }

    resetDateTime() {
        this.setDefaultDateTime();
        this.markView();
    }

    resetAll() {
        this.setDefaultDateTime();
        this.searchKeyword = '';
        this.showSelectedOnly = false;
        this.selectedPresetKey = '';
        this.clearListActive();
    }

    selectedTag(tag: any, _group: any) {
        if (!tag) {
            return;
        }

        if (!tag.check && !this.canSelectMore()) {
            this.notifySelectionLimit();
            return;
        }

        tag.check = !tag.check;
        this.rebuildTagServiceSelected();
        this.syncHeaderState();

        this.markView();
    }

    removeSelectedTag(tag: any) {
        if (!tag) {
            return;
        }

        for (var key in this.tagGroup) {
            if (this.tagGroup.hasOwnProperty(key) && this.tagGroup[key].tags) {
                for (var i = 0; i < this.tagGroup[key].tags.length; i++) {
                    if (this.tagGroup[key].tags[i].tagName === tag.tagName) {
                        this.tagGroup[key].tags[i].check = false;
                    }
                }
            }
        }

        this.rebuildTagServiceSelected();
        this.syncHeaderState();
        this.markView();
    }

    toggleSelectedOnly() {
        this.showSelectedOnly = !this.showSelectedOnly;
        this.markView();
    }

    clearSearch() {
        this.searchKeyword = '';
        this.markView();
    }

    closeDialog() {
        this.restoreSelectionSnapshot();
        this.displayDialog = false;
        this.markView();
    }

    confirmTag() {
        this.enforceSelectionLimit(true);
        this.selectionSnapshot = this.selectedTags.map((tag: any) => this.getTagMemoryKey(tag));
        this.rememberRecentSelectedTags();
        this.displayDialog = false;
        this.markView();
    }

    selectedAll(tags: any[]) {
        if (!tags) {
            return;
        }

        var blocked = false;
        for (var i = 0; i < tags.length; i++) {
            if (tags[i].check) {
                continue;
            }
            if (!this.canSelectMore()) {
                blocked = true;
                break;
            }
            tags[i].check = true;
        }

        if (blocked) {
            this.notifySelectionLimit();
        }

        this.rebuildTagServiceSelected();
        this.syncHeaderState();
        this.markView();
    }

    selectVisibleAll() {
        var blocked = false;
        outer: for (var i = 0; i < this.tagColumns.length; i++) {
            var key = this.tagColumns[i].key;
            var visible = this.filteredTags(key);

            for (var j = 0; j < visible.length; j++) {
                if (visible[j].check) {
                    continue;
                }
                if (!this.canSelectMore()) {
                    blocked = true;
                    break outer;
                }
                visible[j].check = true;
            }
        }

        if (blocked) {
            this.notifySelectionLimit();
        }

        this.rebuildTagServiceSelected();
        this.syncHeaderState();
        this.markView();
    }

    selectHaederAll(head: string, _data: any[], _group: any) {
        this.selectHeaderAll(head);
    }

    selectHeaderAll(head: string) {
        var visible = this.filteredTags(head);
        var nextValue = !this.isColumnAllSelected(head);
        var blocked = false;

        for (var i = 0; i < visible.length; i++) {
            if (!nextValue) {
                visible[i].check = false;
                continue;
            }
            if (visible[i].check) {
                continue;
            }
            if (!this.canSelectMore()) {
                blocked = true;
                break;
            }
            visible[i].check = true;
        }

        if (blocked) {
            this.notifySelectionLimit();
        }

        this.rebuildTagServiceSelected();
        this.syncHeaderState();
        this.markView();
    }

    getTagSelected() {
        var serviceSelected = this.tagService && this.tagService.tagSelected
            ? this.tagService.tagSelected
            : [];

        for (var key in this.tagGroup) {
            if (this.tagGroup.hasOwnProperty(key)) {
                var filter = serviceSelected.filter((t: any) => {
                    return t &&
                        t.group &&
                        t.group.join(',') === this.tagGroup[key].group.join(',');
                });

                for (var i = 0; i < filter.length; i++) {
                    var f = filter[i];

                    for (var j = 0; j < this.tagGroup[key].tags.length; j++) {
                        if (this.tagGroup[key].tags[j].name === f.tags) {
                            this.tagGroup[key].tags[j].check = true;
                        }
                    }
                }
            }
        }

        this.enforceSelectionLimit(false);
        this.syncHeaderState();
        this.markView();
    }

    setSideTab(tab: string) {
        this.sideTab = tab;
        this.markView();
    }

    selectSideTag(tag: any) {
        if (!tag) {
            return;
        }

        var group = this.getGroupForTag(tag);
        this.selectedTag(tag, group);
    }

    toggleFavorite(tag: any, event?: any) {
        if (event && typeof event.stopPropagation === 'function') {
            event.stopPropagation();
        }

        var key = this.getTagMemoryKey(tag);

        if (!key) {
            return;
        }

        var index = this.favoriteTagKeys.indexOf(key);

        if (index > -1) {
            this.favoriteTagKeys.splice(index, 1);
        } else {
            this.favoriteTagKeys.unshift(key);
        }

        this.favoriteTagKeys = this.unique(this.favoriteTagKeys).slice(0, 40);
        this.saveStringArray(this.favoriteStorageKey, this.favoriteTagKeys);
        this.markView();
    }

    isFavorite(tag: any): boolean {
        var key = this.getTagMemoryKey(tag);
        return key ? this.favoriteTagKeys.indexOf(key) > -1 : false;
    }

    applyPreset(key: string) {
        this.selectedPresetKey = key;

        if (!key) {
            this.markView();
            return;
        }

        var preset = this.tagPresets.filter((x: TagPresetOption) => x.key === key)[0];

        if (!preset) {
            this.markView();
            return;
        }

        for (var groupKey in this.tagGroup) {
            if (this.tagGroup.hasOwnProperty(groupKey)) {
                var groupTags = this.tagGroup[groupKey].tags || [];

                for (var i = 0; i < groupTags.length; i++) {
                    var tag = groupTags[i];
                    var name = String(tag.tagName || tag.name || '').toLowerCase();

                    for (var k = 0; k < preset.keywords.length; k++) {
                        if (name.indexOf(preset.keywords[k].toLowerCase()) > -1) {
                            if (!tag.check && !this.canSelectMore()) {
                                break;
                            }
                            tag.check = true;
                            break;
                        }
                    }
                }
            }
        }

        this.rebuildTagServiceSelected();
        this.syncHeaderState();
        this.markView();
    }

    private canSelectMore(): boolean {
        return this.maxSelection <= 0 || this.tagCountNumber < this.maxSelection;
    }

    private notifySelectionLimit(): void {
        if (this.maxSelection > 0) {
            alert('You can select up to ' + this.maxSelection + ' tags.');
        }
    }

    private enforceSelectionLimit(notify: boolean): void {
        if (this.maxSelection <= 0) {
            return;
        }

        var count = 0;
        var trimmed = false;

        for (var i = 0; i < this.tags.length; i++) {
            if (!this.tags[i].check) {
                continue;
            }

            count++;
            if (count > this.maxSelection) {
                this.tags[i].check = false;
                trimmed = true;
            }
        }

        if (trimmed) {
            this.rebuildTagServiceSelected();
            this.syncHeaderState();
            if (notify) {
                this.notifySelectionLimit();
            }
        }
    }

    private restoreSelectionSnapshot(): void {
        var selectedMap: { [key: string]: boolean } = {};
        for (var i = 0; i < this.selectionSnapshot.length; i++) {
            selectedMap[this.selectionSnapshot[i]] = true;
        }

        for (var j = 0; j < this.tags.length; j++) {
            this.tags[j].check = !!selectedMap[this.getTagMemoryKey(this.tags[j])];
        }

        this.rebuildTagServiceSelected();
        this.syncHeaderState();
    }

    private clearServiceSelected() {
        if (this.tagService && typeof this.tagService.clearTagSelected === 'function') {
            this.tagService.clearTagSelected();
        }
    }

    private rebuildTagServiceSelected() {
        this.clearServiceSelected();

        for (var key in this.tagGroup) {
            if (this.tagGroup.hasOwnProperty(key)) {
                var checked = this.tagGroup[key].tags.filter((x: any) => x.check);

                for (var i = 0; i < checked.length; i++) {
                    if (this.tagService && typeof this.tagService.setActive === 'function') {
                        this.tagService.setActive(checked[i], this.tagGroup[key]);
                    }
                }
            }
        }
    }

    private syncHeaderState() {
        for (var key in this.tagGroup) {
            if (this.tagGroup.hasOwnProperty(key)) {
                this.headers[key] = this.isColumnAllSelected(key);
            }
        }
    }

    private getGroupForTag(tag: any): any {
        if (!tag) {
            return null;
        }

        for (var key in this.tagGroup) {
            if (this.tagGroup.hasOwnProperty(key)) {
                var found = this.tagGroup[key].tags.filter((x: any) => {
                    return x.tagName === tag.tagName;
                })[0];

                if (found) {
                    return this.tagGroup[key];
                }
            }
        }

        return null;
    }

    private getTagsFromKeys(keys: string[]): any[] {
        var result: any[] = [];

        if (!keys || !this.tags) {
            return result;
        }

        var tagMap: any = {};

        for (var i = 0; i < this.tags.length; i++) {
            tagMap[this.getTagMemoryKey(this.tags[i])] = this.tags[i];
        }

        for (var j = 0; j < keys.length; j++) {
            var found = tagMap[keys[j]];

            if (found) {
                result.push(found);
            }
        }

        return result;
    }

    private rememberRecentSelectedTags() {
        var selected = this.selectedTags;
        var next: string[] = [];

        for (var i = 0; i < selected.length; i++) {
            var key = this.getTagMemoryKey(selected[i]);

            if (key) {
                next.push(key);
            }
        }

        this.recentTagKeys = this.unique(next.concat(this.recentTagKeys)).slice(0, 40);
        this.saveStringArray(this.recentStorageKey, this.recentTagKeys);
    }

    private getTagMemoryKey(tag: any): string {
        if (!tag) {
            return '';
        }

        return tag.tagName || tag.name || '';
    }

    private loadLocalTagMemory() {
        this.favoriteTagKeys = this.readStringArray(this.favoriteStorageKey);
        this.recentTagKeys = this.readStringArray(this.recentStorageKey);
    }

    private readStringArray(key: string): string[] {
        try {
            if (typeof localStorage === 'undefined') {
                return [];
            }

            var raw = localStorage.getItem(key);

            if (!raw) {
                return [];
            }

            var parsed = JSON.parse(raw);

            if (parsed && parsed.length) {
                return parsed;
            }
        } catch (e) {}

        return [];
    }

    private saveStringArray(key: string, value: string[]) {
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(key, JSON.stringify(value || []));
            }
        } catch (e) {}
    }

    private unique(list: string[]): string[] {
        var result: string[] = [];

        if (!list) {
            return result;
        }

        for (var i = 0; i < list.length; i++) {
            if (list[i] && result.indexOf(list[i]) === -1) {
                result.push(list[i]);
            }
        }

        return result;
    }

    trackByTagName(index: number, item: any) {
        return item && item.tagName ? item.tagName : index;
    }

    trackByColumnKey(index: number, item: any) {
        return item && item.key ? item.key : index;
    }

    trackByPresetKey(index: number, item: any) {
        return item && item.key ? item.key : index;
    }

    trackBySummaryKey(index: number, item: any) {
        return item && item.key ? item.key : index;
    }
}