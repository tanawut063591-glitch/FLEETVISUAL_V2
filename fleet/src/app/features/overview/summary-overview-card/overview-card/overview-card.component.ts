import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { FvTimeService } from '../../../../shared/services/fv-time.service';

@Component({
  selector: 'app-overview-card',
    standalone: false,
  templateUrl: './overview-card.component.html',
  styleUrls: ['./overview-card.component.css'],

  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OverviewCardComponent {




  @Input() lastSeen?: any;
  @Input() speed?: number;
  @Input() vesselName?: string;
  @Input() vesselDesc?: string;
  @Input() distance?: number;
  @Input() lat?: number;
  @Input() long?: number;
  @Input() fuelCons?: number;
  @Input() id?: string | number;
  @Input() image?: string;
  @Input() prefix?: string;

  constructor(public fvTimeService: FvTimeService) { }


}