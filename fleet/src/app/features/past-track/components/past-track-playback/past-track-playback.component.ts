import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PastTrackPoint } from '../../models/past-track.model';

interface PlaybackDateMarker {
  label: string;
  percent: number;
}

@Component({
  selector: 'app-past-track-playback',
  standalone: false,
  templateUrl: './past-track-playback.component.html',
  styleUrls: ['./past-track-playback.component.css'],
})
export class PastTrackPlaybackComponent {
  @Input() trackPoints: PastTrackPoint[] = [];
  @Input() selectedPoint: PastTrackPoint | null = null;
  @Input() isPlaying = false;
  @Input() playbackSpeed = '1x';
  @Input() rangeStart = '';
  @Input() rangeEnd = '';
  @Input() samplingIntervalMinutes = 30;

  @Output() previousClicked = new EventEmitter<void>();
  @Output() nextClicked = new EventEmitter<void>();
  @Output() playClicked = new EventEmitter<void>();
  @Output() speedChanged = new EventEmitter<string>();
  @Output() pointScrubbed = new EventEmitter<PastTrackPoint>();

  previous(): void { this.previousClicked.emit(); }
  next(): void { this.nextClicked.emit(); }
  play(): void { this.playClicked.emit(); }

  onSpeedSelect(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    if (target) { this.speedChanged.emit(target.value); }
  }

  onScrub(event: Event): void {
    if (!this.trackPoints.length) { return; }

    const target = event.target as HTMLInputElement | null;
    const requestedTime = Number(target?.value);

    if (!Number.isFinite(requestedTime)) { return; }

    const nearest = this.findNearestPoint(requestedTime);
    if (nearest) { this.pointScrubbed.emit(nearest); }
  }

  getSliderMin(): number {
    return this.parseDateBoundary(this.rangeStart, false) ?? this.getPointTime(this.trackPoints[0]);
  }

  getSliderMax(): number {
    const configuredEnd = this.parseDateBoundary(this.rangeEnd, true);
    const now = Date.now();
    const lastPoint = this.getPointTime(this.trackPoints[this.trackPoints.length - 1]);

    if (configuredEnd !== null) {
      return Math.max(this.getSliderMin(), Math.min(configuredEnd, now));
    }

    return Number.isFinite(lastPoint) ? lastPoint : now;
  }

  getSliderValue(): number {
    const value = this.getPointTime(this.selectedPoint);
    return Number.isFinite(value) ? value : this.getSliderMin();
  }

  getSliderStep(): number {
    return this.samplingIntervalMinutes * 60_000;
  }

  getProgressPercent(): number {
    const min = this.getSliderMin();
    const max = this.getSliderMax();
    const value = this.getSliderValue();

    if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) { return 0; }
    return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  }

  getSliderBackground(): string {
    const percent = this.getProgressPercent();
    return `linear-gradient(90deg, #2563eb 0%, #2563eb ${percent}%, #dbe7f5 ${percent}%, #dbe7f5 100%)`;
  }

  getCurrentTime(): string {
    return this.selectedPoint?.time || '--';
  }

  getStartTime(): string {
    return this.formatCompactTime(this.getSliderMin());
  }

  getEndTime(): string {
    return this.formatCompactTime(this.getSliderMax());
  }

  getDateMarkers(): PlaybackDateMarker[] {
    const min = this.getSliderMin();
    const max = this.getSliderMax();

    if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) { return []; }

    const start = new Date(min);
    start.setHours(0, 0, 0, 0);
    const result: PlaybackDateMarker[] = [];

    for (let index = 0; index < 7; index += 1) {
      const markerDate = new Date(start);
      markerDate.setDate(markerDate.getDate() + index);
      const timestamp = markerDate.getTime();

      if (timestamp > max + 60_000) { break; }

      result.push({
        label: markerDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        percent: Math.max(0, Math.min(100, ((timestamp - min) / (max - min)) * 100)),
      });
    }

    return result;
  }

  isAtStart(): boolean {
    return !this.selectedPoint || this.findPointIndex(this.selectedPoint) <= 0;
  }

  isAtEnd(): boolean {
    return !this.selectedPoint || this.findPointIndex(this.selectedPoint) >= this.trackPoints.length - 1;
  }

  trackMarker(index: number, marker: PlaybackDateMarker): string {
    return `${index}-${marker.label}`;
  }

  private findNearestPoint(timestamp: number): PastTrackPoint | null {
    let low = 0;
    let high = this.trackPoints.length - 1;

    while (low <= high) {
      const middle = Math.floor((low + high) / 2);
      const middleTime = this.getPointTime(this.trackPoints[middle]);

      if (middleTime === timestamp) { return this.trackPoints[middle]; }
      if (middleTime < timestamp) { low = middle + 1; } else { high = middle - 1; }
    }

    const candidates = [this.trackPoints[high], this.trackPoints[low]].filter(Boolean);
    return candidates.reduce<PastTrackPoint | null>((best, point) => {
      if (!best) { return point; }
      return Math.abs(this.getPointTime(point) - timestamp) < Math.abs(this.getPointTime(best) - timestamp)
        ? point
        : best;
    }, null);
  }

  private findPointIndex(point: PastTrackPoint): number {
    const index = this.trackPoints.findIndex((candidate) =>
      candidate === point || (candidate.no === point.no && candidate.time === point.time)
    );
    return index >= 0 ? index : 0;
  }

  private getPointTime(point: PastTrackPoint | null | undefined): number {
    if (!point?.time) { return Number.NaN; }
    return this.parseTrackTime(point.time) ?? Number.NaN;
  }

  private parseDateBoundary(value: string, endOfDay: boolean): number | null {
    if (!value) { return null; }
    const time = new Date(`${value}T${endOfDay ? '23:59:59' : '00:00:00'}`).getTime();
    return Number.isNaN(time) ? null : time;
  }

  private parseTrackTime(value: string): number | null {
    const nativeTime = new Date(value).getTime();
    if (!Number.isNaN(nativeTime)) { return nativeTime; }

    const match = value.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (!match) { return null; }

    const months: Record<string, number> = {
      JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
      JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
    };
    const month = months[match[2].toUpperCase()];
    if (month === undefined) { return null; }

    return new Date(
      Number(match[3]), month, Number(match[1]), Number(match[4]), Number(match[5]), Number(match[6] || 0)
    ).getTime();
  }

  private formatCompactTime(timestamp: number): string {
    if (!Number.isFinite(timestamp)) { return '--'; }
    return new Date(timestamp).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
    });
  }
}
