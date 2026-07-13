import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PastTrackPoint } from '../../models/past-track.model';

@Component({
    selector: 'app-past-track-timeline',
    standalone: false,
    templateUrl: './past-track-timeline.component.html',
    styleUrls: ['./past-track-timeline.component.css']
})
export class PastTrackTimelineComponent {

    @Input() trackPoints: PastTrackPoint[] = [];
    @Input() selectedPoint: PastTrackPoint | null = null;

    @Output() pointSelected = new EventEmitter<PastTrackPoint>();

    selectPoint(point: PastTrackPoint): void {
        this.pointSelected.emit(point);
    }

    isSelected(point: PastTrackPoint): boolean {
        return !!this.selectedPoint && this.selectedPoint.no === point.no;
    }

    formatLat(lat: number): string {
        return Math.abs(Number(lat) || 0).toFixed(5) + (Number(lat) >= 0 ? ' N' : ' S');
    }

    formatLng(lng: number): string {
        return Math.abs(Number(lng) || 0).toFixed(5) + (Number(lng) >= 0 ? ' E' : ' W');
    }

    getStatusClass(point: PastTrackPoint): any {
        return {
            sailing: point.status === 'Sailing',
            idle: point.status === 'Idle',
            nodata: point.status === 'No Data'
        };
    }
}
