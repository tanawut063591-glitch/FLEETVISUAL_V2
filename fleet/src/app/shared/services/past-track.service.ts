import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap, timeout } from 'rxjs/operators';

import { NewHttpClientService } from './http-client1.service';
import {
  PastTrackPoint,
  PastTrackResponse,
  PastTrackSummary,
} from '../../features/past-track/models/past-track.model';

type RouteValueType = 'lat' | 'lng' | 'speed' | 'course' | 'fuelRate';

interface RouteTags {
  lat: string;
  lng: string;
  speed: string;
  course: string;
  fuelRate: string;
}

interface HistorianSample {
  time: number;
  value: number;
}

interface HistorianSamples {
  lat: HistorianSample[];
  lng: HistorianSample[];
  speed: HistorianSample[];
  course: HistorianSample[];
  fuelRate: HistorianSample[];
}

interface HeaderTable {
  headers: any[];
  records: any[];
}

@Injectable({
  providedIn: 'root',
})
export class PastTrackService {
  private readonly pointTimeoutMs = 20_000;
  private readonly historianTimeoutMs = 60_000;
  private readonly pairToleranceMs = 75_000;
  private readonly defaultSamplingIntervalMinutes = 30;
  private readonly samplingToleranceMs = 15 * 60_000;

  constructor(private readonly newHttp: NewHttpClientService) {}

  /**
   * Loads historical route data for a single vessel.
   * 1) Load the vessel tags by prefix.
   * 2) Resolve GPS latitude / longitude and supporting tags.
   * 3) Call the same historian contract used by Data Logger.
   * 4) Pair latitude and longitude by timestamp and return a route-ready polyline dataset.
   */
  getPastTrack(
    vesselId: string,
    startDate: string,
    endDate: string,
    samplingIntervalMinutes = this.defaultSamplingIntervalMinutes
  ): Observable<PastTrackResponse> {
    const prefix = this.normalizePrefix(vesselId);
    const intervalMinutes = this.normalizeSamplingInterval(samplingIntervalMinutes);

    if (!prefix) {
      return of(this.buildResponse('', [], [], startDate, endDate, intervalMinutes));
    }

    console.info('[PastTrack] loading vessel:', prefix);

    return this.newHttp.getPoints(prefix).pipe(
      timeout(this.pointTimeoutMs),
      catchError((error: any) => {
        // If /getpoints fails, continue with the platform's standard GPS tags.
        console.warn('[PastTrack] getPoints failed; using standard GPS tags', error);
        return of([]);
      }),
      switchMap((getPointsResponse: any) => {
        const directPoints = this.normalizeDirectPoints(
          getPointsResponse,
          prefix,
          startDate,
          endDate
        );

        if (directPoints.length > 0) {
          const sampledPoints = this.resampleToFixedSlots(
            directPoints,
            startDate,
            endDate,
            intervalMinutes
          );

          console.info('[PastTrack] direct route points:', {
            raw: directPoints.length,
            sampled: sampledPoints.length,
            intervalMinutes,
          });

          return of(
            this.buildResponse(
              prefix,
              sampledPoints,
              directPoints,
              startDate,
              endDate,
              intervalMinutes
            )
          );
        }

        const tagRows = this.extractTagRows(getPointsResponse);
        const routeTags = this.resolveRouteTags(tagRows, prefix);
        const range = this.buildHistoryRange(startDate, endDate);
        const tagRequest = this.buildTagRequest(routeTags, prefix);

        console.info('[PastTrack] route tags:', routeTags);
        console.info('[PastTrack] historian range:', range);

        return this.newHttp
          .getHistorianValues(range.start, range.end, tagRequest)
          .pipe(
            timeout(this.historianTimeoutMs),
            map((historyResponse: any) => {
              const points = this.normalizeHistorianPoints(
                historyResponse,
                prefix,
                routeTags,
                startDate,
                endDate
              );

              const sampledPoints = this.resampleToFixedSlots(
                points,
                startDate,
                endDate,
                intervalMinutes
              );

              console.info('[PastTrack] normalized route points:', {
                raw: points.length,
                sampled: sampledPoints.length,
                intervalMinutes,
              });

              return this.buildResponse(
                prefix,
                sampledPoints,
                points,
                startDate,
                endDate,
                intervalMinutes
              );
            }),
            catchError((error: any) => {
              console.error('[PastTrack] historian request failed:', error);
              return of(
                this.buildResponse(prefix, [], [], startDate, endDate, intervalMinutes)
              );
            })
          );
      }),
      catchError((error: any) => {
        console.error('[PastTrack] load failed:', error);
        return of(this.buildResponse(prefix, [], [], startDate, endDate, intervalMinutes));
      })
    );
  }

  private resolveRouteTags(tagRows: any[], prefix: string): RouteTags {
    const raw: RouteTags = {
      lat: this.findBestTag(tagRows, 'lat') || 'VES-GPS-LAT',
      lng: this.findBestTag(tagRows, 'lng') || 'VES-GPS-LONG',
      speed: this.findBestTag(tagRows, 'speed') || 'VES-GPS-SPEED',
      course: this.findBestTag(tagRows, 'course') || 'VES-GPS-HEAD',
      fuelRate: this.findBestTag(tagRows, 'fuelRate'),
    };

    return {
      lat: this.ensureVesselPrefix(raw.lat, prefix),
      lng: this.ensureVesselPrefix(raw.lng, prefix),
      speed: this.ensureVesselPrefix(raw.speed, prefix),
      course: this.ensureVesselPrefix(raw.course, prefix),
      fuelRate: raw.fuelRate ? this.ensureVesselPrefix(raw.fuelRate, prefix) : '',
    };
  }

  private buildTagRequest(routeTags: RouteTags, prefix: string): any[] {
    const result: any[] = [];

    (Object.keys(routeTags) as RouteValueType[]).forEach((type: RouteValueType) => {
      const tagName = routeTags[type];

      if (!tagName) {
        return;
      }

      result.push({
        name: this.stripVesselPrefix(tagName, prefix),
        tagName,
        vesselPrefix: prefix,
      });
    });

    return result;
  }

  private normalizeHistorianPoints(
    response: any,
    vesselId: string,
    routeTags: RouteTags,
    startDate: string,
    endDate: string
  ): PastTrackPoint[] {
    const source = this.parseJsonValue(response);

    // Supports table responses such as { Headers: [...], Records: [...] }.
    const tablePoints = this.normalizeHeaderTables(
      source,
      vesselId,
      routeTags,
      startDate,
      endDate
    );

    if (tablePoints.length > 0) {
      return this.sanitizeTrack(tablePoints);
    }

    // Supports series, flat-record and nested-object response formats.
    const samples: HistorianSamples = {
      lat: [],
      lng: [],
      speed: [],
      course: [],
      fuelRate: [],
    };

    const series = this.extractHistorianSeries(source);
    const requestedTags = [
      routeTags.lat,
      routeTags.lng,
      routeTags.speed,
      routeTags.course,
      routeTags.fuelRate,
    ];
    const visited = new WeakSet<object>();

    if (series.length > 0) {
      series.forEach((item: any, index: number) => {
        const fallbackTag = this.getTagName(item) || requestedTags[index] || '';
        this.collectHistorianSamples(
          item,
          fallbackTag,
          routeTags,
          samples,
          visited,
          0
        );
      });
    } else {
      this.collectHistorianSamples(
        source,
        '',
        routeTags,
        samples,
        visited,
        0
      );
    }

    const latSamples = this.normalizeSamples(samples.lat);
    const lngSamples = this.normalizeSamples(samples.lng);
    const speedSamples = this.normalizeSamples(samples.speed);
    const courseSamples = this.normalizeSamples(samples.course);
    const fuelSamples = this.normalizeSamples(samples.fuelRate);

    const points: PastTrackPoint[] = [];

    for (const latSample of latSamples) {
      const lngSample = this.findNearestSample(
        lngSamples,
        latSample.time,
        this.pairToleranceMs
      );

      if (!lngSample) {
        continue;
      }

      const lat = latSample.value;
      const lng = lngSample.value;

      if (!this.isValidCoordinate(lat, lng)) {
        continue;
      }

      const pointTime = Math.round((latSample.time + lngSample.time) / 2);

      if (!this.isTimestampInRange(pointTime, startDate, endDate)) {
        continue;
      }

      const speed = this.findNearestSample(
        speedSamples,
        pointTime,
        this.pairToleranceMs
      )?.value;
      const course = this.findNearestSample(
        courseSamples,
        pointTime,
        this.pairToleranceMs
      )?.value;
      const fuelRate = this.findNearestSample(
        fuelSamples,
        pointTime,
        this.pairToleranceMs
      )?.value;

      points.push(
        this.createPoint(
          points.length + 1,
          vesselId,
          pointTime,
          lat,
          lng,
          speed ?? 0,
          course ?? 0,
          fuelRate ?? 0
        )
      );
    }

    return this.sanitizeTrack(points);
  }

  private normalizeHeaderTables(
    source: any,
    vesselId: string,
    routeTags: RouteTags,
    startDate: string,
    endDate: string
  ): PastTrackPoint[] {
    const tables: HeaderTable[] = [];
    this.findHeaderTables(source, tables, new WeakSet<object>(), 0);

    const points: PastTrackPoint[] = [];

    for (const table of tables) {
      const latIndex = this.findHeaderIndex(table.headers, routeTags.lat, [
        'VESGPSLAT',
        'GPSLAT',
        'LATITUDE',
      ]);
      const lngIndex = this.findHeaderIndex(table.headers, routeTags.lng, [
        'VESGPSLONG',
        'VESGPSLNG',
        'GPSLONG',
        'GPSLNG',
        'LONGITUDE',
      ]);

      if (latIndex < 0 || lngIndex < 0) {
        continue;
      }

      const timeIndex = this.findHeaderIndex(table.headers, '', [
        'TIMESTAMP',
        'DATETIME',
        'RECORDTIME',
        'TIME',
        'DATE',
      ]);
      const speedIndex = this.findHeaderIndex(table.headers, routeTags.speed, [
        'VESGPSSPEED',
        'SPEED',
        'SOG',
      ]);
      const courseIndex = this.findHeaderIndex(table.headers, routeTags.course, [
        'VESGPSHEAD',
        'COURSE',
        'HEADING',
        'COG',
      ]);
      const fuelIndex = this.findHeaderIndex(table.headers, routeTags.fuelRate, [
        'FUELRATE',
        'FUELFLOW',
        'MFLOW',
      ]);

      for (let index = 0; index < table.records.length; index += 1) {
        const record = table.records[index];
        const rawTime = this.readRecordTime(record, table.headers, timeIndex);
        const timestamp = this.parseTimestamp(rawTime);
        const lat = this.toNumber(
          this.readRecordValue(record, table.headers, latIndex, routeTags.lat)
        );
        const lng = this.toNumber(
          this.readRecordValue(record, table.headers, lngIndex, routeTags.lng)
        );

        if (
          timestamp === null ||
          !this.isValidCoordinate(lat, lng) ||
          !this.isTimestampInRange(timestamp, startDate, endDate)
        ) {
          continue;
        }

        const speed = this.toNumber(
          this.readRecordValue(record, table.headers, speedIndex, routeTags.speed)
        );
        const course = this.toNumber(
          this.readRecordValue(record, table.headers, courseIndex, routeTags.course)
        );
        const fuelRate = this.toNumber(
          this.readRecordValue(record, table.headers, fuelIndex, routeTags.fuelRate)
        );

        points.push(
          this.createPoint(
            points.length + 1,
            vesselId,
            timestamp,
            lat,
            lng,
            Number.isFinite(speed) ? speed : 0,
            Number.isFinite(course) ? course : 0,
            Number.isFinite(fuelRate) ? fuelRate : 0
          )
        );
      }
    }

    return this.sortAndRemoveDuplicate(points);
  }

  private collectHistorianSamples(
    rawValue: any,
    parentTagName: string,
    routeTags: RouteTags,
    samples: HistorianSamples,
    visited: WeakSet<object>,
    depth: number
  ): void {
    if (rawValue === null || rawValue === undefined || depth > 12) {
      return;
    }

    const value = this.parseJsonValue(rawValue);

    if (Array.isArray(value)) {
      for (const item of value) {
        this.collectHistorianSamples(
          item,
          parentTagName,
          routeTags,
          samples,
          visited,
          depth + 1
        );
      }
      return;
    }

    if (typeof value !== 'object') {
      return;
    }

    if (visited.has(value)) {
      return;
    }
    visited.add(value);

    const ownTagName = this.getTagName(value) || parentTagName;
    const timestamp = this.parseTimestamp(this.getTimeValue(value));
    const rawRecordValue = this.getTagValue(value);
    const type = this.getTypeFromSelectedTag(ownTagName, routeTags);

    if (
      type &&
      timestamp !== null &&
      rawRecordValue !== undefined &&
      rawRecordValue !== null &&
      !Array.isArray(rawRecordValue) &&
      typeof rawRecordValue !== 'object'
    ) {
      const numericValue = this.toNumber(rawRecordValue);

      if (Number.isFinite(numericValue)) {
        samples[type].push({ time: timestamp, value: numericValue });
      }
    }

    const keys = Object.keys(value);

    for (const key of keys) {
      const child = value[key];

      if (!child || (typeof child !== 'object' && !Array.isArray(child))) {
        continue;
      }

      const nextParentTag = this.looksLikeRouteTag(key)
        ? key
        : ownTagName;

      this.collectHistorianSamples(
        child,
        nextParentTag,
        routeTags,
        samples,
        visited,
        depth + 1
      );
    }
  }

  private normalizeDirectPoints(
    response: any,
    vesselId: string,
    startDate: string,
    endDate: string
  ): PastTrackPoint[] {
    const rows = this.extractTagRows(response);
    const points: PastTrackPoint[] = [];

    for (const row of rows) {
      const lat = this.toNumber(this.getLatValue(row));
      const lng = this.toNumber(this.getLngValue(row));
      const timestamp = this.parseTimestamp(this.getTimeValue(row));

      if (
        timestamp === null ||
        !this.isValidCoordinate(lat, lng) ||
        !this.isTimestampInRange(timestamp, startDate, endDate)
      ) {
        continue;
      }

      const speed = this.toNumber(this.getSpeedValue(row));
      const course = this.toNumber(this.getCourseValue(row));
      const fuelRate = this.toNumber(this.getFuelRateValue(row));

      points.push(
        this.createPoint(
          points.length + 1,
          vesselId,
          timestamp,
          lat,
          lng,
          Number.isFinite(speed) ? speed : 0,
          Number.isFinite(course) ? course : 0,
          Number.isFinite(fuelRate) ? fuelRate : 0
        )
      );
    }

    return this.sanitizeTrack(points);
  }

  private createPoint(
    no: number,
    vesselId: string,
    timestamp: number,
    lat: number,
    lng: number,
    speed: number,
    course: number,
    fuelRate: number
  ): PastTrackPoint {
    const safeSpeed = Number.isFinite(speed) ? speed : 0;

    return {
      no,
      vesselId,
      time: this.formatDisplayTime(new Date(timestamp)),
      lat: Number(lat),
      lng: Number(lng),
      status: safeSpeed > 0.5 ? 'Sailing' : 'Idle',
      speed: Number(safeSpeed.toFixed(2)),
      course: Number((Number.isFinite(course) ? course : 0).toFixed(2)),
      engine: safeSpeed > 0.5 ? 'Running' : 'Idle',
      fuelRate: Number((Number.isFinite(fuelRate) ? fuelRate : 0).toFixed(2)),
    };
  }

  private sanitizeTrack(points: PastTrackPoint[]): PastTrackPoint[] {
    const sorted = this.sortAndRemoveDuplicate(points);
    const result: PastTrackPoint[] = [];

    for (const point of sorted) {
      if (!this.isValidCoordinate(point.lat, point.lng)) {
        continue;
      }

      const previous = result[result.length - 1];

      if (previous && this.isImplausibleJump(previous, point)) {
        console.warn('[PastTrack] skipped implausible GPS jump', {
          from: previous,
          to: point,
        });
        continue;
      }

      point.no = result.length + 1;
      result.push(point);
    }

    return result;
  }

  private isImplausibleJump(previous: PastTrackPoint, current: PastTrackPoint): boolean {
    const previousTime = this.parseTimestamp(previous.time);
    const currentTime = this.parseTimestamp(current.time);

    if (previousTime === null || currentTime === null || currentTime <= previousTime) {
      return false;
    }

    const hours = (currentTime - previousTime) / 3_600_000;

    if (hours <= 0) {
      return false;
    }

    const distance = this.distanceNm(
      previous.lat,
      previous.lng,
      current.lat,
      current.lng
    );
    const impliedSpeed = distance / hours;

    return impliedSpeed > 120;
  }

  private normalizeSamples(input: HistorianSample[]): HistorianSample[] {
    const sorted = input
      .filter(
        (sample: HistorianSample) =>
          Number.isFinite(sample.time) && Number.isFinite(sample.value)
      )
      .sort((a: HistorianSample, b: HistorianSample) => a.time - b.time);

    const map = new Map<number, HistorianSample>();

    for (const sample of sorted) {
      // The historian is minute-based, so tiny second/millisecond differences share one bucket.
      const bucket = Math.floor(sample.time / 60_000) * 60_000;
      map.set(bucket, { time: sample.time, value: sample.value });
    }

    return Array.from(map.values()).sort(
      (a: HistorianSample, b: HistorianSample) => a.time - b.time
    );
  }

  private findNearestSample(
    samples: HistorianSample[],
    targetTime: number,
    toleranceMs: number
  ): HistorianSample | null {
    if (samples.length === 0) {
      return null;
    }

    let low = 0;
    let high = samples.length - 1;

    while (low <= high) {
      const middle = Math.floor((low + high) / 2);
      const value = samples[middle].time;

      if (value < targetTime) {
        low = middle + 1;
      } else if (value > targetTime) {
        high = middle - 1;
      } else {
        return samples[middle];
      }
    }

    const candidates: HistorianSample[] = [];

    if (low < samples.length) {
      candidates.push(samples[low]);
    }
    if (low - 1 >= 0) {
      candidates.push(samples[low - 1]);
    }

    let nearest: HistorianSample | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const candidate of candidates) {
      const distance = Math.abs(candidate.time - targetTime);

      if (distance < nearestDistance) {
        nearest = candidate;
        nearestDistance = distance;
      }
    }

    return nearest && nearestDistance <= toleranceMs ? nearest : null;
  }

  private findHeaderTables(
    rawValue: any,
    result: HeaderTable[],
    visited: WeakSet<object>,
    depth: number
  ): void {
    if (rawValue === null || rawValue === undefined || depth > 10) {
      return;
    }

    const value = this.parseJsonValue(rawValue);

    if (Array.isArray(value)) {
      for (const item of value) {
        this.findHeaderTables(item, result, visited, depth + 1);
      }
      return;
    }

    if (typeof value !== 'object') {
      return;
    }

    if (visited.has(value)) {
      return;
    }
    visited.add(value);

    const headers = value['Headers'] || value['headers'];
    const records = value['Records'] || value['records'];

    if (Array.isArray(headers) && Array.isArray(records)) {
      result.push({ headers, records });
    }

    for (const key of Object.keys(value)) {
      const child = value[key];
      if (child && typeof child === 'object') {
        this.findHeaderTables(child, result, visited, depth + 1);
      }
    }
  }

  private findHeaderIndex(
    headers: any[],
    selectedTag: string,
    keywords: string[]
  ): number {
    const selectedAliases = this.getTagAliases(selectedTag);

    for (let index = 0; index < headers.length; index += 1) {
      const header = this.normalizeText(this.headerToText(headers[index]));

      if (selectedAliases.some((alias: string) => header === alias || header.includes(alias))) {
        return index;
      }
    }

    for (let index = 0; index < headers.length; index += 1) {
      const header = this.normalizeText(this.headerToText(headers[index]));

      if (keywords.some((keyword: string) => header.includes(this.normalizeText(keyword)))) {
        return index;
      }
    }

    return -1;
  }

  private readRecordTime(record: any, headers: any[], timeIndex: number): any {
    if (Array.isArray(record)) {
      return timeIndex >= 0 ? record[timeIndex] : record[0];
    }

    const direct = this.readFirstDeep(record, [
      'TimeStamp',
      'Timestamp',
      'timeStamp',
      'timestamp',
      'Time',
      'time',
      'DateTime',
      'datetime',
      'Date',
      'date',
      'RecordTime',
      'recordTime',
    ]);

    if (direct !== undefined) {
      return direct;
    }

    if (timeIndex >= 0) {
      const headerName = this.headerToText(headers[timeIndex]);
      return record?.[headerName];
    }

    return undefined;
  }

  private readRecordValue(
    record: any,
    headers: any[],
    index: number,
    selectedTag: string
  ): any {
    if (index < 0 || !record) {
      return undefined;
    }

    if (Array.isArray(record)) {
      return record[index];
    }

    const headerName = this.headerToText(headers[index]);

    if (selectedTag && record[selectedTag] !== undefined) {
      return record[selectedTag];
    }
    if (headerName && record[headerName] !== undefined) {
      return record[headerName];
    }

    const arrays = [record['Values'], record['values'], record['Data'], record['data']];

    for (const array of arrays) {
      if (Array.isArray(array)) {
        return array[index];
      }
    }

    return undefined;
  }

  private getTypeFromSelectedTag(
    tagName: string,
    routeTags: RouteTags
  ): RouteValueType | '' {
    if (!tagName) {
      return '';
    }

    const normalizedName = this.normalizeText(tagName);
    const types: RouteValueType[] = ['lat', 'lng', 'speed', 'course', 'fuelRate'];

    for (const type of types) {
      const aliases = this.getTagAliases(routeTags[type]);

      if (
        aliases.some(
          (alias: string) =>
            normalizedName === alias ||
            normalizedName.endsWith(alias) ||
            alias.endsWith(normalizedName)
        )
      ) {
        return type;
      }
    }

    let bestType: RouteValueType | '' = '';
    let bestScore = 0;

    for (const type of types) {
      const score = this.scoreTag(String(tagName).toUpperCase(), type);
      if (score > bestScore) {
        bestScore = score;
        bestType = type;
      }
    }

    return bestScore > 0 ? bestType : '';
  }

  private findBestTag(tagRows: any[], type: RouteValueType): string {
    let bestTagName = '';
    let bestScore = 0;

    for (const row of tagRows) {
      const tagName = this.getTagName(row);

      if (!tagName) {
        continue;
      }

      const description =
        this.readFirst(row, ['Description', 'description', 'Desc', 'desc']) || '';
      const score = this.scoreTag(
        `${String(tagName)} ${String(description)}`.toUpperCase(),
        type
      );

      if (score > bestScore) {
        bestScore = score;
        bestTagName = String(tagName);
      }
    }

    return bestScore > 0 ? bestTagName : '';
  }

  private scoreTag(text: string, type: RouteValueType): number {
    let score = 0;

    if (type === 'lat') {
      if (text.includes('VES-GPS-LAT')) score += 400;
      if (text.includes('GPS_LAT') || text.includes('GPS LAT')) score += 260;
      if (text.includes('LATITUDE')) score += 220;
      if (text.includes('LAT')) score += 100;
    }

    if (type === 'lng') {
      if (text.includes('VES-GPS-LONG') || text.includes('VES-GPS-LNG')) score += 400;
      if (text.includes('GPS_LONG') || text.includes('GPS LNG')) score += 260;
      if (text.includes('LONGITUDE')) score += 220;
      if (text.includes('LONG') || text.includes('LNG') || text.includes('LON')) score += 100;
    }

    if (type === 'speed') {
      if (text.includes('VES-GPS-SPEED')) score += 400;
      if (text.includes('SPEED')) score += 180;
      if (text.includes('SOG')) score += 160;
    }

    if (type === 'course') {
      if (text.includes('VES-GPS-HEAD')) score += 400;
      if (text.includes('COURSE') || text.includes('COG')) score += 180;
      if (text.includes('HEADING') || text.includes('HEAD')) score += 140;
    }

    if (type === 'fuelRate') {
      if (text.includes('FUEL RATE')) score += 220;
      if (text.includes('FUEL') && text.includes('FLOW')) score += 190;
      if (text.includes('MFLOW')) score += 160;
    }

    if (text.includes('GPS') && type !== 'fuelRate') {
      score += 30;
    }

    return score;
  }

  private extractHistorianSeries(rawResponse: any): any[] {
    const response = this.parseJsonValue(rawResponse);

    if (Array.isArray(response)) {
      return response;
    }

    if (!response || typeof response !== 'object') {
      return [];
    }

    const candidates = [
      response['data'],
      response['Data'],
      response['result'],
      response['Result'],
      response['results'],
      response['Results'],
      response['items'],
      response['Items'],
      response['values'],
      response['Values'],
      response['tags'],
      response['Tags'],
      response['HistorianValues'],
      response['historianValues'],
      response['history'],
      response['History'],
      response['payload'],
      response['Payload'],
    ];

    for (const candidate of candidates) {
      const parsed = this.parseJsonValue(candidate);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }

    return [];
  }

  private extractTagRows(rawResponse: any): any[] {
    const response = this.parseJsonValue(rawResponse);

    if (Array.isArray(response)) {
      return response;
    }

    if (!response || typeof response !== 'object') {
      return [];
    }

    const candidates = [
      response['points'],
      response['Points'],
      response['data'],
      response['Data'],
      response['result'],
      response['Result'],
      response['results'],
      response['Results'],
      response['records'],
      response['Records'],
      response['items'],
      response['Items'],
      response['values'],
      response['Values'],
      response['rows'],
      response['Rows'],
      response['route'],
      response['Route'],
      response['track'],
      response['Track'],
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate;
      }
    }

    return [];
  }

  /**
   * Aligns irregular historian samples to the display interval selected by Past Track.
   * The closest real GPS point within half an interval is selected; no coordinate
   * is invented and the same raw sample is never reused for two slots.
   */
  private resampleToFixedSlots(
    points: PastTrackPoint[],
    startDate: string,
    endDate: string,
    intervalMinutes: number
  ): PastTrackPoint[] {
    const sorted = this.sanitizeTrack(points)
      .map((point: PastTrackPoint) => ({
        point,
        timestamp: this.parseTimestamp(point.time),
      }))
      .filter((item): item is { point: PastTrackPoint; timestamp: number } =>
        item.timestamp !== null
      )
      .sort((a, b) => a.timestamp - b.timestamp);

    if (sorted.length === 0) {
      return [];
    }

    const normalizedInterval = this.normalizeSamplingInterval(intervalMinutes);
    const intervalMs = normalizedInterval * 60_000;
    const toleranceMs = Math.min(this.samplingToleranceMs, intervalMs / 2);
    const configuredStart = this.parseRangeBoundary(startDate, false);
    const configuredEnd = this.parseRangeBoundary(endDate, true);
    const rangeStart = configuredStart ?? sorted[0].timestamp;
    const rangeEnd = Math.min(
      configuredEnd ?? sorted[sorted.length - 1].timestamp,
      Date.now()
    );
    const firstSlot = Math.ceil(rangeStart / intervalMs) * intervalMs;
    const lastSlot = Math.floor(rangeEnd / intervalMs) * intervalMs;
    const result: PastTrackPoint[] = [];
    const usedSamples = new Set<number>();
    let cursor = 0;

    for (let slot = firstSlot; slot <= lastSlot; slot += intervalMs) {
      while (cursor + 1 < sorted.length && sorted[cursor + 1].timestamp <= slot) {
        cursor += 1;
      }

      const candidates = [sorted[cursor], sorted[cursor + 1]]
        .filter((item): item is { point: PastTrackPoint; timestamp: number } => !!item)
        .filter((item) => !usedSamples.has(item.timestamp));

      if (candidates.length === 0) {
        continue;
      }

      const nearest = candidates.reduce((best, candidate) =>
        Math.abs(candidate.timestamp - slot) < Math.abs(best.timestamp - slot)
          ? candidate
          : best
      );
      const difference = Math.abs(nearest.timestamp - slot);

      if (difference > toleranceMs) {
        continue;
      }

      usedSamples.add(nearest.timestamp);
      result.push({
        ...nearest.point,
        no: result.length + 1,
        recordedTime: nearest.point.recordedTime || nearest.point.time,
        sampleOffsetMinutes: Number(((nearest.timestamp - slot) / 60_000).toFixed(1)),
        time: this.formatDisplayTime(new Date(slot)),
      });
    }

    return result;
  }

  private calculateExpectedSlots(
    startDate: string,
    endDate: string,
    intervalMinutes: number
  ): number {
    const intervalMs = this.normalizeSamplingInterval(intervalMinutes) * 60_000;
    const start = this.parseRangeBoundary(startDate, false);
    const configuredEnd = this.parseRangeBoundary(endDate, true);

    if (start === null || configuredEnd === null || configuredEnd < start) {
      return 0;
    }

    const end = Math.min(configuredEnd, Date.now());
    const firstSlot = Math.ceil(start / intervalMs) * intervalMs;
    const lastSlot = Math.floor(end / intervalMs) * intervalMs;

    return lastSlot >= firstSlot ? Math.floor((lastSlot - firstSlot) / intervalMs) + 1 : 0;
  }

  private buildHistoryRange(startDate: string, endDate: string): {
    start: string;
    end: string;
  } {
    const configuredStart = this.parseRangeBoundary(startDate, false);
    const configuredEnd = this.parseRangeBoundary(endDate, true);

    if (configuredStart !== null && configuredEnd !== null) {
      return {
        start: this.formatRequestTime(new Date(configuredStart)),
        end: this.formatRequestTime(new Date(Math.min(configuredEnd, Date.now()))),
      };
    }

    const end = new Date();
    const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);

    return {
      start: this.formatRequestTime(start),
      end: this.formatRequestTime(end),
    };
  }

  private buildResponse(
    prefix: string,
    displayPoints: PastTrackPoint[],
    rawPoints: PastTrackPoint[] = displayPoints,
    startDate = '',
    endDate = '',
    intervalMinutes = this.defaultSamplingIntervalMinutes
  ): PastTrackResponse {
    return {
      summary: this.buildSummary(
        prefix,
        displayPoints,
        rawPoints,
        startDate,
        endDate,
        intervalMinutes
      ),
      points: displayPoints,
    };
  }

  private buildSummary(
    prefix: string,
    displayPoints: PastTrackPoint[],
    rawPoints: PastTrackPoint[],
    startDate: string,
    endDate: string,
    intervalMinutes: number
  ): PastTrackSummary {
    const normalizedInterval = this.normalizeSamplingInterval(intervalMinutes);
    const vessel = this.getSavedVessel(prefix);
    const expectedSlots = this.calculateExpectedSlots(
      startDate,
      endDate,
      normalizedInterval
    );
    const coveragePercent = expectedSlots > 0
      ? Math.min(100, Number(((displayPoints.length / expectedSlots) * 100).toFixed(1)))
      : 0;
    const metricPoints = rawPoints.length > 0 ? rawPoints : displayPoints;

    return {
      vesselId: prefix,
      vesselName: this.getVesselName(prefix, vessel),
      vesselType: this.getVesselType(vessel),
      imo: this.getImo(vessel),
      mmsi: this.getMmsi(vessel),
      status: displayPoints.length > 0 ? 'Available' : 'No Data',
      image: this.getVesselImage(vessel),
      // KPIs use valid raw points. Map/timeline use the automatic display interval.
      totalDistance: this.calculateTotalDistance(metricPoints),
      trackPoints: displayPoints.length,
      rawTrackPoints: rawPoints.length,
      samplingIntervalMinutes: normalizedInterval,
      expectedSlots,
      coveragePercent,
      rangeStart: startDate,
      rangeEnd: endDate,
      avgSpeed: this.calculateAvgSpeed(metricPoints),
      totalTime: this.calculateTotalTime(metricPoints),
      lastUpdate: metricPoints.length > 0 ? metricPoints[metricPoints.length - 1].time : '-',
    };
  }

  private normalizeSamplingInterval(value: number): number {
    const interval = Math.round(Number(value));

    if (!Number.isFinite(interval)) {
      return this.defaultSamplingIntervalMinutes;
    }

    return Math.max(1, Math.min(60, interval));
  }

  private parseRangeBoundary(value: string, endOfDay: boolean): number | null {
    if (!value) {
      return null;
    }

    const normalized = String(value).trim().replace('T', ' ');
    const hasTime = /\d{1,2}:\d{2}/.test(normalized);
    const candidate = hasTime
      ? normalized
      : `${normalized} ${endOfDay ? '23:59:59' : '00:00:00'}`;

    return this.parseTimestamp(candidate);
  }

  private getSavedVessel(prefix: string): any {
    const keys = ['pastTrackVessel', 'selectedVessel', 'realtimeVessel'];

    for (const key of keys) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) {
          continue;
        }

        const vessel = JSON.parse(raw);
        const vesselPrefix = this.readVesselPrefix(vessel);

        if (!prefix || !vesselPrefix || this.normalizeText(vesselPrefix) === this.normalizeText(prefix)) {
          return vessel;
        }
      } catch {
        continue;
      }
    }

    return null;
  }

  private readVesselPrefix(vessel: any): string {
    return String(
      vessel?.prefix ||
        vessel?.fv?.prefix ||
        vessel?.fvInfo?.prefix ||
        vessel?.id ||
        vessel?.fv?.id ||
        vessel?.fvInfo?.id ||
        ''
    ).trim();
  }

  private getVesselName(prefix: string, vessel: any): string {
    return String(
      vessel?.name ||
        vessel?.fv?.name ||
        vessel?.fvInfo?.name ||
        prefix.replace(/_/g, ' ') ||
        'VESSEL'
    );
  }

  private getVesselType(vessel: any): string {
    return String(
      vessel?.desc || vessel?.type || vessel?.fv?.desc || vessel?.fvInfo?.desc || 'AHTS'
    );
  }

  private getImo(vessel: any): string {
    return String(vessel?.imo || vessel?.fv?.imo || vessel?.fvInfo?.imo || '-');
  }

  private getMmsi(vessel: any): string {
    return String(vessel?.mmsi || vessel?.fv?.mmsi || vessel?.fvInfo?.mmsi || '-');
  }

  private getVesselImage(vessel: any): string {
    return String(
      vessel?.img ||
        vessel?.image ||
        vessel?.fv?.img ||
        vessel?.fvInfo?.img ||
        'assets/images/vessel/notfound.png'
    );
  }

  private calculateAvgSpeed(points: PastTrackPoint[]): number {
    const valid = points
      .map((point: PastTrackPoint) => Number(point.speed))
      .filter((speed: number) => Number.isFinite(speed) && speed >= 0);

    if (valid.length === 0) {
      return 0;
    }

    const total = valid.reduce((sum: number, speed: number) => sum + speed, 0);
    return Number((total / valid.length).toFixed(1));
  }

  private calculateTotalDistance(points: PastTrackPoint[]): number {
    let total = 0;

    for (let index = 1; index < points.length; index += 1) {
      total += this.distanceNm(
        points[index - 1].lat,
        points[index - 1].lng,
        points[index].lat,
        points[index].lng
      );
    }

    return Number(total.toFixed(1));
  }

  private calculateTotalTime(points: PastTrackPoint[]): string {
    if (points.length < 2) {
      return '-';
    }

    const first = this.parseTimestamp(points[0].time);
    const last = this.parseTimestamp(points[points.length - 1].time);

    if (first === null || last === null || last < first) {
      return '-';
    }

    const totalMinutes = Math.floor((last - first) / 60_000);
    const days = Math.floor(totalMinutes / 1_440);
    const hours = Math.floor((totalMinutes % 1_440) / 60);
    const minutes = totalMinutes % 60;

    return days > 0
      ? `${days}d ${hours}h ${minutes}m`
      : `${hours}h ${minutes}m`;
  }

  private sortAndRemoveDuplicate(points: PastTrackPoint[]): PastTrackPoint[] {
    const sorted = points.slice().sort((a: PastTrackPoint, b: PastTrackPoint) => {
      const first = this.parseTimestamp(a.time) ?? 0;
      const second = this.parseTimestamp(b.time) ?? 0;
      return first - second;
    });

    const result: PastTrackPoint[] = [];
    const seen = new Set<string>();

    for (const point of sorted) {
      const timestamp = this.parseTimestamp(point.time) ?? 0;
      const key = `${timestamp}|${point.lat.toFixed(7)}|${point.lng.toFixed(7)}`;

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      point.no = result.length + 1;
      result.push(point);
    }

    return result;
  }

  private isTimestampInRange(
    timestamp: number,
    startDate: string,
    endDate: string
  ): boolean {
    if (!startDate || !endDate) {
      return true;
    }

    const start = this.parseRangeBoundary(startDate, false);
    const end = this.parseRangeBoundary(endDate, true);

    if (start === null || end === null) {
      return true;
    }

    return timestamp >= start && timestamp <= end;
  }

  private parseTimestamp(value: any): number | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    if (value instanceof Date) {
      const time = value.getTime();
      return Number.isNaN(time) ? null : time;
    }

    if (typeof value === 'number') {
      const time = Math.abs(value) < 100_000_000_000 ? value * 1000 : value;
      return Number.isFinite(time) ? time : null;
    }

    const text = String(value).trim();
    const dotNet = text.match(/^\/Date\((-?\d+)(?:[+-]\d{4})?\)\/$/);

    if (dotNet) {
      return Number(dotNet[1]);
    }

    if (/^-?\d+(?:\.\d+)?$/.test(text)) {
      const numeric = Number(text);
      return Math.abs(numeric) < 100_000_000_000 ? numeric * 1000 : numeric;
    }

    const isoLocal = text.match(
      /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/
    );

    if (isoLocal) {
      return new Date(
        Number(isoLocal[1]),
        Number(isoLocal[2]) - 1,
        Number(isoLocal[3]),
        Number(isoLocal[4]),
        Number(isoLocal[5]),
        Number(isoLocal[6] || 0),
        Number(String(isoLocal[7] || '0').padEnd(3, '0'))
      ).getTime();
    }

    const displayDate = text.match(
      /^(\d{1,2})-([A-Za-z]{3})-(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/
    );

    if (displayDate) {
      const months: Record<string, number> = {
        JAN: 0,
        FEB: 1,
        MAR: 2,
        APR: 3,
        MAY: 4,
        JUN: 5,
        JUL: 6,
        AUG: 7,
        SEP: 8,
        OCT: 9,
        NOV: 10,
        DEC: 11,
      };
      const month = months[displayDate[2].toUpperCase()];

      if (month === undefined) {
        return null;
      }

      return new Date(
        Number(displayDate[3]),
        month,
        Number(displayDate[1]),
        Number(displayDate[4]),
        Number(displayDate[5]),
        Number(displayDate[6] || 0)
      ).getTime();
    }

    const nativeTime = new Date(text).getTime();
    return Number.isNaN(nativeTime) ? null : nativeTime;
  }

  private formatRequestTime(date: Date): string {
    return (
      `${date.getFullYear()}-${this.pad(date.getMonth() + 1)}-${this.pad(date.getDate())} ` +
      `${this.pad(date.getHours())}:${this.pad(date.getMinutes())}:${this.pad(date.getSeconds())}`
    );
  }

  private formatDisplayTime(date: Date): string {
    const monthNames = [
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
      `${this.pad(date.getDate())}-${monthNames[date.getMonth()]}-${date.getFullYear()} ` +
      `${this.pad(date.getHours())}:${this.pad(date.getMinutes())}:${this.pad(date.getSeconds())}`
    );
  }

  private ensureVesselPrefix(tagName: string, prefix: string): string {
    const tag = String(tagName || '').trim();

    if (!tag) {
      return '';
    }

    const normalizedTag = this.normalizeText(tag);
    const normalizedPrefix = this.normalizeText(prefix);

    if (normalizedPrefix && normalizedTag.startsWith(normalizedPrefix)) {
      return tag;
    }

    return `${prefix}-${tag.replace(/^[-_.\s]+/, '')}`;
  }

  private stripVesselPrefix(tagName: string, prefix: string): string {
    const tag = String(tagName || '').trim();
    const normalizedPrefix = this.normalizeText(prefix);

    if (!tag || !normalizedPrefix) {
      return tag;
    }

    const parts = tag.split(/[-_.]/);
    let candidate = '';

    for (let index = 0; index < parts.length; index += 1) {
      candidate += parts[index];
      if (this.normalizeText(candidate) === normalizedPrefix) {
        return parts.slice(index + 1).join('-');
      }
    }

    return tag;
  }

  private getTagAliases(tagName: string): string[] {
    const aliases = new Set<string>();
    const normalized = this.normalizeText(tagName);

    if (normalized) {
      aliases.add(normalized);
    }

    const index = normalized.indexOf('VESGPS');
    if (index >= 0) {
      aliases.add(normalized.slice(index));
    }

    return Array.from(aliases);
  }

  private looksLikeRouteTag(key: string): boolean {
    const text = this.normalizeText(key);
    return (
      text.includes('GPSLAT') ||
      text.includes('GPSLONG') ||
      text.includes('GPSLNG') ||
      text.includes('GPSSPEED') ||
      text.includes('GPSHEAD') ||
      text.includes('FUEL')
    );
  }

  private isValidCoordinate(lat: number, lng: number): boolean {
    return (
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180 &&
      !(lat === 0 && lng === 0)
    );
  }

  private distanceNm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const earthRadiusKm = 6371.0088;
    const deltaLat = this.toRad(lat2 - lat1);
    const deltaLng = this.toRad(lng2 - lng1);
    const firstLat = this.toRad(lat1);
    const secondLat = this.toRad(lat2);
    const haversine =
      Math.sin(deltaLat / 2) ** 2 +
      Math.cos(firstLat) * Math.cos(secondLat) * Math.sin(deltaLng / 2) ** 2;
    const angularDistance =
      2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

    return earthRadiusKm * angularDistance * 0.539956803;
  }

  private toRad(value: number): number {
    return (value * Math.PI) / 180;
  }

  private toNumber(value: any): number {
    if (value === undefined || value === null || value === '') {
      return Number.NaN;
    }

    if (typeof value === 'string') {
      const cleaned = value.trim().replace(/,/g, '.').replace(/[^0-9+\-.eE]/g, '');
      return Number(cleaned);
    }

    return Number(value);
  }

  private getTagName(row: any): string {
    return String(
      this.readFirst(row, [
        'TagName',
        'tagName',
        'tagname',
        'HistorianTagName',
        'historianTagName',
        'PointName',
        'pointName',
        'Name',
        'name',
        'Tag',
        'tag',
      ]) || ''
    );
  }

  private getTagValue(row: any): any {
    return this.readFirstDeep(row, [
      'Value',
      'value',
      'Val',
      'val',
      'NumericValue',
      'numericValue',
      'DataValue',
      'dataValue',
      'CurrentValue',
      'currentValue',
      'y',
    ]);
  }

  private getTimeValue(row: any): any {
    return this.readFirstDeep(row, [
      'TimeStamp',
      'Timestamp',
      'timeStamp',
      'timestamp',
      'Time',
      'time',
      'DateTime',
      'dateTime',
      'datetime',
      'Date',
      'date',
      'CreatedAt',
      'createdAt',
      'RecordTime',
      'recordTime',
      'x',
    ]);
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
      'VES_GPS_LAT',
      'y',
      'Y',
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
      'GPS_LONG',
      'VES_GPS_LONG',
      'VES_GPS_LNG',
      'x',
      'X',
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
      'VES_GPS_HEAD',
      'COG',
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
      'FUEL',
    ]);
  }

  private readFirst(row: any, keys: string[]): any {
    if (!row || typeof row !== 'object') {
      return undefined;
    }

    for (const key of keys) {
      const value = row[key];
      if (value !== undefined && value !== null && value !== '') {
        return value;
      }
    }

    return undefined;
  }

  private readFirstDeep(row: any, keys: string[], depth = 0): any {
    if (!row || depth > 4) {
      return undefined;
    }

    const direct = this.readFirst(row, keys);
    if (direct !== undefined) {
      return direct;
    }

    if (typeof row !== 'object' || Array.isArray(row)) {
      return undefined;
    }

    for (const key of Object.keys(row)) {
      const child = row[key];
      if (child && typeof child === 'object' && !Array.isArray(child)) {
        const nested = this.readFirstDeep(child, keys, depth + 1);
        if (nested !== undefined) {
          return nested;
        }
      }
    }

    return undefined;
  }

  private headerToText(header: any): string {
    if (header === undefined || header === null) {
      return '';
    }

    if (typeof header === 'string') {
      return header;
    }

    return String(
      this.readFirst(header, [
        'TagName',
        'tagName',
        'Name',
        'name',
        'Header',
        'header',
        'Key',
        'key',
        'Description',
        'description',
      ]) || JSON.stringify(header)
    );
  }

  private parseJsonValue(value: any): any {
    if (typeof value !== 'string') {
      return value;
    }

    const text = value.trim();
    if (!text || (!text.startsWith('{') && !text.startsWith('['))) {
      return value;
    }

    try {
      return JSON.parse(text);
    } catch {
      return value;
    }
  }

  private normalizePrefix(value: string): string {
    return String(value || '').trim();
  }

  private normalizeText(value: any): string {
    return String(value || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
  }

  private pad(value: number): string {
    return value < 10 ? `0${value}` : String(value);
  }
}
