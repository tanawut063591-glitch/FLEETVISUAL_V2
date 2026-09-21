import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HighchartsChartComponent } from 'highcharts-angular';
import { RouterModule, Routes } from '@angular/router';

import { SharedComponentsModule } from '../../shared/shared-components.module';
import { PremiumPieChartComponent } from './components/premium-pie-chart/premium-pie-chart.component';
import { ReportDatePickerComponent } from './components/report-date-picker/report-date-picker.component';
import { ReportMessageAlertComponent } from './components/report-message-alert/report-message-alert.component';
import { ReportModeDetailCardComponent } from './components/report-mode-detail-card/report-mode-detail-card.component';
import { ReportPdfViewerComponent } from './components/report-pdf-viewer/report-pdf-viewer.component';
import { ReportComponent } from './report.component';

const routes: Routes = [{ path: '', component: ReportComponent }];

@NgModule({
  declarations: [
    ReportComponent,
    PremiumPieChartComponent,
    ReportDatePickerComponent,
    ReportMessageAlertComponent,
    ReportModeDetailCardComponent,
    ReportPdfViewerComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    HighchartsChartComponent,
    SharedComponentsModule,
    RouterModule.forChild(routes),
  ],
})
export class ReportFeatureModule {}
