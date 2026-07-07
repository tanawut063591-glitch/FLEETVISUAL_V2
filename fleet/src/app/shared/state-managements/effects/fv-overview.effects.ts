import { Injectable } from '@angular/core';

import { Actions, Effect } from '@ngrx/effects';
import { Observable, of } from 'rxjs';
import { catchError, filter, map, mergeMap, retry } from 'rxjs/operators';

import * as fvOverviewActions from '../actions/fv-overview.action';

import { NewHttpClientService } from '../../services/http-client1.service';

@Injectable()
export class FvOverviewEffects {
  @Effect()
  setFvDataActive$: Observable<any>;

  constructor(
    private actions$: Actions,
    private newHttp: NewHttpClientService
  ) {
    this.setFvDataActive$ = (this.actions$ as any as Observable<any>).pipe(
      filter((action: any) => {
        return action && action.type === fvOverviewActions.GET_FV_OVERVIEW;
      }),

      mergeMap((action: any) => {
        const payload = Array.isArray(action.payload) ? action.payload : [];

        const request: { Name: string[] } = {
          Name: [],
        };

        payload.forEach((item: any) => {
          if (!item || !Array.isArray(item.tags)) {
            return;
          }

          const tagNames = item.tags
            .map((tag: any) => {
              return tag && tag.tagName ? tag.tagName : '';
            })
            .filter((tagName: string) => !!tagName);

          request.Name = request.Name.concat(tagNames);
        });

        if (request.Name.length === 0) {
          return of(new fvOverviewActions.GetFvOverviewSuccess(payload));
        }

        return this.newHttp.getOverviewCurrentsValues(request).pipe(
          retry(2),

          map((res: any) => {
            const responseList = Array.isArray(res) ? res : [];
            const resArr: any[] = [];

            responseList.forEach((item: any) => {
              const fullTagName = item && item.Name ? item.Name : '';

              if (!fullTagName) {
                return;
              }

              const prefix = fullTagName.split('-')[0] + '-';

              const cleanName = fullTagName
                .replace(prefix, '')
                .split('-')
                .join('_');

              resArr.push({
                tagName: fullTagName,
                name: cleanName,
                value: String(item && item.Value != null ? item.Value : ''),
                dateTime: item && item.TimeStamp ? item.TimeStamp : '',
                cal: false,
              });
            });

            payload.forEach((vessel: any) => {
              if (!vessel || !Array.isArray(vessel.tags)) {
                return;
              }

              vessel.datas = [];

              resArr.forEach((data: any) => {
                const hasTag = vessel.tags.some((tag: any) => {
                  return tag && tag.tagName === data.tagName;
                });

                if (hasTag) {
                  vessel.datas.push(data);
                }
              });
            });

            return new fvOverviewActions.GetFvOverviewSuccess(payload);
          }),

          catchError((error: any) => {
            console.error('FvOverviewEffects error:', error);
            return of(new fvOverviewActions.GetFvOverviewFailure(error));
          })
        );
      })
    );
  }
}