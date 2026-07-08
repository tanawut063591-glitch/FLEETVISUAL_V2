import { Injectable } from '@angular/core';
import { firstValueFrom, Observable, of, timer } from 'rxjs';
import { catchError, shareReplay, switchMap } from 'rxjs/operators';

import { NewHttpClientService } from './http-client1.service';

export interface OverviewPayloadRow {
  fv: any;
  fvInfo?: any;
  datas: any[];
  newData: Record<string, any>;
  tags: any[];
}

@Injectable({
  providedIn: 'root',
})
export class FleetVesselDataService {
  private readonly overviewTagPath = '/assets/tags/overview.tag.json';
  private overviewStream$?: Observable<OverviewPayloadRow[]>;
  private lastRows: OverviewPayloadRow[] = [];

  constructor(private newHttp: NewHttpClientService) {}

  /**
   * Main stream for Sidebar / Overview / Realtime.
   * - Always tries backend first.
   * - Refreshes every 5s by default.
   * - Falls back to stable demo data instead of showing a blank page.
   */
  getOverviewVessels(refreshMs = 5000): Observable<OverviewPayloadRow[]> {
    if (!this.overviewStream$) {
      this.overviewStream$ = timer(0, refreshMs).pipe(
        switchMap(() => this.loadOverviewRowsSafe()),
        shareReplay({ bufferSize: 1, refCount: true })
      );
    }

    return this.overviewStream$;
  }

  getSnapshot(): OverviewPayloadRow[] {
    return this.lastRows;
  }

  refreshNow(): Observable<OverviewPayloadRow[]> {
    return this.loadOverviewRowsSafe();
  }

  async loadVessels(): Promise<any[]> {
    try {
      const vessels = await this.newHttp.getVesselInfo2();
      const normalized = this.extractArray(vessels)
        .map((item: any) => this.normalizeVessel(item))
        .filter((item: any) => !!item.name);

      if (normalized.length > 0) {
        return normalized;
      }
    } catch (error) {
      console.warn('[FleetVesselDataService] loadVessels fallback:', error);
    }

    return this.getFallbackVessels();
  }

  async loadOverviewRows(vessels?: any[]): Promise<OverviewPayloadRow[]> {
    const fvInfos = Array.isArray(vessels) && vessels.length > 0
      ? vessels.map((item: any) => this.normalizeVessel(item)).filter((item: any) => !!item.name)
      : await this.loadVessels();

    const tags = await this.loadOverviewTags();
    let payloadRows = this.buildPayloadRows(fvInfos, tags);

    if (payloadRows.length === 0) {
      payloadRows = this.buildPayloadRows(this.getFallbackVessels(), tags);
    }

    await this.attachCurrentValues(payloadRows);

    // Keep direct values even when backend returns partial data.
    payloadRows.forEach((row) => this.seedDirectValues(row, row.fv));

    this.lastRows = payloadRows;
    return payloadRows;
  }

  private loadOverviewRowsSafe(): Observable<OverviewPayloadRow[]> {
    return new Observable<OverviewPayloadRow[]>((observer) => {
      this.loadOverviewRows()
        .then((rows) => {
          const safeRows = rows && rows.length > 0
            ? rows
            : this.buildPayloadRows(this.getFallbackVessels(), this.getDefaultOverviewTags());

          this.lastRows = safeRows;
          observer.next(safeRows);
          observer.complete();
        })
        .catch((error) => {
          console.warn('[FleetVesselDataService] overview stream fallback:', error);
          const fallback = this.buildPayloadRows(this.getFallbackVessels(), this.getDefaultOverviewTags());
          this.lastRows = fallback;
          observer.next(fallback);
          observer.complete();
        });
    }).pipe(
      catchError((error) => {
        console.warn('[FleetVesselDataService] overview observable fallback:', error);
        const fallback = this.buildPayloadRows(this.getFallbackVessels(), this.getDefaultOverviewTags());
        this.lastRows = fallback;
        return of(fallback);
      })
    );
  }

  private async loadOverviewTags(): Promise<any[]> {
    try {
      const res: any = await firstValueFrom(this.newHttp.getJsonFile(this.overviewTagPath));
      const tags = this.extractTagsFromConfig(res);
      return tags.length > 0 ? tags : this.getDefaultOverviewTags();
    } catch (error) {
      console.warn('[FleetVesselDataService] loadOverviewTags fallback:', error);
      return this.getDefaultOverviewTags();
    }
  }

  private extractTagsFromConfig(res: any): any[] {
    if (!res) {
      return [];
    }

    if (Array.isArray(res)) {
      return res
        .map((tag: any) => ({
          name: tag?.name || tag?.Name || tag?.tagName || tag?.TagName || '',
          tagName: tag?.tagName || tag?.TagName || tag?.name || tag?.Name || '',
          cal: tag?.cal || tag?.Cal || false,
        }))
        .filter((tag) => tag.name && tag.tagName);
    }

    return Object.keys(res)
      .map((key: string) => {
        const tag = res[key];
        return {
          name: tag?.name || tag?.Name || key,
          tagName: tag?.tagName || tag?.TagName || '',
          cal: tag?.cal || tag?.Cal || false,
        };
      })
      .filter((tag) => tag.name && tag.tagName);
  }

  private buildPayloadRows(fvInfos: any[], overviewTags: any[]): OverviewPayloadRow[] {
    return (fvInfos || [])
      .map((item: any) => this.normalizeVessel(item))
      .filter((fv: any) => !!fv.name)
      .map((fv: any) => {
        const prefix = fv.prefix || fv.id || fv.name;
        const tags = (overviewTags || []).map((tag: any) => ({
          name: tag.name,
          tagName: `${prefix}-${this.normalizeBackendTag(tag.tagName)}`,
          cal: tag.cal,
        }));

        const row: OverviewPayloadRow = {
          fv,
          fvInfo: fv,
          tags,
          datas: [],
          newData: {},
        };

        this.seedDirectValues(row, fv);
        return row;
      });
  }

  private async attachCurrentValues(rows: OverviewPayloadRow[]): Promise<void> {
    const tagNames = rows.flatMap((row) =>
      (row.tags || [])
        .map((tag: any) => tag?.tagName || '')
        .filter((tagName: string) => tagName.length > 0)
    );

    if (tagNames.length === 0) {
      return;
    }

    try {
      const response: any = await firstValueFrom(
        this.newHttp.getOverviewCurrentsValues({ Name: tagNames })
      );

      const values = this.flattenCurrentValues(response);

      values.forEach((item: any) => {
        const fullName = this.getFullTagName(item);

        if (!fullName) {
          return;
        }

        const row = rows.find((payload) =>
          (payload.tags || []).some((tag: any) => tag.tagName === fullName)
        );

        if (!row) {
          return;
        }

        const shortName = this.toShortTagName(fullName, row.fv?.prefix || row.fv?.name || '');
        const value = item?.Value ?? item?.value ?? item?.Val ?? item?.val ?? item?.Data ?? item?.data ?? '';
        const dateTime = item?.TimeStamp || item?.timestamp || item?.dateTime || item?.DateTime || item?.time || '';

        this.upsertRowValue(row, shortName, value, dateTime, fullName);
      });
    } catch (error) {
      console.warn('[FleetVesselDataService] attachCurrentValues skipped:', error);
    }
  }

  private flattenCurrentValues(response: any): any[] {
    const direct = this.extractArray(response);

    if (direct.length > 0) {
      return direct;
    }

    const values: any[] = [];

    if (response && typeof response === 'object') {
      Object.keys(response).forEach((key) => {
        const value = response[key];

        if (value && typeof value === 'object') {
          values.push({ TagName: key, ...value });
        } else {
          values.push({ TagName: key, Value: value, TimeStamp: new Date().toISOString() });
        }
      });
    }

    return values;
  }

  private getFullTagName(item: any): string {
    if (!item) {
      return '';
    }

    return String(
      item.Name ||
      item.name ||
      item.TagName ||
      item.tagName ||
      item.Tag ||
      item.tag ||
      item.FullName ||
      item.fullName ||
      ''
    );
  }

  private extractArray(response: any): any[] {
    if (Array.isArray(response)) {
      return response;
    }

    const candidates = [
      response?.data,
      response?.Data,
      response?.result,
      response?.Result,
      response?.results,
      response?.Results,
      response?.vessels,
      response?.Vessels,
      response?.items,
      response?.Items,
      response?.rows,
      response?.Rows,
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate;
      }
    }

    return [];
  }

  private seedDirectValues(row: OverviewPayloadRow, fv: any): void {
    const timestamp = fv?.timestamp || fv?.lastUpdate || new Date().toISOString();

    const directMap: Record<string, any> = {
      VES_GPS_LAT: fv?.lat,
      VES_GPS_LONG: fv?.long ?? fv?.lng,
      VES_GPS_LNG: fv?.long ?? fv?.lng,
      VES_GPS_SPEED: fv?.speed,
      VES_GPS_SOG: fv?.speed,
      VES_GPS_HEAD: fv?.course,
      VES_GPS_COURSE: fv?.course,
      VES_ENGINE_LOAD: fv?.engineLoad,
      ENGINE_LOAD: fv?.engineLoad,
      VES_FUEL_RATE: fv?.fuelRate,
      VES_CONS_RATE: fv?.fuelRate,
      VES_FUEL_CONSUMPTION: fv?.fuelConsumption,
      VES_CONS_TODAY: fv?.fuelConsumption,
      VES_DISTANCE: fv?.distance,
      VES_GPS_DIS_TODAY: fv?.distance,
      VES_STATUS: fv?.status,
      STATUS: fv?.status,
    };

    Object.keys(directMap).forEach((key) => {
      const value = directMap[key];

      if (value === undefined || value === null || value === '') {
        return;
      }

      this.upsertRowValue(
        row,
        key,
        value,
        timestamp,
        `${fv?.prefix || fv?.name || 'VESSEL'}-${key.replace(/_/g, '-')}`
      );
    });
  }

  private upsertRowValue(
    row: OverviewPayloadRow,
    name: string,
    value: any,
    dateTime: string,
    tagName: string
  ): void {
    row.newData[name] = {
      value,
      timestamp: dateTime,
      tagName,
    };

    const existing = row.datas.find((item) => item?.name === name || item?.tagName === tagName);

    if (existing) {
      existing.value = value;
      existing.dateTime = dateTime;
      existing.tagName = tagName;
      return;
    }

    row.datas.push({
      tagName,
      name,
      value,
      dateTime,
      cal: false,
    });
  }

  private normalizeVessel(item: any): any {
    const fv = item?.fvInfo || item?.fv || item?.vessel || item || {};
    const name = fv.name || item?.name || fv.vesselName || item?.vesselName || fv.FvName || item?.FvName || '';
    const prefix = fv.prefix || item?.prefix || fv.Prefix || item?.Prefix || this.nameToPrefix(name);

    return {
      ...fv,
      id: fv.id || fv._id || item?.id || item?._id || prefix || name,
      name,
      desc: fv.desc || fv.description || item?.desc || item?.description || fv.type || item?.type || 'AHTS',
      prefix,
      img: fv.img || fv.image || item?.img || item?.image || this.resolveFallbackImage(name),
      lat: this.pickNumber(fv.lat, fv.latitude, fv.lattitude, fv.Lat, item?.lat, item?.latitude, item?.lattitude),
      long: this.pickNumber(fv.long, fv.lng, fv.longitude, fv.longtitude, fv.Long, item?.long, item?.lng, item?.longitude, item?.longtitude),
      speed: this.pickNumber(fv.speed, fv.sog, item?.speed, item?.sog, 0),
      course: this.pickNumber(fv.course, fv.heading, item?.course, item?.heading, 0),
      engineLoad: this.pickNumber(fv.engineLoad, fv.engine_load, fv.load, item?.engineLoad, item?.engine_load, item?.load, 0),
      fuelRate: this.pickNumber(fv.fuelRate, fv.fuel_rate, item?.fuelRate, item?.fuel_rate, 0),
      fuelConsumption: this.pickNumber(fv.fuelConsumption, fv.fuel_consumption, item?.fuelConsumption, item?.fuel_consumption, 0),
      distance: this.pickNumber(fv.distance, item?.distance, 0),
      status: fv.status || item?.status || '',
      timestamp:
        fv.timestamp ||
        fv.lastUpdate ||
        fv.lastSeenAt ||
        fv.updatedAt ||
        item?.timestamp ||
        item?.lastUpdate ||
        item?.lastSeenAt ||
        item?.updatedAt ||
        new Date().toISOString(),
    };
  }

  private pickNumber(...values: any[]): any {
    for (const value of values) {
      if (value === undefined || value === null || value === '') {
        continue;
      }

      const num = Number(value);

      if (!Number.isNaN(num)) {
        return num;
      }
    }

    return '';
  }

  private toShortTagName(fullName: string, prefix: string): string {
    let text = String(fullName || '');

    if (prefix && text.startsWith(`${prefix}-`)) {
      text = text.substring(prefix.length + 1);
    } else {
      const parts = text.split('-');
      if (parts.length > 1) {
        parts.shift();
        text = parts.join('-');
      }
    }

    return text.replace(/-/g, '_');
  }

  private normalizeBackendTag(tagName: string): string {
    return String(tagName || '').replace(/_/g, '-');
  }

  private nameToPrefix(name: string): string {
    return String(name || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private resolveFallbackImage(name: string): string {
    const normalized = String(name || '').toLowerCase();

    if (normalized.includes('intan')) return 'assets/images/vessel/bb_intan.jpg';
    if (normalized.includes('lazurit')) return 'assets/images/vessel/bb_mulia.jpg';
    if (normalized.includes('makmur')) return 'assets/images/vessel/bb_mukda.jpg';
    if (normalized.includes('zamrud')) return 'assets/images/vessel/bb_zamrud.jpg';
    if (normalized.includes('liberty')) return 'assets/images/vessel/bb_liberty209.jpg';
    if (normalized.includes('tongkam')) return 'assets/images/vessel/bb_tongkam.jpg';
    if (normalized.includes('gemia')) return 'assets/images/vessel/mv_gemia.jpg';
    if (normalized.includes('bongkot')) return 'assets/images/vessel/sc_bongkot.jpg';
    if (normalized.includes('brave')) return 'assets/images/vessel/sc_brave.jpg';
    if (normalized.includes('chol')) return 'assets/images/vessel/sc_choluedee.jpg';
    if (normalized.includes('emerald')) return 'assets/images/vessel/sc_emerald.jpg';
    if (normalized.includes('glory 1')) return 'assets/images/vessel/glory1.jpg';
    if (normalized.includes('glory 2')) return 'assets/images/vessel/glory2.jpg';
    if (normalized.includes('glory 3')) return 'assets/images/vessel/glory3.jpg';
    if (normalized.includes('glory 6')) return 'assets/images/vessel/glory6.jpg';
    if (normalized.includes('glory 7')) return 'assets/images/vessel/glory7.jpg';
    if (normalized.includes('raja')) return 'assets/images/vessel/sc_raja.jpg';
    if (normalized.includes('sultan')) return 'assets/images/vessel/sc_sultan.jpg';
    if (normalized.includes('pailin')) return 'assets/images/vessel/sc_pailin.jpg';
    if (normalized.includes('winter')) return 'assets/images/vessel/sc_winter.jpg';

    return 'assets/images/vessel/notfound.png';
  }

  private getDefaultOverviewTags(): any[] {
    return [
      { name: 'VES_GPS_LAT', tagName: 'VES-GPS-LAT', cal: false },
      { name: 'VES_GPS_LONG', tagName: 'VES-GPS-LONG', cal: false },
      { name: 'VES_GPS_SPEED', tagName: 'VES-GPS-SPEED', cal: false },
      { name: 'VES_GPS_HEAD', tagName: 'VES-GPS-HEAD', cal: false },
      { name: 'VES_GPS_COURSE', tagName: 'VES-GPS-COURSE', cal: false },
      { name: 'VES_ENGINE_LOAD', tagName: 'VES-ENGINE-LOAD', cal: false },
      { name: 'VES_FUEL_RATE', tagName: 'VES-FUEL-RATE', cal: false },
      { name: 'VES_FUEL_CONSUMPTION', tagName: 'VES-FUEL-CONSUMPTION', cal: false },
      { name: 'VES_DISTANCE', tagName: 'VES-DISTANCE', cal: false },
      { name: 'VES_STATUS', tagName: 'VES-STATUS', cal: false },
    ];
  }

  private getFallbackVessels(): any[] {
    const now = Date.now();
    const minutesAgo = (minute: number) => new Date(now - minute * 60000).toISOString();
    const daysAgo = (day: number) => new Date(now - day * 86400000).toISOString();

    return [
      this.demo('BB_INTAN', 'BAHTERA INTAN', 'assets/images/vessel/bb_intan.jpg', 8.7075, 101.11338, 6.59, 193.54, 151.65, 2391, 26.25, 'online', minutesAgo(1)),
      this.demo('BB_LAZURIT', 'BAHTERA LAZURIT', 'assets/images/vessel/bb_mulia.jpg', 9.98095, 101.36226, 5.87, 118.2, 121.2, 1804, 22.1, 'online', minutesAgo(2)),
      this.demo('BB_MAKMUR', 'BAHTERA MAKMUR', 'assets/images/vessel/bb_mukda.jpg', 4.58099, 113.77967, 0.8, 72.0, 52.0, 702, 9.1, 'online', minutesAgo(1)),
      this.demo('BB_ZAMRUD', 'BAHTERA ZAMRUD', 'assets/images/vessel/bb_zamrud.jpg', 7.23465, 100.56837, 5.22, 182.0, 110.0, 1642, 31.8, 'online', minutesAgo(2)),
      this.demo('BB_LIBERTY233', 'BB LIBERTY 233', 'assets/images/vessel/bb_liberty209.jpg', 7.28742, 100.63028, 4.18, 196.0, 95.0, 1408, 29.4, 'online', minutesAgo(1)),
      this.demo('BB_TONGKAM', 'BB TONGKAM', 'assets/images/vessel/bb_tongkam.jpg', 7.20297, 100.58679, 0, 90, 0, 0, 0, 'offline', daysAgo(60)),
      this.demo('MV_GEMIA', 'MV GEMIA', 'assets/images/vessel/mv_gemia.jpg', 7.20317, 100.58662, 5.1, 170, 102, 1530, 34.2, 'online', minutesAgo(2)),
      this.demo('SC_BONGKOT', 'SC BONGKOT', 'assets/images/vessel/sc_bongkot.jpg', 13.53562, 100.25025, 0, 0, 0, 0, 0, 'offline', daysAgo(6)),
      this.demo('SC_BRAVE', 'SC BRAVE', 'assets/images/vessel/sc_brave.jpg', 9.39071, 101.40125, 3.8, 145, 84, 1110, 18.5, 'online', minutesAgo(2)),
      this.demo('SC_CHOLUEDEE', 'SC CHOLUEDEE', 'assets/images/vessel/sc_choluedee.jpg', 7.23453, 100.56398, 4.0, 142, 77, 940, 16.8, 'online', minutesAgo(1)),
      this.demo('SC_EMERALD', 'SC EMERALD', 'assets/images/vessel/sc_emerald.jpg', 9.15599, 101.23312, 5.4, 163, 130, 1760, 38.4, 'online', minutesAgo(3)),
      this.demo('SC_GLORY1', 'SC GLORY 1', 'assets/images/vessel/glory1.jpg', 8.25224, 102.53717, 5.8, 188, 125, 1690, 36.4, 'online', minutesAgo(2)),
      this.demo('SC_GLORY2', 'SC GLORY 2', 'assets/images/vessel/glory2.jpg', 8.21554, 102.41233, 5.2, 184, 116, 1570, 31.6, 'online', minutesAgo(3)),
      this.demo('SC_GLORY3', 'SC GLORY 3', 'assets/images/vessel/glory3.jpg', 8.31542, 102.50121, 4.8, 180, 100, 1390, 25.3, 'online', minutesAgo(2)),
      this.demo('SC_GLORY6', 'SC GLORY 6', 'assets/images/vessel/glory6.jpg', 8.30045, 102.43017, 4.2, 176, 98, 1200, 22.9, 'online', minutesAgo(2)),
      this.demo('SC_GLORY7', 'SC GLORY 7', 'assets/images/vessel/glory7.jpg', 8.20744, 102.53188, 4.5, 171, 93, 1184, 21.7, 'online', minutesAgo(2)),
      this.demo('SC_PAILIN', 'SC PAILIN', 'assets/images/vessel/sc_pailin.jpg', 8.86, 100.42, 2.8, 127, 68, 760, 15.3, 'online', minutesAgo(4)),
      this.demo('SC_RAJA', 'SC RAJA', 'assets/images/vessel/sc_raja.jpg', 12.64, 100.88, 1.1, 215, 25, 390, 7.5, 'idle', minutesAgo(55)),
      this.demo('SC_SULTAN', 'SC SULTAN', 'assets/images/vessel/sc_sultan.jpg', 9.60578, 101.21802, 0.81, 39, 0, 2343, 7.5, 'online', minutesAgo(3)),
      this.demo('SC_WINTER', 'SC WINTER', 'assets/images/vessel/sc_winter.jpg', 8.92, 100.17, 4.1, 143, 51, 910, 24.2, 'online', minutesAgo(4)),
    ];
  }

  private demo(
    prefix: string,
    name: string,
    img: string,
    lat: number,
    long: number,
    speed: number,
    course: number,
    fuelRate: number,
    fuelConsumption: number,
    distance: number,
    status: string,
    timestamp: string
  ): any {
    return {
      id: prefix,
      name,
      desc: name.includes('SC GLORY') || name.includes('SC BRAVE') ? 'FLEX 38' : 'AHTS',
      prefix,
      img,
      lat,
      long,
      speed,
      course,
      engineLoad: status === 'offline' ? 0 : Math.round(35 + speed * 5),
      fuelRate,
      fuelConsumption,
      distance,
      status,
      timestamp,
    };
  }
}
