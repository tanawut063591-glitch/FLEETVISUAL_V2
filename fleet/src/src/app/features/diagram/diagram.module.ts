import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { SharedComponentsModule } from '../../shared/shared-components.module';
import { DiagramComponent } from './diagram.component';

const routes: Routes = [{ path: '', component: DiagramComponent }];

@NgModule({
  declarations: [DiagramComponent],
  imports: [CommonModule, SharedComponentsModule, RouterModule.forChild(routes)],
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
})
export class DiagramFeatureModule {}
