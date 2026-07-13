import { ActionReducerMap } from '@ngrx/store';

import * as fvInfoReducer from './fv-info.reducer';
import * as fvOverviewReducer from './fv-overview.reducer';

export interface AppReducerState {
  fvState: any;
  fvOverview: any;
}

export const reducers: ActionReducerMap<AppReducerState, any> = {
  fvState: fvInfoReducer.reducer as any,
  fvOverview: fvOverviewReducer.reducer as any,
};