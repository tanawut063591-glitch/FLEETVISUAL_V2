import { buildReportChartAxis, chartBarPercent, hourlyPolyline, maxActiveValue, summarizeHourlyValues } from './report-chart-math';

describe('Report hourly engineering chart math', () => {
  it('uses 100-unit SVG cells, centred above corresponding hour columns', () => {
    const points = hourlyPolyline([{ hour: 0, fuel: 1 }, { hour: 1, fuel: 2 }, { hour: 2, fuel: null }], r => r.fuel, 2);
    expect(points).toBe('50.0,50.0 150.0,0.0 250.0,100.0');
  });
  it('bounds bar percent and protects against invalid axes', () => {
    expect(chartBarPercent(10, 5)).toBe(100);
    expect(chartBarPercent(-1, 5)).toBe(0);
    expect(chartBarPercent(2, Number.POSITIVE_INFINITY)).toBe(0);
    expect(chartBarPercent(null, 10)).toBe(0);
  });
  it('excludes missing/NaN samples but retains genuine zero fuel', () => {
    const rows = [{v: 10}, {v: null}, {v: undefined}, {v: 0}, {v: Number.NaN}];
    expect(summarizeHourlyValues(rows, row => row.v)).toEqual({max: 10, avg: 5, min: 0});
    expect(summarizeHourlyValues([{v: null}], row => row.v)).toEqual({max: 0, avg: 0, min: 0});
  });
  it('makes finite readable axes and keeps active maxima safe', () => {
    const axis = buildReportChartAxis(423);
    expect(axis.max).toBeGreaterThanOrEqual(423);
    expect(axis.ticks[axis.ticks.length - 1]).toBe(0);
    expect(buildReportChartAxis(NaN).max).toBeGreaterThan(0);
    expect(maxActiveValue([{v: null}, {v: 4}], r => r.v)).toBe(4);
  });
});
