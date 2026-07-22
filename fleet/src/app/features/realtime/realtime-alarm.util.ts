import { AlertRecord } from '../../shared/models/alert.model';

export interface RealtimeTagLike {
  tagName?: string | null;
  name?: string | null;
}

export type RealtimeAlarmCandidate = RealtimeTagLike | string | number | null | undefined;

interface AlarmIndex {
  readonly tagNames: ReadonlySet<string>;
  readonly equipmentTokens: ReadonlySet<string>;
}

const alarmIndexCache = new WeakMap<readonly AlertRecord[], AlarmIndex>();

/**
 * Normalizes backend tag names so values using underscores, hyphens or spaces
 * can be compared safely without changing the original telemetry payload.
 */
export function normalizeRealtimeAlarmTag(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function realtimeCandidateTag(candidate: RealtimeAlarmCandidate): string {
  if (candidate && typeof candidate === 'object') {
    return normalizeRealtimeAlarmTag(candidate.tagName || candidate.name || '');
  }

  return typeof candidate === 'string'
    ? normalizeRealtimeAlarmTag(candidate)
    : '';
}

export function hasRealtimeTagAlarm(
  alerts: readonly AlertRecord[] | null | undefined,
  ...candidates: RealtimeAlarmCandidate[]
): boolean {
  if (!Array.isArray(alerts) || alerts.length === 0) {
    return false;
  }

  const normalizedCandidates = candidates
    .map(realtimeCandidateTag)
    .filter((candidate) => candidate.length > 0);

  if (normalizedCandidates.length === 0) {
    return false;
  }

  const index = getAlarmIndex(alerts);

  return normalizedCandidates.some((candidate) =>
    Array.from(index.tagNames).some((alarmTag) => tagsMatch(alarmTag, candidate))
  );
}

export function hasRealtimeEquipmentAlarm(
  alerts: readonly AlertRecord[] | null | undefined,
  ...equipmentKeys: string[]
): boolean {
  if (!Array.isArray(alerts) || alerts.length === 0) {
    return false;
  }

  const normalizedKeys = equipmentKeys
    .map(normalizeRealtimeAlarmTag)
    .filter((key) => key.length > 0);

  if (normalizedKeys.length === 0) {
    return false;
  }

  const index = getAlarmIndex(alerts);

  return normalizedKeys.some((key) => {
    if (index.equipmentTokens.has(key)) {
      return true;
    }

    return Array.from(index.tagNames).some((tagName) =>
      new RegExp(`(^|-)${escapeRegExp(key)}(-|$)`).test(tagName)
    );
  });
}

export function getRealtimeAlarmMessage(
  alerts: readonly AlertRecord[] | null | undefined,
  ...candidates: RealtimeAlarmCandidate[]
): string {
  if (!Array.isArray(alerts) || alerts.length === 0) {
    return '';
  }

  const normalizedCandidates = candidates
    .map(realtimeCandidateTag)
    .filter((candidate) => candidate.length > 0);

  const match = alerts.find((alert) => {
    const alarmTag = normalizeRealtimeAlarmTag(alert?.tagName);
    return normalizedCandidates.some((candidate) => tagsMatch(alarmTag, candidate));
  });

  if (!match) {
    return '';
  }

  return [match.title, match.message].filter(Boolean).join(' — ');
}

function getAlarmIndex(alerts: readonly AlertRecord[]): AlarmIndex {
  const cached = alarmIndexCache.get(alerts);
  if (cached) {
    return cached;
  }

  const tagNames = new Set<string>();
  const equipmentTokens = new Set<string>();

  for (const alert of alerts) {
    if (!alert || alert.state === 'resolved') {
      continue;
    }

    const normalizedTag = normalizeRealtimeAlarmTag(alert.tagName);
    const normalizedEquipment = normalizeRealtimeAlarmTag(alert.equipment);

    if (normalizedTag) {
      tagNames.add(normalizedTag);
    }

    if (normalizedEquipment) {
      equipmentTokens.add(normalizedEquipment);
    }
  }

  const index: AlarmIndex = { tagNames, equipmentTokens };
  alarmIndexCache.set(alerts, index);
  return index;
}

function tagsMatch(alarmTag: string, candidate: string): boolean {
  if (!alarmTag || !candidate) {
    return false;
  }

  return (
    alarmTag === candidate ||
    alarmTag.endsWith(`-${candidate}`) ||
    candidate.endsWith(`-${alarmTag}`)
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
