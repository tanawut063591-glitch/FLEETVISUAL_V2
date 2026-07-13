import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, Subject, Subscription, timer } from 'rxjs';

import { HttpClientService } from './http-client.service';
import * as fvOverviewActions from '../../store/actions/fv-overview.action';

@Injectable({
  providedIn: 'root',
})
export class FvOverviewService {
  private timerSubscription: Subscription | null = null;
  private tagFileSubscription: Subscription | null = null;
  private readonly defaultInterval = 5000;

  private overviewTags: any[] = [];
  private overviewDatas: any[] = [];
  private pendingVessels: any[] = [];

  private readonly overviewPayloadSource = new Subject<any[]>();

  readonly overviewPayload$: Observable<any[]> = this.overviewPayloadSource.asObservable();

  constructor(
    private http: HttpClientService,
    private store: Store<any>
  ) {}

  start(interval?: number): void {
    this.stop();
    this.resetData();

    const safeInterval = interval && interval > 0 ? interval : this.defaultInterval;
    this.loadOverviewTags(safeInterval);
  }

  private loadOverviewTags(interval: number): void {
    this.tagFileSubscription = this.http
      .getJsonFile('/assets/tags/overview.tag.json')
      .subscribe({
        next: (res: any) => {
          this.overviewTags = this.mapOverviewTags(res);
          this.startTimer(interval);

          if (this.pendingVessels.length > 0) {
            const pending = [...this.pendingVessels];
            this.pendingVessels = [];
            this.setVessels(pending);
          }
        },
        error: (error) => {
          console.error('[FvOverviewService] load tags error:', error);
          this.resetData();
        },
      });
  }

  private mapOverviewTags(res: any): any[] {
    if (!res) {
      return [];
    }

    return Object.keys(res)
      .map((key: string) => {
        const tag = res[key];

        return {
          name: tag?.name || '',
          tagName: tag?.tagName || '',
          cal: tag?.cal,
        };
      })
      .filter((tag) => tag.name && tag.tagName);
  }

  private startTimer(interval: number): void {
    this.timerSubscription = timer(interval, interval).subscribe(() => {
      this.tick();
    });
  }

  private tick(): void {
    if (this.overviewDatas.length > 0) {
      this.emitOverviewPayload(this.overviewDatas);
    }
  }

  setVessels(fvInfos: any[]): void {
    if (!Array.isArray(fvInfos) || fvInfos.length === 0) {
      this.overviewDatas = [];
      this.emitOverviewPayload([]);
      return;
    }

    if (!this.overviewTags || this.overviewTags.length === 0) {
      this.pendingVessels = fvInfos;
      return;
    }

    this.overviewDatas = this.buildOverviewDatas(fvInfos);
    this.emitOverviewPayload(this.overviewDatas);
  }

  private emitOverviewPayload(payload: any[]): void {
    this.overviewPayloadSource.next(payload);
    this.store.dispatch(new fvOverviewActions.GetFVOverview(payload));
  }

  private buildOverviewDatas(fvInfos: any[]): any[] {
    return fvInfos
      .map((fv) => this.generateTags(fv))
      .filter((payload) => payload !== null);
  }

  private generateTags(fv: any): any {
    if (!fv) {
      return null;
    }

    const fvInfo = fv?.fvInfo || fv?.fv || fv;
    const prefix = fvInfo?.prefix || fvInfo?.id || fvInfo?.name;

    if (!prefix) {
      return null;
    }

    if (!this.overviewTags || this.overviewTags.length === 0) {
      return null;
    }

    const tags = this.overviewTags.map((tag) => ({
      name: tag.name,
      tagName: `${prefix}-${tag.tagName}`,
      cal: tag.cal,
    }));

    if (tags.length === 0) {
      return null;
    }

    return {
      tags,
      fv: {
        ...fvInfo,
        prefix,
      },
    };
  }

  stop(): void {
    this.timerSubscription?.unsubscribe();
    this.tagFileSubscription?.unsubscribe();

    this.timerSubscription = null;
    this.tagFileSubscription = null;
  }

  private resetData(): void {
    this.overviewTags = [];
    this.overviewDatas = [];
    this.pendingVessels = [];
  }
}
