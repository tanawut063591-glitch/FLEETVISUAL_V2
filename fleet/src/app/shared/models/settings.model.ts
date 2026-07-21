export type VesselSettingsStatus = 'online' | 'idle' | 'offline' | 'unknown';

export interface VesselSettingsRecord {
  id: string;
  name: string;
  prefix: string;
  image: string;
  description: string;
  nationality: string;
  customer: string;
  owner: string;
  agency: string;
  groups: string[];
  engines: string[];
  status: VesselSettingsStatus;
  lastSeenAt?: string;
  lastSeenLabel?: string;
  latitude?: number;
  longitude?: number;
  source: 'backend' | 'local';
  raw?: unknown;
}

export type UserPresenceStatus = 'online' | 'idle' | 'offline' | 'unknown';

export interface UserSessionRecord {
  id: string;
  username: string;
  displayName: string;
  role: string;
  status: UserPresenceStatus;
  loginAt?: string;
  lastActiveAt?: string;
  ipAddress?: string;
  device?: string;
  browser?: string;
  source: 'backend' | 'session';
  raw?: unknown;
}


export type SettingsPersistenceTarget = 'database' | 'browser';

export interface VesselGroupRecord {
  id: string;
  name: string;
  description: string;
  vesselIds: string[];
  createdAt: string;
  updatedAt?: string;
  source: 'backend' | 'local';
}
