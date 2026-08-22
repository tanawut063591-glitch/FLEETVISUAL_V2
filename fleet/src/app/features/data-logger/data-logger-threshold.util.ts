import { DataLoggerThreshold } from './data-logger.model';
import { DATA_LOGGER_DEFAULT_THRESHOLDS } from './data-logger-threshold.config';

export function getThresholdFromTag(tag: any, name: string): DataLoggerThreshold | null {
  const threshold: DataLoggerThreshold = {
    warningLow: pickNumberFromSources(tag, [
      'warningLow',
      'WarningLow',
      'warnLow',
      'WarnLow',
      'warning_min',
      'WarningMin',
      'warningMin',
    ]),
    warningHigh: pickNumberFromSources(tag, [
      'warningHigh',
      'WarningHigh',
      'warnHigh',
      'WarnHigh',
      'warning_max',
      'WarningMax',
      'warningMax',
    ]),
    alarmLow: pickNumberFromSources(tag, [
      'alarmLow',
      'AlarmLow',
      'alertLow',
      'AlertLow',
      'alarm_min',
      'AlarmMin',
      'alarmMin',
    ]),
    alarmHigh: pickNumberFromSources(tag, [
      'alarmHigh',
      'AlarmHigh',
      'alertHigh',
      'AlertHigh',
      'alarm_max',
      'AlarmMax',
      'alarmMax',
    ]),
  };

  if (hasThreshold(threshold)) {
    return threshold;
  }

  return getDefaultThresholdByName(name);
}

export function hasThreshold(threshold: DataLoggerThreshold): boolean {
  return (
    threshold.warningLow !== undefined ||
    threshold.warningHigh !== undefined ||
    threshold.alarmLow !== undefined ||
    threshold.alarmHigh !== undefined
  );
}

export function normalizeTextForSearch(value: string): string {
  return (value || '')
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

function getDefaultThresholdByName(name: string): DataLoggerThreshold | null {
  const text = normalizeTextForSearch(name);

  for (let i = 0; i < DATA_LOGGER_DEFAULT_THRESHOLDS.length; i++) {
    const rule = DATA_LOGGER_DEFAULT_THRESHOLDS[i];

    for (let j = 0; j < rule.keywords.length; j++) {
      const keyword = normalizeTextForSearch(rule.keywords[j]);

      if (text.indexOf(keyword) !== -1) {
        return rule.threshold;
      }
    }
  }

  return null;
}

function pickNumberFromSources(tag: any, keys: string[]): number | undefined {
  const sources: any[] = [];

  if (tag) {
    sources.push(tag);

    if (tag.threshold) {
      sources.push(tag.threshold);
    }

    if (tag.Threshold) {
      sources.push(tag.Threshold);
    }

    if (tag.limit) {
      sources.push(tag.limit);
    }

    if (tag.Limit) {
      sources.push(tag.Limit);
    }

    if (tag.limits) {
      sources.push(tag.limits);
    }

    if (tag.Limits) {
      sources.push(tag.Limits);
    }
  }

  for (let s = 0; s < sources.length; s++) {
    const source = sources[s];

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];

      if (source && source[key] !== undefined && source[key] !== null && source[key] !== '') {
        const num = Number(source[key]);

        if (!isNaN(num)) {
          return num;
        }
      }
    }
  }

  return undefined;
}
