export type LiveReportTab = 'live' | 'files';
export type LiveReportMetricTone = 'blue' | 'green' | 'orange' | 'violet' | 'cyan' | 'slate';
export type LiveReportEquipmentState = 'running' | 'stopped' | 'no-data';
export type LiveReportModeSource =
  | 'verified-tag'
  | 'vessel-record'
  | 'estimated-telemetry'
  | 'unavailable';
export type LiveReportModeConfidence = 'high' | 'medium' | 'low' | null;
export type LiveReportValueQuality = 'valid' | 'invalid' | 'no-data';
export type LiveReportTelemetryState = 'live' | 'delayed' | 'stale' | 'offline';

export interface LiveReportModeProfile {
  key: string;
  label: string;
  codes?: Array<string | number>;
}

export interface LiveReportEngineProfile {
  key: string;
  label: string;
  kind: 'main' | 'auxiliary' | 'generator' | 'motor' | 'other';
  fuelTodayTags?: string[];
  fuelRateTags?: string[];
  flowSupplyTags?: string[];
  flowReturnTags?: string[];
  speedTags?: string[];
  loadTags?: string[];
  powerTags?: string[];

  maxSpeedRpm?: number;
}

export interface LiveReportModeVerificationProfile {
  kind: 'direct-telemetry-tag' | 'fallback-or-derived';
  tagSuffix?: string;
  mappingSource?: string;
}

export interface LiveReportVesselProfile {
  id: string;
  label: string;
  aliases: string[];
  prefixes: string[];
  modeTags?: string[];
  modeVerification?: LiveReportModeVerificationProfile;
  modes: LiveReportModeProfile[];
  engines: LiveReportEngineProfile[];
  sourceReport?: string;
}

export interface LiveReportProfileDocument {
  version: number;
  defaultProfile: LiveReportVesselProfile;
  profiles: LiveReportVesselProfile[];
}

export interface LiveReportMetric {
  key: string;
  label: string;
  value: string;
  unit: string;
  icon: string;
  tone: LiveReportMetricTone;
  available: boolean;
}

export interface LiveReportEngineSnapshot {
  key: string;
  label: string;
  kind: LiveReportEngineProfile['kind'];
  state: LiveReportEquipmentState;
  fuelToday: number | null;
  fuelRate: number | null;
  speed: number | null;
  speedQuality: LiveReportValueQuality;
  speedLimitRpm: number;
  speedSourceTag: string | null;
  load: number | null;
  power: number | null;
}

export interface LiveReportModeSnapshot {
  key: string;
  label: string;
  isCurrent: boolean;
}

export interface LiveReportTrackingSnapshot {
  latitude: number | null;
  longitude: number | null;
  distanceToday: number | null;
  currentSpeed: number | null;
  averageSpeed: number | null;
  maximumSpeed: number | null;
  heading: number | null;
}

export interface LiveReportSnapshot {
  vesselName: string;
  vesselPrefix: string;
  profileLabel: string;
  sourceReport: string;
  periodStart: Date;
  periodEnd: Date;
  updatedAt: Date | null;
  telemetryState: LiveReportTelemetryState;
  telemetryAgeSeconds: number | null;
  currentMode: string | null;
  currentModeRawValue: string | null;
  modeSourceTag: string | null;
  modeSource: LiveReportModeSource;
  modeConfidence: LiveReportModeConfidence;
  modeReason: string;
  dataCompleteness: number;
  invalidEngineSpeedCount: number;
  availableEngineCount: number;
  runningEngineCount: number;
  totalFuelRate: number | null;
  metrics: LiveReportMetric[];
  tracking: LiveReportTrackingSnapshot;
  engines: LiveReportEngineSnapshot[];
  modes: LiveReportModeSnapshot[];
}
