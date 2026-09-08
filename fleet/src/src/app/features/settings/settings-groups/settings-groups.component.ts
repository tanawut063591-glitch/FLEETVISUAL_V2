import { Component, Host } from '@angular/core';

import { SettingsComponent } from '../settings.component';
import { bindSettingsSectionViewModel } from '../settings-section-view-model.bridge';

@Component({
  selector: 'app-settings-groups',
  standalone: false,
  templateUrl: './settings-groups.component.html',
  styleUrls: ['../settings.shared.css', './settings-groups.component.css'],
})
export class SettingsGroupsComponent {
  declare closeGroupDrawer: any;
  declare deleteGroup: any;
  declare editingGroupId: any;
  declare groupAddedVesselCount: any;
  declare groupAssignedUserCount: any;
  declare groupDrawerOpen: any;
  declare groupForm: any;
  declare groupRemovedVesselCount: any;
  declare groupSaveNotice: any;
  declare groupSummary: any;
  declare groupVesselNames: any;
  declare groupVesselOptions: any;
  declare groupVesselSearchTerm: any;
  declare groupVesselSelected: any;
  declare loadVessels: any;
  declare loading: any;
  declare openAddGroup: any;
  declare openEditGroup: any;
  declare refreshing: any;
  declare saveGroup: any;
  declare statusLabel: any;
  declare toggleGroupVessel: any;
  declare trackByGroup: any;
  declare trackByVessel: any;

  constructor(@Host() host: SettingsComponent) {
    bindSettingsSectionViewModel(this, host);
  }
}
