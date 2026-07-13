import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class DateFormatService {
  addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  formatDateInput(date: Date): string {
    const year = date.getFullYear();
    const month = this.pad(date.getMonth() + 1);
    const day = this.pad(date.getDate());

    return `${year}-${month}-${day}`;
  }

  formatMonthInput(date: Date): string {
    const year = date.getFullYear();
    const month = this.pad(date.getMonth() + 1);

    return `${year}-${month}`;
  }

  buildBackendTimestamp(type: 'd' | 'm', dateValue: string, monthValue: string): string {
    const dateText = type === 'd' ? dateValue : `${monthValue}-01`;
    return `${dateText} 00:00:00`;
  }

  formatLoadedAt(date: Date | null): string {
    if (!date) {
      return '-';
    }

    return date.toLocaleString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }

  private pad(value: number): string {
    return String(value).padStart(2, '0');
  }
}
