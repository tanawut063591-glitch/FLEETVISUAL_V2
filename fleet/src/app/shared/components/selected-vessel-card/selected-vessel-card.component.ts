import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-selected-vessel-card',
  standalone: false,
  templateUrl: './selected-vessel-card.component.html',
  styleUrls: ['./selected-vessel-card.component.css'],
})
export class SelectedVesselCardComponent {
  @Input() vesselName = '';
  @Input() label = 'Selected Vessel';
  @Input() status: 'online' | 'offline' | 'idle' | 'empty' = 'online';
  @Input() imageSrc = '';

  get isEmpty(): boolean {
    return !this.vesselName;
  }

  get displayName(): string {
    return this.vesselName || 'Please select vessel';
  }
}
