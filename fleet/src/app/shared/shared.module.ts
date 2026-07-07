import { NgModule } from '@angular/core';
import { FiltersitePipe } from './pipes/filtersite-pipe';
import { MaterialModule } from '../core/module/material-module';
//import { DatePicker, DatePickerModule } from 'primeng/datepicker';

import { FormsModule } from '@angular/forms';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';


//import { StackChart } from './components/stack-chart/stack-chart';

//import { OwlDateTimeModule, OWL_DATE_TIME_FORMATS, OwlNativeDateTimeModule } from '@danielmoncada/angular-datetime-picker';
import { OwlMomentDateTimeModule } from '@danielmoncada/angular-datetime-picker-moment-adapter';

import { MAT_DATE_LOCALE, MAT_DATE_FORMATS, DateAdapter } from '@angular/material/core';
import { MomentDateAdapter, MAT_MOMENT_DATE_ADAPTER_OPTIONS, provideMomentDateAdapter } from '@angular/material-moment-adapter';
import { NumberFomatPipe } from './pipes/number-fomat.pipe';
import { FilterTablePipe } from './pipes/filter-table-pipe';

import { MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';

import { DragDropModule } from '@angular/cdk/drag-drop';
import { OverlayModule } from '@angular/cdk/overlay';
import { PortalModule } from '@angular/cdk/portal';


import { LastseenPipe } from './pipes/lastseen.pipe';
import { BillingStatusPipe } from './pipes/billing-status-pipe';

import { CommonModule } from '@angular/common';

export const MY_DATE_FORMATS = {
  parse: {
    dateInput: 'DD/MM/YYYY',
  },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthLabel: 'MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};


@NgModule({
  declarations: [
    FiltersitePipe,
    NumberFomatPipe,
    FilterTablePipe,
    LastseenPipe,
    BillingStatusPipe,



    // StackChart,
    // Piechart,
    // Highchart,
    //PanelLayout,
    //ChartCard,
  
    //FilterTable,

    //DataTable,
    //SkeletonBox,

    //MapContainer
    // InverterDialog,
    // MeterDialog
    
  ],
  imports: [
    FormsModule,
    CommonModule,
    DragDropModule,
    OverlayModule,
    PortalModule,
    //MaterialModule,
    //DatePickerModule,
    //ChartModule,
    //OwlDateTimeModule,
    //OwlNativeDateTimeModule,
    Toast,

  ],
  exports: [
    //MaterialModule,
    Toast,

    FiltersitePipe,
    NumberFomatPipe,
    FilterTablePipe,
    LastseenPipe,
    BillingStatusPipe,

    // DatePickers,
    // CardContainer,
    // CircleProgress,

    // StackChart,
    // Piechart,
    // Highchart,
    //PanelLayout,
    //ChartCard,
    //TimeSelectComponent,
    //FilterTable,

    //DataTable,
    //SkeletonBox,

    //MapContainer
    // InverterDialog,
    // MeterDialog
    
  ],
  providers: [
    MessageService, // Add MessageService provider here
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: Aura,
      },
    }),
    {
      provide: DateAdapter,
      useClass: MomentDateAdapter,
    },
    {
      provide: MAT_DATE_FORMATS,
      useFactory: () => ({
        parse: { dateInput: 'DD/MM/YYYY' },
        display: {
          dateInput: 'DD/MM/YYYY',
          monthYearLabel: 'MMM YYYY',
          dateA11yLabel: 'LL',
          monthYearA11yLabel: 'MMMM YYYY',
        }
      })
    }
  ]
})
export class ShareModule { }