import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  OnDestroy,
  Input,
  NgZone,
  ViewChild,
} from '@angular/core';

import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { VesselPopupService } from '../../../shared/services/vessel-popup.service';
import { FvRealtimeService } from '../../../shared/services/fv-realtime.service';
import { NewHttpClientService } from '../../../shared/services/http-client1.service';
import { getVesselStatusFromTimestamp } from '../../../shared/utils/vessel-status.util';

declare var google: any;

type MapStatus = 'online' | 'idle' | 'offline';

@Component({
  selector: 'app-maps-all',
  standalone: false,
  templateUrl: './maps-all.component.html',
  styleUrls: ['./maps-all.component.css'],
})
export class MapsAllComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapElement', { static: true })
  mapElement?: ElementRef<HTMLDivElement>;

  map: any = null;
  markers: any[] = [];
  markerMap: Record<string, any> = {};

  _data: any[] = [];

  // มุมมองเริ่มต้นของหน้า Overview: ซูมเข้ามาที่อ่าวไทยและคาบสมุทรมาเลย์
  // เพื่อให้ตำแหน่งเรือหลักอ่านง่ายใกล้เคียงภาพตัวอย่างที่ผู้ใช้กำหนด
  centerPosition = { lat: 10.25, lng: 102.25 };
  defaultZoom = 7;

  activeFilter: 'all' | MapStatus = 'all';

  totalVessels = 0;
  onlineCount = 0;
  idleCount = 0;
  offlineCount = 0;

  selectedVessel: any = null;
  selectedStatus: MapStatus = 'online';
  selectedMarker: any = null;

  private popupSub?: Subscription;
  private popupSummarySub?: Subscription;
  private popupSummaryCache: Record<string, { newData: Record<string, any> }> = {};
  private realtimeTimer: any = null;
  private resizeObserver?: ResizeObserver;
  private resizeTimer: ReturnType<typeof setTimeout> | null = null;
  private mapInitRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly realtimeRefreshMs = 15000; // รีเฟรช popup/map เพื่อให้ Last seen เดินตามข้อมูล

  // tag ที่ใช้แสดง Today Summary ใน popup
  // ดึงเพิ่มจาก dashboard tag เพราะ overview tag เดิมมีแค่ lat/long บางตัว
  private readonly popupSummaryTagSuffixes: string[] = [
    'VES-GPS-SPEED',
    'VES-GPS-HEAD',
    'VES-GPS-COURSE',
    'VES-GPS-DIS-TODAY',
    'VES-GPS-DIS',
    'VES-DISTANCE',
    'VES-CONS-TODAY',
    'VES-FUEL-CONSUMPTION',

    // Engine load จริงของ dashboard เดิมใช้ PME/SME เป็นหลัก
    // เพิ่มหลายชื่อไว้เผื่อเรือบางลำใช้ tag คนละชุด
    'PME-ENGINE-LOAD',
    'CME-ENGINE-LOAD',
    'SME-ENGINE-LOAD',
    'PAE-ENGINE-LOAD',
    'CAE-ENGINE-LOAD',
    'SAE-ENGINE-LOAD',
    'ENGINE-LOAD',
    'VES-ENGINE-LOAD',

    'PME-CONS-TODAY',
    'CME-CONS-TODAY',
    'SME-CONS-TODAY',
    'DG1-CONS-TODAY',
    'DG2-CONS-TODAY',
    'DG3-CONS-TODAY',
    'DG4-CONS-TODAY',
  ];

  @Input('data')
  set data(value: any[]) {
    const selectedKey = this.getVesselKey(this.selectedVessel);

    this._data = this.normalizeMapData(value || []);
    this.calculateStatusCount(this._data);

    if (this.map) {
      this.renderMap(this._data);
      this.syncSelectedPopup(selectedKey);
    }
  }

  get allowDay(): any[] {
    return this._data;
  }

  constructor(
    private router: Router,
    private zone: NgZone,
    private vesselPopup: VesselPopupService,
    private fvRealtimeService: FvRealtimeService,
    private newHttp: NewHttpClientService
  ) {}

  ngOnInit(): void {
    this.popupSub = this.vesselPopup.vesselPopup$.subscribe((vessel) => {
      if (!vessel) {
        this.closeSelectedCard();
        return;
      }

      this.openVesselFromOverview(vessel);
    });

    this.startRealtimeWatcher();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initMap();
    }, 0);
  }

  ngOnDestroy(): void {
    this.clearOverlays();
    this.popupSub?.unsubscribe();
    this.popupSummarySub?.unsubscribe();
    this.resizeObserver?.disconnect();

    if (this.realtimeTimer) {
      clearInterval(this.realtimeTimer);
      this.realtimeTimer = null;
    }

    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = null;
    }

    if (this.mapInitRetryTimer) {
      clearTimeout(this.mapInitRetryTimer);
      this.mapInitRetryTimer = null;
    }
  }

  initMap(): void {
    const mapElement = this.mapElement?.nativeElement;

    if (!mapElement) {
      return;
    }

    if (mapElement.clientWidth <= 0 || mapElement.clientHeight <= 0) {
      this.mapInitRetryTimer = setTimeout(() => this.initMap(), 120);
      return;
    }

    if (typeof google === 'undefined' || !google.maps) {
      console.warn('[MapsAllComponent] Google Maps is not ready.');
      return;
    }

    this.map = new google.maps.Map(mapElement, {
      center: this.centerPosition,
      zoom: this.defaultZoom,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      mapTypeControl: true,
      mapTypeControlOptions: {
        style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
        position: google.maps.ControlPosition.TOP_LEFT,
        mapTypeIds: [
          google.maps.MapTypeId.ROADMAP,
          google.maps.MapTypeId.SATELLITE,
          google.maps.MapTypeId.HYBRID,
          google.maps.MapTypeId.TERRAIN,
        ],
      },
      fullscreenControl: true,
      fullscreenControlOptions: {
        position: google.maps.ControlPosition.RIGHT_TOP,
      },
      zoomControl: true,
      zoomControlOptions: {
        position: google.maps.ControlPosition.RIGHT_TOP,
      },
      streetViewControl: true,
      streetViewControlOptions: {
        position: google.maps.ControlPosition.RIGHT_BOTTOM,
      },
      styles: [],
    });

    this.setupMapResizeObserver(mapElement);
    this.refreshMapSize();

    if (this._data.length > 0) {
      this.renderMap(this._data);
    }
  }


  private setupMapResizeObserver(mapElement: HTMLElement): void {
    this.resizeObserver?.disconnect();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    this.resizeObserver = new ResizeObserver(() => {
      this.refreshMapSize();
    });

    this.resizeObserver.observe(mapElement);
  }

  private refreshMapSize(): void {
    if (!this.map || typeof google === 'undefined' || !google.maps) {
      return;
    }

    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
    }

    this.resizeTimer = setTimeout(() => {
      const center = this.map.getCenter?.();
      google.maps.event.trigger(this.map, 'resize');

      if (center) {
        this.map.setCenter(center);
      } else {
        this.map.setCenter(this.centerPosition);
      }
    }, 80);
  }

  startRealtimeWatcher(): void {
    if (this.realtimeTimer) {
      clearInterval(this.realtimeTimer);
    }

    this.realtimeTimer = setInterval(() => {
      if (!this._data || this._data.length === 0) {
        return;
      }

      const selectedKey = this.getVesselKey(this.selectedVessel);
      this.calculateStatusCount(this._data);
      this.renderMap(this._data);
      this.syncSelectedPopup(selectedKey);
    }, this.realtimeRefreshMs);
  }

  normalizeMapData(data: any[]): any[] {
    return (data || []).map((row: any, index: number) => {
      const newData = row?.newData || this.buildTagMap(row?.datas || []);

      return {
        ...row,
        newData,
        markerNo: index + 1,
      };
    });
  }

  renderMap(data: any[]): void {
    this.clearOverlays();

    if (!this.map || !data || data.length === 0) {
      return;
    }

    const displayData = this.getFilteredData(data);

    displayData.forEach((vessel: any) => {
      const lat = this.toNumberOrNull(this.getLatValue(vessel));
      const lng = this.toNumberOrNull(this.getLngValue(vessel));

      if (lat === null || lng === null) {
        return;
      }

      const status = this.getVesselStatus(vessel);
      const vesselName = this.getVesselName(vessel);

      const marker = new google.maps.Marker({
        position: { lat, lng },
        map: this.map,
        title: vesselName,
        icon: this.getPremiumShipIcon(status, vesselName),
        zIndex: this.getMarkerZIndex(status),
      });

      const vesselKey = this.getVesselKey(vessel);

      if (vesselKey) {
        this.markerMap[vesselKey] = {
          marker,
          vessel,
          status,
        };
      }

      this.bindMarkerClick(marker, vessel, status);
      this.markers.push(marker);
    });

    // ไม่บังคับ reset zoom/center ทุกครั้งที่ข้อมูล realtime refresh
    // ผู้ใช้จึงยังสามารถซูมและเลื่อนแผนที่เองได้ โดยค่าเริ่มต้นถูกกำหนดตอน initMap เท่านั้น
  }

  bindMarkerClick(marker: any, vessel: any, status: MapStatus): void {
    marker.addListener('click', () => {
      this.openVesselPopup(vessel, status, marker);
    });
  }

  openVesselPopup(vessel: any, status: MapStatus, marker: any): void {
    this.zone.run(() => {
      // เก็บข้อมูลเรือแบบ normalize เพื่อให้ popup อ่านค่า speed/load/fuel ได้ครบ
      const normalizedVessel = this.normalizePopupVessel(vessel);

      this.selectedVessel = normalizedVessel;
      this.selectedStatus = status;
      this.selectedMarker = marker;

      try {
        localStorage.setItem('selectedVessel', JSON.stringify(normalizedVessel));
        localStorage.setItem('realtimeVessel', JSON.stringify(normalizedVessel));
        localStorage.setItem('pastTrackVessel', JSON.stringify(normalizedVessel));
      } catch {}

      this.loadPopupSummary(normalizedVessel);

      if (this.map && marker) {
        this.map.panTo(marker.getPosition());

        const currentZoom = this.map.getZoom();
        if (!currentZoom || currentZoom < 8) {
          this.map.setZoom(8);
        }
      }
    });
  }

  syncSelectedPopup(selectedKey: string): void {
    if (!selectedKey) {
      return;
    }

    const item = this.markerMap?.[selectedKey];

    if (item) {
      this.selectedVessel = this.normalizePopupVessel(item.vessel);
      this.selectedStatus = item.status;
      this.selectedMarker = item.marker;
    }
  }

  openVesselFromOverview(vesselFromOverview: any): void {
    if (!vesselFromOverview) {
      return;
    }

    setTimeout(() => {
      let item = this.findMarkerItem(vesselFromOverview);

      if (!item && this.activeFilter !== 'all') {
        this.activeFilter = 'all';
        this.renderMap(this._data);
        item = this.findMarkerItem(vesselFromOverview);
      }

      if (!item) {
        console.warn('[MapsAllComponent] marker target not found:', vesselFromOverview);
        return;
      }

      this.openVesselPopup(item.vessel, item.status, item.marker);
    }, 0);
  }

  private findMarkerItem(vesselFromOverview: any): any {
    if (!vesselFromOverview || !this.markerMap) {
      return null;
    }

    const key = this.getVesselKey(vesselFromOverview);

    if (key && this.markerMap[key]) {
      return this.markerMap[key];
    }

    const targetCandidates = [
      key,
      this.getVesselPrefix(vesselFromOverview),
      this.getVesselName(vesselFromOverview),
      this.getVesselKey(vesselFromOverview?.fv),
      this.getVesselName(vesselFromOverview?.fv),
    ]
      .map((value) => this.normalizeKey(value))
      .filter((value) => value.length > 0);

    const keys = Object.keys(this.markerMap);

    for (const itemKey of keys) {
      const item = this.markerMap[itemKey];

      if (!item?.vessel) {
        continue;
      }

      const itemCandidates = [
        itemKey,
        this.getVesselKey(item.vessel),
        this.getVesselPrefix(item.vessel),
        this.getVesselName(item.vessel),
        this.getVesselKey(item.vessel?.fv),
        this.getVesselName(item.vessel?.fv),
      ].map((value) => this.normalizeKey(value));

      if (targetCandidates.some((candidate) => itemCandidates.includes(candidate))) {
        return item;
      }
    }

    return null;
  }

  setFilter(status: 'all' | MapStatus): void {
    this.activeFilter = status;
    this.selectedVessel = null;
    this.selectedMarker = null;
    this.renderMap(this._data);
  }

  getFilteredData(data: any[]): any[] {
    if (this.activeFilter === 'all') {
      return data;
    }

    return data.filter((vessel) => this.getVesselStatus(vessel) === this.activeFilter);
  }

  calculateStatusCount(data: any[]): void {
    this.totalVessels = data.length;
    this.onlineCount = 0;
    this.idleCount = 0;
    this.offlineCount = 0;

    data.forEach((vessel) => {
      const status = this.getVesselStatus(vessel);

      if (status === 'online') this.onlineCount++;
      else if (status === 'idle') this.idleCount++;
      else this.offlineCount++;
    });
  }

  clearOverlays(): void {
    this.markers.forEach((marker) => marker.setMap(null));
    this.markers = [];
    this.markerMap = {};
  }

  closeSelectedCard(): void {
    this.selectedVessel = null;
    this.selectedMarker = null;
  }

  resetView(): void {
    if (!this.map) {
      return;
    }

    this.map.setZoom(this.defaultZoom);
    this.map.setCenter(this.centerPosition);
  }

  getVesselStatus(vessel: any): MapStatus {
    const timestamp = this.getLatestTimestamp(vessel);
    let diffMinutes: number | null = null;

    if (timestamp) {
      const date = new Date(timestamp);

      if (!Number.isNaN(date.getTime())) {
        diffMinutes = Math.max(0, (Date.now() - date.getTime()) / 60000);
        const timestampStatus = getVesselStatusFromTimestamp(timestamp);

        // Timestamp ใช้เกณฑ์เดียวกับ Sidebar และ Realtime
        if (timestampStatus === 'offline' || timestampStatus === 'idle') {
          return timestampStatus;
        }
      }
    }

    const textStatus = this.getTextStatus(vessel);

    if (textStatus) {
      return textStatus;
    }

    if (
      this.toNumberOrNull(this.getLatValue(vessel)) === null ||
      this.toNumberOrNull(this.getLngValue(vessel)) === null
    ) {
      return 'offline';
    }

    return 'online';
  }

  getTextStatus(vessel: any): MapStatus | '' {
    // ให้สถานะจาก Tag ข้อมูลจริงมาก่อน statusKey/status ที่อาจเป็นค่าค้าง
    // ใช้ลำดับเดียวกับ Sidebar เพื่อให้สีและสถานะทั้งสองจุดตรงกัน
    const value =
      this.getFirstTagValue(vessel, [
        'VES_STATUS_TEXT',
        'STATUS_TEXT',
        'VES_STATE',
        'STATE',
        'VES_STATUS',
        'STATUS',
      ]) ||
      this.getObjectValue(vessel, 'fv.status') ||
      this.getObjectValue(vessel, 'fv.state') ||
      this.getObjectValue(vessel, 'status') ||
      this.getObjectValue(vessel, 'statusKey') ||
      this.getObjectValue(vessel, 'state');

    if (!this.hasValue(value)) {
      return '';
    }

    const text = String(value).toLowerCase();

    if (text.includes('offline') || text === 'false' || text === '0') return 'offline';
    if (text.includes('idle') || text.includes('standby') || text.includes('stop')) return 'idle';
    if (text.includes('online') || text.includes('running') || text.includes('active') || text === 'true' || text === '1') return 'online';

    return '';
  }

  getPremiumShipIcon(status: string, name: string): any {
    const color = this.getStatusColor(status);
    const text = this.escapeSvgText(this.truncateText(name, 18));

    // คืน UI Marker แบบเดิม: pin สีตามสถานะ + ป้ายชื่อเรือขนาดเล็ก
    const svg =
      '<svg width="190" height="54" viewBox="0 0 190 54" xmlns="http://www.w3.org/2000/svg">' +
      '<filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">' +
      '<feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="#0f172a" flood-opacity="0.25"/>' +
      '</filter>' +
      '<path filter="url(#shadow)" d="M24 2C13.8 2 5.5 10.1 5.5 20C5.5 33.6 24 52 24 52C24 52 42.5 33.6 42.5 20C42.5 10.1 34.2 2 24 2Z" fill="' + color + '"/>' +
      '<circle cx="24" cy="21" r="12" fill="white" fill-opacity="0.96"/>' +
      '<path d="M15.5 24.5L19 17.5H29L32.5 24.5H15.5Z" fill="' + color + '"/>' +
      '<path d="M19.5 17.5L21.5 13.5H26.5L28.5 17.5H19.5Z" fill="' + color + '"/>' +
      '<path d="M17.5 26.2C21 28.3 27 28.3 30.5 26.2" stroke="' + color + '" stroke-width="2.2" stroke-linecap="round"/>' +
      '<circle cx="21" cy="21" r="1.2" fill="white"/>' +
      '<circle cx="24" cy="21" r="1.2" fill="white"/>' +
      '<circle cx="27" cy="21" r="1.2" fill="white"/>' +
      '<rect x="45" y="14" width="125" height="25" rx="6" fill="white" fill-opacity="0.95"/>' +
      '<text x="53" y="31" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#0f172a">' + text + '</text>' +
      '</svg>';

    return {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
      scaledSize: new google.maps.Size(190, 54),
      anchor: new google.maps.Point(24, 52),
    };
  }

  getStatusColor(status: string): string {
    if (status === 'online') return '#16a34a';
    if (status === 'idle') return '#f59e0b';
    return '#ef4444';
  }

  getStatusText(status: string): string {
    if (status === 'online') return 'Online';
    if (status === 'idle') return 'Idle';
    return 'Offline';
  }

  getMarkerZIndex(status: string): number {
    // ให้ Offline อยู่ด้านบนเมื่อเรือหลายลำมีตำแหน่งใกล้กัน
    if (status === 'offline') return 40;
    if (status === 'idle') return 30;
    return 20;
  }

  getVesselName(vessel: any): string {
    return (
      vessel?.fv?.name ||
      vessel?.fvInfo?.name ||
      vessel?.name ||
      vessel?.vesselName ||
      vessel?.prefix ||
      'VESSEL'
    );
  }

  getVesselType(vessel: any): string {
    return vessel?.fv?.desc || vessel?.fvInfo?.desc || vessel?.desc || vessel?.type || 'AHTS';
  }

  getVesselPrefix(vessel: any): string {
    return vessel?.fv?.prefix || vessel?.fvInfo?.prefix || vessel?.prefix || vessel?.id || this.getVesselName(vessel);
  }

  getVesselKey(vessel: any): string {
    if (!vessel) {
      return '';
    }

    return String(
      vessel?.fv?.id ||
      vessel?.fvInfo?.id ||
      vessel?.id ||
      vessel?._id ||
      vessel?.fv?.prefix ||
      vessel?.fvInfo?.prefix ||
      vessel?.prefix ||
      vessel?.fv?.name ||
      vessel?.fvInfo?.name ||
      vessel?.name ||
      ''
    );
  }

  getVesselImage(vessel: any): string {
    const image = vessel?.fv?.img || vessel?.fvInfo?.img || vessel?.img || vessel?.image;
    return image || this.resolveFallbackImage(this.getVesselName(vessel));
  }

  onImageError(event: any): void {
    if (event?.target) {
      event.target.src = 'assets/images/vessel/notfound.png';
    }
  }

  getCoordinateText(vessel: any): string {
    const lat = this.toNumberOrNull(this.getLatValue(vessel));
    const lng = this.toNumberOrNull(this.getLngValue(vessel));

    if (lat === null || lng === null) {
      return '-';
    }

    const latDir = lat >= 0 ? 'N' : 'S';
    const lngDir = lng >= 0 ? 'E' : 'W';
    return `${Math.abs(lat).toFixed(5)} ${latDir}, ${Math.abs(lng).toFixed(5)} ${lngDir}`;
  }

  getLastUpdateText(vessel: any): string {
    const timestamp = this.getLatestTimestamp(vessel);

    if (!timestamp) {
      return '-';
    }

    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
      return String(timestamp);
    }

    const diffMs = Date.now() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'Now';
    if (diffMin < 60) return `${diffMin}M`;
    if (diffHour < 24) return `${diffHour}H`;
    return `${diffDay}D`;
  }

  getSpeedText(vessel: any): string {
    return this.formatNumber(
      this.getFirstTagValue(vessel, [
        'VES_GPS_SPEED',
        'VES_GPS_SOG',
        'GPS_SPEED',
        'SPEED',
        'SOG',
      ]) ?? this.getDirectValue(vessel, ['speed', 'sog']),
      1
    );
  }

  getEngineLoadText(vessel: any): string {
    const values = this.getAllNumericValues(
      vessel,
      [
        'PME_ENGINE_LOAD',
        'CME_ENGINE_LOAD',
        'SME_ENGINE_LOAD',
        'PAE_ENGINE_LOAD',
        'CAE_ENGINE_LOAD',
        'SAE_ENGINE_LOAD',
        'VES_ENGINE_LOAD',
        'ENGINE_LOAD',
        'ENG_LOAD',
        'MAIN_ENGINE_LOAD',
        'LOAD',
      ],
      ['engineLoad', 'engine_load', 'load']
    );

    // ถ้ามีหลายเครื่อง ให้ใช้ค่าเฉลี่ยของเครื่องที่มี load จริง (> 0)
    // เพื่อไม่ให้ tag ตัวแรกที่เป็น 0 ไปทับค่าจริงของอีกเครื่อง
    const activeLoads = values.filter((value) => value > 0);
    const value = activeLoads.length > 0
      ? activeLoads.reduce((sum, current) => sum + current, 0) / activeLoads.length
      : values[0];

    return this.formatNumber(value, 0);
  }

  getFuelConsumptionText(vessel: any): string {
    return this.formatNumber(
      this.getFirstTagValue(vessel, [
        'VES_CONS_TODAY',
        'VES_FUEL_CONSUMPTION',
        'VES_FUEL_CONS_TODAY',
        'FUEL_CONSUMPTION',
        'FUEL_CONSUMPTION_TODAY',
        'CONS_TODAY',
        'PME_CONS_TODAY',
        'CME_CONS_TODAY',
        'SME_CONS_TODAY',
      ]) ?? this.getDirectValue(vessel, ['fuelConsumption', 'fuel_consumption']),
      0
    );
  }

  getCourseText(vessel: any): string {
    return this.formatNumber(
      this.getFirstTagValue(vessel, [
        'VES_GPS_HEAD',
        'VES_GPS_COURSE',
        'GPS_HEAD',
        'GPS_COURSE',
        'COURSE',
        'HEADING',
      ]) ?? this.getDirectValue(vessel, ['course', 'heading']),
      0
    );
  }

  getDistanceText(vessel: any): string {
    const values = this.getAllNumericValues(
      vessel,
      [
        'VES_GPS_DIS_TODAY',
        'VES_GPS_DIS',
        'VES_DISTANCE',
        'VES_GPS_DIS_TOTAL',
        'GPS_DIS_TODAY',
        'GPS_DIS',
        'DISTANCE_TODAY',
        'TODAY_DISTANCE',
        'DISTANCE',
      ],
      ['distance', 'distanceToday', 'todayDistance', 'tripDistance']
    );

    // เลือกค่าระยะทางที่มากกว่า 0 ก่อน เพราะ direct default บางเรือเป็น 0
    const value = values.find((item) => item > 0) ?? values[0];

    return this.formatNumber(value, 1);
  }

  goPastTrack(vessel: any, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();

    const selected = this.normalizePopupVessel(vessel);

    if (selected) {
      localStorage.setItem('pastTrackVessel', JSON.stringify(selected));
      localStorage.setItem('selectedVessel', JSON.stringify(selected));
    }

    const routeId = this.getVesselRouteId(selected);
    this.zone.run(() => {
      this.router.navigate(routeId ? ['/main/past-track', routeId] : ['/main/past-track']);
    });
  }

  goRealtime(vessel: any, event?: Event): void {
    // กัน click ซ้อนกับ Google Map และกันหน้าเว็บค้างจาก event bubble
    event?.preventDefault();
    event?.stopPropagation();

    const selected = this.normalizePopupVessel(vessel);

    if (selected) {
      localStorage.setItem('realtimeVessel', JSON.stringify(selected));
      localStorage.setItem('selectedVessel', JSON.stringify(selected));
    }

    // สำคัญ: ไป /main/realtime ตรง ๆ ไม่ส่ง :id
    // เพราะบาง prefix/name มีช่องว่างหรืออักขระพิเศษแล้วทำให้ route/realtime ค้างได้
    this.zone.run(() => {
      this.router.navigate(['/main/realtime']).then(() => {
        if (selected) {
          // set active หลัง navigate สำเร็จ เพื่อให้ RealtimeComponent พร้อมรับข้อมูลก่อน
          setTimeout(() => this.fvRealtimeService.setActiveVessel(selected), 50);
        }
      });
    });
  }

  private loadPopupSummary(vessel: any): void {
    const prefix = this.getBackendPrefix(vessel);

    if (!prefix) {
      return;
    }

    const tags = this.buildPopupSummaryTags(prefix);

    if (tags.length === 0) {
      return;
    }

    this.popupSummarySub?.unsubscribe();

    this.popupSummarySub = this.newHttp.getCurrentValues(tags, prefix).subscribe({
      next: (response: any) => {
        const summaryData = this.buildTagMapFromCurrentResponse(response, prefix);

        if (Object.keys(summaryData).length === 0) {
          return;
        }

        const cacheKey = this.getSummaryCacheKey(vessel);
        this.popupSummaryCache[cacheKey] = { newData: summaryData };

        if (!this.selectedVessel || this.getSummaryCacheKey(this.selectedVessel) !== cacheKey) {
          return;
        }

        this.zone.run(() => {
          this.selectedVessel = this.normalizePopupVessel({
            ...this.selectedVessel,
            newData: {
              ...this.getTagMap(this.selectedVessel),
              ...summaryData,
            },
          });
        });
      },
      error: (error: any) => {
        console.warn('[MapsAllComponent] popup summary load failed:', error);
      },
    });
  }

  private buildPopupSummaryTags(prefix: string): any[] {
    return this.popupSummaryTagSuffixes.map((suffix) => {
      const tagName = `${prefix}-${suffix}`;

      return {
        name: this.toShortTagName(tagName),
        tagName,
        cal: false,
      };
    });
  }

  private buildTagMapFromCurrentResponse(response: any, prefix: string): Record<string, any> {
    const map: Record<string, any> = {};
    const rows = this.flattenCurrentResponse(response);

    rows.forEach((item: any) => {
      const tagName = this.getCurrentResponseTagName(item);

      if (!tagName) {
        return;
      }

      const shortName = this.toShortTagName(tagName);
      const value =
        item?.Value ??
        item?.value ??
        item?.IValue ??
        item?.ivalue ??
        item?.iValue ??
        item?.ActualValue ??
        item?.actualValue ??
        item?.CurrentValue ??
        item?.currentValue ??
        item?.Val ??
        item?.val ??
        item?.Data ??
        item?.data;

      const timestamp =
        item?.TimeStamp ||
        item?.timestamp ||
        item?.DateTime ||
        item?.dateTime ||
        item?.timeStamp ||
        item?.time;

      const tagValue = {
        value,
        timestamp,
        tagName,
      };

      this.addTagAlias(map, tagName, tagValue);
      this.addTagAlias(map, shortName, tagValue);
      this.addTagAlias(map, tagName.replace(`${prefix}-`, '').replace(/-/g, '_'), tagValue);
    });

    return map;
  }

  private flattenCurrentResponse(response: any): any[] {
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

    if (response && typeof response === 'object') {
      return Object.keys(response).map((key) => {
        const value = response[key];

        if (value && typeof value === 'object') {
          return {
            Name: key,
            ...value,
          };
        }

        return {
          Name: key,
          Value: value,
        };
      });
    }

    return [];
  }

  private getCurrentResponseTagName(item: any): string {
    return String(
      item?.Name ||
      item?.name ||
      item?.TagName ||
      item?.tagName ||
      item?.tagname ||
      item?.Tag ||
      item?.tag ||
      item?.FullName ||
      item?.fullName ||
      item?.fulltagname ||
      item?.FullTagName ||
      item?.Key ||
      item?.key ||
      ''
    );
  }

  private getBackendPrefix(vessel: any): string {
    const prefix = String(
      vessel?.prefix ||
      vessel?.fv?.prefix ||
      vessel?.fvInfo?.prefix ||
      vessel?.id ||
      vessel?.fv?.id ||
      vessel?.fvInfo?.id ||
      ''
    ).trim();

    if (prefix) {
      return prefix;
    }

    return this.nameToPrefix(this.getVesselName(vessel));
  }

  private getSummaryCacheKey(vessel: any): string {
    return this.normalizeKey(
      this.getBackendPrefix(vessel) ||
      this.getVesselKey(vessel) ||
      this.getVesselName(vessel)
    );
  }

  getLatValue(vessel: any): any {
    return (
      this.getFirstTagValue(vessel, ['VES_GPS_LAT', 'GPS_LAT', 'LAT', 'LATITUDE']) ??
      this.getDirectValue(vessel, ['lat', 'latitude', 'lattitude'])
    );
  }

  getLngValue(vessel: any): any {
    return (
      this.getFirstTagValue(vessel, ['VES_GPS_LONG', 'VES_GPS_LNG', 'GPS_LONG', 'GPS_LNG', 'LNG', 'LONG', 'LONGITUDE']) ??
      this.getDirectValue(vessel, ['lng', 'long', 'longitude', 'longtitude'])
    );
  }

  getLatestTimestamp(vessel: any): any {
    // ใช้เวลาของข้อมูลตำแหน่ง GPS ก่อนเสมอ เพราะเป็นตัวบอกว่าเรือส่งตำแหน่งล่าสุดเมื่อไร
    // ห้ามใช้เวลา STATUS / ENGINE LOAD เป็น Last seen ของ Marker เนื่องจาก tag เหล่านี้อาจยังอัปเดต
    // แม้ข้อมูลตำแหน่งเรือจะหยุดส่งแล้ว ทำให้ Map แสดง Online ทั้งที่ Sidebar เป็น Offline
    return (
      this.getFirstTagTimestamp(vessel, [
        'VES_GPS_LAT',
        'VES_GPS_LONG',
        'VES_GPS_LNG',
        'GPS_LAT',
        'GPS_LONG',
        'GPS_LNG',
        'LAT',
        'LONG',
        'LNG',
      ]) ||
      this.getFirstTagTimestamp(vessel, [
        'VES_GPS_SPEED',
        'VES_GPS_SOG',
        'GPS_SPEED',
        'SPEED',
        'SOG',
      ]) ||
      this.getDirectValue(vessel, [
        'timestamp',
        'lastUpdate',
        'updatedAt',
        'lastSeenAt',
        'dateTime',
        'DateTime',
      ])
    );
  }

  getFirstTagValue(vessel: any, names: string[]): any {
    const newData = this.getTagMap(vessel);

    for (const name of names) {
      const tag = this.findTag(newData, name);
      const value =
        tag?.value ??
        tag?.Value ??
        tag?.ivalue ??
        tag?.IValue ??
        tag?.iValue ??
        tag?.actualValue ??
        tag?.ActualValue ??
        tag?.currentValue ??
        tag?.CurrentValue ??
        tag?.val ??
        tag?.Val;

      if (this.hasValue(value)) {
        return value;
      }
    }

    return undefined;
  }

  getFirstTagTimestamp(vessel: any, names: string[]): any {
    const newData = this.getTagMap(vessel);

    for (const name of names) {
      const tag = this.findTag(newData, name);
      const value = tag?.timestamp || tag?.dateTime || tag?.DateTime || tag?.TimeStamp || tag?.timeStamp || tag?.time;

      if (this.hasValue(value)) {
        return value;
      }
    }

    return undefined;
  }

  getObjectValue(source: any, path: string): any {
    if (!source || !path) {
      return undefined;
    }

    return path.split('.').reduce((obj: any, key: string) => obj?.[key], source);
  }

  hasValue(value: any): boolean {
    return value !== undefined && value !== null && value !== '';
  }

  private buildTagMap(datas: any[]): Record<string, any> {
    const map: Record<string, any> = {};

    if (!Array.isArray(datas)) {
      return map;
    }

    datas.forEach((data: any) => {
      const name = data?.name || data?.Name || data?.tagName || data?.TagName;
      const tagName = data?.tagName || data?.TagName || name;

      if (!name && !tagName) {
        return;
      }

      const tagValue = {
        value:
          data.value ??
          data.Value ??
          data.ivalue ??
          data.IValue ??
          data.iValue ??
          data.actualValue ??
          data.ActualValue ??
          data.currentValue ??
          data.CurrentValue ??
          data.val ??
          data.Val,
        timestamp: data.dateTime || data.timestamp || data.DateTime || data.TimeStamp || data.timeStamp || data.time,
        tagName,
      };

      this.addTagAlias(map, name, tagValue);
      this.addTagAlias(map, tagName, tagValue);
      this.addTagAlias(map, this.toShortTagName(tagName), tagValue);
    });

    return map;
  }

  private getTagMap(vessel: any): Record<string, any> {
    const direct = {
      ...(vessel?.newData || {}),
      ...(vessel?.rawData || {}),
      ...(vessel?.fv?.newData || {}),
      ...(vessel?.fvInfo?.newData || {}),
    };

    const fromDatas = this.buildTagMap([
      ...(Array.isArray(vessel?.datas) ? vessel.datas : []),
      ...(Array.isArray(vessel?.fv?.datas) ? vessel.fv.datas : []),
      ...(Array.isArray(vessel?.fvInfo?.datas) ? vessel.fvInfo.datas : []),
    ]);

    const map: Record<string, any> = { ...fromDatas };

    Object.keys(direct).forEach((key) => {
      const value = direct[key];
      this.addTagAlias(map, key, value);
      this.addTagAlias(map, this.toShortTagName(value?.tagName || key), value);
    });

    return map;
  }

  private findTag(map: Record<string, any>, name: string): any {
    if (!map || !name) {
      return null;
    }

    const candidates = [
      name,
      name.toUpperCase(),
      name.toLowerCase(),
      name.replace(/-/g, '_'),
      name.replace(/_/g, '-'),
      this.toShortTagName(name),
    ];

    for (const candidate of candidates) {
      if (map[candidate]) {
        return map[candidate];
      }
    }

    const normalizedName = this.normalizeKey(name);
    const foundKey = Object.keys(map).find((key) => {
      const normalizedKey = this.normalizeKey(key);
      return normalizedKey === normalizedName || normalizedKey.endsWith(normalizedName);
    });

    return foundKey ? map[foundKey] : null;
  }

  private addTagAlias(map: Record<string, any>, key: any, value: any): void {
    if (!key) {
      return;
    }

    const text = String(key);
    map[text] = value;
    map[text.toUpperCase()] = value;
    map[text.toLowerCase()] = value;
    map[text.replace(/-/g, '_')] = value;
    map[text.replace(/_/g, '-')] = value;
  }

  private toShortTagName(fullName: any): string {
    const parts = String(fullName || '').split('-');

    if (parts.length > 1) {
      parts.shift();
    }

    return parts.join('-').replace(/-/g, '_');
  }

  private getAllNumericValues(vessel: any, tagNames: string[], directKeys: string[] = []): number[] {
    const values: number[] = [];
    const used = new Set<string>();
    const tagMap = this.getTagMap(vessel);

    tagNames.forEach((name) => {
      const tag = this.findTag(tagMap, name);
      const rawValue =
        tag?.value ??
        tag?.Value ??
        tag?.ivalue ??
        tag?.IValue ??
        tag?.iValue ??
        tag?.actualValue ??
        tag?.ActualValue ??
        tag?.currentValue ??
        tag?.CurrentValue ??
        tag?.val ??
        tag?.Val;

      const num = this.toCleanNumber(rawValue);
      const identity = `${name}:${num}`;

      if (num !== null && !used.has(identity)) {
        used.add(identity);
        values.push(num);
      }
    });

    directKeys.forEach((key) => {
      const num = this.toCleanNumber(this.getDirectValue(vessel, [key]));
      const identity = `${key}:${num}`;

      if (num !== null && !used.has(identity)) {
        used.add(identity);
        values.push(num);
      }
    });

    return values;
  }

  private getDirectValue(vessel: any, keys: string[]): any {
    const sources = [vessel, vessel?.fv, vessel?.fvInfo, vessel?.raw, vessel?.raw?.fv, vessel?.raw?.fvInfo];

    for (const source of sources) {
      if (!source) {
        continue;
      }

      for (const key of keys) {
        const value = source?.[key];

        if (this.hasValue(value)) {
          return value;
        }
      }
    }

    return undefined;
  }

  private normalizePopupVessel(vessel: any): any {
    if (!vessel) {
      return vessel;
    }

    const fv = vessel?.fv || vessel?.fvInfo || vessel;
    const cacheKey = this.getSummaryCacheKey(vessel);
    const cached = this.popupSummaryCache[cacheKey]?.newData || {};

    // รวมข้อมูล 2 ส่วนเข้าด้วยกัน:
    // 1) overview data ที่แผนที่ใช้วาง marker
    // 2) popup summary data ที่ดึงเพิ่มจาก getcurrentvalues ตอนคลิกเรือ
    const mergedNewData = {
      ...this.getTagMap(vessel),
      ...cached,
    };

    const mergedVessel = {
      ...vessel,
      newData: mergedNewData,
    };

    return {
      ...mergedVessel,
      id: vessel?.id || fv?.id || fv?.prefix || fv?.name,
      prefix: vessel?.prefix || fv?.prefix || fv?.id || fv?.name,
      name: this.getVesselName(vessel),
      desc: this.getVesselType(vessel),
      img: this.getVesselImage(vessel),
      lat: this.getLatValue(mergedVessel),
      lng: this.getLngValue(mergedVessel),
      long: this.getLngValue(mergedVessel),
      speed: this.getSpeedText(mergedVessel),
      engineLoad: this.getEngineLoadText(mergedVessel),
      fuelConsumption: this.getFuelConsumptionText(mergedVessel),
      course: this.getCourseText(mergedVessel),
      distance: this.getDistanceText(mergedVessel),
      // Last seen ต้องยึด timestamp จาก overview/GPS เดิม ไม่ให้ข้อมูล Summary ที่โหลดตอนเปิด Popup
      // เข้ามาทำให้เวลาถูกเปลี่ยนเป็น Now และสถานะกลับเป็น Online
      timestamp: this.getLatestTimestamp(vessel),
      newData: mergedNewData,
    };
  }

  private getVesselRouteId(vessel: any): string {
    return String(
      vessel?.prefix ||
      vessel?.id ||
      vessel?.fv?.prefix ||
      vessel?.fvInfo?.prefix ||
      vessel?.fv?.id ||
      vessel?.fvInfo?.id ||
      this.getVesselName(vessel)
    ).trim();
  }

  private nameToPrefix(name: string): string {
    return String(name || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private normalizeKey(value: any): string {
    if (value === undefined || value === null) {
      return '';
    }

    return String(value).toLowerCase().replace(/\s+/g, '').replace(/_/g, '').replace(/-/g, '');
  }

  private toNumberOrNull(value: any): number | null {
    return this.toCleanNumber(value);
  }

  private toCleanNumber(value: any): number | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    const rawValue = typeof value === 'object'
      ? value?.value ?? value?.Value ?? value?.ivalue ?? value?.IValue ?? value?.iValue ?? value?.val ?? value?.Val
      : value;

    if (rawValue === undefined || rawValue === null || rawValue === '') {
      return null;
    }

    const num = Number.parseFloat(String(rawValue).replace(/,/g, ''));

    if (!Number.isFinite(num)) {
      return null;
    }

    // ค่า sentinel จากระบบเดิม ไม่ใช่ค่าจริง
    if (num === 999999 || num === -999999) {
      return 0;
    }

    return num;
  }

  private formatNumber(value: any, digit: number): string {
    const num = this.toNumberOrNull(value);
    return num === null ? '0' : num.toFixed(digit);
  }

  private truncateText(value: string, max: number): string {
    const text = String(value || '');
    return text.length > max ? text.slice(0, max - 1) + '…' : text;
  }

  private escapeSvgText(value: string): string {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
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

    return 'assets/images/vessel/notfound.png';
  }
}
