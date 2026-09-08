import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { SharedComponentsModule } from '../../shared/shared-components.module';
import { ActivityLogsComponent } from './activity-logs.component';

@NgModule({
  declarations: [ActivityLogsComponent],
  imports: [
    SharedComponentsModule,
    RouterModule.forChild([{ path: '', component: ActivityLogsComponent }]),
  ],
})
export class ActivityLogsFeatureModule {}
