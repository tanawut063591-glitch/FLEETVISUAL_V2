import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { catchError, exhaustMap, map, timeout } from 'rxjs/operators';

import * as fvOverviewActions from '../actions/fv-overview.action';
import { ResponseRealtime } from '../models/response';
import { NewHttpClientService } from '../../shared/services/http-client1.service';

interface OverviewRequest {
  Name: string[];
}

interface OverviewDataItem {
  tagName: string;
  name: string;
  value: string;
  dateTime: any;
  cal: boolean;
}

@Injectable()
export class FvOverviewEffects {
  private readonly actions$ = inject(Actions as any) as Actions;
  private readonly newHttp = inject(NewHttpClientService);

  setFvDataActive$ = createEffect(() =>
    this.actions$.pipe(
      ofType(fvOverviewActions.GET_FV_OVERVIEW),
      exhaustMap((action: any) => {
        const payload = Array.isArray(action.payload) ? action.payload : [];
        const overviewItems = this.cloneOverviewPayload(payload);
        const request = this.buildOverviewRequest(overviewItems);

        if (!request.Name.length) {
          return of(new fvOverviewActions.GetFvOverviewSuccess(overviewItems));
        }

        return this.newHttp.getOverviewCurrentsValues(request).pipe(
          timeout(15_000),
          map((res: any) => {
            const result = this.mapRealtimeToOverview(
              overviewItems,
              this.extractRealtimeArray(res)
            );
            return new fvOverviewActions.GetFvOverviewSuccess(result);
          }),
          catchError((error: any) => {
            console.error('[FvOverviewEffects] GET_FV_OVERVIEW error:', error);
            return of(new fvOverviewActions.GetFvOverviewFailure(error));
          })
        );
      })
    )
  );

  private cloneOverviewPayload(payload: any[]): any[] {
    return payload.map((item: any) => ({
      ...item,
      tags: Array.isArray(item.tags) ? [...item.tags] : [],
      datas: [],
    }));
  }

  private buildOverviewRequest(items: any[]): OverviewRequest {
    const names = new Set<string>();

    for (const item of items) {
      const tags = Array.isArray(item.tags) ? item.tags : [];
      for (const tag of tags) {
        const tagName = tag?.tagName || '';
        if (tagName) {
          names.add(tagName);
        }
      }
    }

    return { Name: Array.from(names) };
  }

  private extractRealtimeArray(response: any): ResponseRealtime[] {
    if (Array.isArray(response)) {
      return response as ResponseRealtime[];
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
        return candidate as ResponseRealtime[];
      }
    }

    return [];
  }

  private mapRealtimeToOverview(
    overviewItems: any[],
    response: ResponseRealtime[] = []
  ): any[] {
    const responseList = Array.isArray(response) ? response : [];
    const dataByTagName = new Map<string, OverviewDataItem>();

    for (const item of responseList) {
      const tagName = item?.Name || '';
      if (!tagName) {
        continue;
      }

      dataByTagName.set(tagName, {
        tagName,
        name: this.convertTagNameToDataName(tagName),
        value: String(item.Value !== null && item.Value !== undefined ? item.Value : '0'),
        dateTime: item.TimeStamp || '',
        cal: false,
      });
    }

    return overviewItems.map((overviewItem: any) => {
      const tags = Array.isArray(overviewItem.tags) ? overviewItem.tags : [];
      const datas: OverviewDataItem[] = [];

      for (const tag of tags) {
        const tagName = tag?.tagName || '';
        const value = tagName ? dataByTagName.get(tagName) : undefined;
        if (value) {
          datas.push(value);
        }
      }

      return {
        ...overviewItem,
        datas,
      };
    });
  }

  private convertTagNameToDataName(tagName: string): string {
    const firstDashIndex = tagName.indexOf('-');
    const nameWithoutPrefix = firstDashIndex >= 0 ? tagName.substring(firstDashIndex + 1) : tagName;
    return nameWithoutPrefix.replace(/-/g, '_');
  }
}
