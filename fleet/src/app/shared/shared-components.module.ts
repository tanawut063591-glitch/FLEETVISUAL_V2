import {
  NgModule,
  NO_ERRORS_SCHEMA,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { BillingStatusPipe } from './pipes/billing-status-pipe';
import { FilterTablePipe } from './pipes/filter-table-pipe';
import { FiltersitePipe } from './pipes/filtersite-pipe';
import { LastseenPipe } from './pipes/lastseen.pipe';
import { NumberFomatPipe } from './pipes/number-fomat.pipe';
import { ValueLengthPipe } from './pipes/value-length.pipe';
import { RealtimeColorDirective } from './directives/realtime-color.directive';
import { RealtimeValueDirective } from './directives/realtime-value.directive';

const SHARED_DECLARATIONS = [
  BillingStatusPipe,
  FilterTablePipe,
  FiltersitePipe,
  LastseenPipe,
  NumberFomatPipe,
  ValueLengthPipe,
  RealtimeColorDirective,
  RealtimeValueDirective,
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  declarations: [
    ...SHARED_DECLARATIONS,
  ],
  exports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    ...SHARED_DECLARATIONS,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
})
export class SharedComponentsModule {}
