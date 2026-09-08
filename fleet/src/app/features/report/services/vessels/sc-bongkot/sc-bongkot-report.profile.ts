import { LiveReportVesselProfile } from '../../../models/live-report.model';

export const SC_BONGKOT_REPORT_PROFILE: LiveReportVesselProfile = {
  id: 'sc-bongkot-dedicated',
  label: 'SC BONGKOT Dedicated Report Profile',
  aliases: ['SC BONGKOT', 'SC_BONGKOT', 'SCBongkot'],
  prefixes: ['A06', 'A06-', 'SC_BONGKOT', 'SC_BONGKOT-'],
  modeTags: ['VES-MODE', 'A06-VES-MODE'],
  modeVerification: {
    kind: 'direct-telemetry-tag',
    tagSuffix: 'VES-MODE',
    mappingSource: 'SCReportingService SCBongkot A06-VES-MODE mapping',
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
    { key: 'standby-outside', label: 'Standby (Idling) outside 500 meter zone', codes: [9, '9'] },
    { key: 'standby-inside', label: 'Standby (Idling) inside 500 meter zone', codes: [10, '10'] },
    { key: 'standby', label: 'Standby at mooring buoy', codes: [11, '11'] },
    { key: 'port', label: 'Port Movements', codes: [12, '12'] },
    { key: 'towing', label: 'Towing operation', codes: [13, '13'] },
    { key: 'anchor', label: 'Anchor Handling operation', codes: [14, '14'] },
    { key: 'other', label: 'Other', codes: [15, '15'] },
  ],
  engines: [
    { key: 'port-main', label: 'Port Main Engine', kind: 'main', speedTags: ['PPS-SPD', 'A06-PPS-SPD'], maxSpeedRpm: 1600 },
    { key: 'starboard-main', label: 'Starboard Main Engine', kind: 'main', speedTags: ['SPS-SPD', 'A06-SPS-SPD'], maxSpeedRpm: 1600 },
    { key: 'ae1', label: 'A/E1', kind: 'auxiliary', flowSupplyTags: ['PME-FIN-VTOTAL', 'A06-PME-FIN-VTOTAL'], flowReturnTags: ['PME-FOUT-VTOTAL', 'A06-PME-FOUT-VTOTAL'], speedTags: ['PME-SPD', 'A06-PME-SPD'], maxSpeedRpm: 1200 },
    { key: 'ae2', label: 'A/E2', kind: 'auxiliary', flowSupplyTags: ['SME-FIN-VTOTAL', 'A06-SME-FIN-VTOTAL'], flowReturnTags: ['SME-FOUT-VTOTAL', 'A06-SME-FOUT-VTOTAL'], speedTags: ['SME-SPD', 'A06-SME-SPD'], maxSpeedRpm: 1200 },
    { key: 'ae3', label: 'A/E3', kind: 'auxiliary', flowSupplyTags: ['PAE-FIN-VTOTAL', 'A06-PAE-FIN-VTOTAL'], flowReturnTags: ['PAE-FOUT-VTOTAL', 'A06-PAE-FOUT-VTOTAL'], speedTags: ['PAE-SPD', 'A06-PAE-SPD'], maxSpeedRpm: 1200 },
    { key: 'ae4', label: 'A/E4', kind: 'auxiliary', flowSupplyTags: ['SAE-FIN-VTOTAL', 'A06-SAE-FIN-VTOTAL'], flowReturnTags: ['SAE-FOUT-VTOTAL', 'A06-SAE-FOUT-VTOTAL'], speedTags: ['SAE-SPD', 'A06-SAE-SPD'], maxSpeedRpm: 1200 },
  ],
  sourceReport: 'SCReportingService / SCBongkot A06 legacy-compatible report rules',
};

export const SC_BONGKOT_MODE_HISTORIAN_TAG = 'A06-VES-MODE';
