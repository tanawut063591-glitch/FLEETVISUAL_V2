import { NgModule } from '@angular/core';
import { FiltersitePipe } from './pipes/filtersite-pipe';
import { MaterialModule } from '../core/module/material-module';
import { DatePicker, DatePickerModule } from 'primeng/datepicker';

import { FormsModule } from '@angular/forms';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { HighchartsChartDirective } from 'highcharts-angular';

import { OwlDateTimeModule, OWL_DATE_TIME_FORMATS, OwlNativeDateTimeModule } from '@danielmoncada/angular-datetime-picker';
import { OwlMomentDateTimeModule } from '@danielmoncada/angular-datetime-picker-moment-adapter';

import { MAT_DATE_LOCALE, MAT_DATE_FORMATS, DateAdapter } from '@angular/material/core';
import { MomentDateAdapter, MAT_MOMENT_DATE_ADAPTER_OPTIONS, provideMomentDateAdapter } from '@angular/material-moment-adapter';
import { NumberFomatPipe } from './pipes/number-fomat.pipe';
import { FilterTablePipe } from './pipes/filter-table-pipe';

//import { TagContainer } from './components/tag-container/tag-container';

import { MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';

import { DragDropModule } from '@angular/cdk/drag-drop';
import { OverlayModule } from '@angular/cdk/overlay';
import { PortalModule } from '@angular/cdk/portal';
//import { TagDialog } from './components/tag-dialog/tag-dialog';

import { LastseenPipe } from './pipes/lastseen.pipe';
import { ShareModule } from './shared.module';
import { CommonModule } from '@angular/common';


@NgModule({
  declarations: [
    

  ],
  imports: [
    CommonModule,
    FormsModule,
    HighchartsChartDirective,
    ShareModule,
  ],
  exports: [

  ],
  providers: [
  ]
})
export class ChartsModule { }