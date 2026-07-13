import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PastTrackPoint } from '../../models/past-track.model';

@Component({
    selector: 'app-past-track-playback',
    standalone: false,
    templateUrl: './past-track-playback.component.html',
    styleUrls: ['./past-track-playback.component.css']
})
export class PastTrackPlaybackComponent {

    @Input() trackPoints: PastTrackPoint[] = [];
    @Input() selectedPoint: PastTrackPoint | null = null;
    @Input() isPlaying: boolean = false;
    @Input() playbackSpeed: string = '1x';

    @Output() previousClicked = new EventEmitter<void>();
    @Output() nextClicked = new EventEmitter<void>();
    @Output() playClicked = new EventEmitter<void>();
    @Output() speedChanged = new EventEmitter<string>();

    previous(): void {
        this.previousClicked.emit();
    }

    next(): void {
        this.nextClicked.emit();
    }

    play(): void {
        this.playClicked.emit();
    }

    onSpeedSelect(event: Event): void {
        const target = event.target as HTMLSelectElement | null;

        if (target) {
            this.speedChanged.emit(target.value);
        }
    }

    getProgressPercent(): number {
        if (!this.selectedPoint || !this.trackPoints || this.trackPoints.length <= 1) {
            return 0;
        }

        var index = 0;

        for (var i = 0; i < this.trackPoints.length; i++) {
            if (this.trackPoints[i].no === this.selectedPoint.no) {
                index = i;
                break;
            }
        }

        return (index / (this.trackPoints.length - 1)) * 100;
    }

    getStartTime(): string {
        if (!this.trackPoints || this.trackPoints.length === 0) {
            return '--:--';
        }

        return this.trackPoints[0].time;
    }

    getEndTime(): string {
        if (!this.trackPoints || this.trackPoints.length === 0) {
            return '--:--';
        }

        return this.trackPoints[this.trackPoints.length - 1].time;
    }
}
