import { LiveReportVesselProfile } from '../../../models/live-report.model';

export const SC_WINTER_REPORT_PROFILE: LiveReportVesselProfile = {
  id: 'sc-winter-dedicated',
  label: 'SC WINTER Dedicated Report Profile',
  aliases: ['SC WINTER', 'SC_WINTER', 'SCWinter'],
  prefixes: ['A09', 'A09-', 'SC_WINTER', 'SC_WINTER-'],
  modeTags: [],
  modeVerification: {
    kind: 'fallback-or-derived',
    mappingSource: 'SCReportingService SCWinter GPS-speed mode rules',
  },
  modes: [
    { key: 'standby', label: 'Standby' },
    { key: 'cargo-operation', label: 'Cargo Operation' },
    { key: 'manoeuvring', label: 'Manoeuvring' },
    { key: 'passage', label: 'Passage' },
  ],
  engines: [
    { key: 'port-main', label: 'Port Main Engine', kind: 'main', speedTags: ['PPS-SPD', 'A09-PPS-SPD'], maxSpeedRpm: 1600 },
    { key: 'starboard-main', label: 'Starboard Main Engine', kind: 'main', speedTags: ['SPS-SPD', 'A09-SPS-SPD'], maxSpeedRpm: 1600 },
    { key: 'ae1', label: 'A/E1', kind: 'auxiliary', flowSupplyTags: ['PME-FIN-VTOTAL', 'A09-PME-FIN-VTOTAL'], flowReturnTags: ['PME-FOUT-VTOTAL', 'A09-PME-FOUT-VTOTAL'], speedTags: ['PME-SPD', 'A09-PME-SPD'], maxSpeedRpm: 1200 },
    { key: 'ae2', label: 'A/E2', kind: 'auxiliary', flowSupplyTags: ['SME-FIN-VTOTAL', 'A09-SME-FIN-VTOTAL'], flowReturnTags: ['SME-FOUT-VTOTAL', 'A09-SME-FOUT-VTOTAL'], speedTags: ['SME-SPD', 'A09-SME-SPD'], maxSpeedRpm: 1200 },
    { key: 'ae3', label: 'A/E3', kind: 'auxiliary', flowSupplyTags: ['PAE-FIN-VTOTAL', 'A09-PAE-FIN-VTOTAL'], flowReturnTags: ['PAE-FOUT-VTOTAL', 'A09-PAE-FOUT-VTOTAL'], speedTags: ['PAE-SPD', 'A09-PAE-SPD'], maxSpeedRpm: 1200 },
    { key: 'ae4', label: 'A/E4', kind: 'auxiliary', flowSupplyTags: ['SAE-FIN-VTOTAL', 'A09-SAE-FIN-VTOTAL'], flowReturnTags: ['SAE-FOUT-VTOTAL', 'A09-SAE-FOUT-VTOTAL'], speedTags: ['SAE-SPD', 'A09-SAE-SPD'], maxSpeedRpm: 1200 },
  ],
  sourceReport: 'SCReportingService / SCWinter A09 legacy-compatible report rules',
};

export const SC_WINTER_MODE_HISTORIAN_TAG = 'A09-VES-GPS-SPEED';
