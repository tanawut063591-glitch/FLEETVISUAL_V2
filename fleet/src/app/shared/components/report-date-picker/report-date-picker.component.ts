import { Component, EventEmitter, Input, Output } from '@angular/core';

type ReportDateMode = 'date' | 'month';

@Component({
  selector: 'app-report-date-picker',
  standalone: false,
  templateUrl: './report-date-picker.component.html',
  styleUrls: ['./report-date-picker.component.css'],
})
export class ReportDatePickerComponent {
  @Input() label = 'Date';
  @Input() hint = '';
  @Input() icon = 'fa fa-calendar-o';
  @Input() mode: ReportDateMode = 'date';
  @Input() value = '';
  @Input() disabled = false;
  @Input() min = '';
  @Input() max = '';

  @Output() valueChange = new EventEmitter<string>();

  onValueChange(nextValue: string): void {
    this.value = nextValue;
    this.valueChange.emit(nextValue);
  }
}
