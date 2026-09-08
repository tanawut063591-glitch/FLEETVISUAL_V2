import { LiveReportVesselProfile } from '../../../models/live-report.model';

/**
 * Dedicated SC EMERALD report profile.
 *
 * Historian mapping follows the legacy SCEmerald reporting service (A05-* tags).
 * The vessel has two main engines / shafts and three auxiliary engines.
 */
export const SC_EMERALD_REPORT_PROFILE: LiveReportVesselProfile = {
  id: 'sc-emerald-dedicated',
  label: 'SC EMERALD Dedicated Report Profile',
  aliases: ['SC EMERALD', 'SC_EMERALD', 'SCEmerald'],
  prefixes: ['A05', 'A05-', 'SC_EMERALD', 'SC_EMERALD-'],
  modeTags: ['VES-MODE', 'A05-VES-MODE'],
  modeVerification: {
    kind: 'direct-telemetry-tag',
    tagSuffix: 'VES-MODE',
    mappingSource: 'SCReportingService SCEmerald A05-VES-MODE mapping',
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
    {
      key: 'port-main',
      label: 'Port Main Engine',
      kind: 'main',
      flowSupplyTags: ['PME-FIN-VTOTAL', 'A05-PME-FIN-VTOTAL'],
      flowReturnTags: ['PME-FOUT-VTOTAL', 'A05-PME-FOUT-VTOTAL'],
      speedTags: ['PME-SPD', 'A05-PME-SPD'],
      maxSpeedRpm: 2000,
    },
    {
      key: 'starboard-main',
      label: 'Starboard Main Engine',
      kind: 'main',
      flowSupplyTags: ['SME-FIN-VTOTAL', 'A05-SME-FIN-VTOTAL'],
      flowReturnTags: ['SME-FOUT-VTOTAL', 'A05-SME-FOUT-VTOTAL'],
      speedTags: ['SME-SPD', 'A05-SME-SPD'],
      maxSpeedRpm: 2000,
    },
    {
      key: 'port-aux',
      label: 'Port Auxiliary Engine',
      kind: 'auxiliary',
      flowSupplyTags: ['PAE-FIN-VTOTAL', 'A05-PAE-FIN-VTOTAL'],
      flowReturnTags: ['PAE-FOUT-VTOTAL', 'A05-PAE-FOUT-VTOTAL'],
      speedTags: ['PAE-SPD', 'A05-PAE-SPD'],
      maxSpeedRpm: 2000,
    },
    {
      key: 'center-aux',
      label: 'Thruster Auxiliary Engine',
      kind: 'auxiliary',
      flowSupplyTags: ['CAE-FIN-VTOTAL', 'A05-CAE-FIN-VTOTAL'],
      flowReturnTags: ['CAE-FOUT-VTOTAL', 'A05-CAE-FOUT-VTOTAL'],
      speedTags: ['CAE-SPD', 'A05-CAE-SPD'],
      maxSpeedRpm: 2000,
    },
    {
      key: 'starboard-aux',
      label: 'Starboard Auxiliary Engine',
      kind: 'auxiliary',
      flowSupplyTags: ['SAE-FIN-VTOTAL', 'A05-SAE-FIN-VTOTAL'],
      flowReturnTags: ['SAE-FOUT-VTOTAL', 'A05-SAE-FOUT-VTOTAL'],
      speedTags: ['SAE-SPD', 'A05-SAE-SPD'],
      maxSpeedRpm: 2000,
    },
  ],
  sourceReport: 'SCReportingService / SCEmerald legacy-compatible report rules',
};

export const SC_EMERALD_MODE_HISTORIAN_TAG = 'A05-VES-MODE';
