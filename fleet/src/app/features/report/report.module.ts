import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

import { SharedComponentsModule } from '../../shared/shared-components.module';
import { ReportComponent } from './report.component';

const routes: Routes = [{ path: '', component: ReportComponent }];

@NgModule({
  declarations: [ReportComponent],
  imports: [CommonModule, FormsModule, SharedComponentsModule, RouterModule.forChild(routes)],
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
})
export class ReportFeatureModule {}
