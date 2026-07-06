import {
    InverterSessionResponse,
    InverterDevicesResponse,
    InverterStatusResponse,
    InverterCommandResponse,
    InverterCommandLogsResponse,
    InverterDeviceModel,
    InverterRealtimeModel,
    InverterCommandLogModel,
    InverterCommand,
} from '../shared/models/inverter.model';

// ─── run_state codes (FusionSolar SUN2000) ────────────────────────────────────
// 512  = On-Grid (Running)
// 1024 = On-Grid, Power Limited
// 256  = Off-Grid / Standby
// 768  = Shutdown
// 40960 = Fault

// ─── Session ──────────────────────────────────────────────────────────────────

export const MockInverterSession: InverterSessionResponse = {
    status: 'success',
    data: {
        sessionId: 'mock-session-uuid-8f4a2b1c3d9e7f60',
        expiresAt: new Date(Date.now() + 25 * 60 * 1000).toISOString(),
        ttlSeconds: 1500,
    },
};

export const MockDestroySession: InverterSessionResponse = {
    status: 'success',
    data: {
        sessionId: 'mock-session-uuid-8f4a2b1c3d9e7f60',
        expiresAt: '',
        ttlSeconds: 0,
    },
};

// ─── Devices ──────────────────────────────────────────────────────────────────

export const MockInverterDevices: InverterDevicesResponse = {
    status: 'success',
    data: [
        {
            devDn:           'NL2340A00001',
            devName:         'INV-01',
            devTypeId:       1,
            softwareVersion: 'V300R001C00SPC050',
            stationCode:     'NE=KKB01',
            esnCode:         'NL2340A00001',
        },
        {
            devDn:           'NL2340A00002',
            devName:         'INV-02',
            devTypeId:       1,
            softwareVersion: 'V300R001C00SPC050',
            stationCode:     'NE=KKB01',
            esnCode:         'NL2340A00002',
        },
        {
            devDn:           'NL2340A00003',
            devName:         'INV-03',
            devTypeId:       1,
            softwareVersion: 'V300R001C00SPC050',
            stationCode:     'NE=KKB01',
            esnCode:         'NL2340A00003',
        },
        {
            devDn:           'NL2340A00004',
            devName:         'INV-04',
            devTypeId:       1,
            softwareVersion: 'V300R001C00SPC050',
            stationCode:     'NE=KKB01',
            esnCode:         'NL2340A00004',
        },
        {
            devDn:           'NL2340A00005',
            devName:         'INV-05',
            devTypeId:       1,
            softwareVersion: 'V300R001C00SPC050',
            stationCode:     'NE=KKB01',
            esnCode:         'NL2340A00005',
        },
        {
            devDn:           'NL2340A00006',
            devName:         'INV-06',
            devTypeId:       1,
            softwareVersion: 'V300R001C00SPC050',
            stationCode:     'NE=KKB01',
            esnCode:         'NL2340A00006',
        },
        {
            devDn:           'NL2340A00007',
            devName:         'INV-07',
            devTypeId:       1,
            softwareVersion: 'V300R001C00SPC050',
            stationCode:     'NE=KKB01',
            esnCode:         'NL2340A00007',
        },
    ] as InverterDeviceModel[],
};

// ─── Realtime Status ──────────────────────────────────────────────────────────

export const MockInverterStatus: InverterStatusResponse = {
    status: 'success',
    data: [
        {
            devId: 'NL2340A00001',
            dataItemMap: {
                run_state:       512,       // On-Grid Running
                active_power:    45.2,
                reactive_power:  1.4,
                power_factor:    0.98,
                efficiency:      98.2,
                temperature:     42.5,
                elec_freq:       50.02,
                mppt_power:      46.1,
                ab_u:            220.4,     // Phase AB voltage
                bc_u:            219.8,
                ca_u:            220.1,
            },
        },
        {
            devId: 'NL2340A00002',
            dataItemMap: {
                run_state:    512,
                active_power: 52.0,
                reactive_power: 1.8,
                power_factor:   0.99,
                efficiency:     98.5,
                temperature:    44.1,
                elec_freq:      50.01,
                mppt_power:     52.8,
            },
        },
        {
            devId: 'NL2340A00003',
            dataItemMap: {
                run_state:    512,
                active_power: 48.7,
                reactive_power: 1.6,
                power_factor:   0.98,
                efficiency:     97.9,
                temperature:    43.3,
                elec_freq:      50.00,
                mppt_power:     49.5,
            },
        },
        {
            devId: 'NL2340A00004',
            dataItemMap: {
                run_state:    40960,    // Fault
                active_power: 0,
                reactive_power: 0,
                power_factor:   0,
                efficiency:     0,
                temperature:    38.0,
                elec_freq:      0,
                mppt_power:     0,
            },
        },
        {
            devId: 'NL2340A00005',
            dataItemMap: {
                run_state:    256,      // Standby
                active_power: 0,
                reactive_power: 0,
                power_factor:   0,
                efficiency:     0,
                temperature:    35.2,
                elec_freq:      0,
                mppt_power:     0,
            },
        },
        {
            devId: 'NL2340A00006',
            dataItemMap: {
                run_state:    512,
                active_power: 39.8,
                reactive_power: 1.2,
                power_factor:   0.97,
                efficiency:     97.5,
                temperature:    41.8,
                elec_freq:      50.03,
                mppt_power:     40.6,
            },
        },
        {
            devId: 'NL2340A00007',
            dataItemMap: {
                run_state:    512,
                active_power: 55.1,
                reactive_power: 2.0,
                power_factor:   0.99,
                efficiency:     98.7,
                temperature:    45.0,
                elec_freq:      50.01,
                mppt_power:     55.9,
            },
        },
    ] as InverterRealtimeModel[],
};

// ─── Command Responses ────────────────────────────────────────────────────────

export const MockCommandSuccess = (command: InverterCommand, deviceSn: string): InverterCommandResponse => ({
    status: 'success',
    data: {
        command,
        deviceSn,
        result: 'SUCCESS',
    },
});

export const MockCommandFailed = (command: InverterCommand, deviceSn: string): InverterCommandResponse => ({
    status: 'error',
    message: `FusionSolar API error — failCode: 407, message: Device not found or command rejected`,
});

// ─── Command Logs ─────────────────────────────────────────────────────────────

export const MockInverterCommandLogs: InverterCommandLogsResponse = {
    status: 'success',
    data: [
        {
            id:         1,
            site_id:    'KKB',
            device_sn:  'NL2340A00001',
            command:    'POWER_LIMIT',
            params:     '{"value":"75"}',
            auth_mode:  'passthrough',
            sent_by:    'admin',
            result:     'SUCCESS',
            error_msg:  undefined,
            created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        },
        {
            id:         2,
            site_id:    'KKB',
            device_sn:  'NL2340A00003',
            command:    'ZERO_EXPORT',
            params:     '{"value":"0"}',
            auth_mode:  'passthrough',
            sent_by:    'operator1',
            result:     'SUCCESS',
            error_msg:  undefined,
            created_at: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(),
        },
        {
            id:         3,
            site_id:    'KKB',
            device_sn:  'NL2340A00002',
            command:    'SHUTDOWN',
            params:     '{}',
            auth_mode:  'passthrough',
            sent_by:    'admin',
            result:     'SUCCESS',
            error_msg:  undefined,
            created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        },
        {
            id:         4,
            site_id:    'KKB',
            device_sn:  'NL2340A00004',
            command:    'POWER_LIMIT',
            params:     '{"value":"50"}',
            auth_mode:  'stored',
            sent_by:    'admin',
            result:     'FAILED',
            error_msg:  'FusionSolar API error — failCode: 407, message: Device offline',
            created_at: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
        },
        {
            id:         5,
            site_id:    'KKB',
            device_sn:  'NL2340A00005',
            command:    'ZERO_EXPORT',
            params:     '{"value":"0"}',
            auth_mode:  'stored',
            sent_by:    'operator2',
            result:     'SUCCESS',
            error_msg:  undefined,
            created_at: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
        },
        {
            id:         6,
            site_id:    'KKB',
            device_sn:  'NL2340A00001',
            command:    'START',
            params:     '{}',
            auth_mode:  'passthrough',
            sent_by:    'admin',
            result:     'SUCCESS',
            error_msg:  undefined,
            created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            id:         7,
            site_id:    'KKB',
            device_sn:  'NL2340A00006',
            command:    'SHUTDOWN',
            params:     '{}',
            auth_mode:  'passthrough',
            sent_by:    'admin',
            result:     'PENDING',
            error_msg:  undefined,
            created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        },
    ] as InverterCommandLogModel[],
};
