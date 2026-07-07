import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { DatePipe } from '@angular/common';
import * as _moment from 'moment';
import { Moment } from 'moment';
import { DateView } from '@danielmoncada/angular-datetime-picker';
import { Datetime } from '../../services/datetime';

@Component({
  selector: 'app-time-select',
  templateUrl: './time-select.component.html',
  styleUrl: './time-select.component.scss',
  standalone: false,
})
export class TimeSelectComponent implements OnInit, OnChanges {
  @Input() initDate?: number;
  @Input() title?: string;
  @Input() setDate?: Date = new Date();
  @Input() type: 'datetime' | 'date' | 'month' | 'year' = 'date';
  @Input() dateFormat?: string; // Custom date format input
  @Output() selectDate = new EventEmitter<string>();

  date: Date = new Date();
  placeholder = 'Select date';
  pickerType: any = 'calendar';
  startView: DateView = DateView.MONTH; // ใช้ enum แบบปลอดภัย
  dateView: DateView = DateView.MONTH;
  monthView: DateView = DateView.YEAR;
  yearView: DateView = DateView.MULTI_YEARS;

  constructor(private dateTimeSrv: Datetime, private datePipe: DatePipe, private cd: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (this.setDate) {
      this.date = this.setDate;
    }
    if(this.type){
      switch (this.type) {
        case 'datetime':
          this.pickerType = 'both';
          this.startView = DateView.MONTH;
          this.placeholder = 'Select date & time';
          break;
  
        case 'date':
          this.pickerType = 'calendar';
          this.startView = DateView.MONTH;
          this.placeholder = 'Select date';
          break;
  
        case 'month':
          this.pickerType = 'calendar';
          this.startView = DateView.YEAR; // เปิดมุมมองปี เพื่อเลือกเดือน
          this.placeholder = 'Select month';
          break;
  
        case 'year':
          this.pickerType = 'calendar';
          this.startView = DateView.MULTI_YEARS; // เปิดมุมมองหลายปี
          this.placeholder = 'Select year';
          break;
      }
      this.cd.detectChanges();
    }
  }

  ngOnInit(): void {
    const d = new Date();

    switch (this.title) {
      case 'START':
        d.setHours(0, 0, 0, 0);
        break;
      case 'END':
        d.setHours(23, 59, 0, 0);
        break;
      default:
        d.setHours(0, 0, 0, 0);
        break;
    }

    this.date = d;

    // ✅ ปรับโหมดตาม type ที่รับเข้ามา
    switch (this.type) {
      case 'datetime':
        this.pickerType = 'both';
        this.startView = DateView.MONTH;
        this.placeholder = 'Select date & time';
        break;

      case 'date':
        this.pickerType = 'calendar';
        this.startView = DateView.MONTH;
        this.placeholder = 'Select date';
        break;

      case 'month':
        this.pickerType = 'calendar';
        this.startView = DateView.YEAR; // เปิดมุมมองปี เพื่อเลือกเดือน
        this.placeholder = 'Select month';
        break;

      case 'year':
        this.pickerType = 'calendar';
        this.startView = DateView.MULTI_YEARS; // เปิดมุมมองหลายปี
        this.placeholder = 'Select year';
        break;
    }

    this.emitDate(this.date);
  }

  SelectDay(event: any) {
    this.emitDate(event);
  }

  private emitDate(date: Date) {
    // Use custom format if provided, otherwise use default format based on type
    let format = this.dateFormat || (
      this.type === 'datetime' ? 'yyyy-MM-dd HH:mm:ss' :
      this.type === 'date' ? 'yyyy-MM-dd' :
      this.type === 'month' ? 'MM/yyyy' :
      this.type === 'year' ? 'yyyy' :
      'yyyy-MM-dd HH:mm:ss'
    );
    
    if(this.type === 'month'){
      date.setDate(1);
      // Convert to Buddhist era for Thai locale
      const buddhistYear = date.getFullYear() + 543;
      format = `MM/${buddhistYear}`;
    }
    if(this.type === 'year'){
      date.setMonth(0, 1);
      // Convert to Buddhist era for Thai locale
      const buddhistYear = date.getFullYear() + 543;
      format = buddhistYear.toString();
    }
    const dt = new Date(date);
    //console.log(dt)
    const formatted = this.datePipe.transform(date, format);
    this.selectDate.emit(dt.toISOString());
  }

  onMonthSelected(date: Date, picker: any) {
    picker.close();
    this.emitDate(date);
  }

  onYearSelected(date: Date, picker: any) {
    picker.close();
    this.emitDate(date);
  }
}
