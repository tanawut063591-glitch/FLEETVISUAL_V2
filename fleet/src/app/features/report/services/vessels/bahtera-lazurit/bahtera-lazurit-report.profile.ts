import { LiveReportVesselProfile } from '../../../models/live-report.model';

/**
 * BAHTERA LAZURIT profile transcribed from SCReportingService.BahteraLazurit.
 * The legacy PDF uses a direct 1..16 operating-mode tag and four diesel-generator
 * fuel totalizer pairs. Keep these tags vessel-specific: the older generic profile
 * used rate tags and cannot reproduce the Daily PDF.
 */
export const BAHTERA_LAZURIT_REPORT_PROFILE: LiveReportVesselProfile = {
  id: 'bahtera-lazurit-dedicated',
  label: 'BAHTERA LAZURIT PDF-Parity Report Profile',
  aliases: ['BAHTERA LAZURIT', 'BAHTERA_LAZURIT', 'BahteraLazurit', 'BB LAZURIT', 'BB_LAZURIT'],
  prefixes: ['BB_LAZURIT', 'BB_LAZURIT-', 'BAHTERA_LAZURIT', 'BAHTERA_LAZURIT-'],
  modeTags: ['VES-MODE', 'BB_LAZURIT-VES-MODE'],
  modeVerification: {
    kind: 'direct-telemetry-tag',
    tagSuffix: 'VES-MODE',
    mappingSource: 'SCReportingService BahteraLazurit BB_LAZURIT-VES-MODE mapping (1-16)',
  },
  modes: [
    { key: 'underway-eco', label: 'Underway (ECO Speed)', codes: [1, '1'] },
    { key: 'underway-full', label: 'Underway (Full Speed)', codes: [2, '2'] },
    { key: 'alongside-jack', label: 'Alongside Jack up Rig (BDB)', codes: [3, '3'] },
    { key: 'alongside-tender', label: 'Alongside Tender Rig', codes: [4, '4'] },
    { key: 'alongside-fso', label: 'Alongside FSO', codes: [5, '5'] },
    { key: 'snatch', label: 'Snatching for Cargo operation', codes: [6, '6'] },
    { key: 'berth', label: 'Berth at Jetty (Cargo/Bunker/Maintenance)', codes: [7, '7'] },
    { key: 'moore', label: 'Moored with another Vessel for transferring', codes: [8, '8'] },
    { key: 'dp', label: 'Dynamic Positioning (DP)', codes: [16, '16'] },
    { key: 'standby-outside', label: 'Standby (Idling) outside 500 meter zone', codes: [9, '9'] },
    { key: 'standby-inside', label: 'Standby (Idling) inside 500 meter zone', codes: [10, '10'] },
    { key: 'standby', label: 'Standby at mooring buoy', codes: [11, '11'] },
    { key: 'port', label: 'Port Movements', codes: [12, '12'] },
    { key: 'towing', label: 'Towing operation', codes: [13, '13'] },
    { key: 'anchor', label: 'Anchor Handling operation', codes: [14, '14'] },
    { key: 'other', label: 'Other', codes: [15, '15'] },
  ],
  engines: [
    { key: 'dg1', label: 'DG1', kind: 'generator', flowSupplyTags: ['DG1-FIN-VTOTAL', 'BB_LAZURIT-DG1-FIN-VTOTAL'], flowReturnTags: ['DG1-FOUT-VTOTAL', 'BB_LAZURIT-DG1-FOUT-VTOTAL'], loadTags: ['DG1-GEN-LOAD-KW', 'BB_LAZURIT-DG1-GEN-LOAD-KW'] },
    { key: 'dg2', label: 'DG2', kind: 'generator', flowSupplyTags: ['DG2-FIN-VTOTAL', 'BB_LAZURIT-DG2-FIN-VTOTAL'], flowReturnTags: ['DG2-FOUT-VTOTAL', 'BB_LAZURIT-DG2-FOUT-VTOTAL'], loadTags: ['DG2-GEN-LOAD-KW', 'BB_LAZURIT-DG2-GEN-LOAD-KW'] },
    { key: 'dg3', label: 'DG3', kind: 'generator', flowSupplyTags: ['DG3-FIN-VTOTAL', 'BB_LAZURIT-DG3-FIN-VTOTAL'], flowReturnTags: ['DG3-FOUT-VTOTAL', 'BB_LAZURIT-DG3-FOUT-VTOTAL'], loadTags: ['DG3-GEN-LOAD-KW', 'BB_LAZURIT-DG3-GEN-LOAD-KW'] },
    { key: 'eg', label: 'EG', kind: 'generator', flowSupplyTags: ['DG4-FIN-VTOTAL', 'BB_LAZURIT-DG4-FIN-VTOTAL'], flowReturnTags: ['DG4-FOUT-VTOTAL', 'BB_LAZURIT-DG4-FOUT-VTOTAL'], loadTags: ['DG4-GEN-LOAD-KW', 'BB_LAZURIT-DG4-GEN-LOAD-KW'] },
  ],
  sourceReport: 'SCReportingService / BahteraLazurit legacy Daily PDF rules',
};

export const BAHTERA_LAZURIT_MODE_HISTORIAN_TAG = 'BB_LAZURIT-VES-MODE';
