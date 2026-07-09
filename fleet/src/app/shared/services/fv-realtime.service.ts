import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { BehaviorSubject, Observable, Subject, Subscription, timer } from 'rxjs';

import { HttpClientService } from './http-client.service';
import * as fvInfoActions from '../../store/actions/fv-info.action';

@Injectable({
  providedIn: 'root',
})
export class FvRealtimeService {
  private timerSubscription: Subscription | null = null;
  private tagFileSubscription: Subscription | null = null;
  private readonly defaultInterval = 5000;

  private realtimeTags: any[] = [];
  private loadedVessels: string[] = [];
  private activePayload: any = null;
  private pendingVessel: any = null;

  private readonly realtimePayloadSource = new Subject<any>();
  private readonly activeVesselSource = new BehaviorSubject<any>(this.readStoredVessel());

  readonly realtimePayload$: Observable<any> = this.realtimePayloadSource.asObservable();
  readonly activeVessel$: Observable<any> = this.activeVesselSource.asObservable();

  constructor(
    private http: HttpClientService,
    private store: Store<any>
  ) {}

  start(interval?: number): void {
    this.stop();
    this.resetData();

    const safeInterval = interval && interval > 0 ? interval : this.defaultInterval;
    this.loadRealtimeTags(safeInterval);
  }

  private loadRealtimeTags(interval: number): void {
    this.tagFileSubscription = this.http
      .getJsonFile('/assets/tags/dashboard.tag.json')
      .subscribe({
        next: (res: any) => {
          this.realtimeTags = this.mapRealtimeTags(res);
          this.startTimer(interval);

          if (this.pendingVessel) {
            const pending = this.pendingVessel;
            this.pendingVessel = null;
            this.setActiveVessel(pending);
          }
        },
        error: (error) => {
          console.error('[FvRealtimeService] load tags error:', error);
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

        if (tag?.name && tag?.tagName) {
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
    if (this.activePayload) {
      this.emitRealtimePayload(this.activePayload);
    }
  }

  setActiveVessel(vessel: any): void {
    if (!vessel) {
      return;
    }

    this.activeVesselSource.next(vessel);

    try {
      localStorage.setItem('selectedVessel', JSON.stringify(vessel));
      localStorage.setItem('realtimeVessel', JSON.stringify(vessel));
    } catch {}

    this.store.dispatch(new fvInfoActions.SetFvActive(vessel));

    if (!this.realtimeTags || this.realtimeTags.length === 0) {
      this.pendingVessel = vessel;
      return;
    }

    const payload = this.generateTags(vessel);

    if (!payload) {
      this.pendingVessel = vessel;
      return;
    }

    this.activePayload = payload;
    this.emitRealtimePayload(payload);
  }

  setDelay(offset: number, vessel: any): void {
    const delay = Math.max(offset, 1) * 100;

    setTimeout(() => {
      if (!vessel?.fvInfo?.prefix && !vessel?.prefix) {
        return;
      }

      const prefix = vessel?.fvInfo?.prefix || vessel?.prefix;
      const isLoaded = this.loadedVessels.includes(prefix);

      if (isLoaded) {
        return;
      }

      this.loadedVessels.push(prefix);
      this.setActiveVessel(vessel);
    }, delay);
  }

  private emitRealtimePayload(payload: any): void {
    this.realtimePayloadSource.next(payload);
    this.store.dispatch(new fvInfoActions.SetRealtimeActive(payload));
  }

  private generateTags(vessel: any): any {
    if (!vessel) {
      return null;
    }

    const fvInfo = vessel?.fvInfo || vessel?.fv || vessel;
    const prefix = fvInfo?.prefix || fvInfo?.id || fvInfo?.name;

    if (!prefix) {
      return null;
    }

    if (!this.realtimeTags || this.realtimeTags.length === 0) {
      return null;
    }

    const tags = this.realtimeTags.map((tag) => ({
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
    this.realtimeTags = [];
    this.loadedVessels = [];
    this.activePayload = null;
    this.pendingVessel = null;
  }

  private readStoredVessel(): any {
    try {
      const raw = localStorage.getItem('realtimeVessel') || localStorage.getItem('selectedVessel');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}
