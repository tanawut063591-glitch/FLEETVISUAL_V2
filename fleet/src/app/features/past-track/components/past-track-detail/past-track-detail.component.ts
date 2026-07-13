import { Component, Input } from '@angular/core';
import { PastTrackPoint } from '../../models/past-track.model';

@Component({
    selector: 'app-past-track-detail',
    standalone: false,
    templateUrl: './past-track-detail.component.html',
    styleUrls: ['./past-track-detail.component.css']
})
export class PastTrackDetailComponent {

    @Input() point: PastTrackPoint | null = null;

    formatLat(lat: number): string {
        return Math.abs(Number(lat) || 0).toFixed(5) + (Number(lat) >= 0 ? ' N' : ' S');
    }

    formatLng(lng: number): string {
        return Math.abs(Number(lng) || 0).toFixed(5) + (Number(lng) >= 0 ? ' E' : ' W');
    }

    getStatusClass(): any {
        return {
            sailing: this.point && this.point.status === 'Sailing',
            idle: this.point && this.point.status === 'Idle',
            nodata: this.point && this.point.status === 'No Data'
        };
    }
}
