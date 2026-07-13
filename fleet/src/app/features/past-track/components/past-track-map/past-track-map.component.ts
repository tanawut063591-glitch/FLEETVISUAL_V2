import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';

import { PastTrackPoint } from '../../models/past-track.model';

declare const google: any;

interface UiMapPoint {
  point: PastTrackPoint;
  x: number;
  y: number;
}

@Component({
  selector: 'app-past-track-map',
  standalone: false,
  templateUrl: './past-track-map.component.html',
  styleUrls: ['./past-track-map.component.css'],
})
export class PastTrackMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('pastTrackMap') mapElement!: ElementRef<HTMLDivElement>;

  @Input() trackPoints: PastTrackPoint[] = [];
  @Input() selectedPoint: PastTrackPoint | null = null;

  @Output() pointSelected = new EventEmitter<PastTrackPoint>();

  map: any = null;
  polylines: any[] = [];
  markers: any[] = [];
  selectedMarker: any = null;

  mapReady = false;
  mapError = '';
  useFallbackMap = false;

  uiMapPoints: UiMapPoint[] = [];
  uiRoutePoints = '';

  private readonly maxPolylinePoints = 5_000;
  private readonly maxClickableMarkers = 90;
  private readonly maxFallbackPoints = 500;

  constructor(private readonly zone: NgZone) {}

  ngAfterViewInit(): void {
    this.initMap();
    this.buildFallbackMap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['trackPoints']) {
      this.buildFallbackMap();

      if (this.mapReady) {
        this.drawRoute();
      }
      return;
    }

    if (changes['selectedPoint'] && this.mapReady) {
      this.updateSelectedMarker(true);
    }
  }

  ngOnDestroy(): void {
    this.clearRoute();
    this.map = null;
  }

  private initMap(): void {
    if (typeof google === 'undefined' || !google.maps) {
      this.useFallbackMap = true;
      return;
    }

    if (!this.mapElement?.nativeElement) {
      this.useFallbackMap = true;
      return;
    }

    try {
      this.map = new google.maps.Map(this.mapElement.nativeElement, {
        center: this.getInitialCenter(),
        zoom: 8,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        fullscreenControl: true,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: true,
        gestureHandling: 'greedy',
      });

      this.mapReady = true;
      this.useFallbackMap = false;
      this.drawRoute();
    } catch (error) {
      console.warn('[PastTrackMap] Google Maps initialization failed:', error);
      this.mapReady = false;
      this.useFallbackMap = true;
    }
  }

  private drawRoute(): void {
    this.clearRoute();

    const validPoints = (this.trackPoints || []).filter((point: PastTrackPoint) =>
      this.isValidPoint(point)
    );

    if (!this.map || validPoints.length === 0) {
      return;
    }

    const linePoints = this.downsample(validPoints, this.maxPolylinePoints);
    const path = linePoints.map((point: PastTrackPoint) => ({
      lat: Number(point.lat),
      lng: Number(point.lng),
    }));
    const bounds = new google.maps.LatLngBounds();

    for (const position of path) {
      bounds.extend(position);
    }

    // Split the route when historian data is missing for more than 90 minutes.
    // This avoids drawing a misleading straight line across an unknown route.
    const routeSegments = this.buildRouteSegments(linePoints);

    for (const segment of routeSegments) {
      const polyline = new google.maps.Polyline({
        path: segment.points.map((point: PastTrackPoint) => ({
          lat: Number(point.lat),
          lng: Number(point.lng),
        })),
        geodesic: true,
        strokeColor: segment.color,
        strokeOpacity: 0.94,
        strokeWeight: 5,
        map: this.map,
        clickable: false,
      });

      this.polylines.push(polyline);
    }

    const clickablePoints = this.downsample(validPoints, this.maxClickableMarkers);

    for (const point of clickablePoints) {
      const marker = new google.maps.Marker({
        position: { lat: Number(point.lat), lng: Number(point.lng) },
        map: this.map,
        title: `${point.time} • ${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}`,
        icon: this.getRoutePointIcon(point, false),
        zIndex: 20,
        optimized: true,
      });

      marker.addListener('click', () => {
        this.zone.run(() => this.pointSelected.emit(point));
      });

      this.markers.push(marker);
    }

    this.addEndpointMarker(validPoints[0], 'START', '#10b981', 40);

    if (validPoints.length > 1) {
      this.addEndpointMarker(validPoints[validPoints.length - 1], 'END', '#ef4444', 41);
    }

    if (path.length > 1) {
      this.map.fitBounds(bounds, 52);
    } else {
      this.map.setCenter(path[0]);
      this.map.setZoom(13);
    }

    this.updateSelectedMarker(false);
  }

  private buildRouteSegments(points: PastTrackPoint[]): Array<{
    points: PastTrackPoint[];
    color: string;
  }> {
    if (points.length < 2) {
      return [];
    }

    const maxGapMs = 90 * 60_000;
    const result: Array<{ points: PastTrackPoint[]; color: string }> = [];
    let currentPoints: PastTrackPoint[] = [points[0]];
    let currentColor = this.getStatusColor(points[1]);

    for (let index = 1; index < points.length; index += 1) {
      const previous = points[index - 1];
      const current = points[index];
      const previousTime = this.parseTrackTime(previous.time);
      const currentTime = this.parseTrackTime(current.time);
      const hasGap =
        previousTime !== null &&
        currentTime !== null &&
        currentTime - previousTime > maxGapMs;
      const nextColor = this.getStatusColor(current);
      const statusChanged = nextColor !== currentColor;

      if (hasGap) {
        if (currentPoints.length > 1) {
          result.push({ points: currentPoints, color: currentColor });
        }
        currentPoints = [current];
        currentColor = nextColor;
        continue;
      }

      if (statusChanged && currentPoints.length > 1) {
        currentPoints.push(current);
        result.push({ points: currentPoints, color: currentColor });
        currentPoints = [current];
        currentColor = nextColor;
        continue;
      }

      currentPoints.push(current);
      currentColor = nextColor;
    }

    if (currentPoints.length > 1) {
      result.push({ points: currentPoints, color: currentColor });
    }

    return result;
  }

  private getStatusColor(point: PastTrackPoint): string {
    if (point.status === 'Idle') {
      return '#f59e0b';
    }

    if (point.status === 'No Data') {
      return '#94a3b8';
    }

    return '#10b981';
  }

  private parseTrackTime(value: string): number | null {
    const nativeTime = new Date(value).getTime();

    if (!Number.isNaN(nativeTime)) {
      return nativeTime;
    }

    const match = String(value || '').match(
      /^(\d{1,2})-([A-Za-z]{3})-(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/
    );

    if (!match) {
      return null;
    }

    const months: Record<string, number> = {
      JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
      JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
    };
    const month = months[match[2].toUpperCase()];

    if (month === undefined) {
      return null;
    }

    return new Date(
      Number(match[3]),
      month,
      Number(match[1]),
      Number(match[4]),
      Number(match[5]),
      Number(match[6] || 0)
    ).getTime();
  }

  private addEndpointMarker(
    point: PastTrackPoint,
    label: string,
    color: string,
    zIndex: number
  ): void {
    const marker = new google.maps.Marker({
      position: { lat: Number(point.lat), lng: Number(point.lng) },
      map: this.map,
      title: `${label}: ${point.time}`,
      label: {
        text: label === 'START' ? 'S' : 'E',
        color: '#ffffff',
        fontSize: '11px',
        fontWeight: '700',
      },
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: color,
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeOpacity: 1,
        strokeWeight: 3,
        scale: 10,
      },
      zIndex,
    });

    marker.addListener('click', () => {
      this.zone.run(() => this.pointSelected.emit(point));
    });

    this.markers.push(marker);
  }

  private updateSelectedMarker(panToPoint: boolean): void {
    if (this.selectedMarker) {
      this.selectedMarker.setMap(null);
      this.selectedMarker = null;
    }

    if (!this.map || !this.selectedPoint || !this.isValidPoint(this.selectedPoint)) {
      return;
    }

    const position = {
      lat: Number(this.selectedPoint.lat),
      lng: Number(this.selectedPoint.lng),
    };

    this.selectedMarker = new google.maps.Marker({
      position,
      map: this.map,
      title: `Selected: ${this.selectedPoint.time}`,
      icon: this.getRoutePointIcon(this.selectedPoint, true),
      zIndex: 100,
      optimized: false,
    });

    if (panToPoint) {
      this.map.panTo(position);
    }
  }

  private clearRoute(): void {
    for (const polyline of this.polylines) {
      polyline?.setMap(null);
    }
    this.polylines = [];

    for (const marker of this.markers) {
      marker?.setMap(null);
    }
    this.markers = [];

    if (this.selectedMarker) {
      this.selectedMarker.setMap(null);
      this.selectedMarker = null;
    }
  }

  private getInitialCenter(): any {
    const first = (this.trackPoints || []).find((point: PastTrackPoint) =>
      this.isValidPoint(point)
    );

    return first
      ? { lat: Number(first.lat), lng: Number(first.lng) }
      : { lat: 9.5, lng: 101 };
  }

  private getRoutePointIcon(point: PastTrackPoint, selected: boolean): any {
    let color = '#10b981';

    if (point.status === 'Idle') {
      color = '#f59e0b';
    } else if (point.status === 'No Data') {
      color = '#94a3b8';
    }

    if (selected) {
      color = '#1769ff';
    }

    const size = selected ? 42 : 18;
    const radius = selected ? 16 : 5;
    const center = size / 2;
    const label = selected ? String(point.no) : '';
    const svg =
      `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">` +
      `<circle cx="${center}" cy="${center}" r="${radius}" fill="${selected ? '#ffffff' : color}" stroke="${color}" stroke-width="${selected ? 4 : 2}"/>` +
      (selected
        ? `<text x="${center}" y="${center + 4}" text-anchor="middle" font-family="Arial" font-size="11" font-weight="700" fill="${color}">${label}</text>`
        : '') +
      '</svg>';

    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new google.maps.Size(size, size),
      anchor: new google.maps.Point(center, center),
    };
  }

  selectFallbackPoint(point: PastTrackPoint): void {
    this.pointSelected.emit(point);
  }

  private buildFallbackMap(): void {
    this.uiMapPoints = [];
    this.uiRoutePoints = '';

    const validPoints = (this.trackPoints || []).filter((point: PastTrackPoint) =>
      this.isValidPoint(point)
    );

    if (validPoints.length === 0) {
      return;
    }

    const points = this.downsample(validPoints, this.maxFallbackPoints);
    const lats = points.map((point: PastTrackPoint) => point.lat);
    const lngs = points.map((point: PastTrackPoint) => point.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const latRange = maxLat - minLat || 1;
    const lngRange = maxLng - minLng || 1;

    for (const point of points) {
      this.uiMapPoints.push({
        point,
        x: 16 + ((point.lng - minLng) / lngRange) * 70,
        y: 76 - ((point.lat - minLat) / latRange) * 56,
      });
    }

    this.uiRoutePoints = this.uiMapPoints
      .map((mapPoint: UiMapPoint) => `${mapPoint.x},${mapPoint.y}`)
      .join(' ');
  }

  private downsample(points: PastTrackPoint[], maxPoints: number): PastTrackPoint[] {
    if (points.length <= maxPoints) {
      return points.slice();
    }

    const result: PastTrackPoint[] = [];
    const step = (points.length - 1) / (maxPoints - 1);

    for (let index = 0; index < maxPoints; index += 1) {
      result.push(points[Math.round(index * step)]);
    }

    return result;
  }

  private isValidPoint(point: PastTrackPoint): boolean {
    const lat = Number(point?.lat);
    const lng = Number(point?.lng);

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

  isSelected(point: PastTrackPoint): boolean {
    return !!this.selectedPoint && this.selectedPoint.no === point.no;
  }

  getFallbackPointClass(point: PastTrackPoint): Record<string, boolean> {
    return {
      selected: this.isSelected(point),
      idle: point.status === 'Idle',
      nodata: point.status === 'No Data',
    };
  }

  formatLat(lat: number): string {
    return `${Math.abs(Number(lat) || 0).toFixed(6)}${Number(lat) >= 0 ? ' N' : ' S'}`;
  }

  formatLng(lng: number): string {
    return `${Math.abs(Number(lng) || 0).toFixed(6)}${Number(lng) >= 0 ? ' E' : ' W'}`;
  }
}
