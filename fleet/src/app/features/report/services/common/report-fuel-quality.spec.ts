import { buildFuelQualityNotice } from './report-fuel-quality';

describe('Report fuel data provenance (presentation-only)', () => {
  const verified = {
    mainEngineFuelTotal: 0, auxiliaryFuelTotal: 6226.09, totalFuelUsed: 6226.09,
    auxSummary: [153, 4132.09, 1253, 688].map(v => ({ fuelUsed: v })),
    quality: { historianSource: 'report' as const, pdfParityVerified: true, warnings: [] },
  };
  it('checks SC WINTER 18-Oct PDF totals without hard-coded production overrides', () => {
    expect(buildFuelQualityNotice(verified, true)?.severity).toBe('ok');
  });
  it('detects 201 L discrepancy when A/E4=889 but the validated A/E total=6226.09', () => {
    const wrong = { ...verified, auxSummary: [153, 4132.09, 1253, 889].map(fuelUsed => ({ fuelUsed })) };
    const notice = buildFuelQualityNotice(wrong, true);
    expect(notice?.severity).toBe('error');
    expect(notice?.details.some(s => s.includes('6,427'))).toBeFalse(); // raw numbers in decimal canonical string
    expect(notice?.details.some(s => s.includes('6427.09'))).toBeTrue();
  });
  it('shows PDF/historian discrepancies distinctly from arithmetic mistakes', () => {
    const notice = buildFuelQualityNotice({ ...verified, quality: {
      historianSource: 'api2' as const, pdfParityVerified: false,
      warnings: ['Daily PDF page-1 fuel totals replaced inconsistent historian values: A/E4 889 vs PDF 688'],
    } }, true);
    expect(notice?.severity).toBe('warning');
    expect(notice?.headline).toContain('Official PDF');
  });
  it('does not claim official verification when source reports no PDF', () => {
    const notice = buildFuelQualityNotice({ ...verified, quality: {historianSource: 'api2' as const, pdfParityVerified: false, warnings: []} }, true);
    expect(notice?.severity).toBe('warning');
  });
  it('avoids unsolicited warnings on other vessels unless totals mismatch', () => {
    const other = { mainEngineFuelTotal: 10, auxiliaryFuelTotal: 20, totalFuelUsed: 30 };
    expect(buildFuelQualityNotice(other, false)).toBeNull();
    expect(buildFuelQualityNotice({...other,totalFuelUsed: 33},false)?.severity).toBe('error');
  });
});
