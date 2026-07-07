import { Injectable } from '@angular/core';

import { Actions, Effect } from '@ngrx/effects';
import { Store } from '@ngrx/store';

import { Observable, from, of } from 'rxjs';
import {
  catchError,
  filter,
  map,
  mergeMap,
  switchMap,
  withLatestFrom,
} from 'rxjs/operators';

import * as fvInfoActions from '../actions/fv-info.action';
import * as fvInfoReducer from '../reducers/fv-info.reducer';

import { AppState } from '../states/app.states';
import { FV } from '../models/fv.model';

import { NewHttpClientService } from '../../services/http-client1.service';

@Injectable()
export class FvInfoEffects {
  @Effect()
  loadFvInfos$!: Observable<any>;

  @Effect()
  setFvActive$!: Observable<any>;

  @Effect()
  setFvDataActive$!: Observable<any>;

  constructor(
    private actions$: Actions,
    private store: Store<AppState>,
    private newHttp: NewHttpClientService
  ) {
    const actionsStream$ = this.actions$ as any as Observable<any>;

    this.loadFvInfos$ = actionsStream$.pipe(
      filter((action: any) => {
        return action && action.type === fvInfoActions.INIT_FV_INFO;
      }),

      withLatestFrom(this.store.select(fvInfoReducer.getFvInfoState)),

      switchMap(([action, store]: [any, any]) => {
        return from(this.newHttp.getVesselInfo2()).pipe(
          map((response: any[]) => {
            const dataArr = Array.isArray(response) ? [...response] : [];

            dataArr.sort(this.newHttp.compare);

            const currentState = Array.isArray(store && store.fvState)
              ? store.fvState
              : [];

            const data: FV[] = [];

            dataArr.forEach((item: any) => {
              if (!item || !item.name) {
                return;
              }

              const current = currentState.find((x: any) => {
                return x && x.fvInfo && x.fvInfo.name === item.name;
              });

              const currentData = current && current.data ? current.data : [];

              const timestamp = item.timestamp
                ? new Date(new Date(item.timestamp).getTime() - 25200000)
                : new Date();

              const fvInfo = {
                desc: item.description || '',
                img: item.image || '',
                lat: item.lattitude != null ? String(item.lattitude) : '',
                long: item.longtitude != null ? String(item.longtitude) : '',
                name: item.name || '',
                prefix: item.prefix || '',
                active: false,
                timestamp,
              };

              data.push({
                fvInfo,
                data: currentData,
              } as FV);
            });

            const active = currentState.find((x: any) => {
              return x && x.fvInfo && x.fvInfo.active === true;
            });

            if (active) {
              const match = data.find((x: any) => {
                return (
                  x &&
                  x.fvInfo &&
                  active.fvInfo &&
                  x.fvInfo.name === active.fvInfo.name
                );
              });

              if (match && match.fvInfo) {
                match.fvInfo.active = true;
              } else if (data.length > 0) {
                data[0].fvInfo.active = true;
              }
            } else if (data.length > 0) {
              data[0].fvInfo.active = true;
            }

            return new fvInfoActions.GetFvInfoSuccess(data);
          }),

          catchError((error: any) => {
            console.error('Load vessel info error:', error);
            return of(new fvInfoActions.GetFvInfoSuccess([]));
          })
        );
      })
    );

    this.setFvActive$ = actionsStream$.pipe(
      filter((action: any) => {
        return action && action.type === fvInfoActions.SET_FV_ACTIVE;
      }),

      withLatestFrom(this.store.select(fvInfoReducer.getFvInfoState)),

      map(([action, store]: [any, any]) => {
        const payload = action.payload;

        const currentState = Array.isArray(store && store.fvState)
          ? [...store.fvState]
          : [];

        currentState.forEach((item: any) => {
          if (item && item.fvInfo) {
            item.fvInfo.active = false;
          }
        });

        const active = currentState.find((item: any) => {
          return (
            item &&
            item.fvInfo &&
            payload &&
            item.fvInfo.name === payload.name
          );
        });

        if (active && active.fvInfo) {
          active.fvInfo.active = true;
        }

        return new fvInfoActions.SetFvActiveSuccess(currentState);
      })
    );

    this.setFvDataActive$ = actionsStream$.pipe(
      filter((action: any) => {
        return action && action.type === fvInfoActions.SET_REALTIME_ACTIVE;
      }),

      mergeMap((action: any) => {
        const payload = action.payload;

        if (!payload || !payload.tags || !payload.fv) {
          return of(
            new fvInfoActions.SetRealtimeActiveSuccess({
              data: {},
              fv: payload && payload.fv ? payload.fv : null,
            })
          );
        }

        return this.newHttp
          .getCurrentValues(payload.tags, payload.fv.prefix)
          .pipe(
            map((res: any[]) => {
              const responseList = Array.isArray(res) ? res : [];

              const realtimeList = responseList.map((item: any) => {
                const tagName = item && item.Name ? item.Name : '';
                const prefix = payload.fv.prefix
                  ? payload.fv.prefix + '-'
                  : '';

                const cleanName = tagName
                  .replace(prefix, '')
                  .split('-')
                  .join('_');

                return {
                  tagName,
                  name: cleanName,
                  value: String(item && item.Value != null ? item.Value : '0'),
                  dateTime: item && item.TimeStamp ? item.TimeStamp : '',
                  cal: false,
                };
              });

              const data: any = {};

              realtimeList.forEach((item: any) => {
                if (!item.name) {
                  return;
                }

                data[item.name] = {
                  value: item.value,
                  name: item.name,
                  tagName: item.tagName,
                  timestamp: item.dateTime,
                  cal: item.cal,
                };
              });

              return new fvInfoActions.SetRealtimeActiveSuccess({
                data,
                fv: payload.fv,
              });
            }),

            catchError((error: any) => {
              console.error('Realtime active error:', error);

              return of(
                new fvInfoActions.SetRealtimeActiveSuccess({
                  data: {},
                  fv: payload.fv,
                })
              );
            })
          );
      })
    );
  }
}