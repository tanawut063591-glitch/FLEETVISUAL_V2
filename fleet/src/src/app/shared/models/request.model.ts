

export interface RequestRealtimeModel{
    Tags: string[];
}

export interface RequestHistorianModel{
    Name: string;
    Options: Option;
}

export interface RequestAtTimeModel{
    Tags: string[];
    TimeStamp: string;
}

export interface GroupRequestRealtimeModel{
    Group: string;
    Order: number;
    Request: RequestRealtimeModel;
}

export interface GroupRequestAtTimeModel{
    Group: string;
    Order: number;
    Request: RequestAtTimeModel[];
}

export interface GroupRequestHistorianModel{
    Group: string;
    Order: number;
    Request: RequestHistorianModel[];
}

export interface RequestRealtime2Model{
   [name: string]: RequestRealtimeModel;
}

export interface RequestHistorian2Model{
    [name: string]: RequestHistorianModel[];
}

export interface Option{
    Interval?: number;
    Time: string;
    StartTime: string;
    EndTime: string;
}