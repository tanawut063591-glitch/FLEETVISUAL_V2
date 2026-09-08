import { LiveReportVesselProfile } from '../../../models/live-report.model';

/**
 * Dedicated SC BRAVE report profile.
 *
 * This profile intentionally lives beside the vessel service instead of in the
 * shared report component. New vessel-specific rules can therefore be added
 * without turning report.component.ts into a collection of vessel if/else blocks.
 */
export const SC_BRAVE_REPORT_PROFILE: LiveReportVesselProfile = {
  id: 'sc-brave-dedicated',
  label: 'SC BRAVE Dedicated Report Profile',
  aliases: ['SC BRAVE', 'SC_BRAVE', 'SCBRAVE', 'A03'],
  prefixes: ['A03', 'A03-', 'SC_BRAVE', 'SC_BRAVE-'],
  modeTags: [],
  modeVerification: {
    kind: 'fallback-or-derived',
    mappingSource: 'SCReportingService SCBrave GPS-speed mode rules',
  },
  modes: [
    { key: 'standby', label: 'Standby' },
    { key: 'cargo-operation', label: 'Cargo Operation' },
    { key: 'manoeuvring', label: 'Manoeuvring' },
    { key: 'sea-passage-economics', label: 'Sea Passage Economics' },
    { key: 'passage', label: 'Passage' },
  ],
  engines: [
    {
      key: 'port-main',
      label: 'Port Main Engine',
      kind: 'main',
      fuelTodayTags: ['PME_CONS_TODAY'],
      fuelRateTags: ['PME_CONS_RATE'],
      flowSupplyTags: ['PME_FIN_RATE'],
      flowReturnTags: ['PME_FOUT_RATE'],
      speedTags: ['PME_SPD_CALC', 'PME_SPD'],
      loadTags: ['PME_ENGINE_LOAD', 'PME_GEN_LOAD'],
      powerTags: ['PME_GEN_LOAD_KW'],
      maxSpeedRpm: 3000,
    },
    {
      key: 'center-main',
      label: 'Center Main Engine',
      kind: 'main',
      fuelTodayTags: ['CME_CONS_TODAY'],
      fuelRateTags: ['CME_CONS_RATE'],
      flowSupplyTags: ['CME_FIN_RATE'],
      flowReturnTags: ['CME_FOUT_RATE'],
      speedTags: ['CME_SPD_CALC', 'CME_SPD'],
      loadTags: ['CME_ENGINE_LOAD', 'CME_GEN_LOAD'],
      powerTags: ['CME_GEN_LOAD_KW'],
      maxSpeedRpm: 3000,
    },
    {
      key: 'starboard-main',
      label: 'Starboard Main Engine',
      kind: 'main',
      fuelTodayTags: ['SME_CONS_TODAY'],
      fuelRateTags: ['SME_CONS_RATE'],
      flowSupplyTags: ['SME_FIN_RATE'],
      flowReturnTags: ['SME_FOUT_RATE'],
      speedTags: ['SME_SPD_CALC', 'SME_SPD'],
      loadTags: ['SME_ENGINE_LOAD', 'SME_GEN_LOAD'],
      powerTags: ['SME_GEN_LOAD_KW'],
      maxSpeedRpm: 3000,
    },
    {
      key: 'port-aux',
      label: 'Port Auxiliary Engine',
      kind: 'auxiliary',
      fuelTodayTags: ['PAE_CONS_TODAY'],
      fuelRateTags: ['PAE_CONS_RATE'],
      flowSupplyTags: ['PAE_FIN_RATE'],
      flowReturnTags: ['PAE_FOUT_RATE'],
      speedTags: ['PAE_SPD_CALC', 'PAE_SPD'],
      loadTags: ['PAE_ENGINE_LOAD', 'PAE_GEN_LOAD'],
      powerTags: ['PAE_GEN_LOAD_KW'],
      maxSpeedRpm: 4000,
    },
    {
      key: 'starboard-aux',
      label: 'Starboard Auxiliary Engine',
      kind: 'auxiliary',
      fuelTodayTags: ['SAE_CONS_TODAY'],
      fuelRateTags: ['SAE_CONS_RATE'],
      flowSupplyTags: ['SAE_FIN_RATE'],
      flowReturnTags: ['SAE_FOUT_RATE'],
      speedTags: ['SAE_SPD_CALC', 'SAE_SPD'],
      loadTags: ['SAE_ENGINE_LOAD', 'SAE_GEN_LOAD'],
      powerTags: ['SAE_GEN_LOAD_KW'],
      maxSpeedRpm: 4000,
    },
  ],
  sourceReport: 'SCReportingService / SCBrave legacy-compatible report rules',
};

export const SC_BRAVE_MODE_HISTORIAN_TAG = 'A03-VES-GPS-SPEED';
