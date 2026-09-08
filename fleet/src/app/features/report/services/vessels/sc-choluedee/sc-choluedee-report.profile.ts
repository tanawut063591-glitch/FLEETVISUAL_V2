import { LiveReportVesselProfile } from '../../../models/live-report.model';

/**
 * Dedicated SC CHOLUEDEE historical report profile.
 *
 * The legacy SCReportingService derives operating mode from GPS speed and uses
 * two main engines / shafts plus two auxiliary engines.
 */
export const SC_CHOLUEDEE_REPORT_PROFILE: LiveReportVesselProfile = {
  id: 'sc-choluedee-dedicated',
  label: 'SC CHOLUEDEE Dedicated Report Profile',
  aliases: ['SC CHOLUEDEE', 'SC CHOLRUEDEE', 'SC_CHOLUEDEE', 'SC_CHOLRUEDEE'],
  prefixes: ['SC_CHOLUEDEE', 'SC_CHOLUEDEE-'],
  modeTags: [],
  modeVerification: {
    kind: 'fallback-or-derived',
    mappingSource: 'SCReportingService SCCholruedee GPS-speed mode rules',
  },
  modes: [
    { key: 'standby', label: 'Standby' },
    { key: 'cargo-operation', label: 'Cargo Operation' },
    { key: 'manoeuvring', label: 'Manoeuvring' },
    { key: 'passage', label: 'Passage' },
  ],
  engines: [
    {
      key: 'port-main',
      label: 'Port Main Engine',
      kind: 'main',
      flowSupplyTags: ['PME-FIN-VTOTAL', 'SC_CHOLUEDEE-PME-FIN-VTOTAL'],
      flowReturnTags: ['PME-FOUT-VTOTAL', 'SC_CHOLUEDEE-PME-FOUT-VTOTAL'],
      speedTags: ['PME-SPD', 'SC_CHOLUEDEE-PME-SPD'],
      maxSpeedRpm: 2000,
    },
    {
      key: 'starboard-main',
      label: 'Starboard Main Engine',
      kind: 'main',
      flowSupplyTags: ['SME-FIN-VTOTAL', 'SC_CHOLUEDEE-SME-FIN-VTOTAL'],
      flowReturnTags: ['SME-FOUT-VTOTAL', 'SC_CHOLUEDEE-SME-FOUT-VTOTAL'],
      speedTags: ['SME-SPD', 'SC_CHOLUEDEE-SME-SPD'],
      maxSpeedRpm: 2000,
    },
    {
      key: 'port-aux',
      label: 'Port Auxiliary Engine',
      kind: 'auxiliary',
      flowSupplyTags: ['PAE-FIN-VTOTAL', 'SC_CHOLUEDEE-PAE-FIN-VTOTAL'],
      flowReturnTags: ['PAE-FOUT-VTOTAL', 'SC_CHOLUEDEE-PAE-FOUT-VTOTAL'],
      speedTags: ['PAE-SPD', 'SC_CHOLUEDEE-PAE-SPD'],
      maxSpeedRpm: 2000,
    },
    {
      key: 'starboard-aux',
      label: 'Starboard Auxiliary Engine',
      kind: 'auxiliary',
      flowSupplyTags: ['SAE-FIN-VTOTAL', 'SC_CHOLUEDEE-SAE-FIN-VTOTAL'],
      flowReturnTags: ['SAE-FOUT-VTOTAL', 'SC_CHOLUEDEE-SAE-FOUT-VTOTAL'],
      speedTags: ['SAE-SPD', 'SC_CHOLUEDEE-SAE-SPD'],
      maxSpeedRpm: 2000,
    },
  ],
  sourceReport: 'SCReportingService / SCCholruedee legacy-compatible report rules',
};

export const SC_CHOLUEDEE_MODE_HISTORIAN_TAG = 'SC_CHOLUEDEE-VES-GPS-SPEED';
