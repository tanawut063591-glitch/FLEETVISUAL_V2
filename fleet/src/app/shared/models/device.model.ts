export interface DeviceDialogData{
    siteId: string;
    deviceId: string;
    deviceConfig: DeviceConfigModel;
}

export interface DeviceConfigModel{
    Name: string;
    Type: string;
    Parameter: DeviceParameterModel[];
    Historical: DeviceHistoricalModel[];
}

export interface DeviceParameterModel{
    Title: string;
    Name: string;
    Description: string;
    Unit: string;
    Group: string;
}

export interface DeviceHistoricalModel{
    Title: string;
    Name: string;
    Tags: HistoricalTagModel[];
}

export interface HistoricalTagModel{
    Name: string;
    Axis: number;
    Type: string;
    Color: string;
    Opacity?: number;
}
