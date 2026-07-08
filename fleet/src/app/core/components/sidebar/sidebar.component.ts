import {
  Component,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  ChangeDetectorRef,
} from '@angular/core';

import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { Subscription } from 'rxjs';

import { CoordinatesService } from '../../../shared/services/coordinate.service';

interface VesselViewItem {
  raw: any;
  key: string;
  name: string;
  type: string;
  image: string;
  coordinate: string;
  status: string;
  statusClass: string;
  lastSeen: string;
  isActive: boolean;
}

@Component({
  selector: '[app-sidebar]',
  standalone: false,
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent implements OnInit, OnDestroy, OnChanges {
  @Input() vessels: any[] = [];
  @Input() activeVessel: any = null;

  @Output() selectedVessel = new EventEmitter<any>();

  keyword = '';
  isShowMenu = true;
  isSm = false;

  allVessels: any[] = [];
  visibleVessels: VesselViewItem[] = [];

  selectedVesselKey = '';

  private breakpointSub: Subscription | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private coordinatesService: CoordinatesService,
    private breakpointObserver: BreakpointObserver,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.breakpointSub = this.breakpointObserver
      .observe(['(max-width: 991px)'])
      .subscribe((state: BreakpointState) => {
        this.isSm = state.matches;
        this.isShowMenu = !state.matches;
        this.cdr.markForCheck();
      });

    this.allVessels = Array.isArray(this.vessels) ? this.vessels : [];
    this.syncActiveVessel();
    this.buildVisibleVessels();

    // refresh เวลา Last seen ทุก 1 นาที
    this.timer = setInterval(() => {
      this.buildVisibleVessels();
    }, 60000);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['vessels']) {
      this.allVessels = Array.isArray(this.vessels) ? this.vessels : [];
      this.buildVisibleVessels();
    }

    if (changes['activeVessel']) {
      this.syncActiveVessel();
      this.buildVisibleVessels();
    }
  }

  ngOnDestroy(): void {
    this.breakpointSub?.unsubscribe();

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  toggle(): void {
    this.isShowMenu = !this.isShowMenu;
    this.cdr.markForCheck();
  }

  closeMobileSidebar(): void {
    if (this.isSm) {
      this.isShowMenu = false;
      this.cdr.markForCheck();
    }
  }

  onSearch(value: string): void {
    this.keyword = value || '';
    this.buildVisibleVessels();
  }

  selectVessel(item: VesselViewItem): void {
    if (!item || !item.raw) {
      return;
    }

    this.selectedVesselKey = item.key;
    this.selectedVessel.emit(item.raw);

    try {
      localStorage.setItem('selectedVessel', JSON.stringify(item.raw));
      localStorage.setItem('realtimeVessel', JSON.stringify(item.raw));
      localStorage.setItem('pastTrackVessel', JSON.stringify(item.raw));
    } catch (error) {
      console.warn('[SidebarComponent] save selected vessel failed:', error);
    }

    if (this.isSm) {
      this.isShowMenu = false;
    }

    this.buildVisibleVessels();
    this.cdr.markForCheck();
  }

  buildVisibleVessels(): void {
    const keyword = (this.keyword || '').toLowerCase().trim();

    const filtered = this.allVessels.filter((vessel: any) => {
      if (!keyword) {
        return true;
      }

      const normalized = this.normalizeVessel(vessel);

      const name = String(normalized.name || '').toLowerCase();
      const desc = String(normalized.desc || '').toLowerCase();
      const prefix = String(normalized.prefix || '').toLowerCase();

      return (
        name.includes(keyword) ||
        desc.includes(keyword) ||
        prefix.includes(keyword)
      );
    });

    this.visibleVessels = filtered.map((vessel: any, index: number) => {
      const normalized = this.normalizeVessel(vessel);
      const key = this.getVesselKey(normalized, index);
      const status = this.getStatus(normalized);

      return {
        raw: vessel,
        key,
        name: normalized.name || '-',
        type: normalized.desc || normalized.prefix || 'AHTS',
        image: normalized.img || this.resolveFallbackImage(normalized.name),
        coordinate: this.getCoordinate(normalized),
        status,
        statusClass: this.getStatusClass(status),
        lastSeen: this.getLastSeenText(normalized),
        isActive:
          this.selectedVesselKey !== '' &&
          this.selectedVesselKey === key,
      };
    });

    this.cdr.markForCheck();
  }

  getStatus(vessel: any): string {
    const rawStatus = String(
      vessel?.status ||
        vessel?.statusKey ||
        vessel?.state ||
        ''
    ).toLowerCase();

    if (rawStatus.includes('offline')) {
      return 'Offline';
    }

    if (rawStatus.includes('idle')) {
      return 'Idle';
    }

    if (rawStatus.includes('online')) {
      return 'Online';
    }

    const minute = this.getLastSeenMinute(vessel);

    if (minute > 120) {
      return 'Offline';
    }

    if (minute > 30) {
      return 'Idle';
    }

    return 'Online';
  }

  getStatusClass(status: string): string {
    if (status === 'Offline') {
      return 'offline';
    }

    if (status === 'Idle') {
      return 'idle';
    }

    return 'online';
  }

  getLastSeenText(vessel: any): string {
    if (!vessel || !vessel.timestamp) {
      return '-';
    }

    // บังคับ format เอง ไม่ใช้ FvTimeService
    // เพื่อให้แสดงเป็น 1 M, 2 M, 60 D แบบ sidebar
    return this.formatLastSeen(vessel.timestamp);
  }

  getLastSeenMinute(vessel: any): number {
    if (!vessel || !vessel.timestamp) {
      return 999999;
    }

    const now = Date.now();
    const last = new Date(vessel.timestamp).getTime();

    if (Number.isNaN(last)) {
      return 999999;
    }

    const diff = Math.floor((now - last) / 60000);

    return diff < 0 ? 0 : diff;
  }

  getCoordinate(vessel: any): string {
    if (!vessel) {
      return '-';
    }

    const lat = this.toNumberOrNull(vessel.lat);
    const lng = this.toNumberOrNull(
      vessel.long ??
        vessel.lng ??
        vessel.longitude ??
        vessel.longtitude
    );

    if (lat === null || lng === null) {
      return '-';
    }

    try {
      const service: any = this.coordinatesService;

      if (typeof service.getLatLong === 'function') {
        const value = service.getLatLong(String(lat), String(lng));

        if (value) {
          return value;
        }
      }
    } catch {
      return this.formatCoordinate(lat, lng);
    }

    return this.formatCoordinate(lat, lng);
  }

  getVesselKey(vessel: any, index: number): string {
    if (!vessel) {
      return String(index);
    }

    if (vessel.id) {
      return String(vessel.id);
    }

    if (vessel._id) {
      return String(vessel._id);
    }

    if (vessel.prefix) {
      return String(vessel.prefix);
    }

    if (vessel.name) {
      return String(vessel.name);
    }

    return String(index);
  }

  trackByVessel(index: number, item: VesselViewItem): string | number {
    return item?.key || index;
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement | null;

    if (img) {
      img.src = 'assets/images/vessel/notfound.png';
    }
  }

  private syncActiveVessel(): void {
    if (!this.activeVessel) {
      return;
    }

    const active = this.normalizeVessel(this.activeVessel);
    this.selectedVesselKey = this.getVesselKey(active, 0);
  }

  private normalizeVessel(vessel: any): any {
    if (!vessel) {
      return {};
    }

    const fvInfo = vessel?.fvInfo || vessel?.fv || vessel;
    const newData = vessel?.newData || this.buildTagMap(vessel?.datas || []);

    const tagValue = (names: string[]): any => {
      for (const name of names) {
        const item =
          newData?.[name] ||
          this.findCaseInsensitive(newData, name);

        const value = item?.value ?? item?.Value;

        if (value !== undefined && value !== null && value !== '') {
          return value;
        }
      }

      return undefined;
    };

    const tagTimestamp = (): any => {
      const keys = [
        'VES_GPS_LAT',
        'VES_GPS_LONG',
        'VES_GPS_LNG',
        'VES_GPS_SPEED',
        'GPS_LAT',
        'GPS_LONG',
        'GPS_LNG',
        'GPS_SPEED',
      ];

      for (const key of keys) {
        const item =
          newData?.[key] ||
          this.findCaseInsensitive(newData, key);

        const timestamp =
          item?.timestamp ||
          item?.dateTime ||
          item?.DateTime ||
          item?.TimeStamp;

        if (timestamp) {
          return timestamp;
        }
      }

      return undefined;
    };

    const vesselName =
      fvInfo.name ||
      vessel.name ||
      vessel.vesselName ||
      vessel.VesselName ||
      '';

    return {
      id: fvInfo.id || vessel.id,
      _id: fvInfo._id || vessel._id,
      name: vesselName,
      desc:
        fvInfo.desc ||
        fvInfo.description ||
        vessel.desc ||
        vessel.description ||
        vessel.type ||
        'AHTS',
      prefix:
        fvInfo.prefix ||
        vessel.prefix ||
        fvInfo.name ||
        vessel.name,
      img:
        fvInfo.img ||
        fvInfo.image ||
        vessel.img ||
        vessel.image ||
        vessel.imageUrl ||
        this.resolveFallbackImage(vesselName),
      lat:
        tagValue(['VES_GPS_LAT', 'GPS_LAT', 'LAT', 'lat', 'latitude']) ??
        fvInfo.lat ??
        fvInfo.latitude ??
        fvInfo.lattitude ??
        vessel.lat ??
        vessel.latitude ??
        vessel.lattitude,
      long:
        tagValue([
          'VES_GPS_LONG',
          'VES_GPS_LNG',
          'GPS_LONG',
          'GPS_LNG',
          'LNG',
          'lng',
          'long',
          'longitude',
        ]) ??
        fvInfo.long ??
        fvInfo.lng ??
        fvInfo.longitude ??
        fvInfo.longtitude ??
        vessel.long ??
        vessel.lng ??
        vessel.longitude ??
        vessel.longtitude,
      status:
        tagValue(['VES_STATUS', 'STATUS', 'VES_STATE', 'STATE']) ??
        fvInfo.status ??
        vessel.status ??
        vessel.statusKey ??
        vessel.state,
      timestamp:
        tagTimestamp() ||
        fvInfo.timestamp ||
        fvInfo.lastUpdate ||
        fvInfo.updatedAt ||
        vessel.timestamp ||
        vessel.lastUpdate ||
        vessel.updatedAt ||
        vessel.dateTime,
    };
  }

  private buildTagMap(datas: any[]): Record<string, any> {
    const map: Record<string, any> = {};

    if (!Array.isArray(datas)) {
      return map;
    }

    datas.forEach((data: any) => {
      const name =
        data?.name ||
        data?.tagName ||
        data?.TagName ||
        data?.Name;

      if (!name) {
        return;
      }

      map[name] = {
        value: data.value ?? data.Value,
        timestamp:
          data.dateTime ||
          data.timestamp ||
          data.DateTime ||
          data.TimeStamp,
      };
    });

    return map;
  }

  private findCaseInsensitive(obj: any, key: string): any {
    if (!obj || !key) {
      return null;
    }

    const foundKey = Object.keys(obj).find(
      (itemKey) => itemKey.toLowerCase() === key.toLowerCase()
    );

    return foundKey ? obj[foundKey] : null;
  }

  private formatLastSeen(timestamp: string): string {
    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    const diffMs = Date.now() - date.getTime();
    const diffMinRaw = Math.floor(diffMs / 60000);

    // ถ้าน้อยกว่า 1 นาที ให้แสดง 1 M แทน Now
    const diffMin = diffMinRaw < 1 ? 1 : diffMinRaw;

    if (diffMin < 60) {
      return `${diffMin} M`;
    }

    const diffHour = Math.floor(diffMin / 60);

    if (diffHour < 24) {
      return `${diffHour} H`;
    }

    const diffDay = Math.floor(diffHour / 24);

    return `${diffDay} D`;
  }

  private formatCoordinate(lat: number, lng: number): string {
    const latDir = lat >= 0 ? 'N' : 'S';
    const lngDir = lng >= 0 ? 'E' : 'W';

    return `${Math.abs(lat).toFixed(5)} ${latDir}, ${Math.abs(lng).toFixed(
      5
    )} ${lngDir}`;
  }

  private toNumberOrNull(value: any): number | null {
    const num = Number.parseFloat(String(value));

    return Number.isNaN(num) ? null : num;
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

    if (normalized.includes('liberty')) {
      return 'assets/images/vessel/bb_liberty209.jpg';
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