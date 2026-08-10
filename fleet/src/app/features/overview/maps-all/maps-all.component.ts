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
import { Subscription, finalize, map, of, switchMap, take, timeout } from 'rxjs';

import { VesselPopupService } from '../../../shared/services/vessel-popup.service';
import { FvRealtimeService } from '../../../shared/services/fv-realtime.service';
import { NewHttpClientService } from '../../../shared/services/http-client1.service';
import { getVesselStatusFromTimestamp } from '../../../shared/utils/vessel-status.util';
import { LiveReportService } from '../../report/live-report.service';
import { LiveReportSnapshot } from '../../report/live-report.model';

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
  @ViewChild('vesselPopup')
  vesselPopupElement?: ElementRef<HTMLElement>;

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

  private popupProjectionOverlay: any = null;
  private popupPositionRaf: number | null = null;
  private mapViewportListeners: any[] = [];
  private readonly popupDesktopBreakpointPx = 900;
  // Desktop callout keeps the original speech-bubble shape and points to
  // the BACK (right edge) of the selected vessel name label. The offsets below
  // match getPremiumShipIcon(): 190x54 icon, anchor (24,52), label x=45..170.
  // Therefore the right edge of the label is +146px from the projected GPS
  // anchor and the label vertical centre is -25.5px above it.
  private readonly selectedLabelRightOffsetPx = 146;
  private readonly selectedLabelCenterYOffsetPx = -25.5;
  private readonly popupArrowReachPx = 15;
  private readonly popupArrowHeightPx = 24;
  private readonly popupPreferredArrowCenterYpx = 58;
  private popupAutoPanPending = false;

  private popupSub?: Subscription;
  private popupSummarySub?: Subscription;
  private popupSummaryCache: Record<
    string,
    { newData: Record<string, any>; snapshot: LiveReportSnapshot; fetchedAt: number }
  > = {};
  popupSnapshot: LiveReportSnapshot | null = null;
  popupSummaryLoading = false;
  popupSummaryError = false;
  private popupSummaryRequestKey = '';
  private readonly popupSummaryCacheTtlMs = 55_000 + Math.floor(Math.random() * 15_001);
  private readonly popupSummaryRetryAfter: Record<string, number> = {};
  private readonly popupSummaryFailureBackoffMs = 60_000;
  private realtimeTimer: any = null;
  private resizeObserver?: ResizeObserver;
  private resizeTimer: ReturnType<typeof setTimeout> | null = null;
  private mapInitRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly realtimeRefreshMs = 15000; // รีเฟรช popup/map เพื่อให้ Last seen เดินตามข้อมูล




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
    private newHttp: NewHttpClientService,
    private liveReportService: LiveReportService
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

    if (this.popupPositionRaf !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.popupPositionRaf);
      this.popupPositionRaf = null;
    }

    this.mapViewportListeners.forEach((listener) => {
      try {
        listener?.remove?.();
      } catch {}
    });
    this.mapViewportListeners = [];

    if (this.popupProjectionOverlay) {
      try {
        this.popupProjectionOverlay.setMap(null);
      } catch {}
      this.popupProjectionOverlay = null;
    }

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

    this.setupPopupProjectionOverlay();
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

  private setupPopupProjectionOverlay(): void {
    if (!this.map || typeof google === 'undefined' || !google.maps?.OverlayView) {
      return;
    }

    this.mapViewportListeners.forEach((listener) => {
      try {
        listener?.remove?.();
      } catch {}
    });
    this.mapViewportListeners = [];

    if (this.popupProjectionOverlay) {
      try {
        this.popupProjectionOverlay.setMap(null);
      } catch {}
    }

    const overlay = new google.maps.OverlayView();
    overlay.onAdd = () => {};
    overlay.onRemove = () => {};
    overlay.draw = () => this.schedulePopupPositionUpdate();
    overlay.setMap(this.map);
    this.popupProjectionOverlay = overlay;

    // Coalesced with requestAnimationFrame, so map drag/zoom keeps the callout
    // attached to the vessel marker without triggering Angular/API work.
    this.mapViewportListeners = [
      this.map.addListener('bounds_changed', () => this.schedulePopupPositionUpdate()),
      this.map.addListener('idle', () => this.schedulePopupPositionUpdate()),
    ];
  }

  private schedulePopupPositionUpdate(): void {
    if (!this.selectedVessel || !this.selectedMarker || !this.map) {
      return;
    }

    if (typeof requestAnimationFrame !== 'function') {
      this.updatePopupPosition();
      return;
    }

    if (this.popupPositionRaf !== null) {
      cancelAnimationFrame(this.popupPositionRaf);
    }

    this.popupPositionRaf = requestAnimationFrame(() => {
      this.popupPositionRaf = null;
      this.updatePopupPosition();
    });
  }

  private updatePopupPosition(): void {
    const popup = this.vesselPopupElement?.nativeElement;
    const mapElement = this.mapElement?.nativeElement;

    if (!popup || !mapElement || !this.selectedMarker || !this.popupProjectionOverlay) {
      return;
    }

    // Phones/tablets use the compact bottom-sheet layout. Keeping it detached
    // from the map projection avoids a large card covering the selected marker.
    if (mapElement.clientWidth <= this.popupDesktopBreakpointPx) {
      popup.style.removeProperty('left');
      popup.style.removeProperty('right');
      popup.style.removeProperty('top');
      popup.classList.remove('popup-right-of-marker', 'popup-left-of-marker');
      return;
    }

    const projection = this.popupProjectionOverlay.getProjection?.();
    const markerPosition = this.selectedMarker.getPosition?.();

    if (!projection || !markerPosition) {
      return;
    }

    const point = projection.fromLatLngToContainerPixel(markerPosition);

    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      return;
    }

    const mapWidth = mapElement.clientWidth;
    const mapHeight = mapElement.clientHeight;
    const popupWidth = popup.offsetWidth || 430;
    const popupHeight = popup.offsetHeight || 500;
    const edgePadding = 18;

    // The selected marker retains its white vessel-name label. The popup tail
    // points to the right edge of that label ("behind the vessel name"), not
    // to the GPS pin itself and not through a long connector line.
    const targetX = point.x + this.selectedLabelRightOffsetPx;
    const targetY = point.y + this.selectedLabelCenterYOffsetPx;
    const left = targetX + this.popupArrowReachPx;

    // Keep the original callout relationship even when the vessel is close to
    // the right edge. Google Maps pans the canvas (browser-only) just enough to
    // make room, rather than flipping the speech bubble to the wrong side.
    const overflowRight = left + popupWidth + edgePadding - mapWidth;
    if (overflowRight > 0 && !this.popupAutoPanPending && this.map?.panBy) {
      this.popupAutoPanPending = true;
      this.map.panBy(Math.ceil(overflowRight + 12), 0);
      setTimeout(() => {
        this.popupAutoPanPending = false;
        this.schedulePopupPositionUpdate();
      }, 180);
      return;
    }

    let top = targetY - this.popupPreferredArrowCenterYpx;
    top = this.clampNumber(
      top,
      edgePadding,
      Math.max(edgePadding, mapHeight - popupHeight - edgePadding)
    );

    const arrowTop = this.clampNumber(
      targetY - top - this.popupArrowHeightPx / 2,
      22,
      Math.max(22, popupHeight - this.popupArrowHeightPx - 22)
    );
    const arrow = popup.querySelector<HTMLElement>('.popup-arrow');

    popup.style.left = `${Math.round(left)}px`;
    popup.style.right = 'auto';
    popup.style.top = `${Math.round(top)}px`;
    popup.classList.add('popup-right-of-marker');
    popup.classList.remove('popup-left-of-marker');

    if (arrow) {
      arrow.style.top = `${Math.round(arrowTop)}px`;
    }
  }

  private clampNumber(value: number, min: number, max: number): number {
    if (max < min) {
      return min;
    }

    return Math.min(Math.max(value, min), max);
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

      this.schedulePopupPositionUpdate();
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

      // Popup metrics refresh at most once per minute and only for the one
      // vessel currently open. loadPopupSummary() serves fresh cache instantly,
      // skips overlapping requests and never polls the whole fleet.
      if (this.selectedVessel) {
        this.loadPopupSummary(this.selectedVessel);
      }
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
      const vesselKey = this.getVesselKey(vessel);
      const selectedKey = this.getVesselKey(this.selectedVessel);
      const isSelected = Boolean(vesselKey && selectedKey && vesselKey === selectedKey);

      const marker = new google.maps.Marker({
        position: { lat, lng },
        map: this.map,
        title: vesselName,
        icon: this.getPremiumShipIcon(status, vesselName, isSelected),
        zIndex: isSelected ? 1000 : this.getMarkerZIndex(status),
      });

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
      this.openVesselPopup(vessel, status, marker, false);
    });
  }

  openVesselPopup(vessel: any, status: MapStatus, marker: any, ensureVisible = false): void {
    this.zone.run(() => {
      this.restoreSelectedMarkerVisual();

      // เก็บข้อมูลเรือแบบ normalize เพื่อให้ popup อ่านค่า speed/load/fuel ได้ครบ
      const normalizedVessel = this.normalizePopupVessel(vessel);

      if (this.selectedMarker && this.selectedMarker !== marker) {
        this.selectedMarker.setZIndex?.(this.getMarkerZIndex(this.selectedStatus));
      }

      this.selectedVessel = normalizedVessel;
      this.selectedStatus = status;
      this.selectedMarker = marker;
      this.applySelectedMarkerVisual(marker, normalizedVessel, status);

      const summaryCacheKey = this.getSummaryCacheKey(normalizedVessel);
      const cachedSummary = this.popupSummaryCache[summaryCacheKey];
      this.popupSnapshot = cachedSummary?.snapshot || null;
      this.popupSummaryError = false;

      try {
        localStorage.setItem('selectedVessel', JSON.stringify(normalizedVessel));
        localStorage.setItem('realtimeVessel', JSON.stringify(normalizedVessel));
        localStorage.setItem('pastTrackVessel', JSON.stringify(normalizedVessel));
      } catch {}

      // Publish the map selection to the shared vessel state. MainComponent
      // listens to this stream and immediately updates the active Sidebar card.
      this.fvRealtimeService.setActiveVessel(normalizedVessel);

      this.loadPopupSummary(normalizedVessel);

      // Clicking a marker keeps the operator's current map context intact.
      // Sidebar/programmatic selection can request centering because the target
      // vessel may currently be outside the visible viewport.
      if (ensureVisible && this.map && marker) {
        this.map.panTo(marker.getPosition());

        const currentZoom = this.map.getZoom();
        if (!currentZoom || currentZoom < 8) {
          this.map.setZoom(8);
        }
      }

      // The card is created by *ngIf, so wait one frame before measuring it.
      // No server request is involved; this is browser-only map positioning.
      setTimeout(() => this.schedulePopupPositionUpdate(), 0);
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
      this.applySelectedMarkerVisual(item.marker, this.selectedVessel, item.status);
      setTimeout(() => this.schedulePopupPositionUpdate(), 0);
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

      this.openVesselPopup(item.vessel, item.status, item.marker, true);
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
    this.restoreSelectedMarkerVisual();
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
    this.restoreSelectedMarkerVisual();

    if (this.popupPositionRaf !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.popupPositionRaf);
      this.popupPositionRaf = null;
    }

    this.selectedMarker?.setZIndex?.(this.getMarkerZIndex(this.selectedStatus));

    this.popupSummarySub?.unsubscribe();
    this.popupSummarySub = undefined;
    this.popupSummaryRequestKey = '';
    this.popupSummaryLoading = false;
    this.popupSummaryError = false;
    this.popupSnapshot = null;
    this.selectedVessel = null;
    this.selectedMarker = null;
  }

  private applySelectedMarkerVisual(marker: any, vessel: any, status: MapStatus): void {
    if (!marker) {
      return;
    }

    try {
      marker.setIcon?.(this.getPremiumShipIcon(status, this.getVesselName(vessel), true));
      marker.setZIndex?.(1000);
    } catch {}
  }

  private restoreSelectedMarkerVisual(): void {
    if (!this.selectedMarker || !this.selectedVessel) {
      return;
    }

    try {
      const status = this.getVesselStatus(this.selectedVessel);
      this.selectedMarker.setIcon?.(
        this.getPremiumShipIcon(status, this.getVesselName(this.selectedVessel), false)
      );
      this.selectedMarker.setZIndex?.(this.getMarkerZIndex(status));
    } catch {}
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

  getPremiumShipIcon(status: string, name: string, selected = false): any {
    const color = this.getStatusColor(status);

    if (selected) {
      // Keep the original vessel-name label visible while the popup is open.
      // A subtle blue focus ring/border marks selection without changing the
      // marker geometry used by the exact behind-name popup anchor.
      const text = this.escapeSvgText(this.truncateText(name, 18));
      const selectedSvg =
        '<svg width="190" height="54" viewBox="0 0 190 54" xmlns="http://www.w3.org/2000/svg">' +
        '<filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">' +
        '<feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="#0f172a" flood-opacity="0.25"/>' +
        '</filter>' +
        '<circle cx="24" cy="21" r="20" fill="#2563eb" fill-opacity="0.12" stroke="#2563eb" stroke-width="2.5" stroke-opacity="0.96"/>' +
        '<path filter="url(#shadow)" d="M24 2C13.8 2 5.5 10.1 5.5 20C5.5 33.6 24 52 24 52C24 52 42.5 33.6 42.5 20C42.5 10.1 34.2 2 24 2Z" fill="' + color + '"/>' +
        '<circle cx="24" cy="21" r="12" fill="white" fill-opacity="0.98"/>' +
        '<path d="M15.5 24.5L19 17.5H29L32.5 24.5H15.5Z" fill="' + color + '"/>' +
        '<path d="M19.5 17.5L21.5 13.5H26.5L28.5 17.5H19.5Z" fill="' + color + '"/>' +
        '<path d="M17.5 26.2C21 28.3 27 28.3 30.5 26.2" stroke="' + color + '" stroke-width="2.2" stroke-linecap="round"/>' +
        '<circle cx="21" cy="21" r="1.2" fill="white"/>' +
        '<circle cx="24" cy="21" r="1.2" fill="white"/>' +
        '<circle cx="27" cy="21" r="1.2" fill="white"/>' +
        '<rect x="45" y="14" width="125" height="25" rx="6" fill="white" fill-opacity="0.98" stroke="#60a5fa" stroke-width="1.4"/>' +
        '<text x="53" y="31" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#0f172a">' + text + '</text>' +
        '</svg>';

      return {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(selectedSvg),
        scaledSize: new google.maps.Size(190, 54),
        anchor: new google.maps.Point(24, 52),
      };
    }

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
    const cacheKey = this.getSummaryCacheKey(vessel);

    if (!prefix || !cacheKey) {
      return;
    }

    const cached = this.popupSummaryCache[cacheKey];
    const cacheAge = cached ? Date.now() - cached.fetchedAt : Number.POSITIVE_INFINITY;

    // Stale-while-revalidate: show the last known KPI set immediately. Reopening
    // the same vessel within one minute costs zero API requests.
    if (cached?.snapshot) {
      this.popupSnapshot = cached.snapshot;
    }

    if (cached && cacheAge < this.popupSummaryCacheTtlMs) {
      this.popupSummaryLoading = false;
      this.popupSummaryError = false;
      return;
    }

    // A failing backend gets a quiet period instead of a retry storm from every
    // open browser. Cached values stay visible while the circuit is cooling down.
    if ((this.popupSummaryRetryAfter[cacheKey] || 0) > Date.now()) {
      this.popupSummaryLoading = false;
      this.popupSummaryError = true;
      return;
    }

    // Never restart the same in-flight request on the 15-second map refresh.
    if (this.popupSummaryLoading && this.popupSummaryRequestKey === cacheKey) {
      return;
    }

    this.popupSummarySub?.unsubscribe();
    this.popupSummaryRequestKey = cacheKey;
    this.popupSummaryLoading = true;
    this.popupSummaryError = false;

    this.popupSummarySub = this.liveReportService.profileDocument$
      .pipe(
        take(1),
        switchMap((document) => {
          const suffixes = this.liveReportService.getOverviewMetricTagSuffixes(vessel, document);
          const tags = this.buildPopupSummaryTags(prefix, suffixes);

          if (tags.length === 0) {
            return of({ document, response: [] });
          }

          return this.newHttp.getCurrentValues(tags, prefix).pipe(
            timeout(15_000),
            map((response: any) => ({ document, response }))
          );
        }),
        finalize(() => {
          if (this.popupSummaryRequestKey === cacheKey) {
            this.popupSummaryLoading = false;
            this.popupSummaryRequestKey = '';
          }
        })
      )
      .subscribe({
        next: ({ document, response }) => {
          const summaryData = this.buildTagMapFromCurrentResponse(response, prefix);

          if (Object.keys(summaryData).length === 0) {
            this.popupSummaryRetryAfter[cacheKey] = Date.now() + this.popupSummaryFailureBackoffMs;
            this.popupSummaryError = true;
            return;
          }

          const mergedData = {
            ...this.getTagMap(vessel),
            ...summaryData,
          };
          const updatedAt = this.getNewestSummaryTimestamp(summaryData);
          const snapshot = this.liveReportService.buildSnapshot(
            vessel,
            mergedData,
            updatedAt,
            document
          );

          this.popupSummaryCache[cacheKey] = {
            newData: summaryData,
            snapshot,
            fetchedAt: Date.now(),
          };
          delete this.popupSummaryRetryAfter[cacheKey];

          if (!this.selectedVessel || this.getSummaryCacheKey(this.selectedVessel) !== cacheKey) {
            return;
          }

          this.zone.run(() => {
            this.popupSnapshot = snapshot;
            this.popupSummaryError = false;
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
          this.popupSummaryRetryAfter[cacheKey] = Date.now() + this.popupSummaryFailureBackoffMs;
          if (this.getSummaryCacheKey(this.selectedVessel) === cacheKey) {
            this.popupSummaryError = true;
          }
          console.warn('[MapsAllComponent] popup KPI load failed:', error);
        },
      });
  }

  private buildPopupSummaryTags(prefix: string, suffixes: string[]): any[] {
    const seen = new Set<string>();

    return (suffixes || [])
      .map((suffix) => String(suffix || '').trim().replace(/_/g, '-'))
      .filter((suffix) => suffix.length > 0)
      .map((suffix) => `${prefix}-${suffix}`)
      .filter((tagName) => {
        const normalized = this.normalizeKey(tagName);
        if (seen.has(normalized)) {
          return false;
        }
        seen.add(normalized);
        return true;
      })
      .map((tagName) => ({
        name: this.toShortTagName(tagName),
        tagName,
        cal: false,
      }));
  }

  private getNewestSummaryTimestamp(data: Record<string, any>): Date | null {
    let newest = 0;

    Object.values(data || {}).forEach((item: any) => {
      const raw = item?.timestamp || item?.dateTime || item?.DateTime || item?.TimeStamp;
      if (!raw) {
        return;
      }

      const time = new Date(raw).getTime();
      if (Number.isFinite(time) && time > newest) {
        newest = time;
      }
    });

    return newest > 0 ? new Date(newest) : null;
  }

  getPopupMetricValue(key: string): string {
    const metric = this.popupSnapshot?.metrics?.find((item) => item.key === key);
    if (metric) {
      return metric.value;
    }

    // Before the lightweight KPI request returns, reuse any Overview values
    // already present instead of flashing a false numeric zero.
    const vessel = this.selectedVessel;
    if (!vessel) {
      return '—';
    }

    switch (key) {
      case 'fuel': {
        const direct = this.toCleanNumber(
          this.getFirstTagValue(vessel, ['VES_CONS_TODAY', 'VES_FUEL_CONS_TODAY'])
        );
        return direct === null ? '—' : direct.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
      case 'distance': {
        const value = this.toCleanNumber(
          this.getFirstTagValue(vessel, ['VES_GPS_DIS_TODAY', 'VES_DISTANCE_TODAY', 'VES_DISTANCE']) ??
            this.getDirectValue(vessel, ['distance', 'distanceToday'])
        );
        return value === null ? '—' : value.toFixed(2);
      }
      case 'speed': {
        const value = this.toCleanNumber(
          this.getFirstTagValue(vessel, ['VES_GPS_SPEED', 'GPS_SPEED']) ??
            this.getDirectValue(vessel, ['speed'])
        );
        return value === null ? '—' : value.toFixed(2);
      }
      case 'average': {
        const value = this.toCleanNumber(this.getFirstTagValue(vessel, ['VES_GPS_SPEED_AVG', 'GPS_SPEED_AVG']));
        return value === null ? '—' : value.toFixed(2);
      }
      case 'maximum': {
        const value = this.toCleanNumber(this.getFirstTagValue(vessel, ['VES_GPS_SPEED_MAX', 'GPS_SPEED_MAX']));
        return value === null ? '—' : value.toFixed(2);
      }
      default:
        return '—';
    }
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
    if (normalized.includes('zamrud')) return 'assets/images/vessel/bb_zamrud.jpg';
    if (normalized.includes('liberty')) return 'assets/images/vessel/bb_liberty209.jpg';
    if (normalized.includes('tongkam')) return 'assets/images/vessel/bb_tongkam.jpg';
    if (normalized.includes('gemia')) return 'assets/images/vessel/mv_gemia.jpg';
    if (normalized.includes('bongkot')) return 'assets/images/vessel/sc_bongkot.jpg';

    return 'assets/images/vessel/notfound.png';
  }
}
