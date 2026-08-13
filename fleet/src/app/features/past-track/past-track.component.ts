import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

import {
  PastTrackPoint,
  PastTrackResponse,
  PastTrackStatus,
  PastTrackSummary,
} from './models/past-track.model';
import { PastTrackService } from '../../shared/services/past-track.service';
import { PastTrackMapComponent } from './components/past-track-map/past-track-map.component';

type PlaybackSpeed = '0.5x' | '1x' | '1.5x' | '2x';
type RangeMode = 1 | 3 | 7 | 'custom';

interface HistoryPreset {
  days: 1 | 3 | 7;
  label: string;
  intervalMinutes: number;
}

@Component({
  selector: 'app-past-track',
  standalone: false,
  templateUrl: './past-track.component.html',
  styleUrls: ['./past-track.component.css'],
})
export class PastTrackComponent implements OnInit, OnDestroy {
  @ViewChild('routeWorkspace') routeWorkspace?: ElementRef<HTMLElement>;
  @ViewChild('routeMapExport') routeMapExport?: ElementRef<HTMLElement>;
  @ViewChild(PastTrackMapComponent) routeMapComponent?: PastTrackMapComponent;
  readonly maxHistoryDays = 7;
  readonly historyPresets: HistoryPreset[] = [
    { days: 1, label: '1 Day', intervalMinutes: 10 },
    { days: 3, label: '3 Days', intervalMinutes: 30 },
    { days: 7, label: '7 Days', intervalMinutes: 60 },
  ];

  vesselId = '';
  startDate = '';
  endDate = '';
  customStartDate = '';
  customEndDate = '';
  maxDateTime = '';

  activeRangeMode: RangeMode = 1;
  samplingIntervalMinutes = 10;
  customRangeOpen = false;
  exportingMap = false;

  loading = false;
  errorMessage = '';

  summary: PastTrackSummary | null = null;
  trackPoints: PastTrackPoint[] = [];
  selectedPoint: PastTrackPoint | null = null;

  isPlaying = false;
  playbackSpeed: PlaybackSpeed = '1x';

  private routeSub: Subscription | null = null;
  private loadSub: Subscription | null = null;
  private playTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly pastTrackService: PastTrackService
  ) {}

  ngOnInit(): void {
    this.applyPresetConfiguration(1);
    this.setRollingRange(1);

    this.routeSub = this.route.paramMap.subscribe((params) => {
      const idFromUrl = this.decodeValue(params.get('id') || '');
      this.vesselId = this.resolveBackendPrefix(idFromUrl);
      this.loadPastTrack();
    });
  }

  ngOnDestroy(): void {
    this.stopPlayback();
    this.routeSub?.unsubscribe();
    this.loadSub?.unsubscribe();
  }

  selectHistoryDays(days: 1 | 3 | 7): void {
    if (this.activeRangeMode === days && !this.customRangeOpen) {
      return;
    }

    this.activeRangeMode = days;
    this.customRangeOpen = false;
    this.applyPresetConfiguration(days);
    this.setRollingRange(days);
    this.loadPastTrack();
  }

  toggleCustomRange(): void {
    this.customRangeOpen = !this.customRangeOpen;

    if (this.customRangeOpen) {
      this.syncCustomInputsFromRange();
      this.refreshMaxDateTime();
    }
  }

  applyCustomRange(): void {
    const start = this.parseInputDate(this.customStartDate);
    const end = this.parseInputDate(this.customEndDate);
    const now = new Date();

    if (!start || !end || start.getTime() >= end.getTime()) {
      this.errorMessage = 'The start date and time must be earlier than the end date and time';
      return;
    }

    if (end.getTime() > now.getTime() + 60_000) {
      this.errorMessage = 'The end time cannot be in the future';
      return;
    }

    const durationMs = end.getTime() - start.getTime();
    const maxDurationMs = this.maxHistoryDays * 24 * 60 * 60 * 1000;

    if (durationMs > maxDurationMs) {
      this.errorMessage = 'A custom Past Track range cannot exceed seven days';
      return;
    }

    this.activeRangeMode = 'custom';
    this.startDate = this.toRequestDateTime(start);
    this.endDate = this.toRequestDateTime(end);
    this.applyAutomaticResolution(durationMs);
    this.customRangeOpen = false;
    this.loadPastTrack();
  }

  refreshPastTrack(): void {
    if (this.activeRangeMode !== 'custom') {
      this.applyPresetConfiguration(this.activeRangeMode);
      this.setRollingRange(this.activeRangeMode);
    }

    this.loadPastTrack();
  }

  loadPastTrack(): void {
    this.errorMessage = '';

    if (!this.validateDateRange()) {
      return;
    }

    if (!this.vesselId) {
      this.loading = false;
      this.summary = null;
      this.trackPoints = [];
      this.selectedPoint = null;
      this.errorMessage = 'Please select a vessel before loading past track data';
      return;
    }

    this.loading = true;
    this.summary = null;
    this.trackPoints = [];
    this.selectedPoint = null;

    this.stopPlayback();
    this.loadSub?.unsubscribe();

    this.loadSub = this.pastTrackService
      .getPastTrack(
        this.vesselId,
        this.startDate,
        this.endDate,
        this.samplingIntervalMinutes
      )
      .subscribe({
        next: (response: PastTrackResponse) => {
          const points = this.normalizeTrackPoints(response?.points || []);

          this.trackPoints = points;
          this.summary = response?.summary || this.buildFallbackSummary(points);
          this.selectedPoint = points.length > 0 ? points[0] : null;
          this.loading = false;
        },
        error: (error: unknown) => {
          console.error('[PastTrackComponent] loadPastTrack error:', error);
          this.summary = null;
          this.trackPoints = [];
          this.selectedPoint = null;
          this.errorMessage = 'Cannot load past track data';
          this.loading = false;
        },
      });
  }

  selectPoint(point: PastTrackPoint | null): void {
    if (!point) {
      return;
    }

    this.selectedPoint = point;
  }

  focusPointOnMap(point: PastTrackPoint | null): void {
    if (!point) {
      return;
    }

    this.stopPlayback();
    this.selectedPoint = point;

    requestAnimationFrame(() => {
      this.routeWorkspace?.nativeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  }

  scrubToPoint(point: PastTrackPoint | null): void {
    if (!point) {
      return;
    }

    this.stopPlayback();
    this.selectedPoint = point;
  }

  previousPoint(): void {
    if (this.trackPoints.length === 0) {
      return;
    }

    const index = this.findSelectedIndex();
    this.selectedPoint = this.trackPoints[Math.max(0, index - 1)];
  }

  nextPoint(): void {
    if (this.trackPoints.length === 0) {
      this.stopPlayback();
      return;
    }

    const index = this.findSelectedIndex();

    if (index < this.trackPoints.length - 1) {
      this.selectedPoint = this.trackPoints[index + 1];
      return;
    }

    this.stopPlayback();
  }

  togglePlayback(): void {
    if (this.isPlaying) {
      this.stopPlayback();
      return;
    }

    this.startPlayback();
  }

  changePlaybackSpeed(speed: string): void {
    this.playbackSpeed = this.normalizePlaybackSpeed(speed);

    if (this.isPlaying) {
      this.stopPlayback();
      this.startPlayback();
    }
  }

  getRangeStartLabel(): string {
    return this.formatRangeDateTime(this.startDate);
  }

  getRangeEndLabel(): string {
    return this.formatRangeDateTime(this.endDate);
  }

  getSelectedTimeLabel(): string {
    return this.selectedPoint?.time || 'No point selected';
  }

  getRangeTitle(): string {
    if (this.activeRangeMode === 'custom') {
      return 'Custom Range';
    }

    return this.activeRangeMode === 1
      ? 'Last 24 Hours'
      : `Last ${this.activeRangeMode} Days`;
  }

  getRangeDurationLabel(): string {
    const start = this.parseInputDate(this.startDate);
    const end = this.parseInputDate(this.endDate);

    if (!start || !end) {
      return '-';
    }

    const hours = Math.max(0, Math.round((end.getTime() - start.getTime()) / 3_600_000));
    if (hours >= 24) {
      const days = Math.round(hours / 24);
      return `${days} day${days === 1 ? '' : 's'}`;
    }

    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }

  exportCsv(): void {
    if (!this.trackPoints.length) {
      console.warn('[PastTrackComponent] No past track data to export');
      return;
    }

    const headers = [
      'No',
      `${this.samplingIntervalMinutes}-minute slot`,
      'Recorded time',
      'Sample offset (minutes)',
      'Latitude',
      'Longitude',
      'Status',
      'Speed',
      'Course',
      'Engine',
      'Fuel Rate',
    ];

    const rows = this.trackPoints.map((point: PastTrackPoint, index: number) => {
      return [
        point.no || index + 1,
        point.time,
        point.recordedTime || point.time,
        point.sampleOffsetMinutes ?? 0,
        point.lat,
        point.lng,
        point.status,
        point.speed,
        point.course,
        point.engine,
        point.fuelRate,
      ]
        .map((value) => this.csvEscape(value))
        .join(',');
    });

    const csv = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `past-track-${this.getExportRangeName()}-${this.toSafeFileName(
      this.vesselId || 'vessel'
    )}.csv`;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  async exportMapPng(): Promise<void> {
    if (!this.routeMapExport?.nativeElement || this.trackPoints.length === 0 || this.exportingMap) {
      return;
    }

    this.exportingMap = true;

    try {





      const staticMap = await this.loadStaticMapImage();
      const canvas = this.buildVectorMapCanvas(staticMap);
      await this.downloadCanvas(canvas, this.getMapExportFileName());
    } catch (error) {
      console.warn('[PastTrackComponent] Static map export unavailable. Using coordinate fallback.', error);
      const fallback = this.buildVectorMapCanvas(null);
      await this.downloadCanvas(fallback, this.getMapExportFileName());
    } finally {
      this.exportingMap = false;
    }
  }

  private async loadStaticMapImage(): Promise<HTMLImageElement | null> {
    const url = this.buildStaticMapUrl();

    if (!url) {
      return null;
    }

    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        const timeoutId = window.setTimeout(() => {
          img.src = '';
          reject(new Error('Static map image timed out'));
        }, 10_000);

        img.crossOrigin = 'anonymous';
        img.onload = () => {
          window.clearTimeout(timeoutId);
          resolve(img);
        };
        img.onerror = () => {
          window.clearTimeout(timeoutId);
          reject(new Error('Static map image failed to load'));
        };
        img.src = url;
      });




      const probe = document.createElement('canvas');
      probe.width = 2;
      probe.height = 2;
      const probeContext = probe.getContext('2d');
      probeContext?.drawImage(image, 0, 0, 2, 2);
      probeContext?.getImageData(0, 0, 1, 1);

      return image;
    } catch (error) {
      console.info('[PastTrackComponent] Google Static Maps is not available for this export.', error);
      return null;
    }
  }

  private buildStaticMapUrl(): string | null {
    const key = this.getGoogleMapsApiKey();
    const valid = this.getValidExportPoints();

    if (!key || valid.length === 0) {
      return null;
    }

    const url = new URL('https://maps.googleapis.com/maps/api/staticmap');
    url.searchParams.set('size', '640x320');
    url.searchParams.set('scale', '2');
    url.searchParams.set('format', 'png32');
    url.searchParams.set('maptype', this.routeMapComponent?.mapType || 'roadmap');
    url.searchParams.set('language', 'en');
    url.searchParams.set('key', key);
    url.searchParams.append('style', 'feature:poi|visibility:off');
    url.searchParams.append('style', 'feature:transit|visibility:off');

    for (const segment of this.buildExportRouteSegments(valid)) {
      const sampled = this.downsampleExportPoints(segment.points, 90);
      const encoded = this.encodeGooglePolyline(sampled);

      if (!encoded) {
        continue;
      }



      url.searchParams.append('path', `color:0xffffffff|weight:8|enc:${encoded}`);
      url.searchParams.append('path', `color:${segment.color}|weight:4|enc:${encoded}`);
    }

    const first = valid[0];
    const last = valid[valid.length - 1];
    url.searchParams.append('markers', `color:0x10b981|label:S|${first.lat},${first.lng}`);
    url.searchParams.append('markers', `color:0xef4444|label:E|${last.lat},${last.lng}`);

    if (this.selectedPoint && Number.isFinite(this.selectedPoint.lat) && Number.isFinite(this.selectedPoint.lng)) {
      url.searchParams.append(
        'markers',
        `color:0x2563eb|label:P|${this.selectedPoint.lat},${this.selectedPoint.lng}`
      );
    }

    return url.toString();
  }

  private getGoogleMapsApiKey(): string {
    const scripts = Array.from(
      document.querySelectorAll<HTMLScriptElement>('script[src*="maps.googleapis.com/maps/api/js"]')
    );

    for (const script of scripts) {
      try {
        const key = new URL(script.src, window.location.href).searchParams.get('key');
        if (key) {
          return key;
        }
      } catch {
        // Ignore malformed script URLs and continue looking for the Maps loader.
      }
    }

    return '';
  }

  private buildVectorMapCanvas(baseMap: HTMLImageElement | null = null): HTMLCanvasElement {
    const width = 1600;
    const height = 1000;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return canvas;
    }

    const valid = this.getValidExportPoints();
    const selected = this.selectedPoint && Number.isFinite(this.selectedPoint.lat) && Number.isFinite(this.selectedPoint.lng)
      ? this.selectedPoint
      : valid[0] || null;

    ctx.fillStyle = '#eef5fb';
    ctx.fillRect(0, 0, width, height);

    const pageGradient = ctx.createLinearGradient(0, 0, 0, height);
    pageGradient.addColorStop(0, '#ffffff');
    pageGradient.addColorStop(1, '#edf5fb');
    ctx.fillStyle = pageGradient;
    ctx.fillRect(0, 0, width, height);


    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, 132);
    ctx.strokeStyle = '#d9e6f3';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 131);
    ctx.lineTo(width, 131);
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.font = '800 34px Segoe UI, Arial, sans-serif';
    ctx.fillText(`${this.summary?.vesselName || this.vesselId} · ROUTE MAP`, 48, 50);
    ctx.fillStyle = '#64748b';
    ctx.font = '600 18px Segoe UI, Arial, sans-serif';
    ctx.fillText(
      `${this.getRangeStartLabel()}  →  ${this.getRangeEndLabel()}   ·   Every ${this.samplingIntervalMinutes} minutes`,
      48,
      84
    );
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 14px Segoe UI, Arial, sans-serif';
    ctx.fillText(baseMap ? 'Google basemap export' : 'Coordinate route fallback', 48, 110);

    this.drawExportLegend(ctx, width - 520, 32);

    const mapX = 38;
    const mapY = 156;
    const mapWidth = width - 76;
    const mapHeight = 790;

    ctx.save();
    this.roundedRectPath(ctx, mapX, mapY, mapWidth, mapHeight, 24);
    ctx.clip();

    if (baseMap) {
      ctx.drawImage(baseMap, mapX, mapY, mapWidth, mapHeight);
      const softOverlay = ctx.createLinearGradient(mapX, mapY, mapX, mapY + mapHeight);
      softOverlay.addColorStop(0, 'rgba(255,255,255,0.02)');
      softOverlay.addColorStop(1, 'rgba(15,23,42,0.05)');
      ctx.fillStyle = softOverlay;
      ctx.fillRect(mapX, mapY, mapWidth, mapHeight);
    } else {
      this.drawCoordinateFallbackMap(ctx, valid, mapX, mapY, mapWidth, mapHeight);
    }

    ctx.restore();

    ctx.strokeStyle = '#cdddec';
    ctx.lineWidth = 3;
    this.roundedRectPath(ctx, mapX, mapY, mapWidth, mapHeight, 24);
    ctx.stroke();

    if (selected) {
      const coordinate = `${Number(selected.lat).toFixed(6)} N, ${Number(selected.lng).toFixed(6)} E`;
      const boxWidth = 440;
      const boxHeight = 64;
      const boxX = mapX + mapWidth - boxWidth - 24;
      const boxY = mapY + mapHeight - boxHeight - 24;

      ctx.fillStyle = 'rgba(255,255,255,0.96)';
      this.roundedRectPath(ctx, boxX, boxY, boxWidth, boxHeight, 16);
      ctx.fill();
      ctx.strokeStyle = '#cbdced';
      ctx.lineWidth = 2;
      this.roundedRectPath(ctx, boxX, boxY, boxWidth, boxHeight, 16);
      ctx.stroke();
      ctx.fillStyle = '#0f172a';
      ctx.font = '800 22px Segoe UI, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(coordinate, boxX + boxWidth / 2, boxY + boxHeight / 2 + 1);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    }

    return canvas;
  }

  private drawCoordinateFallbackMap(
    ctx: CanvasRenderingContext2D,
    valid: PastTrackPoint[],
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const seaGradient = ctx.createLinearGradient(x, y, x, y + height);
    seaGradient.addColorStop(0, '#d9f2fb');
    seaGradient.addColorStop(1, '#a9deef');
    ctx.fillStyle = seaGradient;
    ctx.fillRect(x, y, width, height);

    if (valid.length === 0) {
      ctx.fillStyle = '#52657c';
      ctx.font = '700 24px Segoe UI, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No valid Latitude / Longitude points', x + width / 2, y + height / 2);
      ctx.textAlign = 'left';
      return;
    }

    const latitudes = valid.map((point) => Number(point.lat));
    const longitudes = valid.map((point) => Number(point.lng));
    let minLat = Math.min(...latitudes);
    let maxLat = Math.max(...latitudes);
    let minLng = Math.min(...longitudes);
    let maxLng = Math.max(...longitudes);

    const minLatSpan = 0.02;
    const minLngSpan = 0.02;
    const latSpan = Math.max(maxLat - minLat, minLatSpan);
    const lngSpan = Math.max(maxLng - minLng, minLngSpan);
    const latPadding = latSpan * 0.15;
    const lngPadding = lngSpan * 0.15;
    minLat -= latPadding;
    maxLat += latPadding;
    minLng -= lngPadding;
    maxLng += lngPadding;

    const plotPadX = 78;
    const plotPadY = 66;
    const plotX = x + plotPadX;
    const plotY = y + plotPadY;
    const plotWidth = width - plotPadX * 2;
    const plotHeight = height - plotPadY * 2;
    const project = (point: PastTrackPoint) => ({
      x: plotX + ((Number(point.lng) - minLng) / (maxLng - minLng)) * plotWidth,
      y: plotY + (1 - (Number(point.lat) - minLat) / (maxLat - minLat)) * plotHeight,
    });

    ctx.strokeStyle = 'rgba(43, 105, 139, 0.20)';
    ctx.fillStyle = 'rgba(25, 75, 103, 0.72)';
    ctx.font = '600 13px Segoe UI, Arial, sans-serif';
    ctx.lineWidth = 1;

    for (let index = 0; index <= 6; index += 1) {
      const gridX = plotX + (plotWidth / 6) * index;
      const gridY = plotY + (plotHeight / 6) * index;
      const longitude = minLng + ((maxLng - minLng) / 6) * index;
      const latitude = maxLat - ((maxLat - minLat) / 6) * index;

      ctx.beginPath();
      ctx.moveTo(gridX, plotY);
      ctx.lineTo(gridX, plotY + plotHeight);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(plotX, gridY);
      ctx.lineTo(plotX + plotWidth, gridY);
      ctx.stroke();

      ctx.fillText(longitude.toFixed(3), gridX - 28, plotY + plotHeight + 28);
      ctx.fillText(latitude.toFixed(3), plotX - 62, gridY + 5);
    }

    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    this.roundedRectPath(ctx, x + 24, y + 22, 294, 46, 13);
    ctx.fill();
    ctx.fillStyle = '#164e63';
    ctx.font = '800 17px Segoe UI, Arial, sans-serif';
    ctx.fillText('LATITUDE / LONGITUDE ROUTE', x + 42, y + 52);

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    for (const segment of this.buildExportRouteSegments(valid)) {
      if (segment.points.length < 2) {
        continue;
      }

      ctx.strokeStyle = 'rgba(255,255,255,0.92)';
      ctx.lineWidth = 12;
      ctx.beginPath();
      segment.points.forEach((point, index) => {
        const position = project(point);
        if (index === 0) ctx.moveTo(position.x, position.y);
        else ctx.lineTo(position.x, position.y);
      });
      ctx.stroke();

      ctx.strokeStyle = this.staticMapColorToCss(segment.color);
      ctx.lineWidth = 7;
      ctx.beginPath();
      segment.points.forEach((point, index) => {
        const position = project(point);
        if (index === 0) ctx.moveTo(position.x, position.y);
        else ctx.lineTo(position.x, position.y);
      });
      ctx.stroke();
    }

    this.drawExportMarker(ctx, project(valid[0]), 'S', '#10b981');
    this.drawExportMarker(ctx, project(valid[valid.length - 1]), 'E', '#ef4444');

    if (this.selectedPoint && Number.isFinite(this.selectedPoint.lat) && Number.isFinite(this.selectedPoint.lng)) {
      this.drawExportMarker(ctx, project(this.selectedPoint), 'P', '#2563eb');
    }



    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    this.roundedRectPath(ctx, x + width - 92, y + 22, 58, 76, 15);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 20px Segoe UI, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', x + width - 63, y + 49);
    ctx.beginPath();
    ctx.moveTo(x + width - 63, y + 59);
    ctx.lineTo(x + width - 75, y + 82);
    ctx.lineTo(x + width - 63, y + 76);
    ctx.lineTo(x + width - 51, y + 82);
    ctx.closePath();
    ctx.fill();
    ctx.textAlign = 'left';
  }

  private drawExportLegend(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const items = [
      { label: 'Sailing', color: '#10b981' },
      { label: 'Idle', color: '#f59e0b' },
      { label: 'No Data', color: '#94a3b8' },
    ];

    ctx.fillStyle = '#f8fbff';
    this.roundedRectPath(ctx, x, y, 470, 62, 18);
    ctx.fill();
    ctx.strokeStyle = '#d5e3f0';
    ctx.lineWidth = 2;
    this.roundedRectPath(ctx, x, y, 470, 62, 18);
    ctx.stroke();

    let cursor = x + 26;
    for (const item of items) {
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.arc(cursor + 8, y + 31, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.font = '800 17px Segoe UI, Arial, sans-serif';
      ctx.fillText(item.label, cursor + 25, y + 37);
      cursor += item.label === 'No Data' ? 138 : 130;
    }
  }

  private drawExportMarker(
    ctx: CanvasRenderingContext2D,
    position: { x: number; y: number },
    label: string,
    color: string
  ): void {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(position.x, position.y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(position.x, position.y, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 15px Segoe UI, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, position.x, position.y + 1);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  private getValidExportPoints(): PastTrackPoint[] {
    return (this.trackPoints || []).filter((point) =>
      Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lng))
    );
  }

  private buildExportRouteSegments(points: PastTrackPoint[]): Array<{
    points: PastTrackPoint[];
    color: string;
  }> {
    if (points.length < 2) {
      return points.length ? [{ points, color: '0x10b981ff' }] : [];
    }

    const maxGapMs = 90 * 60_000;
    const result: Array<{ points: PastTrackPoint[]; color: string }> = [];
    let currentPoints: PastTrackPoint[] = [points[0]];
    let currentColor = this.getExportStatusColor(points[0]);

    for (let index = 1; index < points.length; index += 1) {
      const previous = points[index - 1];
      const current = points[index];
      const previousTime = this.parseInputDate(previous.time)?.getTime() ?? null;
      const currentTime = this.parseInputDate(current.time)?.getTime() ?? null;
      const hasGap = previousTime !== null && currentTime !== null && currentTime - previousTime > maxGapMs;
      const nextColor = this.getExportStatusColor(current);

      if (hasGap || nextColor !== currentColor) {
        if (currentPoints.length > 1) {
          result.push({ points: currentPoints, color: currentColor });
        }
        currentPoints = hasGap ? [current] : [previous, current];
        currentColor = nextColor;
        continue;
      }

      currentPoints.push(current);
    }

    if (currentPoints.length > 1) {
      result.push({ points: currentPoints, color: currentColor });
    }

    return result;
  }

  private getExportStatusColor(point: PastTrackPoint): string {
    if (point.status === 'Idle') {
      return '0xf59e0bff';
    }

    if (point.status === 'No Data') {
      return '0x94a3b8ff';
    }

    return '0x10b981ff';
  }

  private staticMapColorToCss(color: string): string {
    return `#${color.replace(/^0x/, '').slice(0, 6)}`;
  }

  private downsampleExportPoints(points: PastTrackPoint[], maxPoints: number): PastTrackPoint[] {
    if (points.length <= maxPoints) {
      return points;
    }

    const result: PastTrackPoint[] = [];
    const step = (points.length - 1) / (maxPoints - 1);

    for (let index = 0; index < maxPoints; index += 1) {
      result.push(points[Math.round(index * step)]);
    }

    return result;
  }

  private encodeGooglePolyline(points: PastTrackPoint[]): string {
    let previousLat = 0;
    let previousLng = 0;
    let encoded = '';

    for (const point of points) {
      const lat = Math.round(Number(point.lat) * 1e5);
      const lng = Math.round(Number(point.lng) * 1e5);
      encoded += this.encodePolylineValue(lat - previousLat);
      encoded += this.encodePolylineValue(lng - previousLng);
      previousLat = lat;
      previousLng = lng;
    }

    return encoded;
  }

  private encodePolylineValue(value: number): string {
    let encodedValue = value < 0 ? ~(value << 1) : value << 1;
    let output = '';

    while (encodedValue >= 0x20) {
      output += String.fromCharCode((0x20 | (encodedValue & 0x1f)) + 63);
      encodedValue >>= 5;
    }

    output += String.fromCharCode(encodedValue + 63);
    return output;
  }

  private roundedRectPath(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    const safeRadius = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + safeRadius, y);
    ctx.arcTo(x + width, y, x + width, y + height, safeRadius);
    ctx.arcTo(x + width, y + height, x, y + height, safeRadius);
    ctx.arcTo(x, y + height, x, y, safeRadius);
    ctx.arcTo(x, y, x + width, y, safeRadius);
    ctx.closePath();
  }

  private downloadCanvas(canvas: HTMLCanvasElement, filename: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Unable to create the PNG file'));
            return;
          }

          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.setTimeout(() => URL.revokeObjectURL(url), 0);
          resolve();
        }, 'image/png', 1);
      } catch (error) {
        reject(error);
      }
    });
  }

  private getMapExportFileName(): string {
    return `past-track-map-${this.getExportRangeName()}-${this.toSafeFileName(this.vesselId || 'vessel')}.png`;
  }

  private startPlayback(): void {
    if (this.trackPoints.length === 0) {
      return;
    }

    if (!this.selectedPoint || this.findSelectedIndex() >= this.trackPoints.length - 1) {
      this.selectedPoint = this.trackPoints[0];
    }

    this.stopPlayback();
    this.isPlaying = true;

    this.playTimer = setInterval(() => {
      this.nextPoint();
    }, this.getPlaybackInterval());
  }

  private stopPlayback(): void {
    this.isPlaying = false;

    if (this.playTimer) {
      clearInterval(this.playTimer);
      this.playTimer = null;
    }
  }

  private getPlaybackInterval(): number {
    if (this.playbackSpeed === '0.5x') {
      return 1800;
    }

    if (this.playbackSpeed === '1.5x') {
      return 700;
    }

    if (this.playbackSpeed === '2x') {
      return 450;
    }

    return 1000;
  }

  private findSelectedIndex(): number {
    if (!this.selectedPoint) {
      return 0;
    }

    const index = this.trackPoints.findIndex((point: PastTrackPoint) => {
      return (
        point === this.selectedPoint ||
        (point.no === this.selectedPoint?.no && point.time === this.selectedPoint?.time)
      );
    });

    return index >= 0 ? index : 0;
  }

  private applyPresetConfiguration(days: 1 | 3 | 7): void {
    const preset = this.historyPresets.find((item) => item.days === days);

    this.samplingIntervalMinutes = preset?.intervalMinutes || 60;
  }

  private applyAutomaticResolution(durationMs: number): void {
    const oneDayMs = 24 * 60 * 60 * 1000;

    if (durationMs <= oneDayMs) {
      this.samplingIntervalMinutes = 10;
      return;
    }

    if (durationMs <= 3 * oneDayMs) {
      this.samplingIntervalMinutes = 30;
      return;
    }

    this.samplingIntervalMinutes = 60;
  }

  private setRollingRange(days: 1 | 3 | 7): void {
    const end = new Date();
    end.setSeconds(0, 0);

    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);

    this.startDate = this.toRequestDateTime(start);
    this.endDate = this.toRequestDateTime(end);
    this.syncCustomInputsFromRange();
    this.refreshMaxDateTime();
  }

  private syncCustomInputsFromRange(): void {
    const start = this.parseInputDate(this.startDate);
    const end = this.parseInputDate(this.endDate);

    this.customStartDate = start ? this.toDateTimeLocal(start) : '';
    this.customEndDate = end ? this.toDateTimeLocal(end) : '';
  }

  private refreshMaxDateTime(): void {
    this.maxDateTime = this.toDateTimeLocal(new Date());
  }

  private validateDateRange(): boolean {
    const start = this.parseInputDate(this.startDate)?.getTime() ?? Number.NaN;
    const end = this.parseInputDate(this.endDate)?.getTime() ?? Number.NaN;

    if (Number.isNaN(start) || Number.isNaN(end) || start >= end) {
      this.loading = false;
      this.errorMessage = 'Invalid date range';
      return false;
    }

    const durationMs = end - start;
    const maxDurationMs = this.maxHistoryDays * 24 * 60 * 60 * 1000;

    if (durationMs > maxDurationMs + 60_000) {
      this.loading = false;
      this.errorMessage = 'Past Track supports a maximum of seven days';
      return false;
    }

    if (end > Date.now() + 60_000) {
      this.loading = false;
      this.errorMessage = 'The end time cannot be in the future';
      return false;
    }

    return true;
  }

  private normalizeTrackPoints(points: PastTrackPoint[]): PastTrackPoint[] {
    return (points || [])
      .filter((point: PastTrackPoint) => {
        return point && this.isValidNumber(point.lat) && this.isValidNumber(point.lng);
      })
      .sort((a: PastTrackPoint, b: PastTrackPoint) => {
        const timeA = this.parseDisplayTime(a.time);
        const timeB = this.parseDisplayTime(b.time);

        if (timeA === null || timeB === null) {
          return Number(a.no || 0) - Number(b.no || 0);
        }

        return timeA - timeB;
      })
      .map((point: PastTrackPoint, index: number) => ({
        ...point,
        no: index + 1,
        vesselId: point.vesselId || this.vesselId,
        time: point.time || '-',
        lat: this.toSafeNumber(point.lat),
        lng: this.toSafeNumber(point.lng),
        status: this.normalizeStatus(point.status),
        speed: this.toSafeNumber(point.speed),
        course: this.toSafeNumber(point.course),
        engine: point.engine || '-',
        fuelRate: this.toSafeNumber(point.fuelRate),
      }));
  }

  private buildFallbackSummary(points: PastTrackPoint[]): PastTrackSummary {
    const start = this.parseInputDate(this.startDate)?.getTime() ?? 0;
    const end = this.parseInputDate(this.endDate)?.getTime() ?? start;
    const expectedSlots = Math.max(
      0,
      Math.floor((end - start) / (this.samplingIntervalMinutes * 60_000)) + 1
    );

    return {
      vesselId: this.vesselId,
      vesselName: this.vesselId || 'Selected Vessel',
      vesselType: 'AHTS',
      imo: '-',
      mmsi: '-',
      status: points.length > 0 ? 'Available' : 'No Data',
      image: 'assets/images/vessel/notfound.png',
      totalDistance: 0,
      trackPoints: points.length,
      rawTrackPoints: points.length,
      samplingIntervalMinutes: this.samplingIntervalMinutes,
      expectedSlots,
      coveragePercent: expectedSlots > 0 ? Math.min(100, (points.length / expectedSlots) * 100) : 0,
      rangeStart: this.startDate,
      rangeEnd: this.endDate,
      avgSpeed: this.calculateAverageSpeed(points),
      totalTime: '-',
      lastUpdate: points.length > 0 ? points[points.length - 1].time : '-',
    };
  }

  private calculateAverageSpeed(points: PastTrackPoint[]): number {
    if (!points.length) {
      return 0;
    }

    const total = points.reduce((sum: number, point: PastTrackPoint) => {
      return sum + this.toSafeNumber(point.speed);
    }, 0);

    return Math.round((total / points.length) * 100) / 100;
  }

  private resolveBackendPrefix(idFromUrl: string): string {
    const storedVessel = this.getVesselFromStorage();
    const storedPrefix = this.readVesselPrefix(storedVessel);

    if (!idFromUrl) {
      return storedPrefix;
    }

    if (!storedVessel || !storedPrefix) {
      return idFromUrl;
    }

    const routeKey = this.normalizeVesselKey(idFromUrl);
    const candidates = [
      storedPrefix,
      storedVessel?.id,
      storedVessel?._id,
      storedVessel?.vesselId,
      storedVessel?.name,
      storedVessel?.fv?.id,
      storedVessel?.fv?.prefix,
      storedVessel?.fv?.name,
      storedVessel?.fvInfo?.id,
      storedVessel?.fvInfo?.prefix,
      storedVessel?.fvInfo?.name,
    ];

    const belongsToStoredVessel = candidates.some((value: unknown) => {
      return value && this.normalizeVesselKey(value) === routeKey;
    });

    return belongsToStoredVessel ? storedPrefix : idFromUrl;
  }

  private getVesselFromStorage(): any {
    const keys = ['pastTrackVessel', 'selectedVessel', 'realtimeVessel'];

    for (const key of keys) {
      try {
        const raw = localStorage.getItem(key);

        if (!raw) {
          continue;
        }

        return JSON.parse(raw);
      } catch {
        continue;
      }
    }

    return null;
  }

  private readVesselPrefix(vessel: any): string {
    return String(
      vessel?.prefix ||
        vessel?.fv?.prefix ||
        vessel?.fvInfo?.prefix ||
        vessel?.id ||
        vessel?._id ||
        vessel?.vesselId ||
        vessel?.fv?.id ||
        vessel?.fvInfo?.id ||
        vessel?.name ||
        ''
    ).trim();
  }

  private normalizeVesselKey(value: unknown): string {
    return String(value || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
  }

  private normalizePlaybackSpeed(speed: string): PlaybackSpeed {
    if (speed === '0.5x' || speed === '1x' || speed === '1.5x' || speed === '2x') {
      return speed;
    }

    return '1x';
  }

  private normalizeStatus(status: unknown): PastTrackStatus {
    if (status === 'Sailing' || status === 'Idle' || status === 'No Data') {
      return status;
    }

    return 'No Data';
  }

  private parseDisplayTime(value: string): number | null {
    const native = new Date(value).getTime();

    if (!Number.isNaN(native)) {
      return native;
    }

    const match = String(value || '').match(
      /^(\d{1,2})-([A-Za-z]{3})-(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/
    );

    if (!match) {
      return null;
    }

    const months: Record<string, number> = {
      JAN: 0,
      FEB: 1,
      MAR: 2,
      APR: 3,
      MAY: 4,
      JUN: 5,
      JUL: 6,
      AUG: 7,
      SEP: 8,
      OCT: 9,
      NOV: 10,
      DEC: 11,
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

  private formatRangeDateTime(value: string): string {
    const date = this.parseInputDate(value);

    if (!date) {
      return '-';
    }

    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  private parseInputDate(value: string): Date | null {
    if (!value) {
      return null;
    }

    const normalized = value.includes('T') ? value : value.replace(' ', 'T');
    const date = new Date(normalized);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  private toRequestDateTime(date: Date): string {
    return `${date.getFullYear()}-${this.pad(date.getMonth() + 1)}-${this.pad(
      date.getDate()
    )} ${this.pad(date.getHours())}:${this.pad(date.getMinutes())}:${this.pad(
      date.getSeconds()
    )}`;
  }

  private toDateTimeLocal(date: Date): string {
    return `${date.getFullYear()}-${this.pad(date.getMonth() + 1)}-${this.pad(
      date.getDate()
    )}T${this.pad(date.getHours())}:${this.pad(date.getMinutes())}`;
  }

  private getExportRangeName(): string {
    if (this.activeRangeMode === 'custom') {
      return 'custom-range';
    }

    return `${this.activeRangeMode}-day`;
  }

  private csvEscape(value: unknown): string {
    const text = String(value ?? '');

    if (text.includes(',') || text.includes('"') || text.includes('\n') || text.includes('\r')) {
      return `"${text.replace(/"/g, '""')}"`;
    }

    return text;
  }

  private toSafeFileName(value: string): string {
    return String(value || 'vessel')
      .trim()
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, '_');
  }

  private decodeValue(value: string): string {
    if (!value) {
      return '';
    }

    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  private pad(value: number): string {
    return value < 10 ? `0${value}` : String(value);
  }

  private isValidNumber(value: unknown): boolean {
    return Number.isFinite(Number(value));
  }

  private toSafeNumber(value: unknown): number {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  }
}
