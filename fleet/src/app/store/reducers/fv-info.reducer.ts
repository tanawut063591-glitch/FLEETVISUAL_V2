import { createFeatureSelector, createSelector } from '@ngrx/store';
import * as fvInfoActions from '../actions/fv-info.action';
import { FvState } from '../states/app.states';
import { error, success } from '../models/response';

export const initialState: FvState = {
  fvState: [],
  message: '',
  statuscode: 0,
};

export function reducer(
  state = initialState,
  action: fvInfoActions.All_FV_INFO_ACTIONS
): FvState {
  switch (action.type) {
    case fvInfoActions.GET_FV_INFO_SUCCESS: {
      const payload = Array.isArray(action.payload) ? action.payload : [];
      return {
        ...state,
        fvState: payload,
        message: success.message,
        statuscode: success.statusCode,
      };
    }

    case fvInfoActions.GET_FV_INFO_FAILURE: {
      return {
        ...state,
        message: error.message,
        statuscode: error.statusCode,
      };
    }

    case fvInfoActions.SET_FV_ACTIVE_SUCCESS: {
      const payload = Array.isArray(action.payload) ? action.payload : [];
      return {
        ...state,
        fvState: payload,
        message: success.message,
        statuscode: success.statusCode,
      };
    }

    case fvInfoActions.SET_FV_ACTIVE_FAILURE: {
      return {
        ...state,
        message: error.message,
        statuscode: error.statusCode,
      };
    }

    case fvInfoActions.SET_REALTIME_ACTIVE_SUCCESS: {
      const payload: any = action.payload || {};
      const payloadFv = payload.fv || {};
      const payloadName = payloadFv.name || payloadFv.fvInfo?.name || '';
      const payloadPrefix = payloadFv.prefix || payloadFv.fvInfo?.prefix || '';
      const payloadData = payload.data || {};

      const fvState = getSafeFvState(state).map((item: any) => {
        const itemName = item?.fvInfo?.name || '';
        const itemPrefix = item?.fvInfo?.prefix || '';
        const isMatch =
          (payloadName && itemName === payloadName) ||
          (payloadPrefix && itemPrefix === payloadPrefix) ||
          item?.fvInfo?.active === true;

        if (!isMatch) {
          return item;
        }

        return {
          ...item,
          data: payloadData,
        };
      });

      return {
        ...state,
        fvState,
        message: success.message,
        statuscode: success.statusCode,
      };
    }

    case fvInfoActions.SET_REALTIME_ACTIVE_FAILURE: {
      return {
        ...state,
        message: error.message,
        statuscode: error.statusCode,
      };
    }

    default:
      return state;
  }
}

export const getFvInfoState = createFeatureSelector<FvState>('fvState');

export const getFvInfos = createSelector(
  getFvInfoState,
  (state: FvState) => getSafeFvState(state).map((x: any) => x.fvInfo).filter(Boolean)
);

export const getFvInfosActive = createSelector(
  getFvInfoState,
  (state: FvState) => getSafeFvState(state).find((x: any) => x?.fvInfo?.active === true) || null
);

export const getFvNoData = createSelector(
  getFvInfoState,
  (state: FvState) => getSafeFvState(state).filter((x: any) => !x?.data || Object.keys(x.data).length === 0)
);

export const getFvRealtimeData = createSelector(
  getFvInfoState,
  (state: FvState) => {
    const active = getSafeFvState(state).find((x: any) => x?.fvInfo?.active === true);
    return active?.data || {};
  }
);

export const getFvRealtimeDataLatLong = createSelector(
  getFvInfoState,
  (state: FvState) => {
    const active = getSafeFvState(state).find((x: any) => x?.fvInfo?.active === true);
    return active?.fvInfo || null;
  }
);

export const getFvInfo = createSelector(
  getFvInfoState,
  (state: FvState) => {
    const infos = getSafeFvState(state).map((x: any) => x.fvInfo).filter(Boolean);
    return infos.length > 0 ? infos : null;
  }
);

function getSafeFvState(state: FvState | null | undefined): any[] {
  return state && Array.isArray(state.fvState) ? state.fvState : [];
}
