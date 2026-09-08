import {
  Component,
  Input,
  ChangeDetectionStrategy,
  OnChanges,
  SimpleChanges,
} from '@angular/core';

import { TooltipFormatService } from '../../../shared/services/tooltip-format.service';
import { AlertRecord } from '../../../shared/models/alert.model';
import { hasRealtimeTagAlarm } from '../realtime-alarm.util';

interface RealtimeValue {
  value?: string | number | null;
  timestamp?: string | Date | null;
  tagName?: string;
  name?: string;
  cal?: boolean;
}

type AuxEngineInput = RealtimeValue | number | string | null | undefined;

@Component({
  selector: 'app-aux-engine',
  standalone: false,
  templateUrl: './aux-engine.component.html',
  styleUrls: ['./aux-engine.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuxEngineComponent implements OnChanges {
  @Input() activeAlerts: readonly AlertRecord[] = [];


  @Input() flow_supply: AuxEngineInput = null;
  @Input() temp_supply: AuxEngineInput = null;
  @Input() dens_supply: AuxEngineInput = null;


  @Input() flow_return: AuxEngineInput = null;
  @Input() temp_return: AuxEngineInput = null;
  @Input() dens_return: AuxEngineInput = null;


  @Input() cons: AuxEngineInput = null;
  @Input() consL: AuxEngineInput = null;


  @Input() speed_eng: AuxEngineInput = null;


  displayTempSupply = '';
  displayTempReturn = '';
  isRunning = false;
  statusText = 'Stopped';

  constructor(public tooltipFormatService: TooltipFormatService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['speed_eng']) {
      const speed = Number(this.getValue(this.speed_eng));
      this.isRunning = Number.isFinite(speed) && speed > 0;
      this.statusText = this.isRunning ? 'Running' : 'Stopped';
    }

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




  getValue(input: AuxEngineInput): string {
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




  getTagName(input: AuxEngineInput): string {
    if (!input || typeof input !== 'object') {
      return '';
    }

    return input.tagName || input.name || '';
  }




  getTimestamp(input: AuxEngineInput): string {
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




  getTooltip(input: AuxEngineInput): string {
    return this.tooltipFormatService.getTooltip(
      this.getTagName(input),
      this.getTimestamp(input)
    );
  }




  displayNumber(
    input: AuxEngineInput,
    digits: number = 2,
    fallback: string = '0.00'
  ): string {
    const value = Number(this.getValue(input));

    if (!Number.isFinite(value)) {
      return fallback;
    }

    return value.toFixed(digits);
  }




  displayAbsNumber(
    input: AuxEngineInput,
    digits: number = 2,
    fallback: string = '0.00'
  ): string {
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

    const numberValue = Number(value);

    if (!Number.isFinite(numberValue)) {
      return value;
    }

    const normalizedValue =
      tagName && tagName.startsWith('A01')
        ? numberValue - 272.15
        : numberValue;

    return normalizedValue.toFixed(2);
  }


  hasAlarm(input: AuxEngineInput, ...fallbackTags: string[]): boolean {
    return hasRealtimeTagAlarm(this.activeAlerts, input, ...fallbackTags);
  }

  hasAnyAlarm(): boolean {
    return [
      this.flow_supply,
      this.temp_supply,
      this.dens_supply,
      this.flow_return,
      this.temp_return,
      this.dens_return,
      this.cons,
      this.consL,
      this.speed_eng,
    ].some((input) => hasRealtimeTagAlarm(this.activeAlerts, input));
  }
}