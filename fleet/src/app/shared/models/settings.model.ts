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
  engineAssignments?: VesselEngineAssignment[];
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

export const USER_ACCESS_STORAGE_KEY = 'fleet-settings-user-access-v1';
export const VESSEL_GROUP_STORAGE_KEY = 'fleet-settings-vessel-groups-v1';

export type UserAccessRole = 'administrator' | 'operator' | 'viewer' | 'custom';
export type UserAccessScope = 'all' | 'groups' | 'vessels';
export type UserAccountStatus = 'active' | 'suspended';
export type UserAccountProvisioning = 'managed' | 'linked' | 'access-only';
export type FleetModuleKey =
  | 'overview'
  | 'realtime'
  | 'data-logger'
  | 'chart'
  | 'diagram'
  | 'report'
  | 'alarm'
  | 'log'
  | 'settings';

export interface UserModulePermission {
  view: boolean;
  export: boolean;
  manage: boolean;
}

export type UserModulePermissionMap = Record<FleetModuleKey, UserModulePermission>;

export interface UserAccessRecord {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: UserAccessRole;
  status: UserAccountStatus;

  accountId?: string;
  accountProvisioning?: UserAccountProvisioning;
  accountLastSyncedAt?: string;
  accessScope: UserAccessScope;
  groupIds: string[];
  vesselIds: string[];
  additionalVesselIds: string[];
  excludedVesselIds: string[];
  modulePermissions: UserModulePermissionMap;
  createdAt: string;
  updatedAt?: string;
  source: 'backend' | 'local' | 'session';
  raw?: unknown;
}

export const ENGINE_PROFILE_STORAGE_KEY = 'fleet-settings-engine-profiles-v1';

export type EngineProfileCategory = 'main' | 'auxiliary' | 'generator' | 'other';
export type EngineFormulaPresetId =
  | 'main-diesel-standard-v1'
  | 'generator-standard-v1'
  | 'telemetry-only-v1'
  | 'custom-v1';

export interface EngineTelemetryMapping {
  powerKwTag: string;
  rpmTag: string;
  fuelRateKgPerHourTag: string;
  runningHoursTag: string;
  statusTag: string;
}

export interface EngineProfileRecord {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  category: EngineProfileCategory;
  fuelType: string;
  ratedPowerKw: number | null;
  ratedRpm: number | null;
  cylinders: number | null;
  formulaPresetId: EngineFormulaPresetId;
  telemetryMapping: EngineTelemetryMapping;
  description: string;
  createdAt: string;
  updatedAt?: string;
  source: 'seed' | 'backend' | 'local';
  raw?: unknown;
}

export interface VesselEngineAssignment {
  id: string;
  profileId: string;
  displayName: string;
  position: string;
  quantity: number;

  realtimeKey?: string;
  realtimeRow?: number;
  realtimeCol?: number;
  realtimeType?: string;
  source?: 'realtime' | 'manual' | 'legacy';
}
