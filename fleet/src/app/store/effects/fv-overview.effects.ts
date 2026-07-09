import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { catchError, map, mergeMap, retry } from 'rxjs/operators';

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
      mergeMap((action: any) => {
        const payload = Array.isArray(action.payload) ? action.payload : [];

        const overviewItems = this.cloneOverviewPayload(payload);
        const request = this.buildOverviewRequest(overviewItems);

        if (!request.Name.length) {
          return of(new fvOverviewActions.GetFvOverviewSuccess(overviewItems));
        }

        return this.newHttp.getOverviewCurrentsValues(request).pipe(
          retry(2),
          map((res: ResponseRealtime[]) => {
            const result = this.mapRealtimeToOverview(overviewItems, res);
            return new fvOverviewActions.GetFvOverviewSuccess(result);
          }),
          catchError((error: any) => {
            console.error('[FvOverviewEffects] GET_FV_OVERVIEW error:', error);

            return of(
              new fvOverviewActions.GetFvOverviewSuccess(overviewItems)
            );
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
    const names: string[] = [];

    for (const item of items) {
      const tags = Array.isArray(item.tags) ? item.tags : [];

      for (const tag of tags) {
        const tagName = tag && tag.tagName ? tag.tagName : '';

        if (tagName && names.indexOf(tagName) === -1) {
          names.push(tagName);
        }
      }
    }

    return {
      Name: names,
    };
  }

  private mapRealtimeToOverview(
    overviewItems: any[],
    response: ResponseRealtime[] = []
  ): any[] {
    const responseList = Array.isArray(response) ? response : [];
    const dataByTagName: { [tagName: string]: OverviewDataItem } = {};

    for (const item of responseList) {
      const tagName = item && item.Name ? item.Name : '';

      if (!tagName) {
        continue;
      }

      dataByTagName[tagName] = {
        tagName,
        name: this.convertTagNameToDataName(tagName),
        value: String(
          item.Value !== null && item.Value !== undefined ? item.Value : '0'
        ),
        dateTime: item.TimeStamp || '',
        cal: false,
      };
    }

    return overviewItems.map((overviewItem: any) => {
      const tags = Array.isArray(overviewItem.tags) ? overviewItem.tags : [];
      const datas: OverviewDataItem[] = [];

      for (const tag of tags) {
        const tagName = tag && tag.tagName ? tag.tagName : '';

        if (tagName && dataByTagName[tagName]) {
          datas.push(dataByTagName[tagName]);
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

    const nameWithoutPrefix =
      firstDashIndex >= 0
        ? tagName.substring(firstDashIndex + 1)
        : tagName;

    return nameWithoutPrefix.replace(/-/g, '_');
  }
}