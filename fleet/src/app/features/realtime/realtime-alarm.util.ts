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

const ALARM_TAG_FIELD_NAMES = new Set([
  'tagname',
  'tag',
  'pointname',
  'address',
  'signalname',
  'parametername',
  'alarmtag',
  'alarmtagname',
  'sourcetag',
]);

const ALARM_SUFFIX_TOKENS = new Set([
  'ALARM',
  'ALERT',
  'ACTIVE',
  'CRITICAL',
  'MAJOR',
  'MINOR',
  'WARNING',
  'WARN',
  'FAULT',
  'TRIP',
  'HIGH',
  'HI',
  'HH',
  'HIGHHIGH',
  'LOW',
  'LO',
  'LL',
  'LOWLOW',
]);

const alarmIndexCache = new WeakMap<readonly AlertRecord[], AlarmIndex>();





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

  const match = alerts.find((alert) =>
    collectAlertTagNames(alert).some((alarmTag) =>
      normalizedCandidates.some((candidate) => tagsMatch(alarmTag, candidate))
    )
  );

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

    for (const normalizedTag of collectAlertTagNames(alert)) {
      tagNames.add(normalizedTag);
    }

    const normalizedEquipment = normalizeRealtimeAlarmTag(alert.equipment);
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

  const alarmVariants = buildTagVariants(alarmTag);
  const candidateVariants = buildTagVariants(candidate);

  return alarmVariants.some((alarmVariant) =>
    candidateVariants.some((candidateVariant) =>
      alarmVariant === candidateVariant ||
      alarmVariant.endsWith(`-${candidateVariant}`) ||
      candidateVariant.endsWith(`-${alarmVariant}`)
    )
  );
}






function collectAlertTagNames(alert: AlertRecord): string[] {
  const tags = new Set<string>();
  addNormalizedTag(tags, alert.tagName);

  const visit = (value: unknown, depth: number): void => {
    if (!value || typeof value !== 'object' || depth > 4) {
      return;
    }

    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (ALARM_TAG_FIELD_NAMES.has(key.toLowerCase())) {
        addNormalizedTag(tags, child);
      }

      if (child && typeof child === 'object' && !Array.isArray(child)) {
        visit(child, depth + 1);
      }
    }
  };

  visit(alert.raw, 0);
  return Array.from(tags);
}

function addNormalizedTag(target: Set<string>, value: unknown): void {
  const normalized = normalizeRealtimeAlarmTag(value);
  if (normalized) {
    target.add(normalized);
  }
}






function buildTagVariants(tag: string): string[] {
  const variants = new Set<string>([tag]);
  const parts = tag.split('-').filter(Boolean);

  while (parts.length > 1 && ALARM_SUFFIX_TOKENS.has(parts[parts.length - 1])) {
    parts.pop();
    variants.add(parts.join('-'));
  }

  return Array.from(variants);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
