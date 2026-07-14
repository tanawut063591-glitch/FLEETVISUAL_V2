import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AlertStateService {
  private readonly storageKey = 'alertCount';
  private readonly countSubject = new BehaviorSubject<number>(this.readStoredCount());

  readonly activeCount$ = this.countSubject.asObservable();

  setActiveCount(count: number): void {
    const safeCount = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
    this.countSubject.next(safeCount);

    try {
      localStorage.setItem(this.storageKey, String(safeCount));
    } catch {
      // Storage is optional. The in-memory stream still updates the header.
    }
  }

  private readStoredCount(): number {
    try {
      const value = Number(localStorage.getItem(this.storageKey) || 0);
      return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
    } catch {
      return 0;
    }
  }
}
