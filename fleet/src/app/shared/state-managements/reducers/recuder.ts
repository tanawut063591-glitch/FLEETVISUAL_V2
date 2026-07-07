import { Action, ActionReducerMap } from '@ngrx/store';

import * as fvInfoReducer from './fv-info.reducer';
import * as fvOverviewReducer from './fv-overview.reducer';

export interface AppState {
  fvInfo: any;
  fvOverview: any;
}

export function reducerFvInfo(state: any, action: Action): any {
  return fvInfoReducer.reducer(state, action as any);
}

export function reducerFvOverview(state: any, action: Action): any {
  return fvOverviewReducer.reducer(state, action as any);
}

export const reducers: ActionReducerMap<AppState, Action> = {
  fvInfo: reducerFvInfo,
  fvOverview: reducerFvOverview,
};