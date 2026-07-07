import { Injectable } from '@angular/core';
import { Subscription, timer } from 'rxjs';

import { Store } from '@ngrx/store';

import { FvState } from '../state-managements/states/app.states';

import * as fvInfoActions from '../state-managements/actions/fv-info.action';
import * as fvInfoReducer from '../state-managements/reducers/fv-info.reducer';

import { HttpClientService } from './http-client.service';

@Injectable({
  providedIn: 'root',
})
export class FvRealtimeService {
  private timerSubscription: Subscription | null = null;
  private tagFileSubscription: Subscription | null = null;
  private activeVesselSubscription: Subscription | null = null;
  private noDataSubscription: Subscription | null = null;

  private readonly defaultInterval = 5000;

  private realtimeTags: any[] = [];
  private loadedVessels: string[] = [];
  private activePayload: any = null;

  private timeoutIds: any[] = [];

  constructor(
    private store: Store<FvState>,
    private http: HttpClientService
  ) {}

  start(interval?: number): void {
    this.stop();
    this.resetData();

    const safeInterval =
      interval && interval > 0 ? interval : this.defaultInterval;

    this.loadRealtimeTags(safeInterval);
  }

  stop(): void {
    this.unsubscribe(this.timerSubscription);
    this.unsubscribe(this.tagFileSubscription);
    this.unsubscribe(this.activeVesselSubscription);
    this.unsubscribe(this.noDataSubscription);

    this.timerSubscription = null;
    this.tagFileSubscription = null;
    this.activeVesselSubscription = null;
    this.noDataSubscription = null;

    this.timeoutIds.forEach((id: any) => clearTimeout(id));
    this.timeoutIds = [];
  }

  private loadRealtimeTags(interval: number): void {
    this.tagFileSubscription = this.http
      .getJsonFile('/assets/tags/dashboard.tag.json')
      .subscribe({
        next: (res: any) => {
          this.realtimeTags = this.mapRealtimeTags(res);

          if (this.realtimeTags.length === 0) {
            return;
          }

          this.initRealtime();
          this.startTimer(interval);
        },
        error: (error: any) => {
          console.error('Load realtime tags error:', error);
          this.resetData();
        },
      });
  }

  private mapRealtimeTags(res: any): any[] {
    const tags: any[] = [];

    if (!res) {
      return tags;
    }

    Object.keys(res).forEach((groupKey: string) => {
      const group = res[groupKey];

      if (!group) {
        return;
      }

      Object.keys(group).forEach((tagKey: string) => {
        const tag = group[tagKey];

        if (tag && tag.name && tag.tagName) {
          tags.push({
            name: tag.name,
            tagName: tag.tagName,
            cal: tag.cal,
          });
        }
      });
    });

    return tags;
  }

  private startTimer(interval: number): void {
    this.timerSubscription = timer(interval, interval).subscribe(() => {
      this.tick();
    });
  }

  private tick(): void {
    if (!this.activePayload) {
      return;
    }

    this.store.dispatch(
      new fvInfoActions.SetRealtimeActive(this.activePayload)
    );
  }

  private initRealtime(): void {
    this.subscribeActiveVessel();
    this.subscribeNoDataVessels();
  }

  private subscribeActiveVessel(): void {
    this.activeVesselSubscription = this.store
      .select(fvInfoReducer.getFvInfosActive)
      .subscribe((res: any) => {
        const payload = this.generateTags(res);

        if (!payload) {
          return;
        }

        this.activePayload = payload;

        this.store.dispatch(
          new fvInfoActions.SetRealtimeActive(payload)
        );
      });
  }

  private subscribeNoDataVessels(): void {
    const timeoutId = setTimeout(() => {
      this.noDataSubscription = this.store
        .select(fvInfoReducer.getFvNoData)
        .subscribe((res: any[]) => {
          if (!Array.isArray(res) || res.length === 0) {
            return;
          }

          res.forEach((vessel: any, index: number) => {
            this.setDelay(index + 1, vessel);
          });
        });
    }, 250);

    this.timeoutIds.push(timeoutId);
  }

  private setDelay(offset: number, res: any): void {
    const timeoutId = setTimeout(() => {
      const prefix = res?.fvInfo?.prefix;

      if (!prefix) {
        return;
      }

      if (this.loadedVessels.includes(prefix)) {
        return;
      }

      this.loadedVessels.push(prefix);

      const payload = this.generateTags(res);

      if (!payload) {
        return;
      }

      this.store.dispatch(
        new fvInfoActions.SetRealtimeActive(payload)
      );
    }, offset * 100);

    this.timeoutIds.push(timeoutId);
  }

  private generateTags(res: any): any | null {
    const fvInfo = res?.fvInfo;
    const prefix = fvInfo?.prefix;

    if (!fvInfo || !prefix) {
      return null;
    }

    if (!Array.isArray(this.realtimeTags) || this.realtimeTags.length === 0) {
      return null;
    }

    const tags = this.realtimeTags.map((tag: any) => {
      return {
        name: tag.name,
        tagName: `${prefix}-${tag.tagName}`,
        cal: tag.cal,
      };
    });

    return {
      tags,
      fv: fvInfo,
    };
  }

  private resetData(): void {
    this.realtimeTags = [];
    this.loadedVessels = [];
    this.activePayload = null;
  }

  private unsubscribe(subscription: Subscription | null): void {
    if (subscription && !subscription.closed) {
      subscription.unsubscribe();
    }
  }
}