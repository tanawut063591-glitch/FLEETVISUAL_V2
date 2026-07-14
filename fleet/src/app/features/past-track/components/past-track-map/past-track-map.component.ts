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
import html2canvas from 'html2canvas';

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
  @ViewChild('mapWrap') mapWrapElement!: ElementRef<HTMLDivElement>;

  @Input() trackPoints: PastTrackPoint[] = [];
  @Input() selectedPoint: PastTrackPoint | null = null;
  @Input() samplingIntervalMinutes = 30;
  @Input() checkpointIntervalMinutes = 60;

  @Output() pointSelected = new EventEmitter<PastTrackPoint>();

  map: any = null;
  polylines: any[] = [];
  markers: any[] = [];
  selectedMarker: any = null;

  mapReady = false;
  mapError = '';
  useFallbackMap = false;
  mapType: 'roadmap' | 'satellite' = 'roadmap';

  uiMapPoints: UiMapPoint[] = [];
  uiRoutePoints = '';

  private readonly maxPolylinePoints = 5_000;
  private readonly maxClickableMarkers = 90;
  private readonly maxFallbackPoints = 500;
  private markerAnimationFrame: number | null = null;

  constructor(private readonly zone: NgZone) {}

  ngAfterViewInit(): void {
    this.initMap();
    this.buildFallbackMap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['trackPoints'] ||
      changes['samplingIntervalMinutes'] ||
      changes['checkpointIntervalMinutes']
    ) {
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
        mapTypeControl: false,
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

    // Split the route only when the timestamp gap is substantially larger than
    // the selected route interval. This prevents normal hourly 7-day samples
    // from being incorrectly treated as missing-data gaps.
    const routeSegments = this.buildRouteSegments(linePoints);

    for (const segment of routeSegments) {
      const segmentPath = segment.points.map((point: PastTrackPoint) => ({
        lat: Number(point.lat),
        lng: Number(point.lng),
      }));

      // A soft halo keeps the route readable on both road and satellite maps.
      const halo = new google.maps.Polyline({
        path: segmentPath,
        geodesic: true,
        strokeColor: '#ffffff',
        strokeOpacity: 0.72,
        strokeWeight: 8,
        map: this.map,
        clickable: false,
        zIndex: 8,
      });

      const polyline = new google.maps.Polyline({
        path: segmentPath,
        geodesic: true,
        strokeColor: segment.color,
        strokeOpacity: 0.98,
        strokeWeight: 4,
        map: this.map,
        clickable: false,
        zIndex: 9,
      });

      this.polylines.push(halo, polyline);
    }

    // The full route uses every display point, while markers are intentionally sparse.
    const clickablePoints = this.buildCheckpointPoints(validPoints).slice(1, -1);

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

    const sampleMinutes = Math.max(1, Number(this.samplingIntervalMinutes) || 1);
    const maxGapMinutes = Math.max(90, Math.ceil(sampleMinutes * 2.5));
    const maxGapMs = maxGapMinutes * 60_000;
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
    if (!this.map || !this.selectedPoint || !this.isValidPoint(this.selectedPoint)) {
      if (this.selectedMarker) {
        this.selectedMarker.setMap(null);
        this.selectedMarker = null;
      }
      return;
    }

    const target = {
      lat: Number(this.selectedPoint.lat),
      lng: Number(this.selectedPoint.lng),
    };

    if (!this.selectedMarker) {
      this.selectedMarker = new google.maps.Marker({
        position: target,
        map: this.map,
        title: `Selected: ${this.selectedPoint.time}`,
        icon: this.getRoutePointIcon(this.selectedPoint, true),
        zIndex: 100,
        optimized: false,
      });
    } else {
      this.selectedMarker.setTitle(`Selected: ${this.selectedPoint.time}`);
      this.selectedMarker.setIcon(this.getRoutePointIcon(this.selectedPoint, true));
      this.animateSelectedMarker(target);
    }

    if (panToPoint) {
      this.map.panTo(target);
    }
  }

  private animateSelectedMarker(target: { lat: number; lng: number }): void {
    if (!this.selectedMarker) {
      return;
    }

    if (this.markerAnimationFrame !== null) {
      cancelAnimationFrame(this.markerAnimationFrame);
      this.markerAnimationFrame = null;
    }

    const currentPosition = this.selectedMarker.getPosition?.();
    const start = {
      lat: Number(currentPosition?.lat?.() ?? target.lat),
      lng: Number(currentPosition?.lng?.() ?? target.lng),
    };
    const startedAt = performance.now();
    const durationMs = 620;

    const step = (now: number): void => {
      if (!this.selectedMarker) {
        this.markerAnimationFrame = null;
        return;
      }

      const progress = Math.min(1, (now - startedAt) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);

      this.selectedMarker.setPosition({
        lat: start.lat + (target.lat - start.lat) * eased,
        lng: start.lng + (target.lng - start.lng) * eased,
      });

      if (progress < 1) {
        this.markerAnimationFrame = requestAnimationFrame(step);
      } else {
        this.markerAnimationFrame = null;
      }
    };

    this.markerAnimationFrame = requestAnimationFrame(step);
  }

  private clearRoute(): void {
    if (this.markerAnimationFrame !== null) {
      cancelAnimationFrame(this.markerAnimationFrame);
      this.markerAnimationFrame = null;
    }

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


  /**
   * Exports a high-resolution PNG of the current route map.
   *
   * html2canvas is used for the visible map surface. Google map tiles can be
   * restricted by browser CORS rules, so the route, checkpoints and selected
   * point are drawn again on a clean canvas. This guarantees that the exported
   * PNG still contains an accurate route even when a tile cannot be captured.
   */
  async exportPng(fileName: string, title: string, subtitle: string): Promise<void> {
    const validPoints = (this.trackPoints || []).filter((point: PastTrackPoint) =>
      this.isValidPoint(point)
    );
    const mapWrap = this.mapWrapElement?.nativeElement;

    if (!mapWrap || validPoints.length === 0) {
      throw new Error('No valid route map is available for export');
    }

    await this.waitForMapRender();

    const preferredScale = 2;
    let mapSnapshot: HTMLCanvasElement;

    try {
      mapSnapshot = await html2canvas(mapWrap, {
        backgroundColor: '#dff3ff',
        scale: preferredScale,
        useCORS: true,
        allowTaint: false,
        logging: false,
        imageTimeout: 12_000,
        removeContainer: true,
      });

      if (!this.isCanvasReadable(mapSnapshot)) {
        mapSnapshot = this.createFallbackExportCanvas(mapWrap, preferredScale);
      }
    } catch (error: unknown) {
      console.warn('[PastTrackMap] Visible map capture failed; using route fallback:', error);
      mapSnapshot = this.createFallbackExportCanvas(mapWrap, preferredScale);
    }

    const cssWidth = Math.max(1, mapWrap.clientWidth);
    const cssHeight = Math.max(1, mapWrap.clientHeight);
    const pixelScale = Math.max(1, mapSnapshot.width / cssWidth);
    const headerHeight = Math.round(84 * pixelScale);
    const footerHeight = Math.round(54 * pixelScale);
    const exportCanvas = document.createElement('canvas');

    exportCanvas.width = mapSnapshot.width;
    exportCanvas.height = headerHeight + mapSnapshot.height + footerHeight;

    const context = exportCanvas.getContext('2d');

    if (!context) {
      throw new Error('Canvas export is not supported by this browser');
    }

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    this.drawExportHeader(context, exportCanvas.width, headerHeight, pixelScale, title, subtitle);
    context.drawImage(mapSnapshot, 0, headerHeight);
    this.drawExportRouteOverlay(
      context,
      validPoints,
      headerHeight,
      cssWidth,
      cssHeight,
      pixelScale
    );
    this.drawExportFooter(
      context,
      validPoints,
      headerHeight + mapSnapshot.height,
      exportCanvas.width,
      footerHeight,
      pixelScale
    );

    await this.downloadCanvas(exportCanvas, fileName);
  }

  private async waitForMapRender(): Promise<void> {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    if (!this.map || typeof google === 'undefined' || !google.maps?.event) {
      return;
    }

    await new Promise<void>((resolve) => {
      let finished = false;
      let listener: any = null;

      const finish = (): void => {
        if (finished) {
          return;
        }

        finished = true;
        window.clearTimeout(timeoutId);

        if (listener && typeof listener.remove === 'function') {
          listener.remove();
        }

        resolve();
      };

      const timeoutId = window.setTimeout(finish, 850);
      listener = google.maps.event.addListenerOnce(this.map, 'idle', finish);
    });
  }

  private isCanvasReadable(canvas: HTMLCanvasElement): boolean {
    try {
      const context = canvas.getContext('2d');
      context?.getImageData(0, 0, 1, 1);
      return true;
    } catch {
      return false;
    }
  }

  private createFallbackExportCanvas(
    mapWrap: HTMLDivElement,
    scale: number
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const width = Math.max(640, Math.round(mapWrap.clientWidth * scale));
    const height = Math.max(420, Math.round(mapWrap.clientHeight * scale));

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');

    if (!context) {
      return canvas;
    }

    const gradient = context.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#dff5ff');
    gradient.addColorStop(1, '#c8ebf8');
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    context.strokeStyle = 'rgba(255, 255, 255, 0.48)';
    context.lineWidth = Math.max(1, scale);
    const grid = Math.round(72 * scale);

    for (let x = 0; x <= width; x += grid) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    }

    for (let y = 0; y <= height; y += grid) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }

    context.fillStyle = 'rgba(225, 242, 215, 0.82)';
    context.beginPath();
    context.ellipse(width * 0.05, height * 0.56, width * 0.18, height * 0.48, 0, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.ellipse(width * 0.98, height * 0.46, width * 0.17, height * 0.4, 0, 0, Math.PI * 2);
    context.fill();

    return canvas;
  }

  private drawExportHeader(
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
    scale: number,
    title: string,
    subtitle: string
  ): void {
    const left = 24 * scale;
    const titleY = 32 * scale;
    const subtitleY = 58 * scale;

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.strokeStyle = '#dbe7f5';
    context.lineWidth = Math.max(1, scale);
    context.beginPath();
    context.moveTo(0, height - context.lineWidth);
    context.lineTo(width, height - context.lineWidth);
    context.stroke();

    context.fillStyle = '#0f172a';
    context.font = `900 ${22 * scale}px Arial, sans-serif`;
    context.textBaseline = 'middle';
    context.fillText(this.fitCanvasText(context, title || 'PAST TRACK ROUTE MAP', width * 0.55), left, titleY);

    context.fillStyle = '#64748b';
    context.font = `600 ${11.5 * scale}px Arial, sans-serif`;
    context.fillText(this.fitCanvasText(context, subtitle || 'Historical vessel route', width * 0.7), left, subtitleY);

    const legendY = titleY;
    const legendStart = Math.max(width * 0.62, width - 300 * scale);
    this.drawCanvasLegendItem(context, legendStart, legendY, '#10b981', 'Sailing', scale);
    this.drawCanvasLegendItem(context, legendStart + 88 * scale, legendY, '#f59e0b', 'Idle', scale);
    this.drawCanvasLegendItem(context, legendStart + 155 * scale, legendY, '#94a3b8', 'No Data', scale);
  }

  private drawCanvasLegendItem(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string,
    label: string,
    scale: number
  ): void {
    context.beginPath();
    context.arc(x, y, 4 * scale, 0, Math.PI * 2);
    context.fillStyle = color;
    context.fill();
    context.fillStyle = '#334155';
    context.font = `700 ${10 * scale}px Arial, sans-serif`;
    context.textBaseline = 'middle';
    context.fillText(label, x + 9 * scale, y);
  }

  private drawExportRouteOverlay(
    context: CanvasRenderingContext2D,
    validPoints: PastTrackPoint[],
    mapOffsetY: number,
    cssWidth: number,
    cssHeight: number,
    scale: number
  ): void {
    const projection = (point: PastTrackPoint): { x: number; y: number } | null =>
      this.projectPointForExport(point, cssWidth, cssHeight, validPoints);
    const segments = this.buildRouteSegments(validPoints);

    context.save();
    context.lineCap = 'round';
    context.lineJoin = 'round';

    for (const segment of segments) {
      const projected = segment.points
        .map(projection)
        .filter((point): point is { x: number; y: number } => point !== null);

      if (projected.length < 2) {
        continue;
      }

      const drawPath = (): void => {
        context.beginPath();
        context.moveTo(projected[0].x * scale, mapOffsetY + projected[0].y * scale);

        for (let index = 1; index < projected.length; index += 1) {
          context.lineTo(projected[index].x * scale, mapOffsetY + projected[index].y * scale);
        }
      };

      drawPath();
      context.strokeStyle = 'rgba(255,255,255,0.92)';
      context.lineWidth = 8 * scale;
      context.stroke();

      drawPath();
      context.strokeStyle = segment.color;
      context.lineWidth = 4 * scale;
      context.stroke();
    }

    for (const point of this.buildCheckpointPoints(validPoints).slice(1, -1)) {
      const projected = projection(point);

      if (!projected) {
        continue;
      }

      context.beginPath();
      context.arc(projected.x * scale, mapOffsetY + projected.y * scale, 4.2 * scale, 0, Math.PI * 2);
      context.fillStyle = '#ffffff';
      context.fill();
      context.strokeStyle = this.getStatusColor(point);
      context.lineWidth = 2.2 * scale;
      context.stroke();
    }

    this.drawExportEndpoint(context, projection(validPoints[0]), mapOffsetY, scale, 'S', '#10b981');

    if (validPoints.length > 1) {
      this.drawExportEndpoint(
        context,
        projection(validPoints[validPoints.length - 1]),
        mapOffsetY,
        scale,
        'E',
        '#ef4444'
      );
    }

    if (this.selectedPoint && this.isValidPoint(this.selectedPoint)) {
      const selected = projection(this.selectedPoint);

      if (selected) {
        const x = selected.x * scale;
        const y = mapOffsetY + selected.y * scale;
        context.beginPath();
        context.arc(x, y, 14 * scale, 0, Math.PI * 2);
        context.fillStyle = '#ffffff';
        context.fill();
        context.strokeStyle = '#1769ff';
        context.lineWidth = 4 * scale;
        context.stroke();
        context.fillStyle = '#1769ff';
        context.font = `900 ${10 * scale}px Arial, sans-serif`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(String(this.selectedPoint.no || ''), x, y + 0.5 * scale);
      }
    }

    context.restore();
  }

  private projectPointForExport(
    point: PastTrackPoint,
    width: number,
    height: number,
    validPoints: PastTrackPoint[]
  ): { x: number; y: number } | null {
    if (
      this.mapReady &&
      this.map &&
      typeof google !== 'undefined' &&
      google.maps &&
      typeof this.map.getProjection === 'function' &&
      typeof this.map.getBounds === 'function'
    ) {
      const mapProjection = this.map.getProjection();
      const bounds = this.map.getBounds();

      if (mapProjection && bounds) {
        const northEast = bounds.getNorthEast();
        const southWest = bounds.getSouthWest();
        const topRight = mapProjection.fromLatLngToPoint(northEast);
        const bottomLeft = mapProjection.fromLatLngToPoint(southWest);
        const worldPoint = mapProjection.fromLatLngToPoint(
          new google.maps.LatLng(Number(point.lat), Number(point.lng))
        );

        if (topRight && bottomLeft && worldPoint) {
          let worldWidth = Number(topRight.x) - Number(bottomLeft.x);
          let pointOffsetX = Number(worldPoint.x) - Number(bottomLeft.x);
          const worldHeight = Number(bottomLeft.y) - Number(topRight.y);

          if (worldWidth <= 0) {
            worldWidth += 256;
          }

          if (pointOffsetX < 0) {
            pointOffsetX += 256;
          }

          if (worldWidth > 0 && worldHeight > 0) {
            return {
              x: (pointOffsetX / worldWidth) * width,
              y: ((Number(worldPoint.y) - Number(topRight.y)) / worldHeight) * height,
            };
          }
        }
      }
    }

    const latitudes = validPoints.map((item: PastTrackPoint) => Number(item.lat));
    const longitudes = validPoints.map((item: PastTrackPoint) => Number(item.lng));
    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);
    const latRange = maxLat - minLat || 1;
    const lngRange = maxLng - minLng || 1;
    const horizontalPadding = width * 0.08;
    const verticalPadding = height * 0.1;

    return {
      x: horizontalPadding + ((Number(point.lng) - minLng) / lngRange) * (width - horizontalPadding * 2),
      y: height - verticalPadding - ((Number(point.lat) - minLat) / latRange) * (height - verticalPadding * 2),
    };
  }

  private drawExportEndpoint(
    context: CanvasRenderingContext2D,
    point: { x: number; y: number } | null,
    mapOffsetY: number,
    scale: number,
    label: string,
    color: string
  ): void {
    if (!point) {
      return;
    }

    const x = point.x * scale;
    const y = mapOffsetY + point.y * scale;
    context.beginPath();
    context.arc(x, y, 11 * scale, 0, Math.PI * 2);
    context.fillStyle = color;
    context.fill();
    context.strokeStyle = '#ffffff';
    context.lineWidth = 3 * scale;
    context.stroke();
    context.fillStyle = '#ffffff';
    context.font = `900 ${9.5 * scale}px Arial, sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(label, x, y + 0.4 * scale);
  }

  private drawExportFooter(
    context: CanvasRenderingContext2D,
    validPoints: PastTrackPoint[],
    offsetY: number,
    width: number,
    height: number,
    scale: number
  ): void {
    context.fillStyle = '#ffffff';
    context.fillRect(0, offsetY, width, height);
    context.strokeStyle = '#dbe7f5';
    context.lineWidth = Math.max(1, scale);
    context.beginPath();
    context.moveTo(0, offsetY);
    context.lineTo(width, offsetY);
    context.stroke();

    const centerY = offsetY + height / 2;
    const leftLabel = `${validPoints.length} route points • ${this.formatExportInterval(
      this.samplingIntervalMinutes
    )} route data • ${this.formatExportInterval(this.checkpointIntervalMinutes)} checkpoints`;
    const selectedLabel = this.selectedPoint
      ? `${this.selectedPoint.time} • ${this.formatLat(this.selectedPoint.lat)}, ${this.formatLng(
          this.selectedPoint.lng
        )}`
      : 'No selected point';

    context.fillStyle = '#475569';
    context.font = `700 ${10.5 * scale}px Arial, sans-serif`;
    context.textAlign = 'left';
    context.textBaseline = 'middle';
    context.fillText(this.fitCanvasText(context, leftLabel, width * 0.56), 22 * scale, centerY);

    context.textAlign = 'right';
    context.fillStyle = '#0f172a';
    context.fillText(
      this.fitCanvasText(context, selectedLabel, width * 0.38),
      width - 22 * scale,
      centerY
    );
  }

  private formatExportInterval(minutes: number): string {
    const safeMinutes = Math.max(1, Math.round(Number(minutes) || 1));

    if (safeMinutes < 60) {
      return `every ${safeMinutes} min`;
    }

    const hours = safeMinutes / 60;
    return Number.isInteger(hours)
      ? `every ${hours} hr${hours === 1 ? '' : 's'}`
      : `every ${hours.toFixed(1)} hrs`;
  }

  private fitCanvasText(
    context: CanvasRenderingContext2D,
    value: string,
    maxWidth: number
  ): string {
    const text = String(value || '');

    if (context.measureText(text).width <= maxWidth) {
      return text;
    }

    let result = text;

    while (result.length > 1 && context.measureText(`${result}…`).width > maxWidth) {
      result = result.slice(0, -1);
    }

    return `${result}…`;
  }

  private async downloadCanvas(canvas: HTMLCanvasElement, fileName: string): Promise<void> {
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value: Blob | null) => {
        if (value) {
          resolve(value);
          return;
        }

        reject(new Error('Unable to encode the route map as PNG'));
      }, 'image/png');
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = fileName || 'past-track-route-map.png';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => window.URL.revokeObjectURL(url), 0);
  }


  setMapType(type: 'roadmap' | 'satellite'): void {
    this.mapType = type;

    if (!this.map || typeof google === 'undefined' || !google.maps) {
      return;
    }

    this.map.setMapTypeId(
      type === 'satellite'
        ? google.maps.MapTypeId.SATELLITE
        : google.maps.MapTypeId.ROADMAP
    );
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

    const routePoints = this.downsample(validPoints, this.maxFallbackPoints);
    const lats = routePoints.map((point: PastTrackPoint) => point.lat);
    const lngs = routePoints.map((point: PastTrackPoint) => point.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const latRange = maxLat - minLat || 1;
    const lngRange = maxLng - minLng || 1;
    const toUiPoint = (point: PastTrackPoint): UiMapPoint => ({
      point,
      x: 16 + ((point.lng - minLng) / lngRange) * 70,
      y: 76 - ((point.lat - minLat) / latRange) * 56,
    });
    const routeUiPoints = routePoints.map(toUiPoint);

    this.uiRoutePoints = routeUiPoints
      .map((mapPoint: UiMapPoint) => `${mapPoint.x},${mapPoint.y}`)
      .join(' ');
    this.uiMapPoints = this.buildCheckpointPoints(validPoints).map(toUiPoint);
  }

  private buildCheckpointPoints(points: PastTrackPoint[]): PastTrackPoint[] {
    if (points.length <= 2) {
      return points.slice();
    }

    const maxMarkers = Math.max(2, this.maxClickableMarkers);
    const intervalMs = Math.max(1, this.checkpointIntervalMinutes) * 60_000;
    const result: PastTrackPoint[] = [points[0]];
    let lastCheckpointTime = this.parseTrackTime(points[0].time);

    for (let index = 1; index < points.length - 1; index += 1) {
      const point = points[index];
      const pointTime = this.parseTrackTime(point.time);

      if (pointTime === null || lastCheckpointTime === null) {
        continue;
      }

      if (pointTime - lastCheckpointTime >= intervalMs) {
        result.push(point);
        lastCheckpointTime = pointTime;
      }
    }

    result.push(points[points.length - 1]);
    return this.downsample(result, maxMarkers);
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
      start: this.isStartPoint(point),
      end: this.isEndPoint(point),
    };
  }

  getFallbackPointLabel(point: PastTrackPoint): string {
    if (this.isStartPoint(point)) {
      return 'S';
    }

    if (this.isEndPoint(point)) {
      return 'E';
    }

    return '';
  }

  private isStartPoint(point: PastTrackPoint): boolean {
    return this.trackPoints.length > 0 && this.trackPoints[0].no === point.no;
  }

  private isEndPoint(point: PastTrackPoint): boolean {
    return this.trackPoints.length > 0 && this.trackPoints[this.trackPoints.length - 1].no === point.no;
  }

  formatLat(lat: number): string {
    return `${Math.abs(Number(lat) || 0).toFixed(6)}${Number(lat) >= 0 ? ' N' : ' S'}`;
  }

  formatLng(lng: number): string {
    return `${Math.abs(Number(lng) || 0).toFixed(6)}${Number(lng) >= 0 ? ' E' : ' W'}`;
  }
}
