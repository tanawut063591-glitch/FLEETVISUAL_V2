import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { AlertRecord } from '../models/alert.model';

@Injectable({ providedIn: 'root' })
export class AlertStateService {
  private readonly countSubject = new BehaviorSubject<number>(0);
  private readonly alertsSubject = new BehaviorSubject<readonly AlertRecord[]>([]);

  /** Global active alarm count used by the header badge. */
  readonly activeCount$ = this.countSubject.asObservable();

  /**
   * Latest active alarm snapshot shared by Header, Alarm Center and Realtime.
   * Realtime filters this list by the currently selected vessel, so it does not
   * need to create another polling loop or duplicate backend requests.
   */
  readonly activeAlerts$ = this.alertsSubject.asObservable();

  setActiveAlerts(alerts: readonly AlertRecord[] | null | undefined): void {
    const activeAlerts = Array.isArray(alerts)
      ? alerts.filter((alert): alert is AlertRecord => !!alert && alert.state !== 'resolved')
      : [];

    // Publish a fresh immutable snapshot so OnPush/async consumers update safely.
    const snapshot = [...activeAlerts];
    this.alertsSubject.next(snapshot);
    this.countSubject.next(snapshot.length);
  }

  /**
   * Kept for backward compatibility with count-only consumers. New data loaders
   * should call setActiveAlerts() so vessel-specific counters can be calculated.
   */
  setActiveCount(count: number): void {
    const safeCount = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
    this.countSubject.next(safeCount);
  }

  clear(): void {
    this.alertsSubject.next([]);
    this.countSubject.next(0);
  }
}
