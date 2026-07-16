import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AlertStateService {
  private readonly countSubject = new BehaviorSubject<number>(0);

  readonly activeCount$ = this.countSubject.asObservable();

  setActiveCount(count: number): void {
    const safeCount = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
    this.countSubject.next(safeCount);
  }
}
