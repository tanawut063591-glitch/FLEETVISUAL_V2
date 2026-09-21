import { Component, Host } from '@angular/core';

import { SettingsComponent } from '../settings.component';
import { bindSettingsSectionViewModel } from '../settings-section-view-model.bridge';

@Component({
  selector: 'app-settings-vessels',
  standalone: false,
  templateUrl: './settings-vessels.component.html',
  styleUrls: ['../settings.shared.css', './settings-vessels.component.css'],
})
export class SettingsVesselsComponent {
  declare applyRealtimeMachinery: any;
  declare assignEngineProfile: any;
  declare assignedEngineCount: any;
  declare cancelRealtimeDetectionPreview: any;
  declare clearRealtimeEngineAssignments: any;
  declare closeDrawer: any;
  declare closeEngineLibrary: any;
  declare closeVesselGroupComposer: any;
  declare createAndSelectVesselGroup: any;
  declare deleteEngineProfile: any;
  declare deleteVessel: any;
  declare drawerOpen: any;
  declare duplicateEngineProfile: any;
  declare editEngineProfile: any;
  declare editingEngineProfileId: any;
  declare editingId: any;
  declare engineAssignmentCategory: any;
  declare engineAssignmentNumber: any;
  declare engineAssignmentStatusIcon: any;
  declare engineAssignmentStatusLabel: any;
  declare engineCategoryOptions: any;
  declare engineFuelOptions: any;
  declare engineLibraryOpen: any;
  declare engineProfileCategoryLabel: any;
  declare engineProfileTypeLabel: any;
  declare engineProfileDisplayName: any;
  declare engineProfileForAssignment: any;
  declare engineProfileForm: any;
  declare engineProfileOptionLabel: any;
  declare engineProfileSaveNotice: any;
  declare engineProfileSaving: any;
  declare engineProfileSearchTerm: any;
  declare engineProfileUsageCount: any;
  declare engineProfiles: any;
  declare engineProfilesError: any;
  declare engineProfilesForAssignment: any;
  declare engineProfilesLoading: any;
  declare engineTelemetryMappingOpen: any;
  declare errorMessage: any;
  declare filteredEngineProfiles: any;
  declare filteredVessels: any;
  declare form: any;
  declare goToPage: any;
  declare groupDefinitions: any;
  declare hasRealtimeEngineAssignments: any;
  declare idleCount: any;
  declare isEngineAssignmentExpanded: any;
  declare isRealtimeAssignment: any;
  declare isSavingVessel: any;
  declare loadEngineProfiles: any;
  declare loadVessels: any;
  declare loading: any;
  declare managedGroupCount: any;
  declare manualEngineName: any;
  declare nationalityOptions: any;
  declare offlineCount: any;
  declare onEngineAssignmentProfileChange: any;
  declare onEngineAssignmentPositionChange: any;
  declare onImageSelected: any;
  declare onVesselPrefixChanged: any;
  declare onlineCount: any;
  declare openAdd: any;
  declare openEdit: any;
  declare openEngineLibrary: any;
  declare openVesselGroupComposer: any;
  declare page: any;
  declare pageEnd: any;
  declare pageNumbers: any;
  declare pageSize: any;
  declare pageStart: any;
  declare pagedVessels: any;
  declare realtimeDetectionPending: any;
  declare realtimeDetectionSummary: any;
  declare realtimeMachineryNotice: any;
  declare refreshing: any;
  declare removeEngineAssignment: any;
  declare saveEngineProfile: any;
  declare saveNotice: any;
  declare saveVessel: any;
  declare searchTerm: any;
  declare selectedEngineProfileId: any;
  declare startNewEngineProfile: any;
  declare statusLabel: any;
  declare syncRealtimeMachinery: any;
  declare toggleEngineAssignmentEditor: any;
  declare toggleVesselGroup: any;
  declare totalPages: any;
  declare trackByEngineAssignment: any;
  declare trackByEngineProfile: any;
  declare trackByGroupDefinition: any;
  declare trackByVessel: any;
  declare vesselEngineCount: any;
  declare vesselEngineSummary: any;
  declare vesselGroupComposerOpen: any;
  declare vesselGroupCount: any;
  declare vesselGroupIds: any;
  declare vesselGroupInlineNotice: any;
  declare vesselGroupMemberCount: any;
  declare vesselGroupOptions: any;
  declare vesselGroupSaving: any;
  declare vesselGroupSearchTerm: any;
  declare vesselGroupSelected: any;
  declare vesselNewGroupDescription: any;
  declare vesselNewGroupName: any;
  declare vesselStatusFilter: any;
  declare vessels: any;

  constructor(@Host() host: SettingsComponent) {
    bindSettingsSectionViewModel(this, host);
  }
}
