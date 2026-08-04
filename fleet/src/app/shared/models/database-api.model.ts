export type DatabaseHttpMethod = 'GET' | 'POST';

export interface DatabaseEndpointConfig {
  enabled?: boolean;
  url?: string;
  method?: DatabaseHttpMethod;
  timeoutMs?: number;
  cacheSeconds?: number;
}

export interface DatabaseFallbackConfig {
  alertsToTelemetry?: boolean;
  logsToAlerts?: boolean;
  vesselsToCurrentInfo?: boolean;
}

export interface DatabaseApiConfig {
  enabled?: boolean;
  timeoutMs?: number;
  cacheSeconds?: number;
  alerts?: DatabaseEndpointConfig;
  activityLogs?: DatabaseEndpointConfig;
  vessels?: DatabaseEndpointConfig;
  vesselGroups?: DatabaseEndpointConfig;
  userSessions?: DatabaseEndpointConfig;
  userAccess?: DatabaseEndpointConfig;
  engineProfiles?: DatabaseEndpointConfig;
  fallback?: DatabaseFallbackConfig;
}

export interface ResolvedDatabaseEndpoint {
  enabled: boolean;
  url: string;
  method: DatabaseHttpMethod;
  timeoutMs: number;
  cacheSeconds: number;
}

export interface ResolvedDatabaseApiConfig {
  enabled: boolean;
  alerts: ResolvedDatabaseEndpoint;
  activityLogs: ResolvedDatabaseEndpoint;
  vessels: ResolvedDatabaseEndpoint;
  vesselGroups: ResolvedDatabaseEndpoint;
  userSessions: ResolvedDatabaseEndpoint;
  userAccess: ResolvedDatabaseEndpoint;
  engineProfiles: ResolvedDatabaseEndpoint;
  fallback: Required<DatabaseFallbackConfig>;
}
