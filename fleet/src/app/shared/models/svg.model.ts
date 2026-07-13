export interface MapConfigModel{
    map: MapItemModel[]
}

export interface MapItemModel{
    id: string;
    d: string;
    fill: string;
    stroke: string;
    strokewidth: number;
    name: string;
    zone: string;
}