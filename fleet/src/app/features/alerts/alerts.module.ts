import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { SharedComponentsModule } from '../../shared/shared-components.module';
import { AlertsComponent } from './alerts.component';

@NgModule({
  declarations: [AlertsComponent],
  imports: [
    SharedComponentsModule,
    RouterModule.forChild([{ path: '', component: AlertsComponent }]),
  ],
})
export class AlertsFeatureModule {}
