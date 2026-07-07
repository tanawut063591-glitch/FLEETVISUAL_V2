import { ResponseRealtimeModel } from "../models/response.model";

export function getTooltip(data: ResponseRealtimeModel | undefined): string {
    const name = data?.Name || '';
    const time = data?.TimeStamp || '';
    if (name && time) { return `${name} • ${time}`; }
    return name || time || '---';
}