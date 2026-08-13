import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  ViewChild,
} from '@angular/core';

import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';

import * as fvOverviewReducer from '../../store/reducers/fv-overview.reducer';
import { FvTimeService } from '../../shared/services/fv-time.service';
import { CoordinatesService } from '../../shared/services/coordinate.service';
import {
  getVesselStatusFromLastSeenLabel,
  getVesselStatusFromTimestamp,
} from '../../shared/utils/vessel-status.util';

type VesselStatus = 'online' | 'idle' | 'offline' | 'nodata';

interface OverviewVessel {
  id: string;
  name: string;
  desc: string;
  img: string;
  status: string;
  statusKey: VesselStatus;
  speed: string;
  distance: number;
  fuelRate: string;
  fuelConsumption: string;
  course: string;
  lat: number | null;
  lng: number | null;
  location: string;
  lastSeen: string;
  mapX: number;
  mapY: number;
  raw: any;
  rawData: any;
}

@Component({
  selector: 'app-overview',
  standalone: false,
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.css'],
})
export class OverviewComponent implements OnInit, OnDestroy {
  mapData: any[] = [];
  masterDisplayData: OverviewVessel[] = [];
  selectedVessel: OverviewVessel | null = null;
  isLoading = true;

  @ViewChild('fleetOverviewMap')
  fleetOverviewMap?: any;

  private overviewSub?: Subscription;

  constructor(
    private store: Store<any>,
    private router: Router,
    public fvTimeService: FvTimeService,
    public coordinatesService: CoordinatesService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.overviewSub = this.store
      .select(fvOverviewReducer.getFvOverviewState)
      .subscribe((state) => {
        if (!state || (state.statuscode === 0 && state.fvOverview.length === 0)) {
          return;
        }

        this.applyVesselData(state.fvOverview);
      });
  }

  ngOnDestroy(): void {
    this.overviewSub?.unsubscribe();
  }

  selectVesselFromSidebar(vesselFromSidebar: any): void {
    if (!vesselFromSidebar) {
      return;
    }

    const found = this.findOverviewVessel(vesselFromSidebar);
    const target = found?.raw || vesselFromSidebar;

    this.selectedVessel = found || this.createOverviewVessel(target);
    this.openSameMapPopup(target);
    this.cdr.detectChanges();
  }

  closeDetail(): void {
    this.selectedVessel = null;
    this.cdr.detectChanges();
  }

  openPastTrack(): void {
    const vessel = this.selectedVessel;

    if (!vessel) {
      return;
    }

    localStorage.setItem('pastTrackVessel', JSON.stringify(vessel));
    this.router.navigate(['/main/past-track', vessel.id]);
  }

  openRealtime(): void {
    const vessel = this.selectedVessel;

    if (!vessel) {
      return;
    }

    localStorage.setItem('realtimeVessel', JSON.stringify(vessel));
    this.router.navigate(['/main/realtime', vessel.id]);
  }

  private applyVesselData(res: any[]): void {
    const data = Array.isArray(res) ? res : [];

    this.mapData = data;
    this.masterDisplayData = data.map((item) => this.createOverviewVessel(item));
    this.selectedVessel = null;
    this.isLoading = false;
    this.cdr.detectChanges();
  }

  private openSameMapPopup(vessel: any): void {
    setTimeout(() => {
      this.fleetOverviewMap?.openVesselFromOverview?.(vessel);
    }, 0);
  }

  private createOverviewVessel(r: any): OverviewVessel {
    const tagData = this.normalizeTagData(r);

    const vesselName = r?.name || r?.vesselName || r?.fv?.name || 'Unknown Vessel';
    const vesselDesc = r?.desc || r?.type || r?.fv?.desc || 'AHTS';
    const vesselImg = r?.img || r?.image || r?.fv?.img || '';

    const rawSpeed = this.getTagValue(tagData, ['VES_GPS_SPEED', 'GPS_SPEED', 'SPEED', 'speed'], r?.speed ?? 0);
    const rawDistance = this.getTagValue(tagData, ['VES_GPS_DIS_TODAY', 'VES_DISTANCE_TODAY', 'DISTANCE_TODAY', 'distance'], r?.distance ?? 0);
    const rawFuelRate = this.getTagValue(tagData, ['VES_FUEL_RATE', 'VES_CONS_RATE', 'FUEL_RATE', 'FUEL_CONSUMPTION_RATE', 'PME_CONS_RATE', 'DG1_CONS_RATE'], r?.fuelRate ?? 0);
    const rawFuelConsumption = this.getTagValue(tagData, ['VES_CONS_TODAY', 'VES_FUEL_CONS_TODAY', 'FUEL_CONSUMPTION_TODAY'], r?.fuelConsumption ?? 0);
    const rawCourse = this.getTagValue(tagData, ['VES_GPS_COURSE', 'VES_GPS_HEAD', 'VES_COURSE', 'GPS_COURSE', 'COURSE', 'course'], r?.course ?? 0);

    const rawLat = this.getTagValue(tagData, ['VES_GPS_LAT', 'GPS_LAT', 'LAT', 'lat', 'latitude'], r?.lat ?? r?.latitude ?? null);
    const rawLng = this.getTagValue(tagData, ['VES_GPS_LONG', 'VES_GPS_LNG', 'GPS_LONG', 'GPS_LNG', 'LNG', 'lng', 'long', 'longitude'], r?.lng ?? r?.long ?? r?.longitude ?? null);

    const latNumber = rawLat !== null && rawLat !== undefined ? this.toNumberOrNull(rawLat) : null;
    const lngNumber = rawLng !== null && rawLng !== undefined ? this.toNumberOrNull(rawLng) : null;

    const timestamp =
      tagData['VES_GPS_LAT']?.timestamp ||
      tagData['VES_GPS_SPEED']?.timestamp ||
      r?.lastUpdate ||
      r?.dateTime ||
      r?.timestamp ||
      null;

    const lastSeen = r?.lastSeen || r?.time || this.getLastSeenText(timestamp);
    let statusKey = this.getStatusKey(timestamp, lastSeen);

    const rawStatus = String(r?.status || r?.statusClass || r?.state || '').toLowerCase();
    if (rawStatus.includes('offline')) {
      statusKey = 'offline';
    } else if (rawStatus.includes('idle')) {
      statusKey = 'idle';
    } else if (rawStatus.includes('online')) {
      statusKey = 'online';
    }

    const mapPosition = this.getMapPosition(latNumber, lngNumber);

    return {
      id: this.getVesselKey(r) || vesselName,
      name: vesselName,
      desc: vesselDesc,
      img: vesselImg,
      status: this.getStatusText(statusKey),
      statusKey,
      speed: this.toNumber(rawSpeed).toFixed(1),
      distance: this.toNumber(rawDistance),
      fuelRate: this.toNumber(rawFuelRate).toFixed(2),
      fuelConsumption: this.toNumber(rawFuelConsumption).toFixed(0),
      course: this.toNumber(rawCourse).toFixed(0),
      lat: latNumber,
      lng: lngNumber,
      location: this.buildLocation(latNumber, lngNumber, r),
      lastSeen,
      mapX: mapPosition.x,
      mapY: mapPosition.y,
      raw: r,
      rawData: tagData,
    };
  }

  private normalizeTagData(r: any): any {
    const result: any = {};

    if (Array.isArray(r?.datas)) {
      for (const d of r.datas) {
        if (!d?.name) {
          continue;
        }

        result[d.name] = {
          value: d.value,
          timestamp: d.dateTime || d.timestamp || null,
          tagName: d.tagName || d.name,
        };
      }
    }

    return result;
  }

  private findOverviewVessel(vesselFromSidebar: any): OverviewVessel | null {
    const raw = vesselFromSidebar?.raw || vesselFromSidebar;
    const rawKey = this.normalizeKey(this.getVesselKey(raw));
    const rawName = this.normalizeKey(this.getVesselName(raw));

    return (
      this.masterDisplayData.find((item) => {
        const itemKey = this.normalizeKey(this.getVesselKey(item.raw));
        const itemName = this.normalizeKey(item.name);
        return itemKey === rawKey || itemName === rawName || this.normalizeKey(item.id) === rawKey;
      }) || null
    );
  }

  private getStatusText(status: VesselStatus): string {
    if (status === 'online') return 'Online';
    if (status === 'idle') return 'Idle';
    if (status === 'offline') return 'Offline';
    if (status === 'nodata') return 'No Data';
    return '-';
  }

  private getStatusKey(timestamp: unknown, lastSeen: string): VesselStatus {
    const timestampStatus = getVesselStatusFromTimestamp(
      timestamp as string | number | Date | null | undefined
    );
    if (timestampStatus !== 'nodata') return timestampStatus;
    return getVesselStatusFromLastSeenLabel(lastSeen);
  }

  private getTagValue(data: any, names: string[], defaultValue: any): any {
    for (const tagName of names) {
      const value = data?.[tagName]?.value;
      if (value !== undefined && value !== null && value !== '') return value;
    }
    return defaultValue;
  }

  private buildLocation(lat: number | null, lng: number | null, raw: any): string {
    if (raw?.location) return raw.location;
    if (raw?.coordinate) return raw.coordinate;
    if (lat === null || lng === null) return '-';
    return `${this.formatLat(lat)}, ${this.formatLng(lng)}`;
  }

  private formatLat(value: number): string {
    const service: any = this.coordinatesService;
    if (typeof service?.getLat === 'function') return service.getLat(value.toFixed(5));
    const direction = value >= 0 ? 'N' : 'S';
    return `${Math.abs(value).toFixed(5)} ${direction}`;
  }

  private formatLng(value: number): string {
    const service: any = this.coordinatesService;
    if (typeof service?.getLong === 'function') return service.getLong(value.toFixed(5));
    const direction = value >= 0 ? 'E' : 'W';
    return `${Math.abs(value).toFixed(5)} ${direction}`;
  }

  private getLastSeenText(timestamp: string | null): string {
    if (!timestamp) return '-';
    const service: any = this.fvTimeService;
    if (typeof service?.getLastSeenFromString === 'function') return service.getLastSeenFromString(timestamp);

    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '-';
    const diffMs = Date.now() - date.getTime();
    if (diffMs < 0) return 'Now';
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    if (diffSec < 60) return 'Now';
    if (diffMin < 60) return `${diffMin}M`;
    if (diffHour < 24) return `${diffHour}H`;
    return `${diffDay}D`;
  }

  private toNumber(value: any): number {
    const num = Number.parseFloat(value);
    return Number.isNaN(num) ? 0 : num;
  }

  private toNumberOrNull(value: any): number | null {
    const num = Number.parseFloat(value);
    return Number.isNaN(num) ? null : num;
  }

  private getMapPosition(lat: number | null, lng: number | null): { x: number; y: number } {
    if (lat === null || lng === null) return { x: 50, y: 45 };
    const minLat = 0;
    const maxLat = 14;
    const minLng = 95;
    const maxLng = 116;
    const x = this.clamp(((lng - minLng) / (maxLng - minLng)) * 100, 10, 74);
    const y = this.clamp(((maxLat - lat) / (maxLat - minLat)) * 100, 12, 68);
    return { x, y };
  }

  private clamp(value: number, min: number, max: number): number {
    if (value < min) return min;
    if (value > max) return max;
    return value;
  }

  private getVesselKey(vessel: any): string {
    if (!vessel) return '';
    return String(vessel.id || vessel._id || vessel.prefix || vessel.name || vessel.vesselName || vessel.fv?.id || vessel.fv?.name || '');
  }

  private getVesselName(vessel: any): string {
    if (!vessel) return 'Unknown Vessel';
    return vessel.name || vessel.vesselName || vessel.fv?.name || vessel.desc || vessel.fv?.desc || 'Unknown Vessel';
  }

  private normalizeKey(value: any): string {
    if (value === undefined || value === null) return '';
    return String(value).toLowerCase().replace(/\s+/g, '').replace(/[_-]/g, '');
  }
}
