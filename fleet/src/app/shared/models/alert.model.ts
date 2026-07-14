export type AlertSeverity = 'critical' | 'major' | 'warning' | 'info' | 'unknown';
export type AlertState = 'active' | 'acknowledged' | 'resolved';

export interface AlertRecord {
  id: string;
  title: string;
  message: string;
  vesselName: string;
  vesselId: string;
  tagName: string;
  equipment: string;
  severity: AlertSeverity;
  state: AlertState;
  occurredAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  value?: string | number;
  unit?: string;
  source?: string;
  raw: unknown;
}

export interface AlertQuery {
  startTime: string;
  endTime: string;
  vessel?: string;
  page?: number;
  pageSize?: number;
}

export interface AlertEndpointConfig {
  name: string;
  url: string;
  method: 'GET' | 'POST';
}

export interface AlertsRuntimeConfig {
  refreshSeconds?: number;
  endpoints?: AlertEndpointConfig[];
}

export interface AlertFetchResult {
  alerts: AlertRecord[];
  endpoint: string;
  fetchedAt: string;
  rawCount: number;
}
