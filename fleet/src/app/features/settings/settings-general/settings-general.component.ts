import { Component, Host } from '@angular/core';

import { SettingsComponent } from '../settings.component';
import { bindSettingsSectionViewModel } from '../settings-section-view-model.bridge';

@Component({
  selector: 'app-settings-general',
  standalone: false,
  templateUrl: './settings-general.component.html',
  styleUrls: ['../settings.shared.css', './settings-general.component.css'],
})
export class SettingsGeneralComponent {
  declare alarmAutoRefresh: any;
  declare alertRefreshSeconds: any;
  declare defaultLandingPage: any;
  declare landingPageOptions: any;
  declare saveGeneral: any;
  declare saveNotice: any;
  declare theme: any;

  constructor(@Host() host: SettingsComponent) {
    bindSettingsSectionViewModel(this, host);
  }
}
