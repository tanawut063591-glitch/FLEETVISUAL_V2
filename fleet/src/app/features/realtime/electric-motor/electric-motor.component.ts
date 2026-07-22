import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

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

type MotorInput = RealtimeValue | number | string | null | undefined;

@Component({
  selector: 'app-electric-motor',
  standalone: false,
  templateUrl: './electric-motor.component.html',
  styleUrls: ['./electric-motor.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ElectricMotorComponent {
  @Input() activeAlerts: readonly AlertRecord[] = [];

  @Input() speed: MotorInput = null;

  constructor(public tooltipFormatService: TooltipFormatService) {}

  get isRunning(): boolean {
    const currentSpeed = Number(this.getValue(this.speed));
    return Number.isFinite(currentSpeed) && currentSpeed > 0;
  }

  get statusText(): string {
    return this.isRunning ? 'Running' : 'Stopped';
  }

  getValue(input: MotorInput): string {
    if (input === null || input === undefined) {
      return '';
    }

    if (typeof input === 'object') {
      const value = input.value;
      return value === null || value === undefined ? '' : String(value);
    }

    return String(input);
  }

  getTagName(input: MotorInput): string {
    if (!input || typeof input !== 'object') {
      return '';
    }

    return input.tagName || input.name || '';
  }

  getTimestamp(input: MotorInput): string {
    if (!input || typeof input !== 'object') {
      return '';
    }

    const timestamp = input.timestamp;

    if (!timestamp) {
      return '';
    }

    return timestamp instanceof Date ? timestamp.toISOString() : String(timestamp);
  }

  getTooltip(input: MotorInput): string {
    return this.tooltipFormatService.getTooltip(
      this.getTagName(input),
      this.getTimestamp(input)
    );
  }

  displayNumber(input: MotorInput, digits = 2, fallback = '0.00'): string {
    const value = Number(this.getValue(input));

    if (!Number.isFinite(value)) {
      return fallback;
    }

    return value.toFixed(digits);
  }


  hasAlarm(input: MotorInput, ...fallbackTags: string[]): boolean {
    return hasRealtimeTagAlarm(this.activeAlerts, input, ...fallbackTags);
  }

  hasAnyAlarm(): boolean {
    return [
      this.speed,
    ].some((input) => hasRealtimeTagAlarm(this.activeAlerts, input));
  }
}