import { inject, Injectable } from '@angular/core';
import { ResponseRealtimeModel } from '../models/response.model';
import { Datetime } from './datetime';

@Injectable({
  providedIn: 'root'
})
export class TooltipFormat {

  private dateSrv = inject(Datetime);

  getTooltip(data: ResponseRealtimeModel | undefined): string {
    const name = data?.Name || '';
    const time = data?.TimeStamp || '';
    if (name && time) { return `${name}\n${this.dateSrv.getDateTime1(time)}`; }
    return name || time || '---';
  }

}
