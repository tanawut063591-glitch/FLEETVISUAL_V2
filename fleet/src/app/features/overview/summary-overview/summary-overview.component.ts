import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { FvTimeService } from '../../../shared/services/fv-time.service';
import { CoordinatesService } from '../../../shared/services/coordinate.service';
import { Animations } from './summary-overview.animations';

@Component({
    selector: 'app-summary-overview',
    standalone: false,
    templateUrl: './summary-overview.component.html',
    styleUrls: ['./summary-overview.component.css'],
    animations: [
        Animations.listAnimation
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SummaryOverviewComponent {

    @Input() data: any[] = [];
    @Input() blankData: any[] = [];
    @Input() selectedVessel: any = null;

    @Output() vesselSelected = new EventEmitter<any>();

    constructor(
        public fvTimeService: FvTimeService,
        public coordinatesService: CoordinatesService
    ) { }

    onRowClick(vessel: any) {
        if (vessel) {
            this.vesselSelected.emit(vessel);
        }
    }
}