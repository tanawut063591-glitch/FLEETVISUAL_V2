import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'valueLength',
  standalone: false,
})
export class ValueLengthPipe implements PipeTransform {
  transform(value: any, digits: number = 0): string | number {
    if (value === undefined || value === null || value === '') {
      return '0';
    }

    const normalized = typeof value === 'string'
      ? value.replace(/,/g, '')
      : value;

    const num = Number(normalized);

    if (!Number.isFinite(num)) {
      return value;
    }

    const safeDigits = Number.isFinite(Number(digits)) ? Number(digits) : 0;
    return num.toFixed(safeDigits);
  }
}
