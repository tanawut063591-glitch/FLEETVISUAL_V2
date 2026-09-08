import { LiveReportVesselProfile } from '../../../models/live-report.model';

export const SC_PAILIN_REPORT_PROFILE: LiveReportVesselProfile = {
  id: 'sc-pailin-dedicated',
  label: 'SC PAILIN Dedicated Report Profile',
  aliases: ['SC PAILIN', 'SC_PAILIN', 'SCPailin'],
  prefixes: ['A07', 'A07-', 'SC_PAILIN', 'SC_PAILIN-'],
  modeTags: [],
  modeVerification: {
    kind: 'fallback-or-derived',
    mappingSource: 'SCReportingService SCPailin GPS-speed mode rules',
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
      flowSupplyTags: ['PME-FIN-VTOTAL', 'A07-PME-FIN-VTOTAL'],
      flowReturnTags: ['PME-FOUT-VTOTAL', 'A07-PME-FOUT-VTOTAL'],
      speedTags: ['PME-SPD', 'A07-PME-SPD'],
      maxSpeedRpm: 1600,
    },
    {
      key: 'starboard-main',
      label: 'Starboard Main Engine',
      kind: 'main',
      flowSupplyTags: ['SME-FIN-VTOTAL', 'A07-SME-FIN-VTOTAL'],
      flowReturnTags: ['SME-FOUT-VTOTAL', 'A07-SME-FOUT-VTOTAL'],
      speedTags: ['SME-SPD', 'A07-SME-SPD'],
      maxSpeedRpm: 1600,
    },
    {
      key: 'port-aux',
      label: 'Port Auxiliary Engine',
      kind: 'auxiliary',
      flowSupplyTags: ['PAE-FIN-VTOTAL', 'A07-PAE-FIN-VTOTAL'],
      flowReturnTags: ['PAE-FOUT-VTOTAL', 'A07-PAE-FOUT-VTOTAL'],
      speedTags: ['PAE-SPD', 'A07-PAE-SPD'],
      maxSpeedRpm: 1600,
    },
    {
      key: 'center-aux',
      label: 'Thruster Auxiliary Engine',
      kind: 'auxiliary',
      flowSupplyTags: ['CAE-FIN-VTOTAL', 'A07-CAE-FIN-VTOTAL'],
      flowReturnTags: ['CAE-FOUT-VTOTAL', 'A07-CAE-FOUT-VTOTAL'],
      speedTags: ['CAE-SPD', 'A07-CAE-SPD'],
      maxSpeedRpm: 1600,
    },
    {
      key: 'starboard-aux',
      label: 'Starboard Auxiliary Engine',
      kind: 'auxiliary',
      flowSupplyTags: ['SAE-FIN-VTOTAL', 'A07-SAE-FIN-VTOTAL'],
      flowReturnTags: ['SAE-FOUT-VTOTAL', 'A07-SAE-FOUT-VTOTAL'],
      speedTags: ['SAE-SPD', 'A07-SAE-SPD'],
      maxSpeedRpm: 1600,
    },
  ],
  sourceReport: 'SCReportingService / SCPailin A07 legacy-compatible report rules',
};

export const SC_PAILIN_MODE_HISTORIAN_TAG = 'A07-VES-GPS-SPEED';
