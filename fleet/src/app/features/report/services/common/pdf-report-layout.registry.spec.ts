import { getVesselPdfLayout, VESSEL_PDF_LAYOUTS } from './pdf-report-layout.registry';

describe('official Daily PDF layout registry', () => {
  it('keeps the supplied 02-Oct-2026 PDF page counts locked per vessel', () => {
    const expected: Record<string, number> = {
      'sc-glory-1': 14,
      'sc-glory-2': 14,
      'sc-glory-3': 14,
      'sc-glory-6': 14,
      'sc-glory-7': 14,
      'sc-brave': 14,
      'sc-choluedee': 12,
      'sc-pailin': 13,
      'sc-winter': 13,
      'sc-emerald': 27,
      'mv-gemia': 27,
      'sc-bongkot': 27,
      'sc-raja': 21,
      'sc-sultan': 22,
      'bahtera-intan': 26,
      'bahtera-lazurit': 26,
      'bahtera-zamrud': 26,
      'bb-liberty-233': 26,
    };

    expect(Object.keys(VESSEL_PDF_LAYOUTS).sort()).toEqual(Object.keys(expected).sort());
    for (const [id, pageCount] of Object.entries(expected)) {
      expect(getVesselPdfLayout(id)?.pdfPageCount).withContext(id).toBe(pageCount);
    }
  });

  it('keeps each vessel family on its official engine layout', () => {
    const expected: Record<string, string> = {
      'sc-glory-1': 'three-main-two-aux',
      'sc-glory-2': 'three-main-two-aux',
      'sc-glory-3': 'three-main-two-aux',
      'sc-glory-6': 'three-main-two-aux',
      'sc-glory-7': 'three-main-two-aux',
      'sc-brave': 'three-main-two-aux',
      'sc-choluedee': 'two-main-two-aux',
      'sc-pailin': 'two-main-three-aux',
      'sc-winter': 'two-main-four-numbered-aux',
      'sc-emerald': 'two-main-three-aux',
      'mv-gemia': 'two-main-three-aux',
      'sc-bongkot': 'two-main-four-numbered-aux',
      'sc-raja': 'two-main-two-aux',
      'sc-sultan': 'two-main-three-aux',
      'bahtera-intan': 'generator-only-four',
      'bahtera-lazurit': 'generator-only-four',
      'bahtera-zamrud': 'generator-only-four',
      'bb-liberty-233': 'generator-only-four',
    };

    for (const [id, layout] of Object.entries(expected)) {
      expect(getVesselPdfLayout(id)?.engineLayout).withContext(id).toBe(layout as any);
    }
  });

  it('keeps the official mode counts per vessel family', () => {
    const expected: Record<string, number> = {
      'sc-glory-1': 5,
      'sc-glory-2': 5,
      'sc-glory-3': 5,
      'sc-glory-6': 5,
      'sc-glory-7': 5,
      'sc-brave': 5,
      'sc-choluedee': 4,
      'sc-pailin': 4,
      'sc-winter': 4,
      'sc-emerald': 15,
      'mv-gemia': 15,
      'sc-bongkot': 15,
      'sc-raja': 10,
      'sc-sultan': 10,
      'bahtera-intan': 16,
      'bahtera-lazurit': 16,
      'bahtera-zamrud': 16,
      'bb-liberty-233': 16,
    };

    for (const [id, modeCount] of Object.entries(expected)) {
      expect(getVesselPdfLayout(id)?.modeLabels.length).withContext(id).toBe(modeCount);
    }
  });

  it('marks generator-only vessels so the UI never renders unsupported M/E machinery pages', () => {
    const generatorOnly = ['bahtera-intan', 'bahtera-lazurit', 'bahtera-zamrud', 'bb-liberty-233'];
    for (const id of generatorOnly) {
      const layout = getVesselPdfLayout(id);
      expect(layout?.generatorOnly).withContext(id).toBeTrue();
      expect(layout?.engineLayout).withContext(id).toBe('generator-only-four');
    }
  });


  it('keeps generator-only Daily PDFs free of unsupported main-engine page contracts', () => {
    const generatorOnly = ['bahtera-intan', 'bahtera-lazurit', 'bahtera-zamrud', 'bb-liberty-233'];
    for (const id of generatorOnly) {
      const layout = getVesselPdfLayout(id);
      expect(layout?.pages['mainFuel']).withContext(`${id} mainFuel`).toBeUndefined();
      expect(layout?.pages['portMachinery']).withContext(`${id} portMachinery`).toBeUndefined();
      expect(layout?.pages['starboardMachinery']).withContext(`${id} starboardMachinery`).toBeUndefined();
      expect(layout?.pages['centerMachinery']).withContext(`${id} centerMachinery`).toBeUndefined();
      expect(layout?.pages['auxiliaryFuel']).withContext(`${id} generator fuel page`).toBe('21');
      expect(layout?.pages['totalFuel']).withContext(`${id} total fuel page`).toBe('26');
    }
  });

  it('preserves known PDF-only label quirks instead of normalising them away', () => {
    expect(getVesselPdfLayout('sc-emerald')?.page1CenterAuxRunningLabel).toBe('Thruster A/E');
    expect(getVesselPdfLayout('mv-gemia')?.thrusterAuxiliary).toBeTrue();
    expect(getVesselPdfLayout('sc-bongkot')?.numberedAuxiliary).toBeTrue();
    expect(getVesselPdfLayout('sc-raja')?.engineLoad).toBeTrue();
    expect(getVesselPdfLayout('sc-sultan')?.engineLoad).toBeTrue();
  });
});
