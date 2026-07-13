import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { PastTrackPoint } from '../../models/past-track.model';

@Component({
  selector: 'app-past-track-timeline',
  standalone: false,
  templateUrl: './past-track-timeline.component.html',
  styleUrls: ['./past-track-timeline.component.css'],
})
export class PastTrackTimelineComponent implements OnChanges {
  @ViewChild('tableWrap') tableWrap?: ElementRef<HTMLDivElement>;

  @Input() trackPoints: PastTrackPoint[] = [];
  @Input() selectedPoint: PastTrackPoint | null = null;
  @Output() pointSelected = new EventEmitter<PastTrackPoint>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedPoint'] && this.selectedPoint) {
      requestAnimationFrame(() => this.scrollSelectedRowIntoView());
    }
  }

  selectPoint(point: PastTrackPoint): void { this.pointSelected.emit(point); }
  isSelected(point: PastTrackPoint): boolean { return !!this.selectedPoint && this.selectedPoint.no === point.no; }
  trackPoint(index: number, point: PastTrackPoint): string { return `${point.no}-${point.time}-${index}`; }

  formatLat(lat: number): string {
    return Math.abs(Number(lat) || 0).toFixed(5) + (Number(lat) >= 0 ? ' N' : ' S');
  }

  formatLng(lng: number): string {
    return Math.abs(Number(lng) || 0).toFixed(5) + (Number(lng) >= 0 ? ' E' : ' W');
  }

  getStatusClass(point: PastTrackPoint): Record<string, boolean> {
    return {
      sailing: point.status === 'Sailing',
      idle: point.status === 'Idle',
      nodata: point.status === 'No Data',
    };
  }

  private scrollSelectedRowIntoView(): void {
    const container = this.tableWrap?.nativeElement;
    const row = container?.querySelector<HTMLElement>(`[data-point-no="${this.selectedPoint?.no}"]`);
    row?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}
