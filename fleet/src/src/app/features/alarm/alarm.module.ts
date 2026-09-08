import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { SharedComponentsModule } from '../../shared/shared-components.module';
import { AlarmComponent } from './alarm.component';

@NgModule({
  declarations: [AlarmComponent],
  imports: [
    SharedComponentsModule,
    RouterModule.forChild([{ path: '', component: AlarmComponent }]),
  ],
})
export class AlarmFeatureModule {}
