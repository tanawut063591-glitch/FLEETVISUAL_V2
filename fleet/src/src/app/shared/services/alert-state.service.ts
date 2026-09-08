import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { AlertRecord } from '../models/alert.model';

@Injectable({ providedIn: 'root' })
export class AlertStateService {
  private readonly countSubject = new BehaviorSubject<number>(0);
  private readonly alertsSubject = new BehaviorSubject<readonly AlertRecord[]>([]);

  readonly activeCount$ = this.countSubject.asObservable();

  readonly activeAlerts$ = this.alertsSubject.asObservable();

  setActiveAlerts(alerts: readonly AlertRecord[] | null | undefined): void {
    const activeAlerts = Array.isArray(alerts)
      ? alerts.filter((alert): alert is AlertRecord => !!alert && alert.state !== 'resolved')
      : [];

    const snapshot = [...activeAlerts];
    this.alertsSubject.next(snapshot);
    this.countSubject.next(snapshot.length);
  }

  setActiveCount(count: number): void {
    const safeCount = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
    this.countSubject.next(safeCount);
  }

  clear(): void {
    this.alertsSubject.next([]);
    this.countSubject.next(0);
  }
}
