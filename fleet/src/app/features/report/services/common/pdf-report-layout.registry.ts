/**
 * Official Daily-PDF layout contract by vessel.
 *
 * This registry intentionally describes what is present in the legacy PDF, not
 * what the generic web dashboard is capable of showing.  It keeps the UI from
 * accidentally rendering a center engine, extra auxiliary engine, extra mode,
 * or a report section that does not exist for that vessel.
 *
 * Source of truth checked for this revision:
 * - supplied 02-Oct-2026 vessel PDFs
 * - SCReportingService legacy C# archive
 */
export type PdfModeModel = 'gps-5' | 'gps-4' | 'direct-10' | 'direct-15' | 'direct-16';
export type PdfEngineLayout =
  | 'three-main-two-aux'
  | 'two-main-two-aux'
  | 'two-main-three-aux'
  | 'two-main-four-numbered-aux'
  | 'generator-only-four';

export interface VesselPdfLayoutSpec {
  id: string;
  pdfPageCount: number;
  engineLayout: PdfEngineLayout;
  modeModel: PdfModeModel;
  modeLabels: readonly string[];
  generatorOnly?: boolean;
  numberedAuxiliary?: boolean;
  engineLoad?: boolean;
  /** Center auxiliary is labelled Thruster A/E throughout the PDF (MV GEMIA). */
  thrusterAuxiliary?: boolean;
  /** Vessel-specific Page-1 running-hour label when it differs from fuel/hourly labels. */
  page1CenterAuxRunningLabel?: string;
  /** Legacy PDF source-page references used by the web parity sections. */
  pages: Readonly<Record<string, string>>;
  /** C# source status for this audit package. */
  csharpSource: 'verified-class' | 'verified-service1' | 'pdf-only';
}

const GPS_5 = [
  'Standby',
  'Cargo Operation',
  'Manoeuvring',
  'Sea Passage Economics',
  'Passage',
] as const;

const GPS_4 = ['Standby', 'Cargo Operation', 'Manoeuvring', 'Passage'] as const;

const DIRECT_15 = [
  'Underway (ECO Speed)',
  'Underway (Full Speed)',
  'Alongside Jack up Rig (BDB)',
  'Alongside Tender Rig',
  'Alongside FSO',
  'Snatching for Cargo operation',
  'Berth at Jetty (Cargo/Bunker/Maintenance)',
  'Moored with another Vessel for transferring',
  'Standby (Idling) outside 500 meter zone',
  'Standby (Idling) inside 500 meter zone',
  'Standby at mooring buoy',
  'Port Movements',
  'Towing operation',
  'Anchor Handling operation',
  'Other',
] as const;

const DIRECT_16 = [
  'Underway (ECO Speed)',
  'Underway (Full Speed)',
  'Alongside Jack up Rig (BDB)',
  'Alongside Tender Rig',
  'Alongside FSO',
  'Snatching for Cargo operation',
  'Berth at Jetty (Cargo/Bunker/Maintenance)',
  'Moored with another Vessel for transferring',
  'Dynamic Positioning (DP)',
  'Standby (Idling) outside 500 meter zone',
  'Standby (Idling) inside 500 meter zone',
  'Standby at mooring buoy',
  'Port Movements',
  'Towing operation',
  'Anchor Handling operation',
  'Other',
] as const;

const DIRECT_10 = [
  'In Port / Tie up buoy / Anchorage',
  'Shifting and Maneuvering',
  'Sea Passage Average Speed 6-7 Kts. (Without Barge)',
  'Sea Passage Average Speed 8-9 Kts. (Without Barge)',
  'Cargo Work / Offshore Transportation',
  'Voyage Towing Empty Barge Operation',
  'Voyage Towing Loaded Barge Operation',
  'Standby (Idling) (1M/E + 1A/E)',
  'Standby (Idling) (2M/E + 1A/E)',
  'Other',
] as const;

const GLORY_PAGES = {
  tracking: '4', hourlyPerformance: '5', mainFuel: '7',
  portMachinery: '8', starboardMachinery: '9', centerMachinery: '10',
  auxiliaryFuel: '11', portAuxiliary: '12', starboardAuxiliary: '13', totalFuel: '14',
} as const;

const TWO_MAIN_12_PAGES = {
  tracking: '4', hourlyPerformance: '5', mainFuel: '6',
  portMachinery: '7', starboardMachinery: '8', auxiliaryFuel: '9',
  portAuxiliary: '10', starboardAuxiliary: '11', totalFuel: '12',
} as const;

const PAILIN_PAGES = {
  tracking: '4', hourlyPerformance: '5', mainFuel: '6',
  portMachinery: '7', starboardMachinery: '8', auxiliaryFuel: '9',
  portAuxiliary: '10', starboardAuxiliary: '11', centerAuxiliary: '12', totalFuel: '13',
} as const;

const WINTER_PAGES = {
  tracking: '4', hourlyPerformance: '5', portMachinery: '6', starboardMachinery: '7',
  auxiliaryFuel: '8', portAuxiliary: '9', centerAuxiliary: '10',
  starboardAuxiliary: '11', fourthAuxiliary: '12', totalFuel: '13',
} as const;

const DIRECT_27_PAGES = {
  tracking: '18', hourlyPerformance: '19', mainFuel: '20',
  portMachinery: '21', starboardMachinery: '22', auxiliaryFuel: '23',
  portAuxiliary: '24', starboardAuxiliary: '25', centerAuxiliary: '26', totalFuel: '27',
} as const;

const BONGKOT_PAGES = {
  tracking: '18', hourlyPerformance: '19', portMachinery: '20', starboardMachinery: '21',
  auxiliaryFuel: '22', portAuxiliary: '23', centerAuxiliary: '24',
  starboardAuxiliary: '25', fourthAuxiliary: '26', totalFuel: '27',
} as const;

const RAJA_PAGES = {
  tracking: '13', hourlyPerformance: '14', mainFuel: '15',
  portMachinery: '16', starboardMachinery: '17', auxiliaryFuel: '18',
  portAuxiliary: '19', starboardAuxiliary: '20', totalFuel: '21',
} as const;

const SULTAN_PAGES = {
  tracking: '13', hourlyPerformance: '14', mainFuel: '15',
  portMachinery: '16', starboardMachinery: '17', auxiliaryFuel: '18',
  portAuxiliary: '19', starboardAuxiliary: '20', centerAuxiliary: '21', totalFuel: '22',
} as const;

const GENERATOR_PAGES = {
  tracking: '19', hourlyPerformance: '20', auxiliaryFuel: '21',
  portAuxiliary: '22', centerAuxiliary: '23', starboardAuxiliary: '24',
  fourthAuxiliary: '25', totalFuel: '26',
} as const;

export const VESSEL_PDF_LAYOUTS: Readonly<Record<string, VesselPdfLayoutSpec>> = {
  'sc-glory-1': { id: 'sc-glory-1', pdfPageCount: 14, engineLayout: 'three-main-two-aux', modeModel: 'gps-5', modeLabels: GPS_5, pages: GLORY_PAGES, csharpSource: 'verified-class' },
  'sc-glory-2': { id: 'sc-glory-2', pdfPageCount: 14, engineLayout: 'three-main-two-aux', modeModel: 'gps-5', modeLabels: GPS_5, pages: GLORY_PAGES, csharpSource: 'verified-class' },
  'sc-glory-3': { id: 'sc-glory-3', pdfPageCount: 14, engineLayout: 'three-main-two-aux', modeModel: 'gps-5', modeLabels: GPS_5, pages: GLORY_PAGES, csharpSource: 'verified-class' },
  'sc-glory-6': { id: 'sc-glory-6', pdfPageCount: 14, engineLayout: 'three-main-two-aux', modeModel: 'gps-5', modeLabels: GPS_5, pages: GLORY_PAGES, csharpSource: 'verified-service1' },
  'sc-glory-7': { id: 'sc-glory-7', pdfPageCount: 14, engineLayout: 'three-main-two-aux', modeModel: 'gps-5', modeLabels: GPS_5, pages: GLORY_PAGES, csharpSource: 'verified-class' },
  'sc-brave': { id: 'sc-brave', pdfPageCount: 14, engineLayout: 'three-main-two-aux', modeModel: 'gps-5', modeLabels: GPS_5, pages: GLORY_PAGES, csharpSource: 'verified-class' },
  'sc-choluedee': { id: 'sc-choluedee', pdfPageCount: 12, engineLayout: 'two-main-two-aux', modeModel: 'gps-4', modeLabels: GPS_4, pages: TWO_MAIN_12_PAGES, csharpSource: 'verified-class' },
  'sc-pailin': { id: 'sc-pailin', pdfPageCount: 13, engineLayout: 'two-main-three-aux', modeModel: 'gps-4', modeLabels: GPS_4, pages: PAILIN_PAGES, csharpSource: 'verified-class' },
  'sc-winter': { id: 'sc-winter', pdfPageCount: 13, engineLayout: 'two-main-four-numbered-aux', modeModel: 'gps-4', modeLabels: GPS_4, numberedAuxiliary: true, pages: WINTER_PAGES, csharpSource: 'verified-class' },
  'sc-emerald': { id: 'sc-emerald', pdfPageCount: 27, engineLayout: 'two-main-three-aux', modeModel: 'direct-15', modeLabels: DIRECT_15, page1CenterAuxRunningLabel: 'Thruster A/E', pages: DIRECT_27_PAGES, csharpSource: 'verified-class' },
  'mv-gemia': { id: 'mv-gemia', pdfPageCount: 27, engineLayout: 'two-main-three-aux', modeModel: 'direct-15', modeLabels: DIRECT_15, thrusterAuxiliary: true, page1CenterAuxRunningLabel: 'Thruster A/E', pages: DIRECT_27_PAGES, csharpSource: 'pdf-only' },
  'sc-bongkot': { id: 'sc-bongkot', pdfPageCount: 27, engineLayout: 'two-main-four-numbered-aux', modeModel: 'direct-15', modeLabels: DIRECT_15, numberedAuxiliary: true, pages: BONGKOT_PAGES, csharpSource: 'verified-class' },
  'sc-raja': { id: 'sc-raja', pdfPageCount: 21, engineLayout: 'two-main-two-aux', modeModel: 'direct-10', modeLabels: DIRECT_10, engineLoad: true, pages: RAJA_PAGES, csharpSource: 'verified-class' },
  'sc-sultan': { id: 'sc-sultan', pdfPageCount: 22, engineLayout: 'two-main-three-aux', modeModel: 'direct-10', modeLabels: DIRECT_10, engineLoad: true, pages: SULTAN_PAGES, csharpSource: 'verified-class' },
  'bahtera-intan': { id: 'bahtera-intan', pdfPageCount: 26, engineLayout: 'generator-only-four', modeModel: 'direct-16', modeLabels: DIRECT_16, generatorOnly: true, numberedAuxiliary: true, pages: GENERATOR_PAGES, csharpSource: 'verified-class' },
  'bahtera-lazurit': { id: 'bahtera-lazurit', pdfPageCount: 26, engineLayout: 'generator-only-four', modeModel: 'direct-16', modeLabels: DIRECT_16, generatorOnly: true, numberedAuxiliary: true, pages: GENERATOR_PAGES, csharpSource: 'verified-class' },
  'bahtera-zamrud': { id: 'bahtera-zamrud', pdfPageCount: 26, engineLayout: 'generator-only-four', modeModel: 'direct-16', modeLabels: DIRECT_16, generatorOnly: true, numberedAuxiliary: true, pages: GENERATOR_PAGES, csharpSource: 'verified-class' },
  'bb-liberty-233': { id: 'bb-liberty-233', pdfPageCount: 26, engineLayout: 'generator-only-four', modeModel: 'direct-16', modeLabels: DIRECT_16, generatorOnly: true, numberedAuxiliary: true, pages: GENERATOR_PAGES, csharpSource: 'verified-class' },
};

export function getVesselPdfLayout(vesselId: string | null | undefined): VesselPdfLayoutSpec | null {
  return vesselId ? VESSEL_PDF_LAYOUTS[vesselId] || null : null;
}
