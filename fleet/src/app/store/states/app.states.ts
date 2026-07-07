import { FV } from '../models/fv.model';

export interface AppState {
    fvState : FvState,
    fvOverview : FvOverview
}

export interface FvState{
    fvState : FV[];
    message? : string;
    statuscode: number;
}

export interface FvOverview {
    fvOverview : any[];
    message? :string;
    statuscode : number;
}