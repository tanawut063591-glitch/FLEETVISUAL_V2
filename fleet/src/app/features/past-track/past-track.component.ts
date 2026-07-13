import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

import {
  PastTrackPoint,
  PastTrackSummary,
  PastTrackStatus,
  PastTrackResponse,
} from './models/past-track.model';

import { PastTrackService } from '../../shared/services/past-track.service';

type PlaybackSpeed = '0.5x' | '1x' | '1.5x' | '2x';

@Component({
  selector: 'app-past-track',
  standalone: false,
  templateUrl: './past-track.component.html',
  styleUrls: ['./past-track.component.css'],
})
export class PastTrackComponent implements OnInit, OnDestroy {
  readonly historyDays = 7;
  readonly samplingIntervalMinutes = 30;

  vesselId = '';
  startDate = '';
  endDate = '';

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
    this.setFixedSevenDayRange();

    this.routeSub = this.route.paramMap.subscribe((params) => {
      const idFromUrl = this.decodeValue(params.get('id') || '');
      this.vesselId = this.resolveBackendPrefix(idFromUrl);
      this.loadPastTrack(false);
    });
  }

  ngOnDestroy(): void {
    this.stopPlayback();
    this.routeSub?.unsubscribe();
    this.loadSub?.unsubscribe();
  }

  /** Refresh always reloads the latest seven calendar days. */
  refreshPastTrack(): void {
    this.setFixedSevenDayRange();
    this.loadPastTrack(false);
  }

  loadPastTrack(resetRange = false): void {
    if (resetRange) {
      this.setFixedSevenDayRange();
    }

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
      .getPastTrack(this.vesselId, this.startDate, this.endDate)
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
    return this.formatRangeDate(this.startDate);
  }

  getRangeEndLabel(): string {
    return this.formatRangeDate(this.endDate);
  }

  getSelectedTimeLabel(): string {
    return this.selectedPoint?.time || 'No point selected';
  }

  exportCsv(): void {
    if (!this.trackPoints.length) {
      console.warn('[PastTrackComponent] No past track data to export');
      return;
    }

    const headers = [
      'No',
      '30-minute slot',
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
    link.download = `past-track-7-days-${this.toSafeFileName(this.vesselId || 'vessel')}.csv`;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
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

  private setFixedSevenDayRange(): void {
    const end = new Date();
    const start = new Date(end);

    // Today plus the previous six calendar days = seven-day view.
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (this.historyDays - 1));

    this.startDate = this.toInputDate(start);
    this.endDate = this.toInputDate(end);
  }

  private validateDateRange(): boolean {
    const start = new Date(`${this.startDate}T00:00:00`).getTime();
    const end = new Date(`${this.endDate}T23:59:59`).getTime();

    if (Number.isNaN(start) || Number.isNaN(end) || start > end) {
      this.loading = false;
      this.errorMessage = 'Invalid seven-day date range';
      return false;
    }

    const calendarDays = Math.floor((end - start) / 86_400_000) + 1;

    if (calendarDays > this.historyDays) {
      this.loading = false;
      this.errorMessage = 'Past Track supports a maximum of seven calendar days';
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
      expectedSlots: this.historyDays * 48,
      coveragePercent: 0,
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

  private formatRangeDate(value: string): string {
    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
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

  private toInputDate(date: Date): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const mm = month < 10 ? '0' + month : String(month);
    const dd = day < 10 ? '0' + day : String(day);

    return `${year}-${mm}-${dd}`;
  }

  private isValidNumber(value: unknown): boolean {
    return Number.isFinite(Number(value));
  }

  private toSafeNumber(value: unknown): number {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  }
}
