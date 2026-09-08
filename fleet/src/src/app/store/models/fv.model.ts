export interface FV {
    fvInfo : FvInfo;
    data : any;
}


export interface FvInfo{
    name: string;
    desc?: string;
    img?: string;
    lat?: string;
    long?: string;
    prefix : string;
    active : boolean;
    timestamp?: Date
}