import { EngineFormulaPresetId, EngineTelemetryMapping } from '../models/settings.model';

export interface EngineFormulaPresetDefinition {
  id: EngineFormulaPresetId;
  name: string;
  shortName: string;
  description: string;
  formulas: string[];
  requiredInputs: string[];
  outputs: string[];
}

export interface EngineFormulaInputs {
  actualPowerKw?: number | null;
  ratedPowerKw?: number | null;
  rpm?: number | null;
  ratedRpm?: number | null;
  fuelRateKgPerHour?: number | null;
}

export interface EngineCalculatedMetrics {
  loadPercent?: number;
  rpmPercent?: number;
  specificFuelConsumptionGPerKwh?: number;
}

export const ENGINE_FORMULA_PRESETS: readonly EngineFormulaPresetDefinition[] = [
  {
    id: 'main-diesel-standard-v1',
    name: 'Main Diesel Engine — Standard',
    shortName: 'Main engine',
    description: 'Shared calculation profile for propulsion engines. Uses rated values from the engine profile.',
    formulas: [
      'Load (%) = Actual Power (kW) ÷ Rated Power (kW) × 100',
      'RPM (%) = Actual RPM ÷ Rated RPM × 100',
      'SFOC (g/kWh) = Fuel Rate (kg/h) × 1000 ÷ Actual Power (kW)',
    ],
    requiredInputs: ['Actual power', 'Rated power', 'RPM', 'Rated RPM', 'Fuel rate'],
    outputs: ['Load %', 'RPM %', 'SFOC g/kWh'],
  },
  {
    id: 'generator-standard-v1',
    name: 'Generator / Auxiliary Engine — Standard',
    shortName: 'Generator',
    description: 'Shared calculation profile for generator and auxiliary engines.',
    formulas: [
      'Load (%) = Actual Power (kW) ÷ Rated Power (kW) × 100',
      'SFOC (g/kWh) = Fuel Rate (kg/h) × 1000 ÷ Actual Power (kW)',
    ],
    requiredInputs: ['Actual power', 'Rated power', 'Fuel rate'],
    outputs: ['Load %', 'SFOC g/kWh'],
  },
  {
    id: 'telemetry-only-v1',
    name: 'Telemetry Only — No Derived Formula',
    shortName: 'Telemetry only',
    description: 'Displays incoming telemetry without calculating load or fuel-efficiency values.',
    formulas: ['No derived calculation. Values are displayed exactly as received from the backend.'],
    requiredInputs: ['Mapped telemetry tags'],
    outputs: ['Raw telemetry values'],
  },
  {
    id: 'custom-v1',
    name: 'Custom / Backend Formula',
    shortName: 'Custom',
    description: 'Reserved for a formula calculated by the backend or a future custom formula engine.',
    formulas: ['Calculation is supplied by the backend. The frontend does not infer a formula.'],
    requiredInputs: ['Backend-defined inputs'],
    outputs: ['Backend-defined outputs'],
  },
] as const;

export function getEngineFormulaPreset(
  id: EngineFormulaPresetId,
): EngineFormulaPresetDefinition {
  return ENGINE_FORMULA_PRESETS.find((preset) => preset.id === id) ?? ENGINE_FORMULA_PRESETS[2];
}






export function calculateEngineMetrics(
  presetId: EngineFormulaPresetId,
  inputs: EngineFormulaInputs,
): EngineCalculatedMetrics {
  if (presetId === 'telemetry-only-v1' || presetId === 'custom-v1') return {};

  const actualPower = finitePositive(inputs.actualPowerKw);
  const ratedPower = finitePositive(inputs.ratedPowerKw);
  const rpm = finiteNonNegative(inputs.rpm);
  const ratedRpm = finitePositive(inputs.ratedRpm);
  const fuelRate = finiteNonNegative(inputs.fuelRateKgPerHour);
  const result: EngineCalculatedMetrics = {};

  if (actualPower !== null && ratedPower !== null) {
    result.loadPercent = round((actualPower / ratedPower) * 100, 2);
  }
  if (presetId === 'main-diesel-standard-v1' && rpm !== null && ratedRpm !== null) {
    result.rpmPercent = round((rpm / ratedRpm) * 100, 2);
  }
  if (actualPower !== null && actualPower > 0 && fuelRate !== null) {
    result.specificFuelConsumptionGPerKwh = round((fuelRate * 1000) / actualPower, 2);
  }

  return result;
}

function finitePositive(value: number | null | undefined): number | null {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function finiteNonNegative(value: number | null | undefined): number | null {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export interface EngineTelemetryTemplateContext {
  prefix: string;
  vesselId: string;
  position: string;
  index: number;
}


export function resolveEngineTelemetryMapping(
  mapping: EngineTelemetryMapping,
  context: EngineTelemetryTemplateContext,
): EngineTelemetryMapping {
  return {
    powerKwTag: resolveEngineTelemetryTag(mapping.powerKwTag, context),
    rpmTag: resolveEngineTelemetryTag(mapping.rpmTag, context),
    fuelRateKgPerHourTag: resolveEngineTelemetryTag(mapping.fuelRateKgPerHourTag, context),
    runningHoursTag: resolveEngineTelemetryTag(mapping.runningHoursTag, context),
    statusTag: resolveEngineTelemetryTag(mapping.statusTag, context),
  };
}

export function resolveEngineTelemetryTag(
  template: string,
  context: EngineTelemetryTemplateContext,
): string {
  return String(template || '')
    .replaceAll('{prefix}', context.prefix)
    .replaceAll('{vesselId}', context.vesselId)
    .replaceAll('{position}', context.position)
    .replaceAll('{index}', String(context.index));
}

