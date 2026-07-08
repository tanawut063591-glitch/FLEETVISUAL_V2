import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

import {
  PastTrackPoint,
  PastTrackSummary,
  PastTrackStatus,
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
    private route: ActivatedRoute,
    private pastTrackService: PastTrackService
  ) {}

  ngOnInit(): void {
    this.setDefaultDateRange();

    this.routeSub = this.route.paramMap.subscribe((params) => {
      const idFromUrl = params.get('id') || '';

      this.vesselId = this.decodeValue(idFromUrl) || this.getVesselIdFromStorage();
      this.loadPastTrack();
    });
  }

  ngOnDestroy(): void {
    this.stopPlayback();
    this.routeSub?.unsubscribe();
    this.loadSub?.unsubscribe();
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
      this.errorMessage = 'Please select vessel before loading past track data';
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
        next: (response: any) => {
          const points = this.normalizeTrackPoints(response?.points || []);

          this.trackPoints = points;
          this.summary = response?.summary || this.buildFallbackSummary(points);
          this.selectedPoint = points.length > 0 ? points[0] : null;
          this.loading = false;
        },
        error: (error: any) => {
          console.error('[PastTrackComponent] loadPastTrack error:', error);

          this.summary = null;
          this.trackPoints = [];
          this.selectedPoint = null;
          this.errorMessage = 'Cannot load past track data';
          this.loading = false;
        },
      });
  }

  clearDateFilter(): void {
    this.setDefaultDateRange();
    this.loadPastTrack();
  }

  selectPoint(point: PastTrackPoint | null): void {
    if (!point) {
      return;
    }

    this.selectedPoint = point;
  }

  previousPoint(): void {
    if (this.trackPoints.length === 0) {
      return;
    }

    if (!this.selectedPoint) {
      this.selectedPoint = this.trackPoints[0];
      return;
    }

    const index = this.findSelectedIndex();

    if (index > 0) {
      this.selectedPoint = this.trackPoints[index - 1];
    }
  }

  nextPoint(): void {
    if (this.trackPoints.length === 0) {
      this.stopPlayback();
      return;
    }

    if (!this.selectedPoint) {
      this.selectedPoint = this.trackPoints[0];
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

  exportCsv(): void {
    if (!this.trackPoints.length) {
      console.warn('[PastTrackComponent] No past track data to export');
      return;
    }

    const headers = [
      'No',
      'Time',
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
    link.download = `past-track-${this.toSafeFileName(this.vesselId || 'vessel')}.csv`;
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

    if (!this.selectedPoint) {
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

  private setDefaultDateRange(): void {
    const end = new Date();
    const start = new Date();

    start.setDate(end.getDate() - 365);

    this.startDate = this.toInputDate(start);
    this.endDate = this.toInputDate(end);
  }

  private validateDateRange(): boolean {
    if (!this.startDate || !this.endDate) {
      this.loading = false;
      this.errorMessage = 'Please select start date and end date';
      return false;
    }

    const start = new Date(this.startDate).getTime();
    const end = new Date(this.endDate).getTime();

    if (Number.isNaN(start) || Number.isNaN(end)) {
      this.loading = false;
      this.errorMessage = 'Invalid date range';
      return false;
    }

    if (start > end) {
      this.loading = false;
      this.errorMessage = 'Start date must be before end date';
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
        const timeA = new Date(a.time).getTime();
        const timeB = new Date(b.time).getTime();

        if (Number.isNaN(timeA) || Number.isNaN(timeB)) {
          return Number(a.no || 0) - Number(b.no || 0);
        }

        return timeA - timeB;
      })
      .map((point: PastTrackPoint, index: number) => {
        return {
          ...point,
          no: point.no || index + 1,
          vesselId: point.vesselId || this.vesselId,
          time: point.time || '-',
          lat: this.toSafeNumber(point.lat),
          lng: this.toSafeNumber(point.lng),
          status: this.normalizeStatus(point.status),
          speed: this.toSafeNumber(point.speed),
          course: this.toSafeNumber(point.course),
          engine: point.engine || '-',
          fuelRate: this.toSafeNumber(point.fuelRate),
        };
      });
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

  private getVesselIdFromStorage(): string {
    const keys = ['pastTrackVessel', 'selectedVessel', 'realtimeVessel'];

    for (const key of keys) {
      try {
        const raw = localStorage.getItem(key);

        if (!raw) {
          continue;
        }

        const vessel = JSON.parse(raw);
        const id = vessel?.id || vessel?._id || vessel?.prefix || vessel?.name || vessel?.vesselId || '';

        if (id) {
          return String(id);
        }
      } catch {
        continue;
      }
    }

    return '';
  }

  private normalizePlaybackSpeed(speed: string): PlaybackSpeed {
    if (speed === '0.5x' || speed === '1x' || speed === '1.5x' || speed === '2x') {
      return speed;
    }

    return '1x';
  }

  private normalizeStatus(status: any): PastTrackStatus {
    if (status === 'Sailing' || status === 'Idle' || status === 'No Data') {
      return status;
    }

    return 'No Data';
  }

  private csvEscape(value: any): string {
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

  private isValidNumber(value: any): boolean {
    return !Number.isNaN(Number(value));
  }

  private toSafeNumber(value: any): number {
    const num = Number(value);

    return Number.isNaN(num) ? 0 : num;
  }
}
