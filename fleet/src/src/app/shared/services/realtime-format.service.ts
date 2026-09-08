import { Injectable } from '@angular/core';

import { RealtimeDisplayStatus, RealtimeInput } from '../models/realtime-value.model';

@Injectable({
  providedIn: 'root',
})
export class RealtimeFormatService {
  private readonly invalidValues = [999999, -999999];

  getValue(input: RealtimeInput): string {
    if (input === null || input === undefined) {
      return '';
    }

    if (typeof input === 'object') {
      const value = input.value;
      return value === null || value === undefined ? '' : String(value);
    }

    return String(input);
  }

  getNumber(input: RealtimeInput): number | null {
    const rawValue = this.getValue(input);

    if (rawValue === '') {
      return null;
    }

    const value = Number(rawValue);

    if (!Number.isFinite(value)) {
      return null;
    }

    if (this.invalidValues.includes(value)) {
      return 0;
    }

    return value;
  }

  getTagName(input: RealtimeInput): string {
    if (!input || typeof input !== 'object') {
      return '';
    }

    return input.tagName || input.name || '';
  }

  getTimestamp(input: RealtimeInput): string {
    if (!input || typeof input !== 'object') {
      return '';
    }

    const timestamp = input.timestamp;

    if (!timestamp) {
      return '';
    }

    return timestamp instanceof Date ? timestamp.toISOString() : String(timestamp);
  }

  displayNumber(input: RealtimeInput, digits = 2, fallback = '0.00'): string {
    const value = this.getNumber(input);
    return value === null ? fallback : value.toFixed(digits);
  }

  displayAbsNumber(input: RealtimeInput, digits = 2, fallback = '0.00'): string {
    const value = this.getNumber(input);
    return value === null ? fallback : Math.abs(value).toFixed(digits);
  }

  hasValue(input: RealtimeInput): boolean {
    const value = this.getNumber(input);
    return value !== null && value !== 0;
  }

  isRunning(input: RealtimeInput): boolean {
    const value = this.getNumber(input);
    return value !== null && value > 0;
  }

  getStatus(input: RealtimeInput): RealtimeDisplayStatus {
    const value = this.getNumber(input);

    if (value === null) {
      return { text: 'No Data', className: 'nodata' };
    }

    if (value > 0) {
      return { text: 'Running', className: 'running' };
    }

    return { text: 'Stopped', className: 'stopped' };
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
      tagName && tagName.startsWith('A01') ? numberValue - 272.15 : numberValue;

    return normalizedValue.toFixed(2);
  }
}
