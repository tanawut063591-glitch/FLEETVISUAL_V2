import { Action, createFeatureSelector, createSelector } from '@ngrx/store';

import * as fvOverviewActions from '../actions/fv-overview.action';
import { FvOverview } from '../states/app.states';
import { error, success } from '../models/response';

export const initialState: FvOverview = {
  fvOverview: [],
  message: '',
  statuscode: 0,
};

export function reducer(
  state: FvOverview = initialState,
  action: Action
): FvOverview {
  switch (action.type) {
    case fvOverviewActions.GET_FV_OVERVIEW_FAILURE: {
      return {
        fvOverview: state.fvOverview,
        message: error.message,
        statuscode: error.statusCode,
      };
    }

    case fvOverviewActions.GET_FV_OVERVIEW_SUCCESS: {
      const payloadAction =
        action as fvOverviewActions.GetFvOverviewSuccess;

      return {
        fvOverview: payloadAction.payload || [],
        message: success.message,
        statuscode: success.statusCode,
      };
    }

    default:
      return state;
  }
}

export const getFvOverviewState =
  createFeatureSelector<FvOverview>('fvOverview');

export const getFvOverviewData = createSelector(
  getFvOverviewState,
  (state: FvOverview) => {
    if (!state || !Array.isArray(state.fvOverview)) {
      return [];
    }

    return state.fvOverview;
  }
);