import {
  Component,
  Input,
  ChangeDetectionStrategy,
} from '@angular/core';

import { TooltipFormatService } from '../../../shared/services/tooltip-format.service';

interface RealtimeValue {
  value?: string | number | null;
  timestamp?: string | Date | null;
  tagName?: string;
  name?: string;
  cal?: boolean;
}

type GeneratorInput = RealtimeValue | number | string | null | undefined;

@Component({
  selector: 'app-diesel-generator-no-rpm',
  standalone: false,
  templateUrl: './diesel-generator-no-rpm.component.html',
  styleUrls: ['./diesel-generator-no-rpm.component.css'],

  // ลดการ render ซ้ำ เวลา realtime update
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DieselGeneratorNoRpmComponent {
  // Fuel supply
  @Input() flow_supply: GeneratorInput = null;
  @Input() temp_supply: GeneratorInput = null;
  @Input() dens_supply: GeneratorInput = null;

  // Fuel return
  @Input() flow_return: GeneratorInput = null;
  @Input() temp_return: GeneratorInput = null;
  @Input() dens_return: GeneratorInput = null;

  // Consumption
  @Input() cons: GeneratorInput = null;
  @Input() consL: GeneratorInput = null;

  // Generator load
  @Input() load: GeneratorInput = null;
  @Input() load_kw: GeneratorInput = null;

  // Status
  @Input() ecm_status: GeneratorInput = null;
  @Input() gen_status: GeneratorInput = null;
  @Input() supply_status: GeneratorInput = null;
  @Input() return_status: GeneratorInput = null;

  constructor(public tooltipFormatService: TooltipFormatService) {}

  /**
   * ดึง value จาก object realtime หรือค่าตรง ๆ
   */
  getValue(input: GeneratorInput): string {
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
   * ดึง tagName สำหรับ tooltip
   */
  getTagName(input: GeneratorInput): string {
    if (!input || typeof input !== 'object') {
      return '';
    }

    return input.tagName || input.name || '';
  }

  /**
   * ดึง timestamp สำหรับ tooltip
   */
  getTimestamp(input: GeneratorInput): string {
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
   * ใช้ใน HTML แทน tooltipFormatService.getTooltip(...) ตรง ๆ
   */
  getTooltip(input: GeneratorInput): string {
    return this.tooltipFormatService.getTooltip(
      this.getTagName(input),
      this.getTimestamp(input)
    );
  }

  /**
   * แสดงตัวเลขแบบปลอดภัย
   */
  displayNumber(
    input: GeneratorInput,
    digits: number = 2,
    fallback: string = '0.00'
  ): string {
    const value = Number(this.getValue(input));

    if (!Number.isFinite(value)) {
      return fallback;
    }

    return value.toFixed(digits);
  }

  /**
   * แสดงตัวเลขแบบค่าสัมบูรณ์ เช่น consumption ที่ติดลบ
   */
  displayAbsNumber(
    input: GeneratorInput,
    digits: number = 2,
    fallback: string = '0.00'
  ): string {
    const value = Math.abs(Number(this.getValue(input)));

    if (!Number.isFinite(value)) {
      return fallback;
    }

    return value.toFixed(digits);
  }

  /**
   * เช็กว่ามี load ไหม
   */
  get hasLoad(): boolean {
    const value = Number(this.getValue(this.load));

    return Number.isFinite(value) && value !== 0;
  }

  /**
   * เช็กว่ามี load kW ไหม
   */
  get hasLoadKw(): boolean {
    const value = Number(this.getValue(this.load_kw));

    return Number.isFinite(value) && value !== 0;
  }

  /**
   * สถานะ generator
   */
  get isRunning(): boolean {
    const genValue = Number(this.getValue(this.gen_status));
    const ecmValue = Number(this.getValue(this.ecm_status));

    if (Number.isFinite(genValue)) {
      return genValue === 1;
    }

    if (Number.isFinite(ecmValue)) {
      return ecmValue === 1;
    }

    return true;
  }

  get statusText(): string {
    return this.isRunning ? 'Running' : 'Stopped';
  }

  get statusClass(): string {
    return this.isRunning ? 'running' : 'stopped';
  }
}