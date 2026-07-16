export type ActivityLogSeverity = 'critical' | 'warning' | 'info' | 'success';
export type SystemHealth = 'normal' | 'warning' | 'critical' | 'offline';

export interface ActivityLogRecord {
  id: string;
  timestamp: string;
  severity: ActivityLogSeverity;
  category: string;
  message: string;
  detail: string;
  vesselName: string;
  user: string;
  module: string;
  source: string;
  raw?: unknown;
}

export interface ActivityLogQuery {
  startTime: string;
  endTime: string;
  search?: string;
  severity?: ActivityLogSeverity | 'all';
  category?: string;
  page?: number;
  pageSize?: number;
}

export interface SystemStatusItem {
  label: string;
  state: SystemHealth;
  detail: string;
  icon: string;
}

export interface ActivityLogFetchResult {
  logs: ActivityLogRecord[];
  statuses: SystemStatusItem[];
  fetchedAt: string;
  source: string;
  backendConnected: boolean;
  total?: number;
  sourceType?: 'database' | 'alert-fallback';
}
