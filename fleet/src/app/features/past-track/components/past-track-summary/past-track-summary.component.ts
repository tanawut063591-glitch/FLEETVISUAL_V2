import { Component, Input } from '@angular/core';
import { PastTrackSummary } from '../../models/past-track.model';

@Component({
    selector: 'app-past-track-summary',
    standalone: false,
    templateUrl: './past-track-summary.component.html',
    styleUrls: ['./past-track-summary.component.css']
})
export class PastTrackSummaryComponent {

    @Input() summary: PastTrackSummary | null = null;

    onImageError(event: Event): void {
        const img = event.target as HTMLImageElement | null;

        if (img) {
            img.style.display = 'none';
        }
    }
}
