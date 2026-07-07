import { Injectable } from '@angular/core';
import { Subscription, timer } from 'rxjs';

import { Store } from '@ngrx/store';

import { FvState } from '../state-managements/states/app.states';
import * as fvInfoActions from '../state-managements/actions/fv-info.action';

@Injectable({
  providedIn: 'root',
})
export class FvInfoService {
  private timerSubscription: Subscription | null = null;

  private readonly defaultInterval = 5000;

  constructor(private store: Store<FvState>) {}

  start(interval?: number): void {
    this.stop();

    const safeInterval =
      interval && interval > 0 ? interval : this.defaultInterval;

    this.timerSubscription = timer(0, safeInterval).subscribe(() => {
      this.tick();
    });
  }

  stop(): void {
    if (this.timerSubscription && !this.timerSubscription.closed) {
      this.timerSubscription.unsubscribe();
    }

    this.timerSubscription = null;
  }

  private tick(): void {
    this.store.dispatch(new fvInfoActions.InitialFVInfo());
  }
}