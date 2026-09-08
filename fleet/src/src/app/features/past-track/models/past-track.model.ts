export type PastTrackStatus = 'Sailing' | 'Idle' | 'No Data';

export interface PastTrackPoint {
  no: number;
  vesselId: string;

  time: string;

  recordedTime?: string;

  sampleOffsetMinutes?: number;
  lat: number;
  lng: number;
  status: PastTrackStatus;
  speed: number;
  course: number;
  engine: string;
  fuelRate: number;
}

export interface PastTrackSummary {
  vesselId: string;
  vesselName: string;
  vesselType: string;
  imo: string;
  mmsi: string;
  status: string;
  image: string;
  totalDistance: number;

  trackPoints: number;

  rawTrackPoints?: number;
  samplingIntervalMinutes?: number;
  expectedSlots?: number;
  coveragePercent?: number;
  rangeStart?: string;
  rangeEnd?: string;
  avgSpeed: number;
  totalTime: string;
  lastUpdate: string;
}

export interface PastTrackResponse {
  summary: PastTrackSummary;
  points: PastTrackPoint[];
}
