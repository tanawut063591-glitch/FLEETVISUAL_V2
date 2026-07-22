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

  // ลดการ render ซ้ำ เวลา realtime update
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainEngineComponent implements OnChanges {
  @Input() activeAlerts: readonly AlertRecord[] = [];

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

  // Speed / Load
  @Input() speed_eng: EngineInput = null;
  @Input() speed_gear: EngineInput = null;
  @Input() load: EngineInput = null;

  hasLoad = false;
  isRunning = false;
  statusText = 'Stopped';
  loadPercent = 0;
  loadStateClass = 'load-panel--normal';

  // ค่า temp ที่แปลงแล้วไว้แสดงในหน้า HTML
  displayTempSupply = '';
  displayTempReturn = '';

  constructor(public tooltipFormatService: TooltipFormatService) {}

  ngOnChanges(changes: SimpleChanges): void {
    // เช็กว่ามี load หรือไม่
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

    // แปลงอุณหภูมิฝั่ง supply
    if (changes['temp_supply']) {
      this.displayTempSupply = this.changeTemp(
        this.getValue(this.temp_supply),
        this.getTagName(this.temp_supply)
      );
    }

    // แปลงอุณหภูมิฝั่ง return
    if (changes['temp_return']) {
      this.displayTempReturn = this.changeTemp(
        this.getValue(this.temp_return),
        this.getTagName(this.temp_return)
      );
    }
  }

  /**
   * ดึง value จาก object realtime หรือค่าตรง ๆ
   */
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

  /**
   * ดึง tagName ไว้ใช้ tooltip / logic
   */
  getTagName(input: EngineInput): string {
    if (!input || typeof input !== 'object') {
      return '';
    }

    return input.tagName || input.name || '';
  }

  /**
   * ดึง timestamp ไว้ใช้ tooltip
   */
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

  /**
   * ใช้ใน HTML สำหรับ tooltip
   */
  getTooltip(input: EngineInput): string {
    return this.tooltipFormatService.getTooltip(
      this.getTagName(input),
      this.getTimestamp(input)
    );
  }

  /**
   * แสดงตัวเลขแบบปลอดภัย
   */
  displayNumber(input: EngineInput, digits = 2, fallback = '0.00'): string {
    const value = Number(this.getValue(input));

    if (!Number.isFinite(value)) {
      return fallback;
    }

    return value.toFixed(digits);
  }

  /**
   * ใช้กับค่าที่อาจเป็นลบ เช่น fuel return / consumption
   */
  displayAbsNumber(input: EngineInput, digits = 2, fallback = '0.00'): string {
    const value = Math.abs(Number(this.getValue(input)));

    if (!Number.isFinite(value)) {
      return fallback;
    }

    return value.toFixed(digits);
  }

  /**
   * เช็กว่ามีค่าจริงไหม
   */
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

  /**
   * แปลงอุณหภูมิของบาง vessel เช่น A01
   */
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