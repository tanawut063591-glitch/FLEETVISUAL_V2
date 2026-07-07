import { Component, input } from '@angular/core';
import { ResponseRealtimeModel } from '../../models/response.model';

@Component({
  selector: 'app-polygon-card',
  standalone: false,
  templateUrl: './polygon-card.html',
  styleUrl: './polygon-card.scss'
})
export class PolygonCard {
  data = input<ResponseRealtimeModel>();
  title = input<string>('');
  value = input<string>('');
  unit = input<string>('');
  icon = input<string>('dashboard');
  icon_color = input<string>('whitesmoke');
  bgcolor = input<string>('var(--secondary-bg)');

  getTooltip(data: ResponseRealtimeModel | undefined): string {
    const name = data?.Name || '';
    const time = data?.TimeStamp || '';
    if (name && time) { return `${name} • ${time}`; }
    return name || time || '---';
  }
  
}
