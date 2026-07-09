import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { from, of } from 'rxjs';
import {
  catchError,
  exhaustMap,
  map,
  switchMap,
  withLatestFrom,
} from 'rxjs/operators';

import * as fvInfoActions from '../actions/fv-info.action';
import * as fvInfoReducer from '../reducers/fv-info.reducer';

import { NewHttpClientService } from '../../shared/services/http-client1.service';
import { FV } from '../models/fv.model';

interface ApiVesselInfo {
  id?: string;
  name?: string;
  description?: string;
  image?: string;
  lattitude?: number | string;
  latitude?: number | string;
  longtitude?: number | string;
  longitude?: number | string;
  prefix?: string;
  timestamp?: string | Date;
}

interface RealtimeTagValue {
  Name?: string;
  Value?: any;
  TimeStamp?: string | Date;
}

@Injectable()
export class FvInfoEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store<any>);
  private readonly newHttp = inject(NewHttpClientService);

  loadFvInfos$ = createEffect(() =>
    this.actions$.pipe(
      ofType(fvInfoActions.INIT_FV_INFO),
      withLatestFrom(this.store.select(fvInfoReducer.getFvInfoState)),
      exhaustMap(([_, storeState]: [any, any]) =>
        from(this.newHttp.getVesselInfo2()).pipe(
          map((response: ApiVesselInfo[] = []) => {
            const oldFvState: FV[] =
              storeState && Array.isArray(storeState.fvState)
                ? storeState.fvState
                : [];

            const dataArr: ApiVesselInfo[] = Array.isArray(response)
              ? [...response]
              : [];

            if (this.newHttp.compare && dataArr.length > 1) {
              dataArr.sort(this.newHttp.compare);
            }

            const activeVessel = oldFvState.find(
              (item: FV) => item.fvInfo && item.fvInfo.active === true
            );

            const nextData: FV[] = dataArr.map((item: ApiVesselInfo) => {
              const oldItem = oldFvState.find(
                (old: FV) =>
                  old.fvInfo &&
                  old.fvInfo.name === item.name
              );

              const lat = item.lattitude ?? item.latitude ?? '';
              const long = item.longtitude ?? item.longitude ?? '';
              const timestamp = this.safeDate(item.timestamp);

              return {
                fvInfo: {
                  desc: item.description || '',
                  img: item.image || '',
                  lat: String(lat),
                  long: String(long),
                  name: item.name || '',
                  prefix: item.prefix || '',
                  active: false,
                  timestamp,
                },
                data: oldItem && oldItem.data ? oldItem.data : [],
              };
            });

            if (nextData.length > 0) {
              const activeIndex = activeVessel
                ? nextData.findIndex(
                    (item: FV) =>
                      item.fvInfo.name === activeVessel.fvInfo.name ||
                      item.fvInfo.prefix === activeVessel.fvInfo.prefix
                  )
                : -1;

              if (activeIndex >= 0) {
                nextData[activeIndex] = {
                  ...nextData[activeIndex],
                  fvInfo: {
                    ...nextData[activeIndex].fvInfo,
                    active: true,
                  },
                };
              } else {
                nextData[0] = {
                  ...nextData[0],
                  fvInfo: {
                    ...nextData[0].fvInfo,
                    active: true,
                  },
                };
              }
            }

            const finalData = nextData.length > 0 ? nextData : oldFvState;

            return new fvInfoActions.GetFvInfoSuccess(finalData);
          }),
          catchError((error: any) => {
            console.error('[FvInfoEffects] loadFvInfos error:', error);

            const fallbackData: FV[] =
              storeState && Array.isArray(storeState.fvState)
                ? storeState.fvState
                : [];

            return of(new fvInfoActions.GetFvInfoSuccess(fallbackData));
          })
        )
      )
    )
  );

  setFvActive$ = createEffect(() =>
    this.actions$.pipe(
      ofType(fvInfoActions.SET_FV_ACTIVE),
      withLatestFrom(this.store.select(fvInfoReducer.getFvInfoState)),
      map(([action, storeState]: [any, any]) => {
        const payload = action.payload || {};

        const currentFvState: FV[] =
          storeState && Array.isArray(storeState.fvState)
            ? storeState.fvState
            : [];

        const selectedName = payload.name || payload.fvInfo?.name || '';
        const selectedPrefix = payload.prefix || payload.fvInfo?.prefix || '';

        const updatedState: FV[] = currentFvState.map((item: FV) => {
          const itemName = item.fvInfo?.name || '';
          const itemPrefix = item.fvInfo?.prefix || '';

          return {
            ...item,
            fvInfo: {
              ...item.fvInfo,
              active:
                itemName === selectedName ||
                itemPrefix === selectedPrefix,
            },
          };
        });

        return new fvInfoActions.SetFvActiveSuccess(updatedState);
      }),
      catchError((error: any) => {
        console.error('[FvInfoEffects] setFvActive error:', error);
        return of(new fvInfoActions.SetFvActiveSuccess([]));
      })
    )
  );

  setFvDataActive$ = createEffect(() =>
    this.actions$.pipe(
      ofType(fvInfoActions.SET_REALTIME_ACTIVE),
      switchMap((action: any) => {
        const payload = action.payload || {};
        const tags = payload.tags || [];
        const fv = payload.fv || {};
        const prefix = fv.prefix || '';

        return this.newHttp.getCurrentValues(tags, prefix).pipe(
          map((res: RealtimeTagValue[] = []) => {
            const response = Array.isArray(res) ? res : [];

            const normalizedData = response.map((item: RealtimeTagValue) => {
              const tagName = item.Name || '';

              const cleanName = tagName
                .replace(`${prefix}-`, '')
                .replace(/-/g, '_');

              return {
                tagName,
                name: cleanName,
                value: String(item.Value ?? '0'),
                dateTime: item.TimeStamp || '',
                cal: false,
              };
            });

            return {
              data: normalizedData,
              fv,
            };
          }),
          map((res: any) => {
            const data: Record<string, any> = {};

            for (const item of res.data) {
              data[item.name] = {
                value: item.value,
                name: item.name,
                tagName: item.tagName,
                timestamp: item.dateTime,
                cal: item.cal,
              };
            }

            return new fvInfoActions.SetRealtimeActiveSuccess({
              ...res,
              data,
            });
          }),
          catchError((error: any) => {
            console.error('[FvInfoEffects] setFvDataActive error:', error);

            return of(
              new fvInfoActions.SetRealtimeActiveSuccess({
                data: {},
                fv,
              })
            );
          })
        );
      })
    )
  );

  private safeDate(value: string | Date | undefined): Date {
    if (!value) {
      return new Date();
    }

    const date = new Date(value);

    if (isNaN(date.getTime())) {
      return new Date();
    }

    return date;
  }
}