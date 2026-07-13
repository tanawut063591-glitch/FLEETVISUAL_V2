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

type AuxEngineInput = RealtimeValue | number | string | null | undefined;

@Component({
  selector: 'app-aux-engine',
  standalone: false,
  templateUrl: './aux-engine.component.html',
  styleUrls: ['./aux-engine.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuxEngineComponent implements OnChanges {
  // Fuel supply
  @Input() flow_supply: AuxEngineInput = null;
  @Input() temp_supply: AuxEngineInput = null;
  @Input() dens_supply: AuxEngineInput = null;

  // Fuel return
  @Input() flow_return: AuxEngineInput = null;
  @Input() temp_return: AuxEngineInput = null;
  @Input() dens_return: AuxEngineInput = null;

  // Consumption
  @Input() cons: AuxEngineInput = null;
  @Input() consL: AuxEngineInput = null;

  // Engine speed
  @Input() speed_eng: AuxEngineInput = null;

  // ค่าอุณหภูมิที่แปลงแล้ว ใช้แสดงใน HTML
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

  /**
   * ดึง value จาก object realtime หรือค่าตรง ๆ
   */
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

  /**
   * ดึง tagName สำหรับ tooltip / logic
   */
  getTagName(input: AuxEngineInput): string {
    if (!input || typeof input !== 'object') {
      return '';
    }

    return input.tagName || input.name || '';
  }

  /**
   * ดึง timestamp สำหรับ tooltip
   */
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

  /**
   * ใช้ใน HTML แทน tooltipFormatService.getTooltip(...) ตรง ๆ
   */
  getTooltip(input: AuxEngineInput): string {
    return this.tooltipFormatService.getTooltip(
      this.getTagName(input),
      this.getTimestamp(input)
    );
  }

  /**
   * แสดงตัวเลขแบบปลอดภัย
   */
  displayNumber(
    input: AuxEngineInput,
    digits: number = 1,
    fallback: string = '0'
  ): string {
    const value = Number(this.getValue(input));

    if (!Number.isFinite(value)) {
      return fallback;
    }

    return value.toFixed(digits);
  }

  /**
   * ใช้กับค่าที่อาจติดลบ เช่น consumption
   */
  displayAbsNumber(
    input: AuxEngineInput,
    digits: number = 1,
    fallback: string = '0'
  ): string {
    const value = Math.abs(Number(this.getValue(input)));

    if (!Number.isFinite(value)) {
      return fallback;
    }

    return value.toFixed(digits);
  }

  /**
   * แปลงอุณหภูมิของบาง vessel เช่น A01 จาก Kelvin เป็น Celsius
   */
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