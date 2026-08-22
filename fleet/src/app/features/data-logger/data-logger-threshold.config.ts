import { DataLoggerThreshold } from './data-logger.model';

export interface DataLoggerDefaultThresholdRule {
  keywords: string[];
  threshold: DataLoggerThreshold;
}

export const DATA_LOGGER_DEFAULT_THRESHOLDS: DataLoggerDefaultThresholdRule[] = [
  {
    keywords: [
      'consumption today',
      'consumption total',
      'total consumption',
      'cons today',
      'vtot',
      'vtotal',
    ],
    threshold: {
      warningLow: 0,
      warningHigh: 3000,
      alarmLow: 0,
      alarmHigh: 3500,
    },
  },
  {
    keywords: [
      'fuel in rate',
      'fuel out rate',
      'fin rate',
      'fout rate',
      'flow rate',
      'fuel rate',
      'consumption rate',
    ],
    threshold: {
      warningLow: 0,
      warningHigh: 200,
      alarmLow: 0,
      alarmHigh: 250,
    },
  },
  {
    keywords: ['temp', 'temperature'],
    threshold: {
      warningLow: 0,
      warningHigh: 85,
      alarmLow: 0,
      alarmHigh: 95,
    },
  },
  {
    keywords: ['press', 'pressure'],
    threshold: {
      warningLow: 0,
      warningHigh: 8,
      alarmLow: 0,
      alarmHigh: 10,
    },
  },
  {
    keywords: ['volt', 'voltage', 'battery'],
    threshold: {
      warningLow: 22,
      warningHigh: 29,
      alarmLow: 20,
      alarmHigh: 32,
    },
  },
  {
    keywords: ['engine load', 'load'],
    threshold: {
      warningLow: 0,
      warningHigh: 85,
      alarmLow: 0,
      alarmHigh: 95,
    },
  },
  {
    keywords: ['rpm'],
    threshold: {
      warningLow: 500,
      warningHigh: 1800,
      alarmLow: 300,
      alarmHigh: 2200,
    },
  },
];
