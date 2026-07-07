import { createFeatureSelector,createSelector } from '@ngrx/store';
import * as fvOverviewActions from '../actions/fv-overview.action';
import { FvOverview } from '../states/app.states';
import { error,success } from '../models/response';
import { SecurityService } from '../../services/security.service';

export const initialState : FvOverview = { fvOverview : [],message:'',statuscode:0}

export function reducer(state = initialState,action:fvOverviewActions.All_FV_OVERVIEW_ACTIONS) : FvOverview{
    switch(action.type){
        // case fvOverviewActions.GET_FV_OVERVIEW : {
        //     return { fvOverview : state.fvOverview ,message:success.message,statuscode:success.statusCode}
        // }
        case fvOverviewActions.GET_FV_OVERVIEW_FAILURE : {
            return { fvOverview : state.fvOverview ,message:error.message,statuscode:error.statusCode}
        }
        case fvOverviewActions.GET_FV_OVERVIEW_SUCCESS : {
            return { fvOverview : action.payload ,message:success.message,statuscode:success.statusCode}
        }
        default :
            return state
    }
}

export const getFvOverviewState = createFeatureSelector<FvOverview>('fvOverview');

export const getFvOverviewData = createSelector(
    getFvOverviewState,
    (state:FvOverview) => {        
     return state.fvOverview.map(x => x)
    }
)

