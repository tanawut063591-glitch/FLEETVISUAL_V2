import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { SharedComponentsModule } from '../../shared/shared-components.module';
import { SettingsComponent } from './settings.component';
import { SettingsGeneralComponent } from './settings-general/settings-general.component';
import { SettingsUsersComponent } from './settings-users/settings-users.component';
import { SettingsVesselsComponent } from './settings-vessels/settings-vessels.component';
import { SettingsGroupsComponent } from './settings-groups/settings-groups.component';
import { SettingsUnsavedGuard } from './settings-unsaved.guard';

@NgModule({
  declarations: [
    SettingsComponent,
    SettingsGeneralComponent,
    SettingsUsersComponent,
    SettingsVesselsComponent,
    SettingsGroupsComponent,
  ],
  imports: [
    SharedComponentsModule,
    RouterModule.forChild([
      { path: '', component: SettingsComponent, canDeactivate: [SettingsUnsavedGuard] },
      { path: ':section', component: SettingsComponent, canDeactivate: [SettingsUnsavedGuard] },
    ]),
  ],
})
export class SettingsFeatureModule {}
