import { LiveReportVesselProfile } from '../../../models/live-report.model';

/**
 * Dedicated MV GEMIA report profile.
 *
 * The legacy PDF is a 27-page offshore report with two M/E, two shafts and
 * three A/E (Port / Thruster / Starboard).  The historian uses the MV_GEMIA
 * namespace and a direct 1..15 vessel-mode code.
 */
export const MV_GEMIA_REPORT_PROFILE: LiveReportVesselProfile = {
  id: 'mv-gemia-dedicated',
  label: 'MV GEMIA Dedicated Report Profile',
  aliases: ['MV GEMIA', 'MV_GEMIA', 'MvGemia'],
  prefixes: ['MV_GEMIA', 'MV_GEMIA-'],
  modeTags: ['VES-MODE', 'VES_MODE', 'MV_GEMIA-VES-MODE', 'MV_GEMIA_VES_MODE'],
  modeVerification: {
    kind: 'direct-telemetry-tag',
    tagSuffix: 'VES-MODE',
    mappingSource: 'MV GEMIA legacy daily report / direct mode code 1..15',
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
      fuelTodayTags: ['PME_CONS_TODAY'],
      fuelRateTags: ['PME_CONS_RATE'],
      speedTags: ['PME_SPD_CALC', 'PME_SPD'],
      flowSupplyTags: ['PME_FIN_RATE'],
      flowReturnTags: ['PME_FOUT_RATE'],
      maxSpeedRpm: 3000,
    },
    {
      key: 'starboard-main',
      label: 'Starboard Main Engine',
      kind: 'main',
      fuelTodayTags: ['SME_CONS_TODAY'],
      fuelRateTags: ['SME_CONS_RATE'],
      speedTags: ['SME_SPD_CALC', 'SME_SPD'],
      flowSupplyTags: ['SME_FIN_RATE'],
      flowReturnTags: ['SME_FOUT_RATE'],
      maxSpeedRpm: 3000,
    },
    {
      key: 'port-aux',
      label: 'Port Auxiliary Engine',
      kind: 'auxiliary',
      fuelTodayTags: ['PAE_CONS_TODAY'],
      fuelRateTags: ['PAE_CONS_RATE'],
      speedTags: ['PAE_SPD_CALC', 'PAE_SPD'],
      flowSupplyTags: ['PAE_FIN_RATE'],
      flowReturnTags: ['PAE_FOUT_RATE'],
      maxSpeedRpm: 4000,
    },
    {
      key: 'center-aux',
      label: 'Thruster Auxiliary Engine',
      kind: 'auxiliary',
      fuelTodayTags: ['CAE_CONS_TODAY'],
      fuelRateTags: ['CAE_CONS_RATE'],
      speedTags: ['CAE_SPD_CALC', 'CAE_SPD'],
      flowSupplyTags: ['CAE_FIN_RATE'],
      flowReturnTags: ['CAE_FOUT_RATE'],
      maxSpeedRpm: 4000,
    },
    {
      key: 'starboard-aux',
      label: 'Starboard Auxiliary Engine',
      kind: 'auxiliary',
      fuelTodayTags: ['SAE_CONS_TODAY'],
      fuelRateTags: ['SAE_CONS_RATE'],
      speedTags: ['SAE_SPD_CALC', 'SAE_SPD'],
      flowSupplyTags: ['SAE_FIN_RATE'],
      flowReturnTags: ['SAE_FOUT_RATE'],
      maxSpeedRpm: 4000,
    },
  ],
  sourceReport: 'MV-GEMIA-Daily-Report-2026-09-14.pdf',
};

export const MV_GEMIA_MODE_HISTORIAN_TAG = 'MV_GEMIA-VES-MODE';
