import {
  ChangeDetectionStrategy,
  Component,
  Input,
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

type GeneratorInput = RealtimeValue | number | string | null | undefined;

@Component({
  selector: 'app-diesel-generator-no-rpm-vtotal',
  standalone: false,
  templateUrl: './diesel-generator-no-rpm-vtotal.component.html',
  styleUrls: ['./diesel-generator-no-rpm-vtotal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DieselGeneratorNoRpmVtotalComponent {
  @Input() activeAlerts: readonly AlertRecord[] = [];

  @Input() flow_supply: GeneratorInput = null;
  @Input() flow_return: GeneratorInput = null;

  @Input() cons: GeneratorInput = null;
  @Input() consL: GeneratorInput = null;

  @Input() load: GeneratorInput = null;
  @Input() load_kw: GeneratorInput = null;

  constructor(public tooltipFormatService: TooltipFormatService) {}

  getValue(input: GeneratorInput): string {
    if (input === null || input === undefined) {
      return '';
    }

    if (typeof input === 'object') {
      const value = input.value;
      return value === null || value === undefined ? '' : String(value);
    }

    return String(input);
  }

  getTagName(input: GeneratorInput): string {
    if (!input || typeof input !== 'object') {
      return '';
    }

    return input.tagName || input.name || '';
  }

  getTimestamp(input: GeneratorInput): string {
    if (!input || typeof input !== 'object' || !input.timestamp) {
      return '';
    }

    return input.timestamp instanceof Date
      ? input.timestamp.toISOString()
      : String(input.timestamp);
  }

  getTooltip(input: GeneratorInput): string {
    return this.tooltipFormatService.getTooltip(
      this.getTagName(input),
      this.getTimestamp(input)
    );
  }

  displayNumber(
    input: GeneratorInput,
    digits = 2,
    fallback = '0.00'
  ): string {
    const value = this.toFiniteNumber(input);
    return value === null ? fallback : value.toFixed(digits);
  }

  displayAbsNumber(
    input: GeneratorInput,
    digits = 2,
    fallback = '0.00'
  ): string {
    const value = this.toFiniteNumber(input);
    return value === null ? fallback : Math.abs(value).toFixed(digits);
  }

  get hasLoad(): boolean {
    return this.toFiniteNumber(this.load) !== null;
  }

  get hasLoadKw(): boolean {
    return this.toFiniteNumber(this.load_kw) !== null;
  }

  get loadPercent(): number {
    const value = this.toFiniteNumber(this.load);
    return value === null ? 0 : Math.min(100, Math.max(0, value));
  }

  get loadStateClass(): string {
    if (this.loadPercent >= 90) {
      return 'load-critical';
    }

    if (this.loadPercent >= 75) {
      return 'load-warning';
    }

    return 'load-normal';
  }

  private toFiniteNumber(input: GeneratorInput): number | null {
    const raw = this.getValue(input).trim();

    if (!raw) {
      return null;
    }

    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  }


  hasAlarm(input: GeneratorInput, ...fallbackTags: string[]): boolean {
    return hasRealtimeTagAlarm(this.activeAlerts, input, ...fallbackTags);
  }

  hasAnyAlarm(): boolean {
    return [
      this.flow_supply,
      this.flow_return,
      this.cons,
      this.consL,
      this.load,
      this.load_kw,
    ].some((input) => hasRealtimeTagAlarm(this.activeAlerts, input));
  }
}
