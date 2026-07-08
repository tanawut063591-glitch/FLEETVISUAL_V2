import { timeout } from 'rxjs/operators';
import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';



import { NewHttpClientService } from './http-client1.service';

import {
    PastTrackPoint,
    PastTrackResponse,
    PastTrackSummary
} from '../../features/past-track/models/past-track.model';

@Injectable({
    providedIn: 'root'
})
export class PastTrackService {

    private readonly apiTimeoutMs: number = 20000;

    constructor(
        private newHttp: NewHttpClientService
    ) {}

    getPastTrack(
        vesselId: string,
        startDate: string,
        endDate: string
    ): Observable<PastTrackResponse> {

        var prefix = vesselId ? String(vesselId).trim() : '';
        var self = this;

        return Observable.create(function(observer: any) {
            console.log('PAST TRACK PREFIX:', prefix);

            if (!prefix) {
                observer.next(self.buildResponse(prefix, []));
                observer.complete();
                return;
            }

            // Step 1: ดึงรายการ Tag หรือจุดจาก Backend
            self.newHttp
                .getPoints(prefix)
                .pipe(timeout(self.apiTimeoutMs))
                .subscribe(
                    function(getPointsResponse: any) {
                        console.log('PAST TRACK /getpoints RAW:', getPointsResponse);

                        // กรณี API /getpoints ส่ง lat/lng route points มาโดยตรง
                        var directPoints = self.normalizeDirectPoints(
                            getPointsResponse,
                            prefix,
                            startDate,
                            endDate
                        );

                        if (directPoints.length > 0) {
                            console.log('PAST TRACK DIRECT REAL POINTS:', directPoints);
                            observer.next(self.buildResponse(prefix, directPoints));
                            observer.complete();
                            return;
                        }

                        // กรณี API /getpoints ส่งเป็นรายการ Tag
                        var tagRows = self.extractArray(getPointsResponse);
                        var routeTags = self.findRouteTags(tagRows);

                        console.log('PAST TRACK SELECTED ROUTE TAGS:', routeTags);

                        if (!routeTags.lat || !routeTags.lng) {
                            console.warn('PAST TRACK: Cannot find GPS LAT/LONG tags from /getpoints');

                            observer.next(self.buildResponse(prefix, []));
                            observer.complete();
                            return;
                        }

                        self.loadHistorianRoute(
                            prefix,
                            routeTags,
                            startDate,
                            endDate,
                            observer
                        );
                    },
                    function(error: any) {
                        console.error('PAST TRACK /getpoints ERROR:', error);

                        observer.next(self.buildResponse(prefix, []));
                        observer.complete();
                    }
                );
        });
    }

    private loadHistorianRoute(
        prefix: string,
        routeTags: any,
        startDate: string,
        endDate: string,
        observer: any
    ): void {

        var range = this.buildHistoryRange(startDate, endDate);
        var tagRequest = this.buildTagRequest(routeTags);

        console.log('PAST TRACK HISTORY RANGE:', range);
        console.log('PAST TRACK HISTORY TAG REQUEST:', tagRequest);

        // Step 2: ดึง Historian จริงจาก Backend
        this.newHttp
            .getRawData(range.start, range.end, tagRequest)
            .pipe(timeout(this.apiTimeoutMs))
            .subscribe(
                (historyResponse: any) => {
                    console.log('PAST TRACK HISTORIAN RAW:', historyResponse);

                    var points = this.normalizeHistorianPoints(
                        historyResponse,
                        prefix,
                        routeTags,
                        startDate,
                        endDate
                    );

                    console.log('PAST TRACK HISTORIAN NORMALIZED POINTS:', points);

                    observer.next(this.buildResponse(prefix, points));
                    observer.complete();
                },
                (error: any) => {
                    console.error('PAST TRACK HISTORIAN ERROR:', error);

                    observer.next(this.buildResponse(prefix, []));
                    observer.complete();
                }
            );
    }

    private buildResponse(prefix: string, points: PastTrackPoint[]): PastTrackResponse {
        return {
            summary: this.buildSummary(prefix, points),
            points: points
        };
    }

    private buildTagRequest(routeTags: any): any[] {
        var tags: any[] = [];

        if (routeTags.lat) {
            tags.push({ tagName: routeTags.lat });
        }

        if (routeTags.lng) {
            tags.push({ tagName: routeTags.lng });
        }

        if (routeTags.speed) {
            tags.push({ tagName: routeTags.speed });
        }

        if (routeTags.course) {
            tags.push({ tagName: routeTags.course });
        }

        if (routeTags.fuelRate) {
            tags.push({ tagName: routeTags.fuelRate });
        }

        return tags;
    }

    private buildHistoryRange(startDate: string, endDate: string): any {
        if (startDate && endDate) {
            return {
                start: startDate + ' 00:00:00',
                end: endDate + ' 23:59:59'
            };
        }

        var end = new Date();
        var start = new Date();

        // Default: ดึงย้อนหลัง 365 วัน เพื่อเช็กข้อมูล history ให้กว้าง
        start.setDate(end.getDate() - 365);

        return {
            start: this.formatDateTime(start),
            end: this.formatDateTime(end)
        };
    }

    private formatDateTime(date: Date): string {
        var year = date.getFullYear();
        var month = this.pad(date.getMonth() + 1);
        var day = this.pad(date.getDate());
        var hour = this.pad(date.getHours());
        var minute = this.pad(date.getMinutes());
        var second = this.pad(date.getSeconds());

        return year + '-' + month + '-' + day + ' ' + hour + ':' + minute + ':' + second;
    }

    private pad(value: number): string {
        return value < 10 ? '0' + value : String(value);
    }

    private findRouteTags(tagRows: any[]): any {
        return {
            lat: this.findBestTag(tagRows, 'lat'),
            lng: this.findBestTag(tagRows, 'lng'),
            speed: this.findBestTag(tagRows, 'speed'),
            course: this.findBestTag(tagRows, 'course'),
            fuelRate: this.findBestTag(tagRows, 'fuelRate')
        };
    }

    private findBestTag(tagRows: any[], type: string): string {
        if (!tagRows || tagRows.length === 0) {
            return '';
        }

        var bestTagName = '';
        var bestScore = 0;

        for (var i = 0; i < tagRows.length; i++) {
            var row = tagRows[i];
            var tagName = this.getTagName(row);

            if (!tagName) {
                continue;
            }

            var description = this.readFirst(row, [
                'Description',
                'description',
                'Desc',
                'desc'
            ]) || '';

            var text = (String(tagName) + ' ' + String(description)).toUpperCase();
            var score = this.scoreTag(text, type);

            if (score > bestScore) {
                bestScore = score;
                bestTagName = String(tagName);
            }
        }

        return bestScore > 0 ? bestTagName : '';
    }

    private scoreTag(text: string, type: string): number {
        var score = 0;

        if (type === 'lat') {
            if (text.indexOf('VES-GPS-LAT') >= 0) { score += 300; }
            if (text.indexOf('GPS_LAT') >= 0) { score += 220; }
            if (text.indexOf('GPS LAT') >= 0) { score += 220; }
            if (text.indexOf('LATITUDE') >= 0) { score += 180; }
            if (text.indexOf('LAT') >= 0) { score += 100; }
            if (text.indexOf('GPS') >= 0) { score += 30; }
        }

        if (type === 'lng') {
            if (text.indexOf('VES-GPS-LONG') >= 0) { score += 300; }
            if (text.indexOf('VES-GPS-LNG') >= 0) { score += 300; }
            if (text.indexOf('GPS_LONG') >= 0) { score += 220; }
            if (text.indexOf('GPS LNG') >= 0) { score += 220; }
            if (text.indexOf('GPS LON') >= 0) { score += 220; }
            if (text.indexOf('LONGITUDE') >= 0) { score += 180; }
            if (text.indexOf('LONG') >= 0) { score += 100; }
            if (text.indexOf('LNG') >= 0) { score += 100; }
            if (text.indexOf('LON') >= 0) { score += 100; }
            if (text.indexOf('GPS') >= 0) { score += 30; }
        }

        if (type === 'speed') {
            if (text.indexOf('VES-GPS-SPEED') >= 0) { score += 300; }
            if (text.indexOf('SOG') >= 0) { score += 160; }
            if (text.indexOf('SPEED') >= 0) { score += 120; }
            if (text.indexOf('GPS') >= 0) { score += 30; }
        }

        if (type === 'course') {
            if (text.indexOf('VES-GPS-HEAD') >= 0) { score += 300; }
            if (text.indexOf('COURSE') >= 0) { score += 160; }
            if (text.indexOf('COG') >= 0) { score += 160; }
            if (text.indexOf('HEADING') >= 0) { score += 140; }
            if (text.indexOf('HEAD') >= 0) { score += 100; }
            if (text.indexOf('GPS') >= 0) { score += 30; }
        }

        if (type === 'fuelRate') {
            if (text.indexOf('FUEL RATE') >= 0) { score += 160; }
            if (text.indexOf('FUEL') >= 0 && text.indexOf('FLOW') >= 0) { score += 140; }
            if (text.indexOf('MFLOW') >= 0) { score += 120; }
            if (text.indexOf('FUEL') >= 0) { score += 60; }
        }

        return score;
    }

    private normalizeDirectPoints(
        response: any,
        vesselId: string,
        startDate: string,
        endDate: string
    ): PastTrackPoint[] {

        var rows = this.extractArray(response);
        var result: PastTrackPoint[] = [];

        if (!rows || rows.length === 0) {
            return result;
        }

        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];

            var lat = this.toNumber(this.getLatValue(row));
            var lng = this.toNumber(this.getLngValue(row));

            if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
                continue;
            }

            var rawTime = this.getTimeValue(row);

            if (!this.isInDateRange(rawTime, startDate, endDate)) {
                continue;
            }

            result.push(this.createPoint(
                result.length + 1,
                vesselId,
                rawTime,
                lat,
                lng,
                this.toNumber(this.getSpeedValue(row)),
                this.toNumber(this.getCourseValue(row)),
                this.toNumber(this.getFuelRateValue(row))
            ));
        }

        return this.sortAndRemoveDuplicate(result);
    }

    private normalizeHistorianPoints(
        historyResponse: any,
        vesselId: string,
        routeTags: any,
        startDate: string,
        endDate: string
    ): PastTrackPoint[] {

        console.log('PAST TRACK HISTORIAN PARSE START:', historyResponse);

        var headerRecordPoints = this.normalizeHeaderRecordResponse(
            historyResponse,
            vesselId,
            routeTags,
            startDate,
            endDate
        );

        if (headerRecordPoints.length > 0) {
            return headerRecordPoints;
        }

        var rows = this.extractArray(historyResponse);
        var grouped: any = {};

        this.flattenHistoryRows(rows, routeTags, grouped);

        var points: PastTrackPoint[] = [];
        var keys = Object.keys(grouped);

        for (var i = 0; i < keys.length; i++) {
            var item = grouped[keys[i]];

            if (item.lat === undefined || item.lng === undefined) {
                continue;
            }

            var lat = this.toNumber(item.lat);
            var lng = this.toNumber(item.lng);

            if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
                continue;
            }

            if (!this.isInDateRange(item.time, startDate, endDate)) {
                continue;
            }

            points.push(this.createPoint(
                points.length + 1,
                vesselId,
                item.time,
                lat,
                lng,
                this.toNumber(item.speed),
                this.toNumber(item.course),
                this.toNumber(item.fuelRate)
            ));
        }

        return this.sortAndRemoveDuplicate(points);
    }

    private normalizeHeaderRecordResponse(
        response: any,
        vesselId: string,
        routeTags: any,
        startDate: string,
        endDate: string
    ): PastTrackPoint[] {

        if (!response) {
            return [];
        }

        var headers = response.Headers || response.headers || [];
        var records = response.Records || response.records || [];

        console.log('PAST TRACK HISTORIAN HEADERS:', headers);
        console.log('PAST TRACK HISTORIAN RECORDS LENGTH:', records ? records.length : 0);

        if (!headers || !records || records.length === 0) {
            return [];
        }

        var latIndex = this.findHeaderIndex(headers, routeTags.lat, ['LAT', 'LATITUDE', 'GPSLAT']);
        var lngIndex = this.findHeaderIndex(headers, routeTags.lng, ['LONG', 'LNG', 'LON', 'LONGITUDE', 'GPSLONG']);
        var speedIndex = this.findHeaderIndex(headers, routeTags.speed, ['SPEED', 'SOG']);
        var courseIndex = this.findHeaderIndex(headers, routeTags.course, ['COURSE', 'COG', 'HEADING', 'HEAD']);
        var fuelIndex = this.findHeaderIndex(headers, routeTags.fuelRate, ['FUEL', 'MFLOW']);
        var timeIndex = this.findHeaderIndex(headers, '', ['TIME', 'TIMESTAMP', 'DATETIME', 'DATE']);

        console.log('PAST TRACK HEADER INDEX:', {
            timeIndex: timeIndex,
            latIndex: latIndex,
            lngIndex: lngIndex,
            speedIndex: speedIndex,
            courseIndex: courseIndex,
            fuelIndex: fuelIndex
        });

        if (latIndex < 0 || lngIndex < 0) {
            console.warn('PAST TRACK: Headers found but cannot find lat/lng column');
            return [];
        }

        var points: PastTrackPoint[] = [];

        for (var i = 0; i < records.length; i++) {
            var record = records[i];

            var rawTime = this.readRecordTime(record, headers, timeIndex, i);
            var lat = this.toNumber(this.readRecordValue(record, headers, latIndex, routeTags.lat));
            var lng = this.toNumber(this.readRecordValue(record, headers, lngIndex, routeTags.lng));

            if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
                continue;
            }

            if (!this.isInDateRange(rawTime, startDate, endDate)) {
                continue;
            }

            points.push(this.createPoint(
                points.length + 1,
                vesselId,
                rawTime,
                lat,
                lng,
                this.toNumber(this.readRecordValue(record, headers, speedIndex, routeTags.speed)),
                this.toNumber(this.readRecordValue(record, headers, courseIndex, routeTags.course)),
                this.toNumber(this.readRecordValue(record, headers, fuelIndex, routeTags.fuelRate))
            ));
        }

        console.log('PAST TRACK HEADER RECORD POINTS:', points);

        return this.sortAndRemoveDuplicate(points);
    }

    private createPoint(
        no: number,
        vesselId: string,
        rawTime: any,
        lat: number,
        lng: number,
        speed: number,
        course: number,
        fuelRate: number
    ): PastTrackPoint {

        if (isNaN(speed)) { speed = 0; }
        if (isNaN(course)) { course = 0; }
        if (isNaN(fuelRate)) { fuelRate = 0; }

        return {
            no: no,
            vesselId: vesselId,
            time: rawTime ? String(rawTime) : '-',
            lat: Number(lat),
            lng: Number(lng),
            status: speed > 0 ? 'Sailing' : 'Idle',
            speed: Number(speed.toFixed(2)),
            course: Number(course.toFixed(2)),
            engine: speed > 0 ? 'Running' : 'Idle',
            fuelRate: Number(fuelRate.toFixed(2))
        };
    }

    private findHeaderIndex(headers: any[], selectedTag: string, keywords: string[]): number {
        if (!headers || headers.length === 0) {
            return -1;
        }

        var selected = this.normalizeText(selectedTag);

        for (var i = 0; i < headers.length; i++) {
            var headerText = this.normalizeText(this.headerToText(headers[i]));

            if (selected && headerText === selected) {
                return i;
            }

            if (selected && headerText.indexOf(selected) >= 0) {
                return i;
            }

            if (selected && selected.indexOf(headerText) >= 0) {
                return i;
            }
        }

        for (var h = 0; h < headers.length; h++) {
            var text = this.normalizeText(this.headerToText(headers[h]));

            for (var k = 0; k < keywords.length; k++) {
                var keyword = this.normalizeText(keywords[k]);

                if (text.indexOf(keyword) >= 0) {
                    return h;
                }
            }
        }

        return -1;
    }

    private flattenHistoryRows(rows: any[], routeTags: any, grouped: any): void {
        if (!rows || rows.length === 0) {
            return;
        }

        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            var parentTagName = this.getTagName(row);
            var nested = this.getNestedArray(row);

            if (nested && nested.length > 0) {
                for (var n = 0; n < nested.length; n++) {
                    this.pushHistoryValue(grouped, nested[n], parentTagName, routeTags, i + '-' + n);
                }
            } else {
                this.pushHistoryValue(grouped, row, parentTagName, routeTags, String(i));
            }
        }
    }

    private pushHistoryValue(
        grouped: any,
        row: any,
        parentTagName: string,
        routeTags: any,
        fallbackKey: string
    ): void {

        var tagName = this.getTagName(row) || parentTagName;
        var type = this.getTypeFromSelectedTag(tagName, routeTags);

        if (!type) {
            return;
        }

        var time = this.getTimeValue(row);
        var value = this.getTagValue(row);

        if (value === undefined || value === null || value === '') {
            return;
        }

        var groupKey = time ? String(time) : fallbackKey;

        if (!grouped[groupKey]) {
            grouped[groupKey] = {
                time: time
            };
        }

        grouped[groupKey][type] = value;
    }

    private getTypeFromSelectedTag(tagName: string, routeTags: any): string {
        if (!tagName) {
            return '';
        }

        var name = this.normalizeText(tagName);

        if (routeTags.lat && name === this.normalizeText(routeTags.lat)) { return 'lat'; }
        if (routeTags.lng && name === this.normalizeText(routeTags.lng)) { return 'lng'; }
        if (routeTags.speed && name === this.normalizeText(routeTags.speed)) { return 'speed'; }
        if (routeTags.course && name === this.normalizeText(routeTags.course)) { return 'course'; }
        if (routeTags.fuelRate && name === this.normalizeText(routeTags.fuelRate)) { return 'fuelRate'; }

        return '';
    }

    private buildSummary(vesselId: string, points: PastTrackPoint[]): PastTrackSummary {
        var savedVessel = this.getSavedVessel();

        return {
            vesselId: vesselId,
            vesselName: this.getVesselName(vesselId, savedVessel),
            vesselType: this.getVesselType(savedVessel),
            imo: this.getImo(savedVessel),
            mmsi: this.getMmsi(savedVessel),
            status: points.length > 0 ? 'Online' : 'No Data',
            image: this.getVesselImage(savedVessel),
            totalDistance: this.calculateTotalDistance(points),
            trackPoints: points.length,
            avgSpeed: this.calculateAvgSpeed(points),
            totalTime: this.calculateTotalTime(points),
            lastUpdate: points.length > 0 ? points[points.length - 1].time : '-'
        };
    }

    private getSavedVessel(): any {
        try {
            var raw = localStorage.getItem('pastTrackVessel');

            if (!raw) {
                return null;
            }

            return JSON.parse(raw);
        } catch (error) {
            return null;
        }
    }

    private getVesselName(vesselId: string, vessel: any): string {
        if (vessel && vessel.fv && vessel.fv.name) {
            return vessel.fv.name;
        }

        if (vessel && vessel.name) {
            return vessel.name;
        }

        return vesselId ? vesselId.replace(/_/g, ' ') : 'VESSEL';
    }

    private getVesselType(vessel: any): string {
        if (vessel && vessel.fv && vessel.fv.desc) {
            return vessel.fv.desc;
        }

        if (vessel && vessel.desc) {
            return vessel.desc;
        }

        if (vessel && vessel.type) {
            return vessel.type;
        }

        return 'AHTS';
    }

    private getImo(vessel: any): string {
        if (vessel && vessel.imo) {
            return String(vessel.imo);
        }

        return '-';
    }

    private getMmsi(vessel: any): string {
        if (vessel && vessel.mmsi) {
            return String(vessel.mmsi);
        }

        return '-';
    }

    private getVesselImage(vessel: any): string {
        if (vessel && vessel.fv && vessel.fv.img) {
            return vessel.fv.img;
        }

        if (vessel && vessel.img) {
            return vessel.img;
        }

        if (vessel && vessel.image) {
            return vessel.image;
        }

        return 'assets/images/vessel/default-vessel.png';
    }

    private headerToText(header: any): string {
        if (header === undefined || header === null) {
            return '';
        }

        if (typeof header === 'string') {
            return header;
        }

        var tagName = this.readFirst(header, [
            'TagName',
            'tagName',
            'Name',
            'name',
            'Header',
            'header',
            'Key',
            'key',
            'Description',
            'description'
        ]);

        if (tagName) {
            return String(tagName);
        }

        try {
            return JSON.stringify(header);
        } catch (error) {
            return String(header);
        }
    }

    private readRecordTime(record: any, headers: any[], timeIndex: number, fallbackIndex: number): any {
        if (!record) {
            return fallbackIndex;
        }

        if (Array.isArray(record)) {
            if (timeIndex >= 0 && record[timeIndex] !== undefined) {
                return record[timeIndex];
            }

            return record[0];
        }

        var directTime = this.readFirstDeep(record, [
            'Time',
            'time',
            'Timestamp',
            'timestamp',
            'DateTime',
            'dateTime',
            'datetime',
            'Date',
            'date',
            'CreatedAt',
            'createdAt',
            'RecordTime',
            'recordTime'
        ]);

        if (directTime) {
            return directTime;
        }

        if (timeIndex >= 0) {
            var headerName = this.headerToText(headers[timeIndex]);

            if (record[headerName] !== undefined) {
                return record[headerName];
            }
        }

        return fallbackIndex;
    }

    private readRecordValue(record: any, headers: any[], index: number, selectedTag: string): any {
        if (!record || index < 0) {
            return undefined;
        }

        if (Array.isArray(record)) {
            return record[index];
        }

        var selected = selectedTag ? String(selectedTag) : '';
        var headerName = this.headerToText(headers[index]);

        if (selected && record[selected] !== undefined) {
            return record[selected];
        }

        if (headerName && record[headerName] !== undefined) {
            return record[headerName];
        }

        if (record.Values && Array.isArray(record.Values)) {
            return record.Values[index];
        }

        if (record.values && Array.isArray(record.values)) {
            return record.values[index];
        }

        if (record.Data && Array.isArray(record.Data)) {
            return record.Data[index];
        }

        if (record.data && Array.isArray(record.data)) {
            return record.data[index];
        }

        return undefined;
    }

    private getNestedArray(row: any): any[] {
        var nested = this.readFirst(row, [
            'values',
            'Values',
            'data',
            'Data',
            'items',
            'Items',
            'records',
            'Records',
            'history',
            'History'
        ]);

        return Array.isArray(nested) ? nested : [];
    }

    private getTagName(row: any): any {
        return this.readFirst(row, [
            'TagName',
            'tagName',
            'tagname',
            'TAGNAME',
            'Name',
            'name',
            'NAME',
            'Tag',
            'tag',
            'TAG'
        ]);
    }

    private getTagValue(row: any): any {
        return this.readFirstDeep(row, [
            'Value',
            'value',
            'VALUE',
            'Val',
            'val',
            'VAL',
            'DataValue',
            'dataValue',
            'CurrentValue',
            'currentValue',
            'v',
            'V'
        ]);
    }

    private extractArray(res: any): any[] {
        if (!res) {
            return [];
        }

        if (typeof res === 'string') {
            try {
                res = JSON.parse(res);
            } catch (error) {
                return [];
            }
        }

        if (Array.isArray(res)) { return res; }

        if (Array.isArray(res.points)) { return res.points; }
        if (Array.isArray(res.Points)) { return res.Points; }
        if (Array.isArray(res.data)) { return res.data; }
        if (Array.isArray(res.Data)) { return res.Data; }
        if (Array.isArray(res.result)) { return res.result; }
        if (Array.isArray(res.Result)) { return res.Result; }
        if (Array.isArray(res.rows)) { return res.rows; }
        if (Array.isArray(res.Rows)) { return res.Rows; }
        if (Array.isArray(res.route)) { return res.route; }
        if (Array.isArray(res.Route)) { return res.Route; }
        if (Array.isArray(res.track)) { return res.track; }
        if (Array.isArray(res.Track)) { return res.Track; }
        if (Array.isArray(res.Records)) { return res.Records; }
        if (Array.isArray(res.records)) { return res.records; }

        return [];
    }

    private getLatValue(row: any): any {
        return this.readFirstDeep(row, [
            'lat',
            'Lat',
            'LAT',
            'latitude',
            'Latitude',
            'LATITUDE',
            'gpsLat',
            'GpsLat',
            'GPS_LAT',
            'GPSLat',
            'VES_GPS_LAT',
            'VES_LAT',
            'y',
            'Y'
        ]);
    }

    private getLngValue(row: any): any {
        return this.readFirstDeep(row, [
            'lng',
            'Lng',
            'LNG',
            'long',
            'Long',
            'LONG',
            'lon',
            'Lon',
            'LON',
            'longitude',
            'Longitude',
            'LONGITUDE',
            'gpsLng',
            'GpsLng',
            'GPS_LNG',
            'GPSLng',
            'GPS_LONG',
            'VES_GPS_LONG',
            'VES_GPS_LNG',
            'VES_LONG',
            'VES_LNG',
            'x',
            'X'
        ]);
    }

    private getTimeValue(row: any): any {
        return this.readFirstDeep(row, [
            'Time',
            'time',
            'TIME',
            'Timestamp',
            'timestamp',
            'TIMESTAMP',
            'DateTime',
            'dateTime',
            'datetime',
            'Date',
            'date',
            'CreatedAt',
            'createdAt',
            'StartTime',
            'startTime',
            'TS',
            'ts'
        ]);
    }

    private getSpeedValue(row: any): any {
        return this.readFirstDeep(row, [
            'speed',
            'Speed',
            'SPEED',
            'sog',
            'SOG',
            'VES_GPS_SPEED',
            'VES_GPS_SOG'
        ]);
    }

    private getCourseValue(row: any): any {
        return this.readFirstDeep(row, [
            'course',
            'Course',
            'COURSE',
            'heading',
            'Heading',
            'HEADING',
            'head',
            'Head',
            'HEAD',
            'VES_GPS_COURSE',
            'VES_GPS_HEAD',
            'COG'
        ]);
    }

    private getFuelRateValue(row: any): any {
        return this.readFirstDeep(row, [
            'fuelRate',
            'FuelRate',
            'fuel_rate',
            'VES_FUEL_RATE',
            'fuel',
            'Fuel',
            'FUEL'
        ]);
    }

    private readFirst(row: any, keys: string[]): any {
        if (!row) {
            return undefined;
        }

        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];

            if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
                return row[key];
            }
        }

        return undefined;
    }

    private readFirstDeep(row: any, keys: string[]): any {
        return this.readFirstDeepInternal(row, keys, 0);
    }

    private readFirstDeepInternal(row: any, keys: string[], depth: number): any {
        if (!row || depth > 3) {
            return undefined;
        }

        var value = this.readFirst(row, keys);

        if (value !== undefined && value !== null && value !== '') {
            return value;
        }

        if (typeof row !== 'object') {
            return undefined;
        }

        var objectKeys = Object.keys(row);

        for (var i = 0; i < objectKeys.length; i++) {
            var child = row[objectKeys[i]];

            if (child && typeof child === 'object' && !Array.isArray(child)) {
                var childValue = this.readFirstDeepInternal(child, keys, depth + 1);

                if (childValue !== undefined && childValue !== null && childValue !== '') {
                    return childValue;
                }
            }
        }

        return undefined;
    }

    private sortAndRemoveDuplicate(points: PastTrackPoint[]): PastTrackPoint[] {
        points.sort((a: PastTrackPoint, b: PastTrackPoint) => {
            var ta = new Date(a.time).getTime();
            var tb = new Date(b.time).getTime();

            if (isNaN(ta) || isNaN(tb)) {
                return 0;
            }

            return ta - tb;
        });

        var result: PastTrackPoint[] = [];
        var cache: any = {};

        for (var i = 0; i < points.length; i++) {
            var p = points[i];
            var key = p.lat + '|' + p.lng + '|' + p.time;

            if (!cache[key]) {
                cache[key] = true;
                p.no = result.length + 1;
                result.push(p);
            }
        }

        return result;
    }

    private isInDateRange(time: any, startDate: string, endDate: string): boolean {
        if (!startDate || !endDate) {
            return true;
        }

        if (!time) {
            return true;
        }

        var pointTime = new Date(time).getTime();
        var start = new Date(startDate + ' 00:00:00').getTime();
        var end = new Date(endDate + ' 23:59:59').getTime();

        if (isNaN(pointTime) || isNaN(start) || isNaN(end)) {
            return true;
        }

        return pointTime >= start && pointTime <= end;
    }

    private calculateAvgSpeed(points: PastTrackPoint[]): number {
        if (!points || points.length === 0) {
            return 0;
        }

        var total = 0;

        for (var i = 0; i < points.length; i++) {
            total += points[i].speed;
        }

        return Number((total / points.length).toFixed(1));
    }

    private calculateTotalDistance(points: PastTrackPoint[]): number {
        if (!points || points.length <= 1) {
            return 0;
        }

        var total = 0;

        for (var i = 1; i < points.length; i++) {
            total += this.distanceNm(
                points[i - 1].lat,
                points[i - 1].lng,
                points[i].lat,
                points[i].lng
            );
        }

        return Number(total.toFixed(1));
    }

    private calculateTotalTime(points: PastTrackPoint[]): string {
        if (!points || points.length < 2) {
            return '-';
        }

        var first = new Date(points[0].time).getTime();
        var last = new Date(points[points.length - 1].time).getTime();

        if (isNaN(first) || isNaN(last)) {
            return '-';
        }

        var diffMinutes = Math.floor((last - first) / (1000 * 60));
        var hours = Math.floor(diffMinutes / 60);
        var minutes = diffMinutes % 60;

        return hours + 'h ' + minutes + 'm';
    }

    private distanceNm(lat1: number, lng1: number, lat2: number, lng2: number): number {
        var r = 6371;
        var dLat = this.toRad(lat2 - lat1);
        var dLng = this.toRad(lng2 - lng1);

        var a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) *
            Math.cos(this.toRad(lat2)) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);

        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        var km = r * c;

        return km * 0.539957;
    }

    private toRad(value: number): number {
        return value * Math.PI / 180;
    }

    private toNumber(value: any): number {
        if (value === undefined || value === null || value === '') {
            return NaN;
        }

        if (typeof value === 'string') {
            value = value.replace(',', '.');
        }

        return Number(value);
    }

    private normalizeText(value: any): string {
        if (!value) {
            return '';
        }

        return String(value)
            .toUpperCase()
            .replace(/\s/g, '')
            .replace(/_/g, '')
            .replace(/-/g, '')
            .replace(/\./g, '');
    }
}
