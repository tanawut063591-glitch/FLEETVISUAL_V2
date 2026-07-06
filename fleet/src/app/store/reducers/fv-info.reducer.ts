import { createFeatureSelector,createSelector } from '@ngrx/store';
import * as fvInfoActions from '../actions/fv-info.action';
import { FvState } from '../states/app.states';
import { error,success } from '../models/response';

export const initialState : FvState = { fvState : [],message:'',statuscode:0}

export function reducer(state = initialState,action:fvInfoActions.All_FV_INFO_ACTIONS) : FvState{
    switch(action.type){
        case fvInfoActions.GET_FV_INFO_SUCCESS : {
            return { fvState : action.payload ,message:success.message,statuscode:success.statusCode}
        }
        case fvInfoActions.GET_FV_INFO_FAILURE : {
            return { fvState : state.fvState ,message:error.message,statuscode:error.statusCode}
        }
        case fvInfoActions.SET_FV_ACTIVE_SUCCESS : {
            return { fvState : action.payload ,message:success.message,statuscode:success.statusCode}
        }
        case fvInfoActions.SET_FV_ACTIVE_FAILURE : {
            return { fvState : state.fvState ,message:error.message,statuscode:error.statusCode}
        }
        case fvInfoActions.SET_REALTIME_ACTIVE_SUCCESS : {
            let match = state.fvState.filter(x => x.fvInfo.name == action.payload.fv.name)
            if(match.length >0){
                match[0].data = action.payload.data
            }
            return { fvState : state.fvState ,message:success.message,statuscode:success.statusCode}
        }
        case fvInfoActions.SET_REALTIME_ACTIVE_FAILURE : {
            return { fvState : state.fvState ,message:error.message,statuscode:error.statusCode}
        }
        default :
            return state
    }
}

export const getFvInfoState = createFeatureSelector<FvState>('fvState');

export const getFvInfos = createSelector(
    getFvInfoState,
    (state : FvState) => {
        return (state && state.fvState && state.fvState.length > 0) ? state.fvState.map(x => x.fvInfo) : [] 
    }
)

export const getFvInfosActive = createSelector(
    getFvInfoState,
    (state:FvState) => {
        return (state && state.fvState && state.fvState.length > 0) ? state.fvState.filter(x => x.fvInfo.active ==true)[0] : null
    }
)

export const getFvNoData = createSelector(
    getFvInfoState,
    (state:FvState) => {
       return (state && state.fvState && state.fvState.length > 0) ? state.fvState.filter(x => x.data.length == 0) : []
    }
)

export const getFvRealtimeData = createSelector(
    getFvInfoState,
    (state:FvState) => {
        //console.log(state.fvState.filter(x => x.fvInfo.active == true)[0].data)
       return (state && state.fvState && state.fvState.length > 0) ? state.fvState.filter(x => x.fvInfo.active == true)[0].data : []
    }
)

export const getFvRealtimeDataLatLong = createSelector(
    getFvInfoState,
    (state:FvState) => {
       return (state && state.fvState && state.fvState.length > 0) ? state.fvState.filter(x => x.fvInfo.active == true)[0].fvInfo : null
    }
)

export const getFvInfo = createSelector(
    getFvInfoState,
    (state:FvState) => {
       return  (state && state.fvState && state.fvState.length > 0) ? state.fvState.map(x => x.fvInfo) : null
    }
)