import { Component, ElementRef, EventEmitter, inject, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild, ViewEncapsulation } from '@angular/core';
import { Datetime } from '../../services/datetime';
import { DateAdapter, MAT_DATE_FORMATS } from '@angular/material/core';

@Component({
  selector: 'app-date-picker',
  templateUrl: './date-picker.html',
  styleUrl: './date-picker.scss',
  standalone: false,
})
export class DatePickers implements OnInit, OnChanges {

  @Input({ required: true }) initdate: Date = new Date();
  @Input() type: 'day' | 'month' | 'year' | 'datetime' = 'day';
  @Input() scale: number = 1;
  @Input() height: number = 40;
  @Output() selectDate = new EventEmitter<Date>();

  @ViewChild('container', { static: true }) containerRef!: ElementRef<HTMLDivElement>;

  private dateAdapter = inject(DateAdapter);
  private dateFormats = inject(MAT_DATE_FORMATS);
  selectedDate: Date = new Date();
  uniqueId: string = '';
  private dateTimeSrv = inject(Datetime);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initdate']) {
      //console.log(this.initdate)
      this.selectedDate = this.initdate;
    }

    if (changes['type']) {
      this.updateDateFormat();
    }
  }

  ngOnInit(): void {
    this.selectedDate = this.initdate;
    this.uniqueId = `datepicker-${Math.random().toString(36).substr(2, 9)}`;
  }

  onDateSelect(event: any): void {
    //console.log(event.value._d)
    if (event.value._d) {
      this.selectDate.emit(new Date(event.value));
    }
  }

  onMonthSelected(event: any, datepicker: any): void {
    //console.log(event)
    if(event._d){
      const date = new Date(event._d);
      const selectedDate1 = new Date(date.getFullYear(), date.getMonth(), 1);
      this.selectDate.emit(new Date(event._d));
      datepicker.close();
    }
  }

  onYearSelected(event: any, datepicker: any): void {
    if(event._d){
      const date = new Date(event._d);
      const selectedDate = new Date(date.getFullYear(), 0, 1);
      this.selectDate.emit(new Date(event._d));
      datepicker.close();
    }
  }

  private updateDateFormat(): void {
    let format: string;
    switch (this.type) {
      case 'month':
        format = 'MM/YYYY';
        break;
      case 'year':
        format = 'YYYY';
        break;
      default:
        format = 'DD/MM/YYYY';
    }
    
    // Update the formats
    (this.dateFormats as any).display.dateInput = format;
    (this.dateFormats as any).parse.dateInput = format;
  }
}

// date-formats.ts
export const DAY_FORMATS = {
  parse: {
    dateInput: 'DD/MM/YYYY',
  },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

export const MONTH_FORMATS = {
  parse: {
    dateInput: 'MM/YYYY',
  },
  display: {
    dateInput: 'MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'MMMM YYYY',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

export const YEAR_FORMATS = {
  parse: {
    dateInput: 'YYYY',
  },
  display: {
    dateInput: 'YYYY',
    monthYearLabel: 'YYYY',
    dateA11yLabel: 'YYYY',
    monthYearA11yLabel: 'YYYY',
  },
};