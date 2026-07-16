import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { SharedComponentsModule } from '../../shared/shared-components.module';
import { SettingsComponent } from './settings.component';

@NgModule({
  declarations: [SettingsComponent],
  imports: [
    SharedComponentsModule,
    RouterModule.forChild([
      { path: '', component: SettingsComponent },
      { path: ':section', component: SettingsComponent },
    ]),
  ],
})
export class SettingsFeatureModule {}
