export type VesselOperationalStatus = 'online' | 'idle' | 'offline' | 'nodata';

/**
 * Fleet-wide connectivity thresholds.
 * - Idle: no fresh data for 1 hour through 24 hours.
 * - Offline: no fresh data for more than 24 hours.
 */
export const VESSEL_IDLE_AFTER_MINUTES = 60;
export const VESSEL_OFFLINE_AFTER_MINUTES = 24 * 60;

export function getElapsedMinutes(
  value: string | number | Date | null | undefined,
  now = Date.now(),
): number | null {
  if (value === null || value === undefined || value === '') return null;

  const normalized =
    typeof value === 'number' && value < 10_000_000_000 ? value * 1000 : value;
  const timestamp = normalized instanceof Date
    ? normalized.getTime()
    : new Date(normalized).getTime();

  if (!Number.isFinite(timestamp)) return null;
  return Math.max(0, (now - timestamp) / 60_000);
}

export function getVesselStatusFromTimestamp(
  value: string | number | Date | null | undefined,
  now = Date.now(),
): VesselOperationalStatus {
  const elapsedMinutes = getElapsedMinutes(value, now);
  if (elapsedMinutes === null) return 'nodata';
  if (elapsedMinutes > VESSEL_OFFLINE_AFTER_MINUTES) return 'offline';
  if (elapsedMinutes >= VESSEL_IDLE_AFTER_MINUTES) return 'idle';
  return 'online';
}

/** Supports compact labels returned by older endpoints, e.g. 45 M, 2 H, 3 D. */
export function getVesselStatusFromLastSeenLabel(
  value: unknown,
): VesselOperationalStatus {
  const text = String(value ?? '').trim().toUpperCase();
  if (!text || text === '-') return 'nodata';

  const match = text.match(/(-?\d+(?:\.\d+)?)\s*(M|MIN|H|HR|D|DAY)/);
  if (!match) return 'nodata';

  const amount = Math.max(0, Number(match[1]));
  const unit = match[2];
  const minutes = unit.startsWith('D')
    ? amount * 24 * 60
    : unit.startsWith('H')
      ? amount * 60
      : amount;

  if (minutes > VESSEL_OFFLINE_AFTER_MINUTES) return 'offline';
  if (minutes >= VESSEL_IDLE_AFTER_MINUTES) return 'idle';
  return 'online';
}

export function toVesselStatusLabel(status: VesselOperationalStatus): string {
  if (status === 'offline') return 'Offline';
  if (status === 'idle') return 'Idle';
  if (status === 'online') return 'Online';
  return 'No Data';
}
