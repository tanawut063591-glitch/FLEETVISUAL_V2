import { Action } from '@ngrx/store';
import { FV,FvInfo } from '../models/fv.model';

export const INIT_FV_INFO = '[FVINFO] Initial Fv Info';
export const GET_FV_INFO_SUCCESS = '[FVINFO] Get Fv Info Success';
export const GET_FV_INFO_FAILURE = '[FVINFO] Get Fv Info Failure';

export const SET_FV_ACTIVE = '[FVINFO] Set Active';
export const SET_FV_ACTIVE_SUCCESS = '[FVINFO] Set Active Success';
export const SET_FV_ACTIVE_FAILURE = '[FVINFO] Set Active Failure';

export const SET_REALTIME_ACTIVE = '[REALTIME] Set Realtime Active';
export const SET_REALTIME_ACTIVE_SUCCESS = '[REALTIME] Set Realtime Active Success';
export const SET_REALTIME_ACTIVE_FAILURE = '[REALTIME] Set Realtime Active Failure';

export const ADD_REALTIME_LAZY = '[REALTIME] Add Realtime Lazy';
export const ADD_REALTIME_LAZY_SUCCESS = '[REALTIME] Add Realtime Lazy Success';
export const ADD_REALTIME_LAZY_FAILURE = '[REALTIME] Add Realtime Lazy Failure';

export class InitialFVInfo implements Action {
    readonly type = INIT_FV_INFO;
    constructor() { }
}

export class GetFvInfoSuccess  implements Action  {
    readonly type = GET_FV_INFO_SUCCESS;
    constructor(public payload:FV[]) { }
}

export class GetFvInfoFailure  implements Action  {
    readonly type = GET_FV_INFO_FAILURE;
    constructor(public payload:any) {}
}

export class SetFvActive implements Action {
    readonly type = SET_FV_ACTIVE;
    constructor(public payload:FvInfo){}
}

export class SetFvActiveSuccess  implements Action {
    readonly type = SET_FV_ACTIVE_SUCCESS;
    constructor(public payload:FV[]){}
}

export class SetFvActiveFailure  implements Action  {
    readonly type = SET_FV_ACTIVE_FAILURE;
    constructor(public payload:any) {}
}


export class SetRealtimeActive implements Action {
    readonly type = SET_REALTIME_ACTIVE
    constructor(public payload : any){}
}

export class SetRealtimeActiveSuccess implements Action {
    readonly type = SET_REALTIME_ACTIVE_SUCCESS
    constructor(public payload : any){}
}


export class SetRealtimeActiveFailure implements Action {
    readonly type = SET_REALTIME_ACTIVE_FAILURE
    constructor(public payload : any){}
}


export class AddRealtimeLazy implements Action {
    readonly type = ADD_REALTIME_LAZY
    constructor(public payload : any){}
}

export class AddRealtimeLazySuccess implements Action {
    readonly type = ADD_REALTIME_LAZY_SUCCESS
    constructor(public payload : any){}
}

export class AddRealtimeLazyFailure implements Action {
    readonly type = ADD_REALTIME_LAZY_FAILURE
    constructor(public payload : any){}
}

export type All_FV_INFO_ACTIONS = 
    InitialFVInfo |
    GetFvInfoSuccess |
    GetFvInfoFailure |
    SetFvActive | 
    SetFvActiveSuccess |
    SetFvActiveFailure |
    SetRealtimeActive |
    SetRealtimeActiveSuccess |
    SetRealtimeActiveFailure |
    AddRealtimeLazy |
    AddRealtimeLazySuccess |
    AddRealtimeLazyFailure
