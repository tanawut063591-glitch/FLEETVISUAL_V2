import { CommonModule, DatePipe } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';

import { DatetimeControlComponent } from './datetime-control.component';

@NgModule({
  declarations: [DatetimeControlComponent],
  imports: [CommonModule, FormsModule, DialogModule, DatePickerModule],
  exports: [DatetimeControlComponent],
  providers: [DatePipe],
})
export class DatetimeControlModule {}
