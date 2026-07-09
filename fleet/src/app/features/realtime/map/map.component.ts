import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

import * as fvInfoReducer from '../../../store/reducers/fv-info.reducer';

declare const google: any;

interface LatLongValue {
  lat: string | number;
  long: string | number;
}

@Component({
  selector: 'app-map',
  standalone: false,
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
})
export class MapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() lat: string | number | null = null;
  @Input() lng: string | number | null = null;

  @ViewChild('mapContainer', { static: true })
  mapContainer!: ElementRef<HTMLDivElement>;

  map: any = null;
  marker: any = null;
  isMapFullScreen = false;

  private viewReady = false;
  private resizeObserver: ResizeObserver | null = null;
  private googleRetryCount = 0;

  private readonly destroy$ = new Subject<void>();

  private readonly defaultCenter = {
    lat: 9.5,
    lng: 101,
  };

  constructor(
    private store: Store<any>,
    private zone: NgZone
  ) {}

  ngAfterViewInit(): void {
    this.viewReady = true;

    this.initMap(this.defaultCenter.lat, this.defaultCenter.lng);
    this.watchRealtimeLatLong();
    this.watchMapResize();

    this.updateFromInput();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['lat'] || changes['lng']) {
      this.updateFromInput();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    this.marker = null;
    this.map = null;
  }

  /**
   * รับตำแหน่ง realtime จาก Store
   */
  private watchRealtimeLatLong(): void {
    this.store
      .select(fvInfoReducer.getFvRealtimeDataLatLong)
      .pipe(
        takeUntil(this.destroy$),

        /**
         * เช็กให้แน่ใจว่า value มี lat / long จริง
         * TypeScript จะได้ไม่มองว่าเป็น undefined
         */
        filter((value: any): value is LatLongValue => {
          return (
            !!value &&
            value.lat !== null &&
            value.lat !== undefined &&
            value.lat !== '' &&
            value.long !== null &&
            value.long !== undefined &&
            value.long !== ''
          );
        })
      )
      .subscribe((value: LatLongValue) => {
        this.setLatLong(value.lat, value.long);
      });
  }

  /**
   * ใช้กรณีเรียก component แบบ <app-map [lat]="..." [lng]="...">
   */
  private updateFromInput(): void {
    if (!this.viewReady) {
      return;
    }

    if (
      this.lat === null ||
      this.lat === undefined ||
      this.lat === '' ||
      this.lng === null ||
      this.lng === undefined ||
      this.lng === ''
    ) {
      return;
    }

    this.setLatLong(this.lat, this.lng);
  }

  /**
   * สร้าง Google Map ครั้งแรก
   */
  private initMap(lat: number, lng: number): void {
    if (!this.viewReady || this.map) {
      return;
    }

    if (!this.isGoogleMapReady()) {
      this.retryInitMap(lat, lng);
      return;
    }

    const mapEl = this.mapContainer?.nativeElement;

    if (!mapEl) {
      console.warn('[MapComponent] Map container not found.');
      return;
    }

    const center = {
      lat,
      lng,
    };

    this.zone.runOutsideAngular(() => {
      this.map = new google.maps.Map(mapEl, {
        center,
        zoom: 6,
        mapTypeId: 'roadmap',
        disableDefaultUI: false,
        mapTypeControl: false,
        fullscreenControl: true,
        streetViewControl: true,
        zoomControl: true,
      });

      this.marker = new google.maps.Marker({
        position: center,
        map: this.map,
      });

      setTimeout(() => this.resizeMap(), 120);
    });
  }

  /**
   * อัปเดตตำแหน่ง marker
   */
  setLatLong(lat: string | number, long: string | number): void {
    const latNum = this.toNumber(lat);
    const lngNum = this.toNumber(long);

    if (latNum === null || lngNum === null) {
      console.warn('[MapComponent] Invalid lat/long:', { lat, long });
      return;
    }

    if (!this.isGoogleMapReady()) {
      this.retryInitMap(latNum, lngNum);
      return;
    }

    if (!this.map) {
      this.initMap(latNum, lngNum);
    }

    if (!this.map || !this.marker) {
      return;
    }

    const nextPosition = new google.maps.LatLng(latNum, lngNum);

    this.zone.runOutsideAngular(() => {
      this.marker.setPosition(nextPosition);
      this.map.panTo(nextPosition);
    });
  }

  /**
   * resize map เวลา container เปลี่ยนขนาด
   */
  private watchMapResize(): void {
    const mapEl = this.mapContainer?.nativeElement;

    if (!mapEl || typeof ResizeObserver === 'undefined') {
      return;
    }

    this.resizeObserver = new ResizeObserver(() => {
      this.resizeMap();
    });

    this.resizeObserver.observe(mapEl);
  }

  @HostListener('document:fullscreenchange')
  @HostListener('document:webkitfullscreenchange')
  @HostListener('window:resize')
  onScreenChanged(): void {
    this.resizeMap();
  }

  private retryInitMap(lat: number, lng: number): void {
    if (this.googleRetryCount >= 30) {
      console.warn('[MapComponent] Google Maps API is not ready after retry.');
      return;
    }

    this.googleRetryCount += 1;

    setTimeout(() => {
      if (this.map) {
        return;
      }

      this.initMap(lat, lng);
    }, 250);
  }

  private resizeMap(): void {
    if (!this.map || !this.marker || !this.isGoogleMapReady()) {
      return;
    }

    setTimeout(() => {
      google.maps.event.trigger(this.map, 'resize');
      this.map.setCenter(this.marker.getPosition());
    }, 100);
  }

  private isGoogleMapReady(): boolean {
    return typeof google !== 'undefined' && !!google.maps;
  }

  private toNumber(value: string | number | null | undefined): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const num = Number.parseFloat(String(value));

    return Number.isFinite(num) ? num : null;
  }
}