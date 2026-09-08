import { Component, Host } from '@angular/core';

import { SettingsComponent } from '../settings.component';
import { bindSettingsSectionViewModel } from '../settings-section-view-model.bridge';

@Component({
  selector: 'app-settings-users',
  standalone: false,
  templateUrl: './settings-users.component.html',
  styleUrls: ['../settings.shared.css', './settings-users.component.css'],
})
export class SettingsUsersComponent {
  declare accountProvisioningLabel: any;
  declare assignedGroupNames: any;
  declare closeUserAccessDrawer: any;
  declare deleteUserAccess: any;
  declare editingUserAccessId: any;
  declare effectiveVesselPreview: any;
  declare filteredUserAccessGroups: any;
  declare filteredUserAccessRecords: any;
  declare filteredUserAccessVessels: any;
  declare formatDateTime: any;
  declare isCurrentUser: any;
  declare loadUserAccessRecords: any;
  declare moduleAccessCount: any;
  declare onModulePermissionChange: any;
  declare onModuleViewChange: any;
  declare onUserRoleChange: any;
  declare openAddUserAccess: any;
  declare openEditUserAccess: any;
  declare passwordHasLower: any;
  declare passwordHasNumber: any;
  declare passwordHasSpecial: any;
  declare passwordHasUpper: any;
  declare passwordStrengthClass: any;
  declare passwordStrengthLabel: any;
  declare resetPassword: any;
  declare resetPasswordConfirm: any;
  declare resetPasswordNotice: any;
  declare resetPasswordPanelOpen: any;
  declare resetPasswordSaving: any;
  declare resetPasswordStrengthScore: any;
  declare resetUserPassword: any;
  declare saveUserAccess: any;
  declare setUserAccessScope: any;
  declare setUserAccountSetupMode: any;
  declare showResetPassword: any;
  declare showUserPassword: any;
  declare statusLabel: any;
  declare toggleAdditionalVessel: any;
  declare toggleExcludedVessel: any;
  declare toggleResetPasswordPanel: any;
  declare toggleUserGroup: any;
  declare toggleUserVessel: any;
  declare trackByGroupDefinition: any;
  declare trackByUserAccess: any;
  declare trackByUserModule: any;
  declare trackByVessel: any;
  declare userAccessAdministratorCount: any;
  declare userAccessDatabaseEnabled: any;
  declare userAccessDrawerOpen: any;
  declare userAccessEffectiveVesselIds: any;
  declare userAccessError: any;
  declare userAccessForm: any;
  declare userAccessGroupSearchTerm: any;
  declare userAccessIsBackend: any;
  declare userAccessLoading: any;
  declare userAccessRecords: any;
  declare userAccessRefreshing: any;
  declare userAccessRestrictedCount: any;
  declare userAccessSaveNotice: any;
  declare userAccessSaving: any;
  declare userAccessSearchTerm: any;
  declare userAccessSummary: any;
  declare userAccessSuspendedCount: any;
  declare userAccessVesselSearchTerm: any;
  declare userAccountApiEnabled: any;
  declare userAccountApiNotice: any;
  declare userAccountApiSecure: any;
  declare userAccountSetupMode: any;
  declare userAccountStatusFilter: any;
  declare userAdditionalVesselSelected: any;
  declare userExcludedVesselSelected: any;
  declare userGroupSelected: any;
  declare userModuleDefinitions: any;
  declare userPassword: any;
  declare userPasswordConfirm: any;
  declare userPasswordStrengthScore: any;
  declare userRoleFilter: any;
  declare userRoleLabel: any;
  declare userRoleOptions: any;
  declare userVesselSelected: any;
  declare vessels: any;

  constructor(@Host() host: SettingsComponent) {
    bindSettingsSectionViewModel(this, host);
  }
}
