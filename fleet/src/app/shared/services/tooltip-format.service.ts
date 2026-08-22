import { Injectable } from '@angular/core';
import { DatePipe } from '@angular/common';
@Injectable({
  providedIn: 'root',
})
export class TooltipFormatService {
  constructor(private datePipe: DatePipe) {}

  getTooltip(tag: string, timestamp: string): string {
    let _timestamp = this.datePipe.transform(timestamp, 'yyyy/MM/dd HH:mm');
    if (_timestamp == null) _timestamp = '';
    let str = `${tag} \n ${_timestamp}`;
    return str;
  }
}
