import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface ReportInfoItem {
  label: string;
  value: string | number | null | undefined;
  icon?: string;
  wide?: boolean;
}

@Component({
  selector: 'app-report-info-bar',
  standalone: false,
  templateUrl: './report-info-bar.component.html',
  styleUrls: ['./report-info-bar.component.css'],
})
export class ReportInfoBarComponent {
  @Input() eyebrow = 'Detail';
  @Input() title = '';
  @Input() icon = 'fa fa-info';
  @Input() items: ReportInfoItem[] = [];
  @Input() primaryLabel = 'Primary Action';
  @Input() primaryIcon = 'fa fa-download';
  @Input() primaryDisabled = false;
  @Input() secondaryLabel = 'Secondary Action';
  @Input() secondaryIcon = 'fa fa-external-link';
  @Input() secondaryDisabled = false;

  @Output() primaryAction = new EventEmitter<void>();
  @Output() secondaryAction = new EventEmitter<void>();

  displayValue(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') {
      return '-';
    }

    return String(value);
  }
}
