import { Injectable } from '@angular/core';

import { DateRangePreset, DateRangeSelection } from '../models/date-range.model';

@Injectable({ providedIn: 'root' })
export class DateRangeService {
  createPreset(preset: Exclude<DateRangePreset, 'custom'>, now = new Date()): DateRangeSelection {
    const end = new Date(now);
    const start = new Date(now);

    switch (preset) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case '24h':
        start.setTime(end.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '3d':
        start.setTime(end.getTime() - 3 * 24 * 60 * 60 * 1000);
        break;
      case '7d':
        start.setTime(end.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        start.setTime(end.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    return this.createCustom(this.toLocalInput(start), this.toLocalInput(end), preset);
  }

  createCustom(
    startInput: string,
    endInput: string,
    preset: DateRangePreset = 'custom'
  ): DateRangeSelection {
    const start = new Date(startInput);
    const end = new Date(endInput);

    if (!startInput || !endInput || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new Error('Select both start and end date/time.');
    }

    if (start.getTime() >= end.getTime()) {
      throw new Error('The start date/time must be earlier than the end date/time.');
    }

    return {
      preset,
      startInput,
      endInput,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      label: this.labelFor(preset),
    };
  }

  labelFor(preset: DateRangePreset): string {
    switch (preset) {
      case 'today':
        return 'Today';
      case '24h':
        return 'Last 24 Hours';
      case '3d':
        return 'Last 3 Days';
      case '7d':
        return 'Last 7 Days';
      case '30d':
        return 'Last 30 Days';
      default:
        return 'Custom Range';
    }
  }

  toLocalInput(date: Date): string {
    const offset = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }
}
