import { Action } from '@ngrx/store';


export const GET_FV_OVERVIEW = '[FVOVERVIEW] Get Fv Overview';
export const GET_FV_OVERVIEW_SUCCESS = '[FVOVERVIEW] Get Fv Overview Success';
export const GET_FV_OVERVIEW_FAILURE = '[FVOVERVIEW] Get Fv Overview Failure';


export class GetFVOverview implements Action {
    readonly type = GET_FV_OVERVIEW;
    constructor(public payload:any) { }
}

export class GetFvOverviewSuccess  implements Action  {
    readonly type = GET_FV_OVERVIEW_SUCCESS;
    constructor(public payload:any[]) { }
}

export class GetFvOverviewFailure  implements Action  {
    readonly type = GET_FV_OVERVIEW_FAILURE;
    constructor(public payload:any) {}
}



export type All_FV_OVERVIEW_ACTIONS = 
    GetFVOverview |
    GetFvOverviewSuccess |
    GetFvOverviewFailure 
