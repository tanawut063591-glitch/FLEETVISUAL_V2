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
  private readonly defaultInterval = 30_000;
  private readonly minimumInterval = 15_000;
  private activeInterval = 0;
  private isStarted = false;
  private isLoadingTags = false;

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
    const safeInterval = this.resolveInterval(interval);
    this.stopTimerOnly();
    this.isStarted = true;
    this.activeInterval = safeInterval;

    if (this.overviewTags.length > 0) {
      this.startTimer(safeInterval);
      this.applyPendingVessels();
      return;
    }

    this.loadOverviewTags(safeInterval);
  }

  ensureStarted(interval?: number): void {
    const safeInterval = this.resolveInterval(interval);

    if (this.isStarted && this.activeInterval === safeInterval) {
      return;
    }

    this.start(safeInterval);
  }

  setVessels(fvInfos: any[]): void {
    this.pendingVessels = Array.isArray(fvInfos) ? [...fvInfos] : [];

    if (!this.isStarted || this.overviewTags.length === 0) {
      return;
    }

    this.applyPendingVessels();
  }

  stop(): void {
    this.stopTimerOnly();
    this.isStarted = false;
    this.activeInterval = 0;
    this.overviewDatas = [];
  }

  private resolveInterval(interval?: number): number {
    const parsed = Number(interval);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return this.defaultInterval;
    }
    return Math.max(this.minimumInterval, parsed);
  }

  private loadOverviewTags(interval: number): void {
    if (this.isLoadingTags) {
      return;
    }

    this.isLoadingTags = true;
    this.tagFileSubscription = this.http
      .getJsonFile('/assets/tags/overview.tag.json')
      .subscribe({
        next: (res: any) => {
          this.isLoadingTags = false;
          this.overviewTags = this.mapOverviewTags(res);
          this.startTimer(interval);
          this.applyPendingVessels();
        },
        error: (error) => {
          this.isLoadingTags = false;
          console.error('[FvOverviewService] load tags error:', error);
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
    this.timerSubscription?.unsubscribe();
    this.timerSubscription = timer(interval, interval).subscribe(() => {
      this.tick();
    });
  }

  private tick(): void {
    if (!this.isStarted || this.overviewDatas.length === 0) {
      return;
    }

    if (typeof document !== 'undefined' && document.hidden) {
      return;
    }

    this.emitOverviewPayload(this.overviewDatas);
  }

  private applyPendingVessels(): void {
    if (!this.isStarted) {
      return;
    }

    if (this.pendingVessels.length === 0) {
      this.overviewDatas = [];
      this.emitOverviewPayload([]);
      return;
    }

    this.overviewDatas = this.buildOverviewDatas(this.pendingVessels);
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
    if (!fv || this.overviewTags.length === 0) {
      return null;
    }

    const fvInfo = fv?.fvInfo || fv?.fv || fv;
    const prefix = fvInfo?.prefix || fvInfo?.id || fvInfo?.name;

    if (!prefix) {
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

  private stopTimerOnly(): void {
    this.timerSubscription?.unsubscribe();
    this.tagFileSubscription?.unsubscribe();
    this.timerSubscription = null;
    this.tagFileSubscription = null;
    this.isLoadingTags = false;
  }
}
