import {
  buildGpsPdfParityModeSummary,
  buildLegacyPdfFuelDeltaMap,
  scaleModeDetailFuelToTarget,
} from './pdf-mode-parity';

describe('SC GLORY 1 PDF/Excel mode parity', () => {
  it('reproduces the 13-Sep-2026 verified PDF aggregate formula', () => {
    const minuteMs = 60_000;
    const modes = [
      { key: 'standby', label: 'Standby' },
      { key: 'cargo-operation', label: 'Cargo Operation' },
      { key: 'manoeuvring', label: 'Manoeuvring' },
      { key: 'sea-passage-economics', label: 'Sea Passage Economics' },
      { key: 'passage', label: 'Passage' },
    ] as const;

    const fixtures = [
      { key: 'standby', count: 738, fuel: 535.354, hours: 12.28, distance: 7.0849, speed: 7.0849 / 12.28 },
      { key: 'cargo-operation', count: 28, fuel: 59.013, hours: 0.47, distance: 1.177434, speed: 1.177434 / 0.47 },
      { key: 'manoeuvring', count: 205, fuel: 667.852, hours: 3.42, distance: 29.369041, speed: 29.369041 / 3.42 },
      { key: 'sea-passage-economics', count: 447, fuel: 2079.632, hours: 7.45, distance: 80.269, speed: 80.269 / 7.45 },
      { key: 'passage', count: 23, fuel: 108.749, hours: 0.38, distance: 4.7118, speed: 4.7118 / 0.38 },
    ] as const;

    const gpsSpeed = new Map<number, number>();
    const fuel = new Map<number, number>();
    let index = 0;
    for (const fixture of fixtures) {
      for (let sample = 0; sample < fixture.count; sample += 1) {
        const minute = index * minuteMs;
        gpsSpeed.set(minute, fixture.speed);
        fuel.set(minute, fixture.fuel / fixture.count);
        index += 1;
      }
    }
    expect(index).toBe(1441);

    const modeForSpeed = (speed: number): string => {
      if (speed <= 2) return 'Standby';
      if (speed <= 3.5) return 'Cargo Operation';
      if (speed <= 10) return 'Manoeuvring';
      if (speed <= 12) return 'Sea Passage Economics';
      return 'Passage';
    };
    const keyForLabel = (label: string): string =>
      modes.find((mode) => mode.label === label)?.key || 'standby';

    const result = buildGpsPdfParityModeSummary({
      modes,
      minuteStart: 0,
      dataEnd: 1440 * minuteMs,
      completedDaily: true,
      minuteMs,
      officialTotalFuel: 3450.6,
      gpsSpeed,
      minuteFuelAt: (minute) => fuel.get(minute) || 0,
      resolveModeLabel: modeForSpeed,
      resolveModeKey: keyForLabel,
      standbyLabel: 'Standby',
      legacySinglePrecision: true,
    });

    const byKey = new Map(result.modeSummary.map((row) => [row.key, row]));
    expect(byKey.get('standby')).toEqual(jasmine.objectContaining({
      fuelUsed: 535.35,
      fuelPercent: 15.52,
      runningHours: 12.28,
      runningPercent: 51.21,
      distanceNm: 7.08,
      litresPerNm: 75.56,
      litresPerHour: 43.6,
    }));
    expect(byKey.get('cargo-operation')).toEqual(jasmine.objectContaining({
      fuelUsed: 59.01,
      fuelPercent: 1.71,
      runningHours: 0.47,
      runningPercent: 1.94,
      distanceNm: 1.18,
      litresPerNm: 50.12,
      litresPerHour: 125.56,
    }));
    expect(byKey.get('manoeuvring')).toEqual(jasmine.objectContaining({
      fuelUsed: 667.85,
      fuelPercent: 19.35,
      runningHours: 3.42,
      runningPercent: 14.23,
      distanceNm: 29.37,
      litresPerNm: 22.74,
      litresPerHour: 195.28,
    }));
    expect(byKey.get('sea-passage-economics')).toEqual(jasmine.objectContaining({
      fuelUsed: 2079.63,
      fuelPercent: 60.27,
      runningHours: 7.45,
      runningPercent: 31.02,
      distanceNm: 80.27,
      litresPerNm: 25.91,
      litresPerHour: 279.15,
    }));
    expect(byKey.get('passage')).toEqual(jasmine.objectContaining({
      fuelUsed: 108.75,
      fuelPercent: 3.15,
      runningHours: 0.38,
      runningPercent: 1.6,
      distanceNm: 4.71,
      litresPerNm: 23.08,
      litresPerHour: 286.18,
    }));
  });

  it('reproduces the 12-Sep-2026 PDF aggregate formula without date calibration', () => {
    const minuteMs = 60_000;
    const modes = [
      { key: 'standby', label: 'Standby' },
      { key: 'cargo-operation', label: 'Cargo Operation' },
      { key: 'manoeuvring', label: 'Manoeuvring' },
      { key: 'sea-passage-economics', label: 'Sea Passage Economics' },
      { key: 'passage', label: 'Passage' },
    ] as const;

    // These are minute-level fixtures whose aggregates are the archived PDF
    // values. The important regression is that the same generic engine works
    // for another day; no report date or per-day calibration is consulted.
    const fixtures = [
      { key: 'standby', count: 546, fuel: 762.49, speed: 0.6332858594097613 },
      { key: 'cargo-operation', count: 50, fuel: 111.95, speed: 2.6046064366992887 },
      { key: 'manoeuvring', count: 219, fuel: 621.02, speed: 8.18585312191649 },
      { key: 'sea-passage-economics', count: 617, fuel: 2811.332, speed: 10.822510737490358 },
      { key: 'passage', count: 9, fuel: 44.748, speed: 12.129293878405857 },
    ] as const;

    const gpsSpeed = new Map<number, number>();
    const fuel = new Map<number, number>();
    let index = 0;
    for (const fixture of fixtures) {
      for (let sample = 0; sample < fixture.count; sample += 1) {
        const minute = index * minuteMs;
        gpsSpeed.set(minute, fixture.speed);
        fuel.set(minute, fixture.fuel / fixture.count);
        index += 1;
      }
    }
    expect(index).toBe(1441);

    const modeForSpeed = (speed: number): string => {
      if (speed <= 2) return 'Standby';
      if (speed <= 3.5) return 'Cargo Operation';
      if (speed <= 10) return 'Manoeuvring';
      if (speed <= 12) return 'Sea Passage Economics';
      return 'Passage';
    };
    const keyForLabel = (label: string): string =>
      modes.find((mode) => mode.label === label)?.key || 'standby';

    const result = buildGpsPdfParityModeSummary({
      modes,
      minuteStart: 0,
      dataEnd: 1440 * minuteMs,
      completedDaily: true,
      minuteMs,
      officialTotalFuel: 4351.54,
      gpsSpeed,
      minuteFuelAt: (minute) => fuel.get(minute) || 0,
      resolveModeLabel: modeForSpeed,
      resolveModeKey: keyForLabel,
      standbyLabel: 'Standby',
      legacySinglePrecision: true,
    });

    const byKey = new Map(result.modeSummary.map((row) => [row.key, row]));
    expect(byKey.get('standby')).toEqual(jasmine.objectContaining({
      fuelUsed: 762.49, fuelPercent: 17.52, runningHours: 9.09, runningPercent: 37.89,
      distanceNm: 5.76, litresPerNm: 132.45, litresPerHour: 83.88,
    }));
    expect(byKey.get('cargo-operation')).toEqual(jasmine.objectContaining({
      fuelUsed: 111.95, fuelPercent: 2.57, runningHours: 0.83, runningPercent: 3.47,
      distanceNm: 2.16, litresPerNm: 51.78, litresPerHour: 134.88,
    }));
    expect(byKey.get('manoeuvring')).toEqual(jasmine.objectContaining({
      fuelUsed: 621.02, fuelPercent: 14.27, runningHours: 3.65, runningPercent: 15.20,
      distanceNm: 29.88, litresPerNm: 20.78, litresPerHour: 170.14,
    }));
    expect(byKey.get('sea-passage-economics')).toEqual(jasmine.objectContaining({
      fuelUsed: 2811.33, fuelPercent: 64.61, runningHours: 10.28, runningPercent: 42.82,
      distanceNm: 111.26, litresPerNm: 25.27, litresPerHour: 273.48,
    }));
    expect(byKey.get('passage')).toEqual(jasmine.objectContaining({
      fuelUsed: 44.75, fuelPercent: 1.03, runningHours: 0.15, runningPercent: 0.62,
      distanceNm: 1.82, litresPerNm: 24.59, litresPerHour: 298.32,
    }));
  });

  it('preserves SC WINTER negative Standby residual fuel percent only when explicitly enabled', () => {
    const minuteMs = 60_000;
    const modes = [
      { key: 'standby', label: 'Standby' },
      { key: 'cargo-operation', label: 'Cargo Operation' },
      { key: 'manoeuvring', label: 'Manoeuvring' },
      { key: 'passage', label: 'Passage' },
    ] as const;

    const gpsSpeed = new Map<number, number>([
      [0, 0],
      [minuteMs, 1],
      [2 * minuteMs, 2],
      [3 * minuteMs, 3],
    ]);
    const fuel = new Map<number, number>([
      [0, -1693],
      [minuteMs, 314],
      [2 * minuteMs, 3477],
      [3 * minuteMs, 65],
    ]);
    const labelBySpeed = ['Standby', 'Cargo Operation', 'Manoeuvring', 'Passage'];
    const keyForLabel = (label: string): string =>
      modes.find((mode) => mode.label === label)?.key || 'standby';

    const shared = {
      modes,
      minuteStart: 0,
      dataEnd: 3 * minuteMs,
      completedDaily: false,
      minuteMs,
      officialTotalFuel: 2163,
      gpsSpeed,
      minuteFuelAt: (minute: number) => fuel.get(minute) || 0,
      resolveModeLabel: (speed: number) => labelBySpeed[speed] || 'Standby',
      resolveModeKey: keyForLabel,
      standbyLabel: 'Standby',
      scaleFuelToOfficialTotal: false,
    } as const;

    const legacy = buildGpsPdfParityModeSummary({
      ...shared,
      allowNegativeResidualFuelPercent: true,
    });
    const safeDefault = buildGpsPdfParityModeSummary(shared);

    expect(legacy.modeSummary.find((row) => row.key === 'standby')?.fuelPercent).toBe(-78.28);
    expect(safeDefault.modeSummary.find((row) => row.key === 'standby')?.fuelPercent).toBe(0);
  });

  it('keeps per-mode equipment fuel aligned with the normalized page-2 mode total', () => {
    const summary = {
      mainEngines: [
        { fuelUsed: 60, label: 'Port M/E' },
        { fuelUsed: 40, label: 'Stb. M/E' },
      ],
      auxFuel: [{ fuelUsed: 20, label: 'Port A/E' }],
      mainEngineFuelTotal: 100,
      auxiliaryFuelTotal: 20,
      averageSpeed: 6.5,
      distanceNm: 12,
    };

    const scaled = scaleModeDetailFuelToTarget(summary, 240);
    expect(scaled.mainEngines.map((row) => row.fuelUsed)).toEqual([120, 80]);
    expect(scaled.auxFuel[0].fuelUsed).toBe(40);
    expect(scaled.mainEngineFuelTotal).toBe(200);
    expect(scaled.auxiliaryFuelTotal).toBe(40);
  });

  it('preserves signed legacy mode totals when scaling SC EMERALD-style detail', () => {
    const summary = {
      mainEngines: [{ fuelUsed: -30 }],
      auxFuel: [{ fuelUsed: -10 }],
      mainEngineFuelTotal: -30,
      auxiliaryFuelTotal: -10,
    };

    const scaled = scaleModeDetailFuelToTarget(summary, -100);
    expect(scaled.mainEngines[0].fuelUsed).toBe(-75);
    expect(scaled.auxFuel[0].fuelUsed).toBe(-25);
    expect(scaled.mainEngineFuelTotal + scaled.auxiliaryFuelTotal).toBe(-100);
  });


  it('keeps :00.xxx logger rows on the PDF minute grid and rejects off-second rows', () => {
    const minuteMs = 60_000;
    const at = (minute: number, second: number, millisecond: number, value: number) => ({
      timestamp: new Date(minute * minuteMs + second * 1000 + millisecond),
      value,
    });

    const fuel = buildLegacyPdfFuelDeltaMap(
      [
        at(0, 0, 100, 1000),
        at(1, 0, 200, 1010),
        // Must be ignored by the legacy fixed-minute DataTable join.
        at(2, 23, 0, 1030),
        at(3, 0, 500, 1040),
      ],
      [],
      {
        supplyMaxDelta: 100,
        returnMaxDelta: 100,
        minuteMs,
        skipOnlyExactZero: true,
      },
    );

    expect(fuel.get(1 * minuteMs)).toBe(10);
    expect(fuel.has(2 * minuteMs)).toBeFalse();
    // 00:02:23 is ignored, so the next accepted delta is 1040 - 1010 = 30.
    expect(fuel.get(3 * minuteMs)).toBe(30);
  });

  it('can preserve C# value != 0 totalizer state semantics for GLORY mode fuel', () => {
    const minuteMs = 60_000;
    const points = [
      { timestamp: new Date(0), value: -5 },
      { timestamp: new Date(minuteMs), value: 5 },
      { timestamp: new Date(2 * minuteMs), value: 10 },
    ];

    const legacy = buildLegacyPdfFuelDeltaMap(points, [], {
      supplyMaxDelta: 100,
      returnMaxDelta: 100,
      minuteMs,
      skipOnlyExactZero: true,
    });
    const safeDefault = buildLegacyPdfFuelDeltaMap(points, [], {
      supplyMaxDelta: 100,
      returnMaxDelta: 100,
      minuteMs,
    });

    expect(legacy.get(minuteMs)).toBe(10);
    expect(legacy.get(2 * minuteMs)).toBe(5);
    expect(safeDefault.has(minuteMs)).toBeFalse();
    expect(safeDefault.get(2 * minuteMs)).toBe(5);
  });

});
