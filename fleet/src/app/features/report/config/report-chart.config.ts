/** Shared view definitions: labels/tags are not historian calculations. */
export interface MachineryChartConfig {
  key: 'port' | 'starboard' | 'center';
  title: string;
  page: string;
  fuel: string;
  meRun: string;
  shaftRun: string;
  shaftRpm: string;
  engineLoad?: string;
  codeFuel: string;
  codeMe: string;
  codeShaftRun: string;
  codeShaftRpm: string;
  codeEngineLoad?: string;
}

export interface AuxiliaryChartConfig {
  key: 'port' | 'starboard' | 'center' | 'fourth';
  title: string;
  page: string;
  fuel: string;
  run: string;
  codeFuel: string;
  codeRun: string;
}


export const MACHINERY_CHART_CONFIGS: readonly MachineryChartConfig[] = [
  { key: 'port', title: 'Port M/E & Shaft Performance', page: '8', fuel: 'portMainFuel', meRun: 'portMainRunningHours', shaftRun: 'portShaftRunningHours', shaftRpm: 'portShaftRpm', engineLoad: 'portMainEngineLoad', codeFuel: 'PM..F.', codeMe: 'PM..RH', codeShaftRun: 'PS..RH', codeShaftRpm: 'PS..ES', codeEngineLoad: 'PM..EL' },
  { key: 'starboard', title: 'Starboard M/E & Shaft Performance', page: '9', fuel: 'starboardMainFuel', meRun: 'starboardMainRunningHours', shaftRun: 'starboardShaftRunningHours', shaftRpm: 'starboardShaftRpm', engineLoad: 'starboardMainEngineLoad', codeFuel: 'SM..F.', codeMe: 'SM..RH', codeShaftRun: 'SS..RH', codeShaftRpm: 'SS..ES', codeEngineLoad: 'SM..EL' },
  { key: 'center', title: 'Center M/E & Shaft Performance', page: '10', fuel: 'centerMainFuel', meRun: 'centerMainRunningHours', shaftRun: 'centerShaftRunningHours', shaftRpm: 'centerShaftRpm', engineLoad: 'centerMainEngineLoad', codeFuel: 'CM..F.', codeMe: 'CM..RH', codeShaftRun: 'CS..RH', codeShaftRpm: 'CS..ES', codeEngineLoad: 'CM..EL' },
];

export const AUXILIARY_CHART_CONFIGS: readonly AuxiliaryChartConfig[] = [
  { key: 'port', title: 'Port A/E Fuel & Running Hours', page: '12', fuel: 'portAuxFuel', run: 'portAuxRunningHours', codeFuel: 'PA..F.', codeRun: 'PA..RH' },
  { key: 'starboard', title: 'Starboard A/E Fuel & Running Hours', page: '13', fuel: 'starboardAuxFuel', run: 'starboardAuxRunningHours', codeFuel: 'SA..F.', codeRun: 'SA..RH' },
  { key: 'center', title: '', page: 'AE-3', fuel: 'centerAuxFuel', run: 'centerAuxRunningHours', codeFuel: 'CA..F.', codeRun: 'CA..RH' },
  { key: 'fourth', title: 'A/E4 Fuel & Running Hours', page: 'AE-4', fuel: 'fourthAuxFuel', run: 'fourthAuxRunningHours', codeFuel: 'AE4..F.', codeRun: 'AE4..RH' },
];

export const NUMBERED_AUXILIARY_CHART_CONFIGS: readonly AuxiliaryChartConfig[] = [
  AUXILIARY_CHART_CONFIGS[0],
  AUXILIARY_CHART_CONFIGS[2],
  AUXILIARY_CHART_CONFIGS[1],
  AUXILIARY_CHART_CONFIGS[3],
];

