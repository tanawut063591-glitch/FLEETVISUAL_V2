export interface DataLoggerThreshold {
  warningLow?: number;
  warningHigh?: number;
  alarmLow?: number;
  alarmHigh?: number;
}

export interface DataLoggerHeader {
  index: number;
  name: string;
  key: string;
  group: string;
  label: string;
  unit: string;
  category: string;
  threshold: DataLoggerThreshold | null;
}

export interface DataLoggerRow {
  timestamp: string;
  values: any[];
}

export interface DataLoggerStatusSummary {
  normal: number;
  warning: number;
  alarm: number;
  nodata: number;
}

export type DataLoggerStatus = 'Normal' | 'Warning' | 'Alarm' | 'No Data';
export type DataLoggerSortColumnType = 'time' | 'tag';
export type DataLoggerSortDirection = 'asc' | 'desc';
