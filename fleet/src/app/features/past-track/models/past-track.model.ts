export type PastTrackStatus = 'Sailing' | 'Idle' | 'No Data';

export interface PastTrackPoint {
    no: number;
    vesselId: string;
    /** Fixed 30-minute display slot, e.g. 13-Jul-2026 08:30:00. */
    time: string;
    /** Original historian timestamp before alignment to a display slot. */
    recordedTime?: string;
    /** Difference between the original sample and its display slot. */
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
    /** Number of 30-minute points rendered on the map and timeline. */
    trackPoints: number;
    /** Number of valid raw historian points used before resampling. */
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
