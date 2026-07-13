import {
  NgModule,
  NO_ERRORS_SCHEMA,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PdfViewerModule } from 'ng2-pdf-viewer';

import { BillingStatusPipe } from './pipes/billing-status-pipe';
import { FilterTablePipe } from './pipes/filter-table-pipe';
import { FiltersitePipe } from './pipes/filtersite-pipe';
import { LastseenPipe } from './pipes/lastseen.pipe';
import { NumberFomatPipe } from './pipes/number-fomat.pipe';
import { ValueLengthPipe } from './pipes/value-length.pipe';
import { RealtimeColorDirective } from './directives/realtime-color.directive';
import { RealtimeValueDirective } from './directives/realtime-value.directive';

import { ReportDatePickerComponent } from './components/report-date-picker/report-date-picker.component';
import { ReportMessageAlertComponent } from './components/report-message-alert/report-message-alert.component';
import { SelectedVesselCardComponent } from './components/selected-vessel-card/selected-vessel-card.component';
import { ReportPdfViewerComponent } from './components/report-pdf-viewer/report-pdf-viewer.component';
import { ReportInfoBarComponent } from './components/report-info-bar/report-info-bar.component';

const SHARED_DECLARATIONS = [
  BillingStatusPipe,
  FilterTablePipe,
  FiltersitePipe,
  LastseenPipe,
  NumberFomatPipe,
  ValueLengthPipe,
  RealtimeColorDirective,
  RealtimeValueDirective,
  ReportDatePickerComponent,
  ReportMessageAlertComponent,
  SelectedVesselCardComponent,
  ReportPdfViewerComponent,
  ReportInfoBarComponent,
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    PdfViewerModule,
  ],
  declarations: [
    ...SHARED_DECLARATIONS,
  ],
  exports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    PdfViewerModule,
    ...SHARED_DECLARATIONS,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
})
export class SharedComponentsModule {}
