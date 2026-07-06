export interface EventDataModel{
    ID: string;
    Group: string;
    Item: string;
    Type: 'alarm' | 'event';
    Level: 'Major' | 'Minor' | 'Warning' | 'Info';
    Location: string;
    PointSource: string;
    StartTime: string;
    EndTime: string;
    Message: string;
    Condition: string;
    Action?: string;
}

export interface EventSummaryModel{
    PointSource: string;
    Count: number;
    Major: number;
    Minor: number;
    Warning: number;
    Info: number;
}

export interface EventRequestModel{
    StartTime: string;
    EndTime: string;
    PointSource?: string;
}

export interface FilterEventRequestModel extends EventRequestModel{
    Equipments?: string;
    Assets?: string;
    Type?: 'alarm' | 'event';
    Level?: 'Major' | 'Minor' | 'Warning' | 'Info';
}

export interface EventConfigModel{
    ID: number;
    Message: string;
    Equipment: string;
    Asset: string;
    Location?: string;
    PointSource?: string;
    Level: 'Major' | 'Minor' | 'Warning' | 'Info';
    Type: 'alarm' | 'event';
    TagSync?: string;
    LastEventCount: number;
    LastEvent?: string;
    lastEventTimestamp: string;
    TriggerCounter: number;
    EnableEmail: boolean;
    EmailType: string;
    Enable: boolean;
    Group: number;
    Order: number;
    BackFillPeriod?: string;
    Schedule: string;
    Expression: string;
    Notifications: string[];
}

export interface EventConfigResponseModel{
    StatusCode: string;
    Message: string;
}

export interface TelegramConfigModel{
    accessToken: string;
    userGroup: string[];
}

export interface LineConfigModel{
    accessToken: string;
    secret: string;
    userGroup: string[];
}

export interface EmailConfigModel{
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string;
    fromAddress: string;
    toAddress: string[];
    ccAddress: string[];
    bccAddress: string[];
}

export interface MsTeamConfigModel{
    webhookUrl: string;
}

export enum NotificationType{
    'telegram', 'line', 'email', 'msteam'
}

export interface NotificationConfigModel{
    id: string;
    name: string;
    type: 'telegram' | 'line' | 'email' | 'msteam';
    enable: boolean;
    config: TelegramConfigModel | LineConfigModel | EmailConfigModel | MsTeamConfigModel;
}

export interface AddNotificationConfigModel{
    Enable: boolean;
    Name: string;
    Type: 'telegram' | 'line' | 'email' | 'msteam';
    Config: TelegramConfigModel | LineConfigModel | EmailConfigModel | MsTeamConfigModel;
}

export interface UpdateNotificationConfigModel extends AddNotificationConfigModel{
    Id: string;
}

export interface DeleteNotificationConfigModel{
    Id: string
}

export interface ExpressionParseResultModel{
    success: boolean;
    value: string;
    error: string;
    warning: any[];
}