export interface RealTimeDisplaySetting {
    name : string;
    grids: RealTimeCell[];
}

export interface RealTimeCell {
    row: number;
    col: number;
    title: string;
    type: RealTimeType;
}

export enum RealTimeType {
    NONE,
    MAIN_ENGINE,
    AUX_ENGINE,
    ELECTRIC_MOTOR
}
