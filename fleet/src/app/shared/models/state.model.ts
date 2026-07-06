import { PageConfigModel } from "./config.model";
import { GroupRequestAtTimeModel, GroupRequestHistorianModel, GroupRequestRealtimeModel } from "./request.model";
import { DataHistorianModel, DataRealtimeModel } from "./response.model";

export interface PageStateModel{
    id?: string;
    config: PageConfigModel;
    req_realtime: GroupRequestRealtimeModel[];
    req_attime: GroupRequestAtTimeModel[];
    req_historian: GroupRequestHistorianModel[];
    data_chart: any;
    data_realtime: DataRealtimeModel;
    data_historian: DataHistorianModel;
    timestamp: Date;
}

