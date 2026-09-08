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

type EngineInput = RealtimeValue | number | string | null | undefined;

@Component({
  selector: 'app-main-engine',
  standalone: false,
  templateUrl: './main-engine.component.html',
  styleUrls: ['./main-engine.component.css'],


  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainEngineComponent implements OnChanges {
  @Input() activeAlerts: readonly AlertRecord[] = [];


  @Input() flow_supply: EngineInput = null;
  @Input() temp_supply: EngineInput = null;
  @Input() dens_supply: EngineInput = null;


  @Input() flow_return: EngineInput = null;
  @Input() temp_return: EngineInput = null;
  @Input() dens_return: EngineInput = null;


  @Input() cons: EngineInput = null;
  @Input() consL: EngineInput = null;


  @Input() speed_eng: EngineInput = null;
  @Input() speed_gear: EngineInput = null;
  @Input() load: EngineInput = null;

  hasLoad = false;
  isRunning = false;
  statusText = 'Stopped';
  loadPercent = 0;
  loadStateClass = 'load-panel--normal';


  displayTempSupply = '';
  displayTempReturn = '';

  constructor(public tooltipFormatService: TooltipFormatService) {}

  ngOnChanges(changes: SimpleChanges): void {

    if (changes['load']) {
      this.hasLoad = this.hasValidValue(this.load);
      this.loadPercent = this.clampPercent(this.toNumber(this.load));
      this.loadStateClass =
        this.loadPercent >= 90
          ? 'load-panel--critical'
          : this.loadPercent >= 75
            ? 'load-panel--warning'
            : 'load-panel--normal';
    }

    if (changes['speed_eng'] || changes['speed_gear']) {
      const engineSpeed = this.toNumber(this.speed_eng);
      const propellerSpeed = this.toNumber(this.speed_gear);
      this.isRunning = engineSpeed > 0 || propellerSpeed > 0;
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




  displayNumber(input: EngineInput, digits = 2, fallback = '0.00'): string {
    const value = Number(this.getValue(input));

    if (!Number.isFinite(value)) {
      return fallback;
    }

    return value.toFixed(digits);
  }




  displayAbsNumber(input: EngineInput, digits = 2, fallback = '0.00'): string {
    const value = Math.abs(Number(this.getValue(input)));

    if (!Number.isFinite(value)) {
      return fallback;
    }

    return value.toFixed(digits);
  }




  private hasValidValue(input: EngineInput): boolean {
    const value = this.getValue(input);

    return value !== '' && value !== '0' && value !== 'null' && value !== 'undefined';
  }

  private toNumber(input: EngineInput): number {
    const value = Number(this.getValue(input));
    return Number.isFinite(value) ? value : 0;
  }

  private clampPercent(value: number): number {
    return Math.min(100, Math.max(0, value));
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


  hasAlarm(input: EngineInput, ...fallbackTags: string[]): boolean {
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
      this.speed_gear,
      this.load,
    ].some((input) => hasRealtimeTagAlarm(this.activeAlerts, input));
  }
}