import { Injectable } from '@angular/core';
import { Subscription, timer } from 'rxjs';

import { Store } from '@ngrx/store';

import { FvState } from '../state-managements/states/app.states';

import * as fvInfoReducer from '../state-managements/reducers/fv-info.reducer';
import * as fvOverviewActions from '../state-managements/actions/fv-overview.action';

import { HttpClientService } from './http-client.service';

@Injectable({
  providedIn: 'root',
})
export class FvOverviewService {
  private timerSubscription: Subscription | null = null;
  private fvInfoSubscription: Subscription | null = null;
  private tagFileSubscription: Subscription | null = null;

  private readonly defaultInterval = 5000;

  private overviewTags: any[] = [];
  private overviewDatas: any[] = [];

  constructor(
    private store: Store<FvState>,
    private http: HttpClientService
  ) {}

  start(interval?: number): void {
    this.stop();
    this.resetData();

    const safeInterval =
      interval && interval > 0 ? interval : this.defaultInterval;

    this.loadOverviewTags(safeInterval);
  }

  stop(): void {
    this.unsubscribe(this.timerSubscription);
    this.unsubscribe(this.fvInfoSubscription);
    this.unsubscribe(this.tagFileSubscription);

    this.timerSubscription = null;
    this.fvInfoSubscription = null;
    this.tagFileSubscription = null;
  }

  private loadOverviewTags(interval: number): void {
    this.tagFileSubscription = this.http
      .getJsonFile('/assets/tags/overview.tag.json')
      .subscribe({
        next: (res: any) => {
          this.overviewTags = this.mapOverviewTags(res);

          if (this.overviewTags.length === 0) {
            return;
          }

          this.initOverview();
          this.startTimer(interval);
        },
        error: (error: any) => {
          console.error('Load overview tags error:', error);
          this.resetData();
        },
      });
  }

  private mapOverviewTags(res: any): any[] {
    const tags: any[] = [];

    if (!res) {
      return tags;
    }

    Object.keys(res).forEach((key: string) => {
      const tag = res[key];

      if (!tag || !tag.name || !tag.tagName) {
        return;
      }

      tags.push({
        name: tag.name,
        tagName: tag.tagName,
        cal: tag.cal,
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
    if (this.overviewDatas.length === 0) {
      return;
    }

    this.store.dispatch(
      new fvOverviewActions.GetFVOverview(this.overviewDatas)
    );
  }

  private initOverview(): void {
    this.fvInfoSubscription = this.store
      .select(fvInfoReducer.getFvInfo)
      .subscribe((res: any) => {
        const fvInfos = Array.isArray(res) ? res : [];

        if (fvInfos.length === 0) {
          return;
        }

        this.overviewDatas = this.buildOverviewDatas(fvInfos);

        if (this.overviewDatas.length > 0) {
          this.store.dispatch(
            new fvOverviewActions.GetFVOverview(this.overviewDatas)
          );
        }
      });
  }

  private buildOverviewDatas(fvInfos: any[]): any[] {
    const datas: any[] = [];

    fvInfos.forEach((fv: any) => {
      const payload = this.generateTags(fv);

      if (payload) {
        datas.push(payload);
      }
    });

    return datas;
  }

  private generateTags(fv: any): any | null {
    const fvInfo = fv && fv.fvInfo ? fv.fvInfo : fv;
    const prefix = fvInfo && fvInfo.prefix ? fvInfo.prefix : '';

    if (!prefix) {
      return null;
    }

    if (!Array.isArray(this.overviewTags) || this.overviewTags.length === 0) {
      return null;
    }

    const tags = this.overviewTags.map((tag: any) => {
      return {
        name: tag.name,
        tagName: `${prefix}-${tag.tagName}`,
        cal: tag.cal,
      };
    });

    return {
      tags,
      fv: fvInfo,
      datas: [],
    };
  }

  private resetData(): void {
    this.overviewTags = [];
    this.overviewDatas = [];
  }

  private unsubscribe(subscription: Subscription | null): void {
    if (subscription && !subscription.closed) {
      subscription.unsubscribe();
    }
  }
}