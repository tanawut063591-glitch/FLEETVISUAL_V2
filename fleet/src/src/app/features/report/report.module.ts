import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HighchartsChartComponent } from 'highcharts-angular';
import { RouterModule, Routes } from '@angular/router';

import { SharedComponentsModule } from '../../shared/shared-components.module';
import { PremiumPieChartComponent } from './components/premium-pie-chart/premium-pie-chart.component';
import { ReportDatePickerComponent } from './components/report-date-picker/report-date-picker.component';
import { ReportInfoBarComponent } from './components/report-info-bar/report-info-bar.component';
import { ReportMessageAlertComponent } from './components/report-message-alert/report-message-alert.component';
import { ReportPdfViewerComponent } from './components/report-pdf-viewer/report-pdf-viewer.component';
import { ReportComponent } from './report.component';

const routes: Routes = [{ path: '', component: ReportComponent }];

@NgModule({
  declarations: [
    ReportComponent,
    PremiumPieChartComponent,
    ReportDatePickerComponent,
    ReportInfoBarComponent,
    ReportMessageAlertComponent,
    ReportPdfViewerComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    HighchartsChartComponent,
    SharedComponentsModule,
    RouterModule.forChild(routes),
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
})
export class ReportFeatureModule {}
