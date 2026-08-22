import { calculateEngineMetrics, resolveEngineTelemetryMapping } from './engine-formula-presets';

describe('engine formula presets', () => {
  it('calculates shared main-engine metrics without clamping overload values', () => {
    const result = calculateEngineMetrics('main-diesel-standard-v1', {
      actualPowerKw: 500,
      ratedPowerKw: 1000,
      rpm: 900,
      ratedRpm: 1000,
      fuelRateKgPerHour: 100,
    });

    expect(result.loadPercent).toBe(50);
    expect(result.rpmPercent).toBe(90);
    expect(result.specificFuelConsumptionGPerKwh).toBe(200);
  });

  it('omits unsafe calculations when required inputs are missing or zero', () => {
    const result = calculateEngineMetrics('generator-standard-v1', {
      actualPowerKw: 0,
      ratedPowerKw: 1000,
      fuelRateKgPerHour: 100,
    });

    expect(result.loadPercent).toBeUndefined();
    expect(result.specificFuelConsumptionGPerKwh).toBeUndefined();
  });

  it('resolves reusable vessel and engine tag placeholders', () => {
    const mapping = resolveEngineTelemetryMapping(
      {
        powerKwTag: '{prefix}_ME{index}_POWER_KW',
        rpmTag: '{prefix}_ME{index}_RPM',
        fuelRateKgPerHourTag: '{vesselId}_FUEL_{index}',
        runningHoursTag: '{position}_HOURS',
        statusTag: '{prefix}_ME{index}_RUNNING',
      },
      { prefix: 'SCB', vesselId: 'SC-BONGKOT', position: 'Main Engine 1', index: 1 },
    );

    expect(mapping.powerKwTag).toBe('SCB_ME1_POWER_KW');
    expect(mapping.fuelRateKgPerHourTag).toBe('SC-BONGKOT_FUEL_1');
    expect(mapping.runningHoursTag).toBe('Main Engine 1_HOURS');
  });
});
