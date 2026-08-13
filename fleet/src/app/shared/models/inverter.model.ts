

export interface InverterSessionResponse {
    status: 'success' | 'error';
    data?: {
        sessionId: string;
        expiresAt: string;
        ttlSeconds: number;
    };
    message?: string;
}

export interface CreateInverterSessionRequest {
    username: string;
    systemCode: string;
}

export interface DestroyInverterSessionRequest {
    sessionId: string;
}



export interface InverterDeviceModel {
    devDn?: string;
    devName?: string;
    devTypeId?: number;
    softwareVersion?: string;
    stationCode?: string;
    esnCode?: string;
    [key: string]: any;
}

export interface GetInverterDevicesRequest {
    stationCode: string;
    sessionId?: string;
}

export interface InverterDevicesResponse {
    status: 'success' | 'error';
    data?: InverterDeviceModel[];
    message?: string;
}



export interface InverterRealtimeModel {
    devId?: string;
    dataItemMap?: {
        mppt_power?: number;
        active_power?: number;
        reactive_power?: number;
        power_factor?: number;
        efficiency?: number;
        temperature?: number;
        elec_freq?: number;
        run_state?: number;
        [key: string]: any;
    };
    [key: string]: any;
}

export interface GetInverterStatusRequest {
    devIds: string | string[];
    sessionId?: string;
}

export interface InverterStatusResponse {
    status: 'success' | 'error';
    data?: InverterRealtimeModel[];
    message?: string;
}



export type InverterCommand = 'SHUTDOWN' | 'START' | 'POWER_LIMIT' | 'ZERO_EXPORT';

export interface InverterCommandParams {
    percent?: number;
}

export interface SendInverterCommandRequest {
    siteId: string;
    deviceSn: string;
    command: InverterCommand;
    params?: InverterCommandParams;
    sessionId?: string;
}

export interface InverterCommandResponse {
    status: 'success' | 'error';
    data?: {
        command: InverterCommand;
        deviceSn: string;
        result: 'SUCCESS' | 'FAILED' | 'PENDING';
    };
    message?: string;
}



export interface InverterCommandLogModel {
    id: number;
    site_id: string;
    device_sn: string;
    command: InverterCommand;
    params?: string;
    auth_mode: 'stored' | 'passthrough';
    sent_by?: string;
    result: 'SUCCESS' | 'FAILED' | 'PENDING';
    error_msg?: string;
    created_at?: string;
}

export interface GetInverterCommandLogsRequest {
    siteId?: string;
    limit?: number;
}

export interface InverterCommandLogsResponse {
    status: 'success' | 'error';
    data?: InverterCommandLogModel[];
    message?: string;
}
