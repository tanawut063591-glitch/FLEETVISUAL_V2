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

  centerPosition = { lat: 9.5, lng: 101 };
  defaultZoom = 6;

  activeFilter: 'all' | MapStatus = 'all';

  totalVessels = 0;
  onlineCount = 0;
  idleCount = 0;
  offlineCount = 0;

  selectedVessel: any = null;
  selectedStatus: MapStatus = 'online';
  selectedMarker: any = null;

  private popupSub?: Subscription;
  private realtimeTimer: any = null;
  private resizeObserver?: ResizeObserver;
  private resizeTimer: ReturnType<typeof setTimeout> | null = null;
  private mapInitRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly idleAfterMinutes = 30;
  private readonly offlineAfterMinutes = 120;
  private readonly realtimeRefreshMs = 15000;

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
    private vesselPopup: VesselPopupService
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

    if (this.markers.length > 0 && !this.selectedVessel) {
      this.map.setZoom(this.defaultZoom);
      this.map.setCenter(this.centerPosition);
    }
  }

  bindMarkerClick(marker: any, vessel: any, status: MapStatus): void {
    marker.addListener('click', () => {
      this.openVesselPopup(vessel, status, marker);
    });
  }

  openVesselPopup(vessel: any, status: MapStatus, marker: any): void {
    this.zone.run(() => {
      this.selectedVessel = vessel;
      this.selectedStatus = status;
      this.selectedMarker = marker;

      try {
        localStorage.setItem('selectedVessel', JSON.stringify(vessel));
        localStorage.setItem('realtimeVessel', JSON.stringify(vessel));
        localStorage.setItem('pastTrackVessel', JSON.stringify(vessel));
      } catch {}

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
      this.selectedVessel = item.vessel;
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
    const textStatus = this.getTextStatus(vessel);

    if (textStatus) {
      return textStatus;
    }

    const timestamp = this.getLatestTimestamp(vessel);

    if (timestamp) {
      const date = new Date(timestamp);

      if (!Number.isNaN(date.getTime())) {
        const diffMinutes = (Date.now() - date.getTime()) / 60000;

        if (diffMinutes >= this.offlineAfterMinutes) return 'offline';
        if (diffMinutes >= this.idleAfterMinutes) return 'idle';
      }
    }

    if (this.toNumberOrNull(this.getLatValue(vessel)) === null || this.toNumberOrNull(this.getLngValue(vessel)) === null) {
      return 'offline';
    }

    return 'online';
  }

  getTextStatus(vessel: any): MapStatus | '' {
    const value =
      this.getObjectValue(vessel, 'statusKey') ||
      this.getObjectValue(vessel, 'status') ||
      this.getObjectValue(vessel, 'state') ||
      this.getObjectValue(vessel, 'fv.status') ||
      this.getObjectValue(vessel, 'fv.state') ||
      this.getFirstTagValue(vessel, [
        'VES_STATUS_TEXT',
        'STATUS_TEXT',
        'VES_STATE',
        'STATE',
        'VES_STATUS',
        'STATUS',
      ]);

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
    if (status === 'online') return 30;
    if (status === 'idle') return 20;
    return 10;
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
    return this.formatNumber(this.getFirstTagValue(vessel, ['VES_GPS_SPEED', 'GPS_SPEED', 'SPEED']) ?? vessel?.speed, 1);
  }

  getEngineLoadText(vessel: any): string {
    return this.formatNumber(this.getFirstTagValue(vessel, ['VES_ENGINE_LOAD', 'ENGINE_LOAD', 'ENG_LOAD', 'PME_ENGINE_LOAD']) ?? vessel?.engineLoad, 0);
  }

  getFuelConsumptionText(vessel: any): string {
    return this.formatNumber(this.getFirstTagValue(vessel, ['VES_FUEL_CONSUMPTION', 'VES_CONS_TODAY', 'FUEL_CONSUMPTION']) ?? vessel?.fuelConsumption, 0);
  }

  getCourseText(vessel: any): string {
    return this.formatNumber(this.getFirstTagValue(vessel, ['VES_GPS_HEAD', 'VES_GPS_COURSE', 'GPS_COURSE', 'COURSE']) ?? vessel?.course, 0);
  }

  getDistanceText(vessel: any): string {
    return this.formatNumber(this.getFirstTagValue(vessel, ['VES_DISTANCE', 'VES_GPS_DIS_TODAY', 'DISTANCE']) ?? vessel?.distance, 1);
  }

  goPastTrack(vessel: any): void {
    if (vessel) {
      localStorage.setItem('pastTrackVessel', JSON.stringify(vessel));
    }

    this.router.navigate(['/main/past-track']);
  }

  goRealtime(vessel: any): void {
    if (vessel) {
      localStorage.setItem('realtimeVessel', JSON.stringify(vessel));
      localStorage.setItem('selectedVessel', JSON.stringify(vessel));
    }

    const prefix = this.getVesselPrefix(vessel);
    this.router.navigate(prefix ? ['/main/realtime', prefix] : ['/main/realtime']);
  }

  getLatValue(vessel: any): any {
    return (
      this.getFirstTagValue(vessel, ['VES_GPS_LAT', 'GPS_LAT', 'LAT', 'lat', 'latitude']) ??
      vessel?.lat ??
      vessel?.latitude ??
      vessel?.lattitude ??
      vessel?.fv?.lat ??
      vessel?.fvInfo?.lat
    );
  }

  getLngValue(vessel: any): any {
    return (
      this.getFirstTagValue(vessel, ['VES_GPS_LONG', 'VES_GPS_LNG', 'GPS_LONG', 'GPS_LNG', 'LNG', 'lng', 'long', 'longitude']) ??
      vessel?.lng ??
      vessel?.long ??
      vessel?.longitude ??
      vessel?.longtitude ??
      vessel?.fv?.lng ??
      vessel?.fv?.long ??
      vessel?.fvInfo?.lng ??
      vessel?.fvInfo?.long
    );
  }

  getLatestTimestamp(vessel: any): any {
    return (
      vessel?.timestamp ||
      vessel?.lastUpdate ||
      vessel?.updatedAt ||
      vessel?.fv?.timestamp ||
      vessel?.fv?.lastUpdate ||
      vessel?.fvInfo?.timestamp ||
      this.getFirstTagTimestamp(vessel, [
        'VES_GPS_LAT',
        'VES_GPS_LONG',
        'VES_GPS_LNG',
        'VES_GPS_SPEED',
        'VES_ENGINE_LOAD',
        'ENGINE_LOAD',
        'STATUS',
      ])
    );
  }

  getFirstTagValue(vessel: any, names: string[]): any {
    const newData = vessel?.newData || this.buildTagMap(vessel?.datas || []);

    for (const name of names) {
      const tag = newData?.[name];
      const value = tag?.value ?? tag?.Value;
      if (this.hasValue(value)) {
        return value;
      }
    }

    return undefined;
  }

  getFirstTagTimestamp(vessel: any, names: string[]): any {
    const newData = vessel?.newData || this.buildTagMap(vessel?.datas || []);

    for (const name of names) {
      const tag = newData?.[name];
      const value = tag?.timestamp || tag?.dateTime || tag?.TimeStamp;
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
      if (!data?.name) return;

      map[data.name] = {
        value: data.value ?? data.Value,
        timestamp: data.dateTime || data.timestamp || data.TimeStamp,
      };
    });

    return map;
  }

  private normalizeKey(value: any): string {
    if (value === undefined || value === null) {
      return '';
    }

    return String(value).toLowerCase().replace(/\s+/g, '').replace(/_/g, '').replace(/-/g, '');
  }

  private toNumberOrNull(value: any): number | null {
    const num = Number.parseFloat(value);
    return Number.isNaN(num) ? null : num;
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
