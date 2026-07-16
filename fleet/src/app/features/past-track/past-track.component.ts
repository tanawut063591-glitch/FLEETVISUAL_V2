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

type PlaybackSpeed = '0.5x' | '1x' | '1.5x' | '2x';
type RangeMode = 1 | 3 | 7 | 'custom';

interface HistoryPreset {
  days: 1 | 3 | 7;
  label: string;
  intervalMinutes: number;
  checkpointMinutes: number;
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
  readonly maxHistoryDays = 7;
  readonly historyPresets: HistoryPreset[] = [
    { days: 1, label: '1 Day', intervalMinutes: 10, checkpointMinutes: 60 },
    { days: 3, label: '3 Days', intervalMinutes: 30, checkpointMinutes: 180 },
    { days: 7, label: '7 Days', intervalMinutes: 60, checkpointMinutes: 600 },
  ];

  vesselId = '';
  startDate = '';
  endDate = '';
  customStartDate = '';
  customEndDate = '';
  maxDateTime = '';

  activeRangeMode: RangeMode = 1;
  samplingIntervalMinutes = 10;
  checkpointIntervalMinutes = 60;
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
      const html2canvasModule = await import('html2canvas/dist/html2canvas.esm.js');
      const html2canvas = html2canvasModule.default;
      const canvas = await html2canvas(this.routeMapExport.nativeElement, {
        backgroundColor: '#eaf4fb',
        scale: Math.min(2, window.devicePixelRatio || 1.5),
        useCORS: true,
        allowTaint: false,
        logging: false,
        imageTimeout: 7000,
      });

      if (!canvas.width || !canvas.height) {
        throw new Error('Map capture returned an empty canvas');
      }

      this.downloadCanvas(canvas, this.getMapExportFileName());
    } catch (error) {
      console.warn('[PastTrackComponent] Google map capture unavailable. Using vector fallback.', error);
      const fallback = this.buildVectorMapCanvas();
      this.downloadCanvas(fallback, this.getMapExportFileName());
    } finally {
      this.exportingMap = false;
    }
  }

  private buildVectorMapCanvas(): HTMLCanvasElement {
    const width = 1600;
    const height = 920;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return canvas;
    }

    ctx.fillStyle = '#eaf6fb';
    ctx.fillRect(0, 0, width, height);

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#dff3fb');
    gradient.addColorStop(1, '#bfe6f4');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 110, width, height - 110);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, 110);
    ctx.fillStyle = '#0f2344';
    ctx.font = '700 32px Segoe UI, Arial';
    ctx.fillText(`${this.summary?.vesselName || this.vesselId} · PAST TRACK`, 46, 48);
    ctx.fillStyle = '#60708a';
    ctx.font = '600 18px Segoe UI, Arial';
    ctx.fillText(`${this.getRangeStartLabel()}  →  ${this.getRangeEndLabel()}   ·   Every ${this.samplingIntervalMinutes} min`, 46, 82);

    const valid = this.trackPoints.filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
    if (valid.length === 0) {
      return canvas;
    }

    const latitudes = valid.map((point) => point.lat);
    const longitudes = valid.map((point) => point.lng);
    let minLat = Math.min(...latitudes);
    let maxLat = Math.max(...latitudes);
    let minLng = Math.min(...longitudes);
    let maxLng = Math.max(...longitudes);

    if (minLat === maxLat) { minLat -= 0.01; maxLat += 0.01; }
    if (minLng === maxLng) { minLng -= 0.01; maxLng += 0.01; }

    const padX = 90;
    const padTop = 170;
    const padBottom = 80;
    const plotWidth = width - padX * 2;
    const plotHeight = height - padTop - padBottom;
    const project = (point: PastTrackPoint) => ({
      x: padX + ((point.lng - minLng) / (maxLng - minLng)) * plotWidth,
      y: padTop + (1 - (point.lat - minLat) / (maxLat - minLat)) * plotHeight,
    });

    ctx.strokeStyle = 'rgba(70, 126, 158, 0.20)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 8; i += 1) {
      const x = padX + (plotWidth / 8) * i;
      const y = padTop + (plotHeight / 8) * i;
      ctx.beginPath(); ctx.moveTo(x, padTop); ctx.lineTo(x, padTop + plotHeight); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(padX, y); ctx.lineTo(padX + plotWidth, y); ctx.stroke();
    }

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = 7;
    for (let i = 1; i < valid.length; i += 1) {
      const a = project(valid[i - 1]);
      const b = project(valid[i]);
      ctx.strokeStyle = valid[i].status === 'Idle' ? '#f59e0b' : valid[i].status === 'No Data' ? '#94a3b8' : '#12ad71';
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    const drawMarker = (point: PastTrackPoint, label: string, color: string) => {
      const pos = project(point);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(pos.x, pos.y, 18, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(pos.x, pos.y, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 15px Segoe UI, Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, pos.x, pos.y + 1);
    };

    drawMarker(valid[0], 'S', '#12ad71');
    drawMarker(valid[valid.length - 1], 'E', '#ef4455');

    if (this.selectedPoint) {
      drawMarker(this.selectedPoint, '•', '#2563eb');
    }

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillRect(45, height - 58, width - 90, 38);
    ctx.fillStyle = '#38506b';
    ctx.font = '600 15px Segoe UI, Arial';
    ctx.fillText('Vector route export is used when browser security blocks Google map tiles. Route coordinates are preserved.', 62, height - 33);

    return canvas;
  }

  private downloadCanvas(canvas: HTMLCanvasElement, filename: string): void {
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    }, 'image/png', 1);
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
    this.checkpointIntervalMinutes = preset?.checkpointMinutes || 600;
  }

  private applyAutomaticResolution(durationMs: number): void {
    const oneDayMs = 24 * 60 * 60 * 1000;

    if (durationMs <= oneDayMs) {
      this.samplingIntervalMinutes = 10;
      this.checkpointIntervalMinutes = 60;
      return;
    }

    if (durationMs <= 3 * oneDayMs) {
      this.samplingIntervalMinutes = 30;
      this.checkpointIntervalMinutes = 180;
      return;
    }

    this.samplingIntervalMinutes = 60;
    this.checkpointIntervalMinutes = 600;
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
