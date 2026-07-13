export interface RealtimeValue {
  value?: string | number | null;
  timestamp?: string | Date | null;
  tagName?: string;
  name?: string;
  cal?: boolean;
}

export type RealtimeInput = RealtimeValue | number | string | null | undefined;

export type RealtimeStatus = 'running' | 'stopped' | 'idle' | 'nodata';

export interface RealtimeDisplayStatus {
  text: string;
  className: RealtimeStatus;
}
