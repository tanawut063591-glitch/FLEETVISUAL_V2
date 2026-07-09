import {
  Component,
  Input,
  ChangeDetectionStrategy,
  OnChanges,
  SimpleChanges,
} from '@angular/core';

import { TooltipFormatService } from '../../../shared/services/tooltip-format.service';

interface RealtimeValue {
  value?: string | number | null;
  timestamp?: string | Date | null;
  tagName?: string;
  name?: string;
  cal?: boolean;
}

type EngineInput = RealtimeValue | number | string | null | undefined;

@Component({
  selector: 'app-main-engine-electric',
  standalone: false,
  templateUrl: './main-engine-electric.component.html',
  styleUrls: ['./main-engine-electric.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainEngineElectricComponent implements OnChanges {
  // Fuel supply
  @Input() flow_supply: EngineInput = null;
  @Input() temp_supply: EngineInput = null;
  @Input() dens_supply: EngineInput = null;

  // Fuel return
  @Input() flow_return: EngineInput = null;
  @Input() temp_return: EngineInput = null;
  @Input() dens_return: EngineInput = null;

  // Consumption
  @Input() cons: EngineInput = null;
  @Input() consL: EngineInput = null;

  // Speed
  @Input() speed_eng: EngineInput = null;
  @Input() speed_gear: EngineInput = null;

  displayTempSupply = '';
  displayTempReturn = '';

  constructor(public tooltipFormatService: TooltipFormatService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['temp_supply']) {
      this.displayTempSupply = this.changeTemp(
        this.getValue(this.temp_supply),
        this.getTagName(this.temp_supply)
      );
    }

    if (changes['temp_return']) {
      this.displayTempReturn = this.changeTemp(
        this.getValue(this.temp_return),
        this.getTagName(this.temp_return)
      );
    }
  }

  getValue(input: EngineInput): string {
    if (input === null || input === undefined) {
      return '';
    }

    if (typeof input === 'object') {
      const value = input.value;

      if (value === null || value === undefined) {
        return '';
      }

      return String(value);
    }

    return String(input);
  }

  getTagName(input: EngineInput): string {
    if (!input || typeof input !== 'object') {
      return '';
    }

    return input.tagName || input.name || '';
  }

  getTimestamp(input: EngineInput): string {
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

  getTooltip(input: EngineInput): string {
    return this.tooltipFormatService.getTooltip(
      this.getTagName(input),
      this.getTimestamp(input)
    );
  }

  displayNumber(input: EngineInput, digits = 1, fallback = '0'): string {
    const value = Number(this.getValue(input));

    if (!Number.isFinite(value)) {
      return fallback;
    }

    return value.toFixed(digits);
  }

  displayAbsNumber(input: EngineInput, digits = 1, fallback = '0'): string {
    const value = Math.abs(Number(this.getValue(input)));

    if (!Number.isFinite(value)) {
      return fallback;
    }

    return value.toFixed(digits);
  }

  changeTemp(value: string, tagName: string): string {
    if (!value) {
      return '';
    }

    if (tagName && tagName.startsWith('A01')) {
      const numberValue = Number(value);

      if (Number.isFinite(numberValue)) {
        return (numberValue - 272.15).toFixed(2);
      }
    }

    return value;
  }
}