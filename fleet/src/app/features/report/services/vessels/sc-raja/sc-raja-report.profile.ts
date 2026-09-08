import { LiveReportVesselProfile } from '../../../models/live-report.model';

export const SC_RAJA_REPORT_PROFILE: LiveReportVesselProfile = {
  id: 'sc-raja-dedicated',
  label: 'SC RAJA Dedicated Report Profile',
  aliases: ['SC RAJA', 'SCENA RAJA', 'SC_RAJA', 'SCRaja'],
  prefixes: ['SC_RAJA', 'SC_RAJA-'],
  modeTags: ['VES-MODE', 'SC_RAJA-VES-MODE'],
  modeVerification: {
    kind: 'direct-telemetry-tag',
    tagSuffix: 'VES-MODE',
    mappingSource: 'SCReportingService SCRaja SC_RAJA-VES-MODE mapping',
  },
  modes: [
    { key: 'in-port', label: 'In Port / Tie up buoy / Anchorage', codes: [1, '1'] },
    { key: 'shifting-manoeuvring', label: 'Shifting and Maneuvering', codes: [2, '2'] },
    { key: 'sea-passage-6-7', label: 'Sea Passage Average Speed 6-7 Kts. (Without Barge)', codes: [3, '3'] },
    { key: 'sea-passage-8-9', label: 'Sea Passage Average Speed 8-9 Kts. (Without Barge)', codes: [4, '4'] },
    { key: 'cargo-work', label: 'Cargo Work / Offshore Transportation', codes: [5, '5'] },
    { key: 'towing-empty', label: 'Voyage Towing Empty Barge Operation', codes: [6, '6'] },
    { key: 'towing-loaded', label: 'Voyage Towing Loaded Barge Operation', codes: [7, '7'] },
    { key: 'standby-1me', label: 'Standby (Idling) (1M/E + 1A/E)', codes: [8, '8'] },
    { key: 'standby-2me', label: 'Standby (Idling) (2M/E + 1A/E)', codes: [9, '9'] },
    { key: 'other', label: 'Other', codes: [10, '10'] },
  ],
  engines: [
    {
      key: 'port-main',
      label: 'Port Main Engine',
      kind: 'main',
      flowSupplyTags: ['PME-FIN-VTOTAL', 'SC_RAJA-PME-FIN-VTOTAL'],
      flowReturnTags: ['PME-FOUT-VTOTAL', 'SC_RAJA-PME-FOUT-VTOTAL'],
      speedTags: ['PME-SPD', 'SC_RAJA-PME-SPD'],
      loadTags: ['PME-ENGINE-LOAD', 'SC_RAJA-PME-ENGINE-LOAD'],
      maxSpeedRpm: 1200,
    },
    {
      key: 'starboard-main',
      label: 'Starboard Main Engine',
      kind: 'main',
      flowSupplyTags: ['SME-FIN-VTOTAL', 'SC_RAJA-SME-FIN-VTOTAL'],
      flowReturnTags: ['SME-FOUT-VTOTAL', 'SC_RAJA-SME-FOUT-VTOTAL'],
      speedTags: ['SME-SPD', 'SC_RAJA-SME-SPD'],
      loadTags: ['SME-ENGINE-LOAD', 'SC_RAJA-SME-ENGINE-LOAD'],
      maxSpeedRpm: 1200,
    },
    {
      key: 'port-aux',
      label: 'Port Auxiliary Engine',
      kind: 'auxiliary',
      flowSupplyTags: ['PAE-FIN-VTOTAL', 'SC_RAJA-PAE-FIN-VTOTAL'],
      flowReturnTags: ['PAE-FOUT-VTOTAL', 'SC_RAJA-PAE-FOUT-VTOTAL'],
      speedTags: ['PAE-SPD', 'SC_RAJA-PAE-SPD'],
      maxSpeedRpm: 2000,
    },
    {
      key: 'starboard-aux',
      label: 'Starboard Auxiliary Engine',
      kind: 'auxiliary',
      flowSupplyTags: ['SAE-FIN-VTOTAL', 'SC_RAJA-SAE-FIN-VTOTAL'],
      flowReturnTags: ['SAE-FOUT-VTOTAL', 'SC_RAJA-SAE-FOUT-VTOTAL'],
      speedTags: ['SAE-SPD', 'SC_RAJA-SAE-SPD'],
      maxSpeedRpm: 2000,
    },
  ],
  sourceReport: 'SCReportingService / SCRaja legacy-compatible report rules',
};

export const SC_RAJA_MODE_HISTORIAN_TAG = 'SC_RAJA-VES-MODE';
