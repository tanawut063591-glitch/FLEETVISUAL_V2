export interface TimerPayload {
    start: number;
    end: number;
    tags: any[];
    fvInfo: any;
}

export interface QuickPeriodOption {
    label: string;
    value: string;
}

export interface TagColumnOption {
    key: string;
    title: string;
    subtitle: string;
    icon: string;
}

export interface TagPresetOption {
    key: string;
    label: string;
    description: string;
    keywords: string[];
}

export interface TagGroupBucket {
    group: string[];
    tags: any[];
}

export interface SelectedGroupSummary {
    key: string;
    title: string;
    count: number;
}
