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
  selector: 'app-diesel-generator-no-rpm-vtotal',
  standalone: false,
  templateUrl: './diesel-generator-no-rpm-vtotal.component.html',
  styleUrls: ['./diesel-generator-no-rpm-vtotal.component.css'],

  // ลดการ render ซ้ำ เวลา realtime update
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DieselGeneratorNoRpmVtotalComponent {
  // Fuel
  @Input() flow_supply: GeneratorInput = null;
  @Input() flow_return: GeneratorInput = null;

  // Consumption
  @Input() cons: GeneratorInput = null;
  @Input() consL: GeneratorInput = null;

  // Generator Load
  @Input() load: GeneratorInput = null;
  @Input() load_kw: GeneratorInput = null;

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
   * เช็กว่ามี Load % ไหม
   */
  get hasLoad(): boolean {
    const value = Number(this.getValue(this.load));

    return Number.isFinite(value) && value !== 0;
  }

  /**
   * เช็กว่ามี Load kW ไหม
   */
  get hasLoadKw(): boolean {
    const value = Number(this.getValue(this.load_kw));

    return Number.isFinite(value) && value !== 0;
  }
}