import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';

import { PastTrackPoint } from '../../models/past-track.model';

@Component({
  selector: 'app-past-track-timeline',
  standalone: false,
  templateUrl: './past-track-timeline.component.html',
  styleUrls: ['./past-track-timeline.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PastTrackTimelineComponent implements OnChanges {
  @ViewChild(CdkVirtualScrollViewport) viewport?: CdkVirtualScrollViewport;

  @Input() trackPoints: PastTrackPoint[] = [];
  @Input() selectedPoint: PastTrackPoint | null = null;
  @Input() samplingIntervalMinutes = 30;
  @Input() checkpointIntervalMinutes = 60;

  @Output() pointSelected = new EventEmitter<PastTrackPoint>();
  @Output() focusRequested = new EventEmitter<PastTrackPoint>();

  readonly rowHeight = 54;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedPoint'] && this.selectedPoint) {
      requestAnimationFrame(() => this.scrollSelectedRowIntoView('auto'));
    }

    if (changes['trackPoints']) {
      requestAnimationFrame(() => this.viewport?.checkViewportSize());
    }
  }

  selectPoint(point: PastTrackPoint): void {
    this.pointSelected.emit(point);
  }

  viewOnMap(point: PastTrackPoint, event?: Event): void {
    event?.stopPropagation();
    this.pointSelected.emit(point);
    this.focusRequested.emit(point);
  }

  scrollToSelected(): void {
    this.scrollSelectedRowIntoView('smooth');
  }

  scrollToStart(): void {
    this.viewport?.scrollToIndex(0, 'smooth');
  }

  scrollToEnd(): void {
    if (!this.trackPoints.length) {
      return;
    }

    this.viewport?.scrollToIndex(this.trackPoints.length - 1, 'smooth');
  }

  isSelected(point: PastTrackPoint): boolean {
    return !!this.selectedPoint && this.selectedPoint.no === point.no;
  }

  isCheckpoint(index: number): boolean {
    if (!this.trackPoints.length) {
      return false;
    }

    if (index === 0 || index === this.trackPoints.length - 1) {
      return true;
    }

    const every = this.getCheckpointStep();
    return every > 0 && index % every === 0;
  }

  getCheckpointText(index: number): string {
    if (index === 0) {
      return 'Start';
    }

    if (index === this.trackPoints.length - 1) {
      return 'End';
    }

    return 'Checkpoint';
  }

  getSelectedPositionLabel(): string {
    if (!this.selectedPoint || !this.trackPoints.length) {
      return 'No point selected';
    }

    const index = this.findSelectedIndex();
    return index >= 0
      ? `Point ${index + 1} of ${this.trackPoints.length}`
      : 'No point selected';
  }

  trackPoint(index: number, point: PastTrackPoint): string {
    return `${point.no}-${point.time}-${index}`;
  }

  formatLat(lat: number): string {
    return `${Math.abs(Number(lat) || 0).toFixed(5)}${Number(lat) >= 0 ? ' N' : ' S'}`;
  }

  formatLng(lng: number): string {
    return `${Math.abs(Number(lng) || 0).toFixed(5)}${Number(lng) >= 0 ? ' E' : ' W'}`;
  }

  formatNumber(value: number, digits = 2): string {
    const number = Number(value);
    return Number.isFinite(number) ? number.toFixed(digits) : '0.00';
  }

  getStatusClass(point: PastTrackPoint): Record<string, boolean> {
    return {
      sailing: point.status === 'Sailing',
      idle: point.status === 'Idle',
      nodata: point.status === 'No Data',
    };
  }

  private getCheckpointStep(): number {
    const sample = Math.max(1, Number(this.samplingIntervalMinutes) || 1);
    const checkpoint = Math.max(sample, Number(this.checkpointIntervalMinutes) || sample);
    return Math.max(1, Math.round(checkpoint / sample));
  }

  private findSelectedIndex(): number {
    if (!this.selectedPoint) {
      return -1;
    }

    return this.trackPoints.findIndex(
      (point) => point.no === this.selectedPoint?.no && point.time === this.selectedPoint?.time
    );
  }

  private scrollSelectedRowIntoView(behavior: ScrollBehavior): void {
    const index = this.findSelectedIndex();
    const viewport = this.viewport;

    if (index < 0 || !viewport) {
      return;
    }

    const viewportHeight = viewport.getViewportSize() || 360;
    const centeredOffset = Math.max(0, index * this.rowHeight - viewportHeight / 2 + this.rowHeight / 2);
    viewport.scrollToOffset(centeredOffset, behavior);
  }
}
