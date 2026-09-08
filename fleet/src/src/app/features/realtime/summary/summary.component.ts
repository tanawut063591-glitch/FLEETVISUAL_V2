import { Component, Input } from '@angular/core';

import { TooltipFormatService } from '../../../shared/services/tooltip-format.service';
import { CoordinatesService } from '../../../shared/services/coordinate.service';

interface RealtimeValue {
  value?: string | number | null;
  timestamp?: string | Date | null;
  tagName?: string;
  name?: string;
  cal?: boolean;
}

type SummaryInput = RealtimeValue | number | string | null | undefined;

@Component({
  selector: 'app-summary',
  standalone: false,
  templateUrl: './summary.component.html',
  styleUrls: ['./summary.component.css'],
})
export class SummaryComponent {

  @Input() speedCurr: SummaryInput = null;
  @Input() speedAvg: SummaryInput = null;
  @Input() speedMax: SummaryInput = null;


  @Input() lat: SummaryInput = null;
  @Input() long: SummaryInput = null;
  @Input() heading: SummaryInput = null;
  @Input() distance: SummaryInput = null;


  @Input() fuel_cons: SummaryInput = null;
  @Input() fuelAvg: SummaryInput = null;
  @Input() fuelTotal: SummaryInput = null;

  constructor(
    public tooltipFormatService: TooltipFormatService,
    public coordinatesService: CoordinatesService
  ) {}




  linkToMap(): void {
    const latitude = this.getValue(this.lat);
    const longitude = this.getValue(this.long);

    if (!this.isValidCoordinate(latitude) || !this.isValidCoordinate(longitude)) {
      console.warn('[SummaryComponent] Invalid coordinate:', {
        latitude,
        longitude,
      });
      return;
    }

    window.open(
      `https://www.google.com/maps/?q=${latitude},${longitude}`,
      '_blank',
      'noopener,noreferrer'
    );
  }




  getValue(input: SummaryInput): string | number | null {
    if (input === null || input === undefined) {
      return null;
    }

    if (typeof input === 'object') {
      return input.value ?? null;
    }

    return input;
  }




  getTagName(input: SummaryInput): string {
    if (!input || typeof input !== 'object') {
      return '';
    }

    return input.tagName || input.name || '';
  }





  getTimestamp(input: SummaryInput): string {
    if (!input || typeof input !== 'object') {
      return '';
    }

    const timestamp = input.timestamp;

    if (!timestamp) {
      return '';
    }

    if (timestamp instanceof Date) {
      return timestamp.toISOString();
    }

    return String(timestamp);
  }




  getTooltip(input: SummaryInput): string {
    return this.tooltipFormatService.getTooltip(
      this.getTagName(input),
      this.getTimestamp(input)
    );
  }




  displayValue(input: SummaryInput, fallback = '0'): string {
    const value = this.getValue(input);

    if (value === null || value === undefined || value === '') {
      return fallback;
    }

    return String(value);
  }




  displayNumber(input: SummaryInput, digits = 2, fallback = '0.00'): string {
    const value = Number(this.getValue(input));

    if (!Number.isFinite(value)) {
      return fallback;
    }

    return value.toFixed(digits);
  }




  displayCoordinate(input: SummaryInput, digits = 6): string {
    const value = Number(this.getValue(input));

    if (!Number.isFinite(value)) {
      return '-';
    }

    return value.toFixed(digits);
  }




  private isValidCoordinate(value: string | number | null): boolean {
    if (value === null || value === undefined || value === '') {
      return false;
    }

    return Number.isFinite(Number(value));
  }
}