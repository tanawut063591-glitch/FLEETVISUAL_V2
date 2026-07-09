import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, Subject, Subscription, timer } from 'rxjs';

import * as fvInfoActions from '../../store/actions/fv-info.action';

@Injectable({
  providedIn: 'root',
})
export class FvInfoService {
  private timerSubscription: Subscription | null = null;
  private readonly defaultInterval = 5000;
  private readonly refreshSource = new Subject<void>();

  readonly refresh$: Observable<void> = this.refreshSource.asObservable();

  constructor(private store: Store<any>) {}

  start(interval?: number): void {
    this.stop();

    const safeInterval = interval && interval > 0 ? interval : this.defaultInterval;

    this.timerSubscription = timer(0, safeInterval).subscribe(() => {
      this.tick();
    });
  }

  stop(): void {
    this.timerSubscription?.unsubscribe();
    this.timerSubscription = null;
  }

  private tick(): void {
    this.refreshSource.next();
    this.store.dispatch(new fvInfoActions.InitialFVInfo());
  }
}
