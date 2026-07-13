import { Component, EventEmitter, Input, Output } from '@angular/core';

type ReportMessageType = 'success' | 'error' | 'warning' | 'info';

@Component({
  selector: 'app-report-message-alert',
  standalone: false,
  templateUrl: './report-message-alert.component.html',
  styleUrls: ['./report-message-alert.component.css'],
})
export class ReportMessageAlertComponent {
  @Input() type: ReportMessageType = 'info';
  @Input() message = '';
  @Input() meta = '';
  @Input() dismissible = true;

  @Output() dismissed = new EventEmitter<void>();

  get iconClass(): string {
    const icons: Record<ReportMessageType, string> = {
      success: 'fa fa-check-circle',
      error: 'fa fa-exclamation-triangle',
      warning: 'fa fa-exclamation-circle',
      info: 'fa fa-info-circle',
    };

    return icons[this.type];
  }
}
