export type DateRangePreset = 'today' | '24h' | '3d' | '7d' | '30d' | 'custom';

export interface DateRangeSelection {
  preset: DateRangePreset;
  startInput: string;
  endInput: string;
  startTime: string;
  endTime: string;
  label: string;
}
