import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { AlertRecord } from '../../../shared/models/alert.model';
import { TooltipFormatService } from '../../../shared/services/tooltip-format.service';
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
  @Input() maxRpm = 2000;

  constructor(public tooltipFormatService: TooltipFormatService) {}

  get numericSpeed(): number {
    const value = Number(this.getValue(this.speed));
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  get isRunning(): boolean {
    return this.numericSpeed > 0;
  }

  get speedPercent(): number {
    const max = Number(this.maxRpm);
    if (!Number.isFinite(max) || max <= 0) {
      return 0;
    }

    return Math.min(100, Math.max(0, (this.numericSpeed / max) * 100));
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
    return Number.isFinite(value) ? value.toFixed(digits) : fallback;
  }

  hasAlarm(input: MotorInput, ...fallbackTags: string[]): boolean {
    return hasRealtimeTagAlarm(this.activeAlerts, input, ...fallbackTags);
  }
}
