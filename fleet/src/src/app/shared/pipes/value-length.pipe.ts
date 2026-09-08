import { Pipe, PipeTransform } from '@angular/core';

const INVALID_SENSOR_VALUES = [999999, -999999];

@Pipe({
  name: 'valueLength',
  standalone: false,
})
export class ValueLengthPipe implements PipeTransform {
  transform(
    value: string | number | null | undefined,
    digits = 2,
    fallback = '---'
  ): string {
    if (value === null || value === undefined || value === '') {
      return fallback;
    }

    const normalized = typeof value === 'string' ? value.replace(/,/g, '') : value;
    const num = Number(normalized);

    if (!Number.isFinite(num)) {
      return fallback;
    }

    if (INVALID_SENSOR_VALUES.includes(num)) {
      return '0';
    }

    const safeDigits = Number.isFinite(Number(digits)) ? Number(digits) : 2;
    return num.toFixed(safeDigits);
  }
}
