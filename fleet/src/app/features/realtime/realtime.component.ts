import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject, combineLatest } from 'rxjs';
import {
  distinctUntilChanged,
  map,
  shareReplay,
  takeUntil,
} from 'rxjs/operators';

import * as fvInfoReducer from '../../store/reducers/fv-info.reducer';
import * as fvInfoActions from '../../store/actions/fv-info.action';

import { FvRealtimeService } from '../../shared/services/fv-realtime.service';
import {
  getVesselStatusFromTimestamp,
  toVesselStatusLabel,
} from '../../shared/utils/vessel-status.util';

import { CardInfo, CardDetail } from './models/card-info.model';
import { CardConfiguration } from './card-config';

@Component({
  selector: 'app-realtime',
  standalone: false,
  templateUrl: './realtime.component.html',
  styleUrls: ['./realtime.component.css'],
})
export class RealtimeComponent implements OnInit, OnDestroy {
  data$!: Observable<Record<string, any>>;
  activeVessel$!: Observable<any>;

  cardInfos: CardInfo[] = [];
  prefixName = '';

  private destroy$ = new Subject<void>();

  constructor(
    private store: Store<any>,
    private route: ActivatedRoute,
    private fvRealtimeService: FvRealtimeService
  ) {
    this.cardInfos = new CardConfiguration().getConfig();
  }

  ngOnInit(): void {
    // ให้ service เริ่มยิง /getcurrentvalues เองทุก 5 วินาที
    // ใช้ได้แม้เปิดหน้า Realtime โดยตรง ไม่ต้อง refresh browser
    this.fvRealtimeService.ensureStarted(5000);

    this.data$ = combineLatest([
      this.store.select(fvInfoReducer.getFvRealtimeData),
      this.fvRealtimeService.currentData$,
    ]).pipe(
      map(([storeData, liveData]) => {
        const normalizedLiveData = this.normalizeRealtimeData(liveData);
        const normalizedStoreData = this.normalizeRealtimeData(storeData);

        // ให้ข้อมูล live จาก service มาก่อน เพราะเป็นค่าที่เพิ่งยิง backend รอบล่าสุด
        return Object.keys(normalizedLiveData).length > 0
          ? normalizedLiveData
          : normalizedStoreData;
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.activeVessel$ = combineLatest([
      this.store.select(fvInfoReducer.getFvInfosActive),
      this.fvRealtimeService.activeVessel$,
    ]).pipe(
      map(([storeActive, clickedActive]) =>
        clickedActive || storeActive || this.getStoredRealtimeVessel()
      ),
      distinctUntilChanged((prev, curr) =>
        this.getVesselIdentity(prev) === this.getVesselIdentity(curr)
      ),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.syncActiveVesselFromRoute();
    this.activateStoredVessel();
    this.watchSelectedVesselForLiveUpdate();
    this.watchRealtimePrefix();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }


  /**
   * เปิดจากปุ่ม Realtime ใน popup จะเก็บเรือไว้ใน localStorage
   * ฟังก์ชันนี้ดึงเรือนั้นมา set active อีกครั้ง กันหน้า realtime ว่าง/ค้าง
   */
  private activateStoredVessel(): void {
    const stored = this.getStoredRealtimeVessel();

    if (!stored) {
      return;
    }

    setTimeout(() => {
      this.fvRealtimeService.setActiveVessel(stored);
    }, 80);
  }

  /**
   * ถ้า active vessel มาจาก Store / Sidebar / URL ให้ส่งเข้า FvRealtimeService
   * เพื่อให้ service ยิง backend ซ้ำอัตโนมัติ ไม่ต้อง refresh หน้าเว็บ
   */
  private watchSelectedVesselForLiveUpdate(): void {
    this.activeVessel$
      .pipe(
        distinctUntilChanged((prev, curr) =>
          this.getVesselIdentity(prev) === this.getVesselIdentity(curr)
        ),
        takeUntil(this.destroy$)
      )
      .subscribe((vessel) => {
        if (!vessel) {
          return;
        }

        this.fvRealtimeService.setActiveVessel(vessel);
      });
  }

  /**
   * ใช้ดึงเรือจาก URL เช่น /main/realtime/BB_INTAN
   * แล้ว set active vessel ให้ตรงกับ route
   */
  private syncActiveVesselFromRoute(): void {
    const routeId$ = this.route.paramMap.pipe(
      map((params) => (params.get('id') || '').trim()),
      distinctUntilChanged()
    );

    const vessels$ = this.store.select(fvInfoReducer.getFvInfos);

    combineLatest([routeId$, vessels$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([id, vessels]) => {
        if (!id || !Array.isArray(vessels) || vessels.length === 0) {
          return;
        }

        const match = vessels.find((item: any) => {
          const fv = this.getActiveVesselInfo(item);

          return (
            String(fv?.prefix || '').toLowerCase() === id.toLowerCase() ||
            String(fv?.name || '').toLowerCase() === id.toLowerCase() ||
            String(fv?.id || '').toLowerCase() === id.toLowerCase()
          );
        });

        if (match) {
          this.store.dispatch(new fvInfoActions.SetFvActive(match));
        }
      });
  }

  /**
   * ใช้จับ prefix จาก tag realtime เช่น BB_INTAN-VES_GPS_SPEED
   */
  private watchRealtimePrefix(): void {
    this.data$
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        if (!data) {
          return;
        }

        const tag = this.getTag(data, 'VES_GPS_SPEED');

        if (tag && tag.tagName) {
          this.prefixName = String(tag.tagName).split('-')[0] || '';
        }
      });
  }

  /**
   * ใช้หา config ของ card ตาม tag / row / col
   */
  getCardDetail(tag: any, row: number, col: number): CardDetail | null {
    if (!tag || !tag.tagName) {
      return null;
    }

    const matchInfo = this.cardInfos.find((item) =>
      String(tag.tagName).startsWith(item.prefix)
    );

    if (!matchInfo || !matchInfo.details) {
      return null;
    }

    const matchCard = matchInfo.details.find(
      (item) => item.row === row && item.col === col
    );

    return matchCard || null;
  }

  getActiveVesselInfo(active: any): any {
    if (!active) {
      return null;
    }

    if (active.fvInfo) {
      return active.fvInfo;
    }

    if (active.fv) {
      return active.fv;
    }

    return active;
  }

  getRealtimeVesselName(active: any): string {
    const fv = this.getActiveVesselInfo(active);

    if (fv && fv.name) {
      return fv.name;
    }

    if (this.prefixName) {
      return this.prefixName;
    }

    return 'Selected Vessel';
  }

  getRealtimeVesselType(active: any): string {
    const fv = this.getActiveVesselInfo(active);

    if (fv && fv.desc) {
      return fv.desc;
    }

    if (fv && fv.description) {
      return fv.description;
    }

    return 'AHTS';
  }

  getRealtimeVesselPrefix(active: any): string {
    const fv = this.getActiveVesselInfo(active);

    if (fv && fv.prefix) {
      return fv.prefix;
    }

    return this.prefixName || '-';
  }

  getRealtimeVesselImage(active: any): string {
    const fv = this.getActiveVesselInfo(active);

    if (fv && fv.img) {
      return fv.img;
    }

    if (fv && fv.image) {
      return fv.image;
    }

    return this.resolveFallbackImage(fv?.name || fv?.prefix || '');
  }

  getRealtimeLat(active: any, rtData: any): string | number | null {
    const fv = this.getActiveVesselInfo(active);
    const data = this.normalizeRealtimeData(rtData);

    return (
      fv?.lat ??
      fv?.latitude ??
      fv?.lattitude ??
      this.getTagValue(data, 'VES_GPS_LAT') ??
      this.getTagValue(data, 'GPS_LAT') ??
      null
    );
  }

  getRealtimeLng(active: any, rtData: any): string | number | null {
    const fv = this.getActiveVesselInfo(active);
    const data = this.normalizeRealtimeData(rtData);

    return (
      fv?.long ??
      fv?.lng ??
      fv?.longitude ??
      fv?.longtitude ??
      this.getTagValue(data, 'VES_GPS_LONG') ??
      this.getTagValue(data, 'VES_GPS_LNG') ??
      this.getTagValue(data, 'GPS_LONG') ??
      this.getTagValue(data, 'GPS_LNG') ??
      null
    );
  }

  getRealtimeCoordinate(active: any, rtData: any): string {
    const fv = this.getActiveVesselInfo(active);
    const data = this.normalizeRealtimeData(rtData);

    const lat =
      fv?.lat ??
      fv?.latitude ??
      fv?.lattitude ??
      this.getTagValue(data, 'VES_GPS_LAT') ??
      this.getTagValue(data, 'GPS_LAT');

    const lng =
      fv?.long ??
      fv?.lng ??
      fv?.longitude ??
      fv?.longtitude ??
      this.getTagValue(data, 'VES_GPS_LONG') ??
      this.getTagValue(data, 'VES_GPS_LNG') ??
      this.getTagValue(data, 'GPS_LONG') ??
      this.getTagValue(data, 'GPS_LNG');

    if (
      lat === null ||
      lat === undefined ||
      lat === '' ||
      lng === null ||
      lng === undefined ||
      lng === ''
    ) {
      return '-';
    }

    const latitude = Number(lat);
    const longitude = Number(lng);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return '-';
    }

    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  }

  getRealtimeStatus(active: any): string {
    const fv = this.getActiveVesselInfo(active);
    const status = getVesselStatusFromTimestamp(fv?.timestamp);
    return status === 'nodata' ? 'Offline' : toVesselStatusLabel(status);
  }

  getRealtimeStatusClass(active: any): string {
    const status = this.getRealtimeStatus(active);

    if (status === 'Offline') {
      return 'offline';
    }

    if (status === 'Idle') {
      return 'idle';
    }

    return 'online';
  }

  getRealtimeLastUpdate(active: any, rtData: any): string {
    const fv = this.getActiveVesselInfo(active);
    const data = this.normalizeRealtimeData(rtData);

    const timestamp =
      this.getTagTimestamp(data, 'VES_GPS_SPEED') ||
      this.getTagTimestamp(data, 'VES_GPS_LAT') ||
      this.getTagTimestamp(data, 'VES_GPS_LONG') ||
      fv?.timestamp;

    if (!timestamp) {
      return '-';
    }

    return this.formatDate(timestamp);
  }

  /**
   * ใช้แสดงค่า tag ใน HTML ได้ เช่น getRealtimeValue(data, 'VES_GPS_SPEED')
   */
  getRealtimeValue(rtData: any, key: string, fallback: any = '0'): any {
    const data = this.normalizeRealtimeData(rtData);
    const value = this.getTagValue(data, key);

    if (value === null || value === undefined || value === '') {
      return fallback;
    }

    return value;
  }

  /**
   * ใช้แสดงตัวเลขแบบทศนิยม 2 ตำแหน่ง
   */
  getRealtimeNumber(rtData: any, key: string, fallback = 0): string {
    const value = Number(this.getRealtimeValue(rtData, key, fallback));

    if (!Number.isFinite(value)) {
      return fallback.toFixed(2);
    }

    return value.toFixed(2);
  }


  /**
   * แสดงค่า direction/course เป็นทศนิยม 2 ตำแหน่ง
   */
  getRealtimeDirection(
    rtData: any,
    key: string,
    fallback: string = '0.00'
  ): string {
    const value = Number(this.getRealtimeValue(rtData, key, fallback));

    if (!Number.isFinite(value)) {
      const fallbackValue = Number(fallback);
      return Number.isFinite(fallbackValue)
        ? fallbackValue.toFixed(2)
        : '0.00';
    }

    return value.toFixed(2);
  }

  /**
   * แสดง Latitude/Longitude เป็นทศนิยม 6 ตำแหน่ง
   */
  getRealtimeCoordinateNumber(
    rtData: any,
    key: string,
    fallback: string = '0.000000'
  ): string {
    const value = Number(this.getRealtimeValue(rtData, key, fallback));

    if (!Number.isFinite(value)) {
      const fallbackValue = Number(fallback);
      return Number.isFinite(fallbackValue)
        ? fallbackValue.toFixed(6)
        : '0.000000';
    }

    return value.toFixed(6);
  }

  pad(value: number): string {
    return value < 10 ? `0${value}` : String(value);
  }

  onShipImageError(event: Event): void {
    const img = event.target as HTMLImageElement | null;

    if (img) {
      img.src = 'assets/images/vessel/notfound.png';
    }
  }

  getHour(timestamp: any): number {
    if (!timestamp) {
      return 1;
    }

    const dt = new Date(timestamp);

    if (Number.isNaN(dt.getTime())) {
      return 1;
    }

    const hour = dt.getHours() + dt.getMinutes() / 60;

    return hour > 0 ? hour : 1;
  }

  abs(data: any): any {
    return data !== undefined && data !== null ? data : null;
  }

  getAvg(data: any): any {
    if (data && data.tagName && data.value !== undefined) {
      const hours = this.getHour(data.timestamp);
      const value = Number(data.value) / hours;

      return {
        name: '',
        tagName: `${data.tagName}-AVG`,
        timestamp: new Date(),
        value: Number.isFinite(value) ? value.toFixed(2) : '0.00',
        cal: false,
      };
    }

    return {
      name: '',
      tagName: '-AVG',
      timestamp: new Date(),
      value: '0',
      cal: false,
    };
  }

  getSum(...datas: any[]): any {
    let total = 0;
    let tagName = '';

    if (datas && datas.length > 0) {
      datas.forEach((data) => {
        if (data && data.value !== undefined && data.value !== null) {
          tagName = data.tagName ? String(data.tagName) : '';
          const value = Number(data.value);

          if (Number.isFinite(value) && value > 0) {
            total += value;
          }
        }
      });
    }

    return {
      name: '',
      tagName,
      timestamp: new Date(),
      value: total.toFixed(2),
      cal: false,
    };
  }

  /**
   * แปลงข้อมูล realtime ให้เป็น object กลาง
   */
  private normalizeRealtimeData(data: any): Record<string, any> {
    if (!data) {
      return {};
    }

    if (Array.isArray(data)) {
      return this.arrayToTagMap(data);
    }

    if (data.data) {
      if (Array.isArray(data.data)) {
        return this.arrayToTagMap(data.data);
      }

      if (typeof data.data === 'object') {
        return data.data;
      }
    }

    if (typeof data === 'object') {
      return data;
    }

    return {};
  }

  private arrayToTagMap(items: any[]): Record<string, any> {
    const result: Record<string, any> = {};

    items.forEach((item) => {
      const name =
        item?.name ||
        item?.tagName ||
        item?.TagName ||
        item?.Name;

      if (!name) {
        return;
      }

      const key = this.normalizeKey(name);

      result[key] = {
        ...item,
        name: key,
        tagName: item?.tagName || item?.Name || name,
        value:
          item?.value ??
          item?.Value ??
          item?.ivalue ??
          item?.IValue,
        timestamp:
          item?.timestamp ||
          item?.dateTime ||
          item?.DateTime ||
          item?.TimeStamp ||
          item?.timeStamp,
      };
    });

    return result;
  }

  private getTag(data: Record<string, any>, key: string): any {
    if (!data || !key) {
      return null;
    }

    const target = this.normalizeKey(key);

    if (data[target]) {
      return data[target];
    }

    if (data[key]) {
      return data[key];
    }

    const foundKey = Object.keys(data).find((dataKey) => {
      const normalizedDataKey = this.normalizeKey(dataKey);
      const tag = data[dataKey];
      const normalizedTagName = this.normalizeKey(
        tag?.tagName || tag?.Name || ''
      );

      return (
        normalizedDataKey === target ||
        normalizedTagName === target ||
        normalizedTagName.endsWith(`_${target}`) ||
        normalizedTagName.endsWith(`-${key}`)
      );
    });

    return foundKey ? data[foundKey] : null;
  }

  private getTagValue(data: Record<string, any>, key: string): any {
    const tag = this.getTag(data, key);

    if (!tag) {
      return null;
    }

    if (typeof tag !== 'object') {
      return tag;
    }

    return (
      tag.value ??
      tag.Value ??
      tag.ivalue ??
      tag.IValue ??
      tag.val ??
      null
    );
  }

  private getTagTimestamp(data: Record<string, any>, key: string): any {
    const tag = this.getTag(data, key);

    if (!tag || typeof tag !== 'object') {
      return null;
    }

    return (
      tag.timestamp ||
      tag.dateTime ||
      tag.DateTime ||
      tag.TimeStamp ||
      tag.timeStamp ||
      null
    );
  }

  private formatDate(value: any): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return (
      this.pad(date.getDate()) +
      '/' +
      this.pad(date.getMonth() + 1) +
      '/' +
      date.getFullYear() +
      ' ' +
      this.pad(date.getHours()) +
      ':' +
      this.pad(date.getMinutes()) +
      ':' +
      this.pad(date.getSeconds())
    );
  }

  private normalizeKey(key: string): string {
    return String(key || '')
      .replace(/-/g, '_')
      .toUpperCase();
  }

  private getStoredRealtimeVessel(): any {
    try {
      const raw =
        localStorage.getItem('realtimeVessel') ||
        localStorage.getItem('selectedVessel');

      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private getVesselIdentity(vessel: any): string {
    const fv = this.getActiveVesselInfo(vessel);

    return String(
      fv?.prefix ||
        fv?.id ||
        fv?.name ||
        ''
    ).toLowerCase();
  }

  private resolveFallbackImage(name: string): string {
    const normalized = String(name || '').toLowerCase();

    if (normalized.includes('intan')) {
      return 'assets/images/vessel/bb_intan.jpg';
    }

    if (normalized.includes('lazurit')) {
      return 'assets/images/vessel/bb_mulia.jpg';
    }

    if (normalized.includes('makmur')) {
      return 'assets/images/vessel/bb_mukda.jpg';
    }

    if (normalized.includes('zamrud')) {
      return 'assets/images/vessel/bb_zamrud.jpg';
    }

    if (normalized.includes('tongkam')) {
      return 'assets/images/vessel/bb_tongkam.jpg';
    }

    if (normalized.includes('gemia')) {
      return 'assets/images/vessel/mv_gemia.jpg';
    }

    if (normalized.includes('bongkot')) {
      return 'assets/images/vessel/sc_bongkot.jpg';
    }

    return 'assets/images/vessel/notfound.png';
  }
}