import { Component, Input, OnChanges, OnInit, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { FvTimeService } from '../../../shared/services/fv-time.service';
import { CoordinatesService } from '../../../shared/services/coordinate.service';

@Component({
  selector: 'app-summary-overview-card',
  standalone: false,
  templateUrl: './summary-overview-card.component.html',
  styleUrls: ['./summary-overview-card.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SummaryOverviewCardComponent implements OnInit, OnChanges {
  @Input() data: any[] = [];

  constructor(
    public fvTimeService: FvTimeService,
    public coordinatesService: CoordinatesService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {}

  ngOnInit(): void {}

  getLastSeen(timestamp: any): string {
    if (!timestamp) {
      return '-';
    }

    try {
      return this.fvTimeService.getLastSeenFromString(String(timestamp)) || '-';
    } catch {
      return '-';
    }
  }

  getLat(value: any): string {
    try {
      return this.coordinatesService.getLat(String(value ?? '')) || '-';
    } catch {
      return '-';
    }
  }

  getLong(value: any): string {
    try {
      return this.coordinatesService.getLong(String(value ?? '')) || '-';
    } catch {
      return '-';
    }
  }
}
