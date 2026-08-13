export interface PanelConfigModel{
    id: string;
    visible: boolean;
    interact: boolean;
    group: PvGroupModel[]
}

export interface PvGroupModel{
    id: string;
    name: string;
    panel: PvPanelModel[]
}

export interface PvPanelModel{
    id: string;
    width: string;
    height: string;
    d: string;
    fill: string;
    average?: number;
    percentage?: number;
    value?: number;
}

export interface ColorRangeModel{
    title: string;
    color: string;
    minimum: number;
    maximum: number;
}