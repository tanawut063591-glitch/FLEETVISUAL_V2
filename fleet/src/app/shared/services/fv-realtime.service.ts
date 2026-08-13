import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { BehaviorSubject, Observable, Subject, Subscription, timer } from 'rxjs';
import { timeout } from 'rxjs/operators';

import { HttpClientService } from './http-client.service';
import { NewHttpClientService } from './http-client1.service';
import * as fvInfoActions from '../../store/actions/fv-info.action';

@Injectable({
  providedIn: 'root',
})
export class FvRealtimeService {
  private timerSubscription: Subscription | null = null;
  private tagFileSubscription: Subscription | null = null;
  private realtimeRequestSubscription: Subscription | null = null;

  private readonly defaultInterval = 5000;
  private activeInterval = 0;

  private realtimeTags: any[] = [];
  private loadedVessels: string[] = [];
  private activePayload: any = null;
  private pendingVessel: any = null;
  private isStarted = false;
  private isLoadingTags = false;
  private isRequesting = false;

  private readonly realtimePayloadSource = new Subject<any>();
  private readonly activeVesselSource = new BehaviorSubject<any>(this.readStoredVessel());
  private readonly currentDataSource = new BehaviorSubject<Record<string, any>>({});
  private readonly lastUpdatedSource = new BehaviorSubject<Date | null>(null);
  private readonly loadingSource = new BehaviorSubject<boolean>(false);

  readonly realtimePayload$: Observable<any> = this.realtimePayloadSource.asObservable();
  readonly activeVessel$: Observable<any> = this.activeVesselSource.asObservable();
  readonly currentData$: Observable<Record<string, any>> = this.currentDataSource.asObservable();
  readonly lastUpdated$: Observable<Date | null> = this.lastUpdatedSource.asObservable();
  readonly loading$: Observable<boolean> = this.loadingSource.asObservable();

  constructor(
    private http: HttpClientService,
    private newHttp: NewHttpClientService,
    private store: Store<any>
  ) {}





  start(interval?: number): void {
    this.stopTimerOnly();
    this.resetData(false);
    this.isStarted = true;

    const safeInterval = interval && interval > 0 ? interval : this.defaultInterval;
    this.activeInterval = safeInterval;

    if (this.realtimeTags.length > 0) {
      this.startTimer(safeInterval);
      const vessel = this.pendingVessel || this.activeVesselSource.value || this.readStoredVessel();
      this.pendingVessel = null;
      if (vessel) {
        this.setActiveVessel(vessel);
      }
      return;
    }

    this.loadRealtimeTags(safeInterval);
  }





  ensureStarted(interval?: number): void {
    const safeInterval = interval && interval > 0 ? interval : this.defaultInterval;

    if (
      this.isStarted &&
      this.activeInterval === safeInterval &&
      (this.timerSubscription || this.isLoadingTags)
    ) {
      return;
    }

    this.start(safeInterval);
  }




  refreshNow(): void {
    this.refreshActiveData();
  }

  getActiveVesselSnapshot(): any {
    return this.activeVesselSource.value;
  }

  getCurrentDataSnapshot(): Record<string, any> {
    return this.currentDataSource.value || {};
  }

  private loadRealtimeTags(interval: number): void {
    if (this.isLoadingTags) {
      return;
    }

    this.isLoadingTags = true;
    this.tagFileSubscription = this.http
      .getJsonFile('/assets/tags/dashboard.tag.json')
      .subscribe({
        next: (res: any) => {
          this.isLoadingTags = false;
          this.realtimeTags = this.mapRealtimeTags(res);
          this.startTimer(interval);

          const vessel = this.pendingVessel || this.activeVesselSource.value || this.readStoredVessel();
          this.pendingVessel = null;

          if (vessel) {
            this.setActiveVessel(vessel);
          }
        },
        error: (error) => {
          this.isLoadingTags = false;
          console.error('[FvRealtimeService] load tags error:', error);
          this.resetData(false);
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
            prefixes: Array.isArray(tag.prefixes) ? tag.prefixes : undefined,
          });
        }
      });
    });

    return tags;
  }

  private startTimer(interval: number): void {
    this.timerSubscription?.unsubscribe();


    this.timerSubscription = timer(0, interval).subscribe(() => {
      this.refreshActiveData();
    });
  }

  setActiveVessel(vessel: any): void {
    if (!vessel) {
      return;
    }

    const previousIdentity = this.getVesselIdentity(this.activeVesselSource.value);
    const nextIdentity = this.getVesselIdentity(vessel);

    if (previousIdentity && nextIdentity && previousIdentity !== nextIdentity) {



      this.realtimeRequestSubscription?.unsubscribe();
      this.realtimeRequestSubscription = null;
      this.isRequesting = false;
      this.currentDataSource.next({});
      this.lastUpdatedSource.next(null);
      this.loadingSource.next(false);
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
    this.realtimePayloadSource.next(payload);
    this.refreshActiveData();
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

  private refreshActiveData(): void {


    if (typeof document !== 'undefined' && document.hidden) {
      return;
    }

    const payload = this.activePayload;

    if (!payload || !Array.isArray(payload.tags) || payload.tags.length === 0) {
      return;
    }

    const prefix = payload?.fv?.prefix || payload?.fv?.name || '';

    if (!prefix) {
      return;
    }

    if (this.isRequesting) {



      return;
    }

    this.isRequesting = true;
    this.loadingSource.next(true);

    this.realtimeRequestSubscription?.unsubscribe();
    this.realtimeRequestSubscription = this.newHttp
      .getCurrentValues(payload.tags, prefix)
      .pipe(timeout(15_000))
      .subscribe({
        next: (response: any) => {
          const data = this.normalizeRealtimeResponse(response, prefix);

          this.currentDataSource.next(data);
          this.lastUpdatedSource.next(new Date());

          this.store.dispatch(
            new fvInfoActions.SetRealtimeActiveSuccess({
              data,
              fv: payload.fv,
            })
          );
        },
        error: (error: any) => {
          console.error('[FvRealtimeService] live realtime error:', error);
          this.finishRealtimeRequest();
        },
        complete: () => {
          this.finishRealtimeRequest();
        },
      });
  }

  private finishRealtimeRequest(): void {
    this.isRequesting = false;
    this.loadingSource.next(false);


  }

  private normalizeRealtimeResponse(response: any, prefix: string): Record<string, any> {
    const result: Record<string, any> = {};
    const list = this.extractRealtimeArray(response);

    list.forEach((item: any) => {
      const tagName = this.readTagName(item);

      if (!tagName) {
        return;
      }

      const cleanName = this.cleanTagName(tagName, prefix);
      const value = this.readTagValue(item);
      const timestamp = this.readTagTimestamp(item);

      const hasValue = value !== null && value !== undefined && value !== '';
      const normalizedItem = {
        ...item,
        name: cleanName,
        tagName,
        value: hasValue ? String(value) : '',
        rawValue: value,
        hasValue,
        timestamp,
        cal: false,
      };

      result[cleanName] = normalizedItem;
      result[this.normalizeKey(cleanName)] = normalizedItem;
      result[this.normalizeKey(tagName)] = normalizedItem;
    });

    return result;
  }

  private extractRealtimeArray(response: any): any[] {
    if (Array.isArray(response)) {
      return response;
    }

    const candidates = [
      response?.data,
      response?.Data,
      response?.result,
      response?.Result,
      response?.results,
      response?.Results,
      response?.items,
      response?.Items,
      response?.values,
      response?.Values,
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate;
      }
    }

    if (response && typeof response === 'object') {
      return Object.keys(response).map((key) => {
        const value = response[key];

        if (value && typeof value === 'object') {
          return {
            Name: value.Name || value.name || value.TagName || value.tagName || key,
            ...value,
          };
        }

        return {
          Name: key,
          Value: value,
        };
      });
    }

    return [];
  }

  private readTagName(item: any): string {
    return String(
      item?.Name ||
        item?.name ||
        item?.TagName ||
        item?.tagName ||
        item?.Key ||
        item?.key ||
        ''
    );
  }

  private readTagValue(item: any): any {
    return (
      item?.Value ??
      item?.value ??
      item?.IValue ??
      item?.iValue ??
      item?.ivalue ??
      item?.CurrentValue ??
      item?.currentValue ??
      item?.ActualValue ??
      item?.actualValue ??
      item?.Val ??
      item?.val ??
      null
    );
  }

  private readTagTimestamp(item: any): any {
    return (
      item?.TimeStamp ||
      item?.timestamp ||
      item?.Timestamp ||
      item?.timeStamp ||
      item?.DateTime ||
      item?.dateTime ||
      item?.datetime ||
      new Date().toISOString()
    );
  }

  private cleanTagName(tagName: string, prefix: string): string {
    let cleanName = String(tagName || '');

    if (prefix) {
      const prefixDash = `${prefix}-`;
      const prefixUnderscore = `${prefix}_`;

      if (cleanName.toUpperCase().startsWith(prefixDash.toUpperCase())) {
        cleanName = cleanName.substring(prefixDash.length);
      }

      if (cleanName.toUpperCase().startsWith(prefixUnderscore.toUpperCase())) {
        cleanName = cleanName.substring(prefixUnderscore.length);
      }
    }

    return this.normalizeKey(cleanName);
  }

  private normalizeKey(value: string): string {
    return String(value || '')
      .replace(/-/g, '_')
      .toUpperCase();
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

    const normalizedPrefix = this.normalizeKey(String(prefix)).replace(/_/g, '');
    const tags = this.realtimeTags
      .filter((tag) => {
        if (!Array.isArray(tag?.prefixes) || tag.prefixes.length === 0) {
          return true;
        }

        return tag.prefixes.some(
          (allowedPrefix: string) =>
            this.normalizeKey(String(allowedPrefix)).replace(/_/g, '') === normalizedPrefix
        );
      })
      .map((tag) => ({
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
    this.stopTimerOnly();
    this.isStarted = false;
    this.activeInterval = 0;
    this.resetData(true);
  }

  private stopTimerOnly(): void {
    this.timerSubscription?.unsubscribe();
    this.tagFileSubscription?.unsubscribe();
    this.realtimeRequestSubscription?.unsubscribe();

    this.timerSubscription = null;
    this.tagFileSubscription = null;
    this.realtimeRequestSubscription = null;
    this.isLoadingTags = false;
    this.isRequesting = false;
    this.loadingSource.next(false);
  }

  private resetData(clearCurrentData: boolean): void {
    this.loadedVessels = [];
    this.activePayload = null;
    this.pendingVessel = null;

    if (clearCurrentData) {
      this.currentDataSource.next({});
      this.lastUpdatedSource.next(null);
    }
  }

  private getVesselIdentity(vessel: any): string {
    const info = vessel?.fvInfo || vessel?.fv || vessel || {};
    return String(
      info?.prefix ||
        info?.id ||
        info?._id ||
        info?.vesselId ||
        info?.name ||
        info?.Name ||
        ''
    )
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
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
