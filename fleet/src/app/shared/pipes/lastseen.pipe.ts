import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'lastseen',
  standalone: false,
})
export class LastseenPipe implements PipeTransform {
  transform(timestamp: string, nowTime: Date): string {
    if (!timestamp || timestamp === '---') return '---';

    const seenAt = new Date(timestamp);
    const now = nowTime instanceof Date ? nowTime : new Date(nowTime);
    if (Number.isNaN(seenAt.getTime()) || Number.isNaN(now.getTime())) return '---';
    if (now.getTime() <= seenAt.getTime()) return '0M';

    const minutes = Math.max(0, Math.floor((now.getTime() - seenAt.getTime()) / 60_000));
    if (minutes >= 1440) return `${Math.floor(minutes / 1440)}D`;
    if (minutes >= 60) return `${Math.floor(minutes / 60)}H`;
    return `${minutes}M`;
  }
}
