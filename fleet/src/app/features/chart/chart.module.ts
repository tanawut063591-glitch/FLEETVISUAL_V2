import { CommonModule, DatePipe } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { HighchartsChartComponent } from 'highcharts-angular';

import { ChartComponent } from './chart.component';
import { DatetimeControlModule } from '../datetime-control/datetime-control.module';

const routes: Routes = [
  {
    path: '',
    component: ChartComponent,
  },
];

@NgModule({
  declarations: [ChartComponent],
  imports: [
    CommonModule,
    FormsModule,
    HighchartsChartComponent,
    DatetimeControlModule,
    RouterModule.forChild(routes),
  ],
  providers: [DatePipe],
})
export class ChartFeatureModule {}
