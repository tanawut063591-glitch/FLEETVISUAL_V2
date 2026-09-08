import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class FvTimeService {
  getLastSeen(timestamp: Date | string | number): string {
    return this.getLastSeenFromValue(timestamp);
  }

  getLastSeenFromString(timestamp: string): string {
    return this.getLastSeenFromValue(timestamp);
  }

  private getLastSeenFromValue(timestamp: Date | string | number): string {
    try {
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp);

      if (Number.isNaN(date.getTime())) {
        return '-';
      }

      const diffTime = Date.now() - date.getTime();

      if (diffTime < 0) {
        return 'Now';
      }

      const minute = Math.floor(diffTime / 1000 / 60);
      const hour = Math.floor(minute / 60);
      const days = Math.floor(hour / 24);

      if (days >= 1) {
        return `${days}D`;
      }

      if (hour >= 1) {
        return `${hour}H`;
      }

      if (minute <= 0) {
        return 'Now';
      }

      return `${minute}M`;
    } catch {
      return '-';
    }
  }
}
