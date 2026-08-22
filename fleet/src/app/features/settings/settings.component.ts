import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Observable,
  Subject,
  distinctUntilChanged,
  finalize,
  forkJoin,
  map,
  of,
  switchMap,
  takeUntil,
  timer,
} from 'rxjs';

import {
  EngineProfileCategory,
  EngineProfileRecord,
  FleetModuleKey,
  UserAccessRecord,
  UserAccessRole,
  UserAccessScope,
  UserAccountProvisioning,
  UserAccountStatus,
  UserModulePermissionMap,
  VesselGroupRecord,
  VesselEngineAssignment,
  VesselSettingsRecord,
  VesselSettingsStatus,
} from '../../shared/models/settings.model';
import {
  ENGINE_FORMULA_PRESETS,
  getEngineFormulaPreset,
} from '../../shared/config/engine-formula-presets';
import { SettingsDataService } from '../../shared/services/settings-data.service';
import { EngineProfileService } from '../../shared/services/engine-profile.service';
import {
  RealtimeMachineryPosition,
  RealtimeMachineryService,
} from '../../shared/services/realtime-machinery.service';
import { UserAccessControlService } from '../../shared/services/user-access-control.service';
import { UserAccountService } from '../../shared/services/user-account.service';
import { ThemeMode, ThemeModeService } from '../../shared/services/theme-mode.service';

interface SettingsTab {
  id: 'general' | 'users' | 'vessels' | 'groups';
  label: string;
  icon: string;
}

type LandingPage = 'overview' | 'realtime' | 'data-logger' | 'chart' | 'diagram' | 'alerts';
type ClockFormat = '24h' | '12h';

type VesselGroupDefinition = VesselGroupRecord;

interface VesselGroupSummary {
  id: string;
  name: string;
  description: string;
  count: number;
  vesselIds: string[];
  editable: boolean;
}

interface UserModuleDefinition {
  key: FleetModuleKey;
  label: string;
  description: string;
  icon: string;
  supportsExport: boolean;
  supportsManage: boolean;
}

type UserAccountSetupMode = 'create' | 'link';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css'],
  standalone: false,
})
export class SettingsComponent implements OnInit, OnDestroy {
  readonly tabs: SettingsTab[] = [
    { id: 'general', label: 'General', icon: 'fa fa-sun-o' },
    { id: 'users', label: 'Users', icon: 'fa fa-users' },
    { id: 'vessels', label: 'Vessels', icon: 'fa fa-ship' },
    { id: 'groups', label: 'Groups', icon: 'fa fa-object-group' },
  ];
  readonly nationalityOptions = [
    'Thailand',
    'Singapore',
    'Indonesia',
    'Malaysia',
    'Vietnam',
    'Other',
  ];
  readonly engineFormulaPresets = ENGINE_FORMULA_PRESETS;
  readonly engineCategoryOptions: Array<{ value: EngineProfileCategory; label: string }> = [
    { value: 'main', label: 'Main / Propulsion Engine' },
    { value: 'auxiliary', label: 'Auxiliary Engine' },
    { value: 'generator', label: 'Generator Engine' },
    { value: 'other', label: 'Other / Custom' },
  ];
  readonly engineFuelOptions = [
    'Marine Diesel Oil',
    'Marine Gas Oil',
    'Heavy Fuel Oil',
    'LNG',
    'Methanol',
    'Hybrid / Electric',
    'Other',
  ];
  readonly landingPageOptions: Array<{ value: LandingPage; label: string }> = [
    { value: 'overview', label: 'Overview' },
    { value: 'realtime', label: 'Realtime' },
    { value: 'data-logger', label: 'Data Logger' },
    { value: 'chart', label: 'Chart' },
    { value: 'diagram', label: 'Diagram' },
    { value: 'alerts', label: 'Alarm Center' },
  ];
  readonly userRoleOptions: Array<{ value: UserAccessRole; label: string; description: string }> = [
    {
      value: 'administrator',
      label: 'Administrator',
      description: 'Full fleet and system administration.',
    },
    {
      value: 'operator',
      label: 'Operator',
      description: 'Operate assigned fleets and acknowledge alarms.',
    },
    { value: 'viewer', label: 'Viewer', description: 'View and export assigned fleet data only.' },
    {
      value: 'custom',
      label: 'Custom',
      description: 'Configure every module permission manually.',
    },
  ];
  readonly userModuleDefinitions: UserModuleDefinition[] = [
    {
      key: 'overview',
      label: 'Overview',
      description: 'Fleet map and summary cards',
      icon: 'fa fa-map',
      supportsExport: false,
      supportsManage: false,
    },
    {
      key: 'realtime',
      label: 'Realtime',
      description: 'Live vessel telemetry',
      icon: 'fa fa-tachometer',
      supportsExport: true,
      supportsManage: false,
    },
    {
      key: 'data-logger',
      label: 'Data Logger',
      description: 'Historian data and tag tables',
      icon: 'fa fa-database',
      supportsExport: true,
      supportsManage: false,
    },
    {
      key: 'chart',
      label: 'Chart',
      description: 'Trend charts and analysis',
      icon: 'fa fa-area-chart',
      supportsExport: true,
      supportsManage: false,
    },
    {
      key: 'diagram',
      label: 'Diagram',
      description: 'Vessel process diagram',
      icon: 'fa fa-sitemap',
      supportsExport: true,
      supportsManage: false,
    },
    {
      key: 'report',
      label: 'Report',
      description: 'Daily reports and PDF export',
      icon: 'fa fa-file-text-o',
      supportsExport: true,
      supportsManage: false,
    },
    {
      key: 'alarm',
      label: 'Alarm',
      description: 'Alarm feed and acknowledgement',
      icon: 'fa fa-bell-o',
      supportsExport: true,
      supportsManage: true,
    },
    {
      key: 'log',
      label: 'Log',
      description: 'Operational and audit history',
      icon: 'fa fa-history',
      supportsExport: true,
      supportsManage: false,
    },
    {
      key: 'settings',
      label: 'Settings',
      description: 'Users, vessels and groups',
      icon: 'fa fa-cog',
      supportsExport: false,
      supportsManage: true,
    },
  ];

  activeTab: SettingsTab['id'] = 'vessels';

  vessels: VesselSettingsRecord[] = [];
  loading = false;
  refreshing = false;
  errorMessage = '';
  searchTerm = '';
  vesselStatusFilter: 'all' | VesselSettingsStatus = 'all';
  page = 1;
  pageSize = 10;

  userAccessRecords: UserAccessRecord[] = [];
  userAccessLoading = false;
  userAccessRefreshing = false;
  userAccessError = '';
  userAccessSearchTerm = '';
  userRoleFilter: 'all' | UserAccessRole = 'all';
  userAccountStatusFilter: 'all' | UserAccountStatus = 'all';
  userAccessDrawerOpen = false;
  editingUserAccessId = '';
  userAccessForm = this.emptyUserAccessForm();
  userAccessSaveNotice = '';
  userAccessVesselSearchTerm = '';
  userAccessGroupSearchTerm = '';
  userAccountSetupMode: UserAccountSetupMode = 'link';
  userAccountApiEnabled = false;
  userAccountApiSecure = true;
  userAccountApiNotice = 'Checking User Account API...';
  userAccessSaving = false;
  userPassword = '';
  userPasswordConfirm = '';
  showUserPassword = false;
  resetPasswordPanelOpen = false;
  resetPassword = '';
  resetPasswordConfirm = '';
  showResetPassword = false;
  resetPasswordSaving = false;
  resetPasswordNotice = '';

  groupDefinitions: VesselGroupDefinition[] = [];
  groupDrawerOpen = false;
  editingGroupId = '';
  groupForm: { name: string; description: string; vesselIds: string[] } = {
    name: '',
    description: '',
    vesselIds: [],
  };
  groupVesselSearchTerm = '';
  groupSaveNotice = '';

  drawerOpen = false;
  editingId = '';
  form = this.emptyForm();
  saveNotice = '';

  engineProfiles: EngineProfileRecord[] = [];
  engineProfilesLoading = false;
  engineProfilesError = '';
  selectedEngineProfileId = '';
  manualEngineComposerOpen = false;
  manualEngineName = '';
  expandedEngineAssignmentId = '';
  engineLibraryOpen = false;
  editingEngineProfileId = '';
  engineProfileSearchTerm = '';
  engineProfileForm = this.emptyEngineProfileForm();
  engineProfileSaveNotice = '';
  engineTelemetryMappingOpen = false;
  realtimeMachinery: RealtimeMachineryPosition[] = [];
  realtimeMachineryNotice = '';
  isSavingVessel = false;
  private readonly pendingEngineProfiles = new Map<string, EngineProfileRecord>();

  theme: ThemeMode = 'light';
  defaultLandingPage: LandingPage = 'overview';
  alertRefreshSeconds = 20;
  alarmAutoRefresh = true;
  timeFormat: ClockFormat = '24h';
  username = 'Admin';

  private readonly destroy$ = new Subject<void>();
  private filteredCacheSource?: VesselSettingsRecord[];
  private filteredCacheKey = '';
  private filteredCache: VesselSettingsRecord[] = [];
  private derivedCacheSource?: VesselSettingsRecord[];
  private derivedGroupDefinitionsSource?: VesselGroupDefinition[];
  private onlineCountCache = 0;
  private idleCountCache = 0;
  private offlineCountCache = 0;
  private groupSummaryCache: VesselGroupSummary[] = [];
  private initialVesselLoadGuard: ReturnType<typeof setTimeout> | null = null;

  // Server-protection guards: do not allow duplicate in-flight reads.
  private vesselsRequestInFlight = false;
  private groupsRequestInFlight = false;
  private userAccessRequestInFlight = false;

  // Derived UI caches: keep expensive filtering/counting out of Angular change-detection loops.
  private filteredUserAccessCacheSource?: UserAccessRecord[];
  private filteredUserAccessCacheKey = '';
  private filteredUserAccessCache: UserAccessRecord[] = [];

  // O(1) lookup indexes for large fleets / groups.
  private vesselIndexSource?: VesselSettingsRecord[];
  private groupIndexSource?: VesselGroupDefinition[];
  private vesselById = new Map<string, VesselSettingsRecord>();
  private groupById = new Map<string, VesselGroupDefinition>();

  private dateTimeFormatterMode: ClockFormat | null = null;
  private dateTimeFormatter: Intl.DateTimeFormat | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private settingsData: SettingsDataService,
    private engineProfileService: EngineProfileService,
    private realtimeMachineryService: RealtimeMachineryService,
    private userAccessControl: UserAccessControlService,
    private userAccountService: UserAccountService,
    private themeMode: ThemeModeService,
  ) {}

  ngOnInit(): void {
    this.username =
      localStorage.getItem('username') || sessionStorage.getItem('username') || 'Admin';
    this.userAccountService.config$.pipe(takeUntil(this.destroy$)).subscribe((config) => {
      this.userAccountApiEnabled = config.enabled;
      this.userAccountApiSecure = config.secureTransport || !config.requireHttps;
      this.userAccountApiNotice = config.enabled
        ? this.userAccountApiSecure
          ? 'Login accounts are managed by the configured backend.'
          : 'User Account API is blocked because one or more endpoints are not HTTPS.'
        : 'Login Account API is disabled. Access profiles can still be linked to existing usernames.';
    });
    this.groupDefinitions = [];
    this.theme = this.themeMode.getMode();
    this.defaultLandingPage = this.readLandingPage(
      localStorage.getItem('fleet-default-landing-page'),
    );
    this.alertRefreshSeconds = Math.max(
      60,
      Number(localStorage.getItem('fleet-alert-refresh-seconds')) || 60,
    );
    this.alarmAutoRefresh = localStorage.getItem('fleet-alert-auto-refresh') !== 'false';
    this.timeFormat = localStorage.getItem('fleet-time-format') === '12h' ? '12h' : '24h';

    this.route.paramMap
      .pipe(
        map((params) => params.get('section')),
        distinctUntilChanged(),
        takeUntil(this.destroy$),
      )
      .subscribe((section) => {
        this.activeTab = this.isTab(section) ? section : 'general';

        if (this.activeTab === 'vessels' || this.activeTab === 'groups') {
          this.loadGroups();
          this.loadVessels();
          this.loadEngineProfiles();
        }
        if (this.activeTab === 'users') {
          this.loadGroups();
          this.loadVessels();
          this.loadUserAccessRecords();
        }
      });
  }

  ngOnDestroy(): void {
    this.clearInitialVesselLoadGuard();
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.userAccessDrawerOpen) {
      this.closeUserAccessDrawer();
      return;
    }
    if (this.groupDrawerOpen) {
      this.closeGroupDrawer();
      return;
    }
    if (this.engineLibraryOpen) {
      this.closeEngineLibrary();
      return;
    }
    if (this.drawerOpen) {
      this.closeDrawer();
    }
  }

  get filteredVessels(): VesselSettingsRecord[] {
    const search = this.searchTerm.trim().toLowerCase();
    const key = `${search}|${this.vesselStatusFilter}`;
    if (this.filteredCacheSource === this.vessels && this.filteredCacheKey === key) {
      return this.filteredCache;
    }

    this.filteredCache = this.vessels.filter((row) => {
      if (this.vesselStatusFilter !== 'all' && row.status !== this.vesselStatusFilter) return false;
      if (!search) return true;
      return [
        row.id,
        row.name,
        row.prefix,
        row.status,
        row.nationality,
        row.customer,
        row.owner,
        row.agency,
        this.getVesselGroups(row).join(' '),
      ]
        .join(' ')
        .toLowerCase()
        .includes(search);
    });
    this.filteredCacheSource = this.vessels;
    this.filteredCacheKey = key;
    return this.filteredCache;
  }

  get filteredUserAccessRecords(): UserAccessRecord[] {
    const search = this.userAccessSearchTerm.trim().toLowerCase();
    const key = `${search}|${this.userRoleFilter}|${this.userAccountStatusFilter}`;
    if (
      this.filteredUserAccessCacheSource === this.userAccessRecords &&
      this.filteredUserAccessCacheKey === key
    ) {
      return this.filteredUserAccessCache;
    }

    this.filteredUserAccessCache = this.userAccessRecords.filter((user) => {
      if (this.userRoleFilter !== 'all' && user.role !== this.userRoleFilter) return false;
      if (this.userAccountStatusFilter !== 'all' && user.status !== this.userAccountStatusFilter)
        return false;
      if (!search) return true;
      return [
        user.username,
        user.displayName,
        user.email,
        user.role,
        user.status,
        this.userAccessSummary(user),
        this.assignedGroupNames(user).join(' '),
      ]
        .join(' ')
        .toLowerCase()
        .includes(search);
    });
    this.filteredUserAccessCacheSource = this.userAccessRecords;
    this.filteredUserAccessCacheKey = key;
    return this.filteredUserAccessCache;
  }

  get userAccessAdministratorCount(): number {
    return this.userAccessRecords.filter((user) => user.role === 'administrator').length;
  }

  get userAccessRestrictedCount(): number {
    return this.userAccessRecords.filter((user) => user.accessScope !== 'all').length;
  }

  get userAccessSuspendedCount(): number {
    return this.userAccessRecords.filter((user) => user.status === 'suspended').length;
  }

  get userAccessIsBackend(): boolean {
    return this.userAccessRecords.some((user) => user.source === 'backend');
  }

  get filteredUserAccessGroups(): VesselGroupDefinition[] {
    const search = this.userAccessGroupSearchTerm.trim().toLowerCase();
    if (!search) return this.groupDefinitions;
    return this.groupDefinitions.filter((group) =>
      [group.name, group.description].join(' ').toLowerCase().includes(search),
    );
  }

  get filteredUserAccessVessels(): VesselSettingsRecord[] {
    const search = this.userAccessVesselSearchTerm.trim().toLowerCase();
    if (!search) return this.vessels;
    return this.vessels.filter((vessel) =>
      [vessel.id, vessel.name, vessel.prefix, vessel.status]
        .join(' ')
        .toLowerCase()
        .includes(search),
    );
  }

  get userAccessEffectiveVesselIds(): string[] {
    return this.effectiveVesselIds(this.userAccessForm);
  }

  get pagedVessels(): VesselSettingsRecord[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredVessels.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredVessels.length / this.pageSize));
  }

  get pageStart(): number {
    return this.filteredVessels.length ? (this.page - 1) * this.pageSize + 1 : 0;
  }

  get pageEnd(): number {
    return Math.min(this.page * this.pageSize, this.filteredVessels.length);
  }

  get pageNumbers(): number[] {
    return Array.from({ length: Math.min(5, this.totalPages) }, (_, index) => index + 1);
  }

  get onlineCount(): number {
    this.ensureVesselDerivatives();
    return this.onlineCountCache;
  }

  get idleCount(): number {
    this.ensureVesselDerivatives();
    return this.idleCountCache;
  }

  get offlineCount(): number {
    this.ensureVesselDerivatives();
    return this.offlineCountCache;
  }

  get groupSummary(): VesselGroupSummary[] {
    this.ensureVesselDerivatives();
    return this.groupSummaryCache;
  }

  get managedGroupCount(): number {
    return this.groupSummary.filter((group) => group.id !== 'ungrouped').length;
  }

  get groupVesselOptions(): VesselSettingsRecord[] {
    const search = this.groupVesselSearchTerm.trim().toLowerCase();
    if (!search) return this.vessels;
    return this.vessels.filter((vessel) =>
      [vessel.name, vessel.prefix, vessel.status].join(' ').toLowerCase().includes(search),
    );
  }

  selectTab(tab: SettingsTab['id']): void {
    this.activeTab = tab;
    this.router.navigate(tab === 'general' ? ['/main/settings'] : ['/main/settings', tab]);
  }

  loadVessels(force = false): void {
    if (this.vesselsRequestInFlight) return;
    if (this.vessels.length > 0 && !force) return;

    this.vesselsRequestInFlight = true;
    const firstLoad = this.vessels.length === 0;
    this.loading = firstLoad;
    this.refreshing = !firstLoad;
    this.errorMessage = '';

    this.clearInitialVesselLoadGuard();
    if (firstLoad) {
      this.initialVesselLoadGuard = setTimeout(() => {
        this.initialVesselLoadGuard = null;
        if (this.loading) {
          this.loading = false;
          this.refreshing = true;
        }
      }, 1200);
    }

    this.settingsData
      .getVessels(force)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.vesselsRequestInFlight = false;
        }),
      )
      .subscribe({
        next: (rows) => {
          this.clearInitialVesselLoadGuard();

          this.vessels = rows.map((vessel) => this.realtimeMachineryService.hydrateVessel(vessel));
          this.invalidateVesselCaches();
          this.loading = false;
          this.refreshing = false;
          this.page = Math.min(this.page, this.totalPages);
        },
        error: (error) => {
          this.clearInitialVesselLoadGuard();
          this.loading = false;
          this.refreshing = false;
          this.errorMessage = error?.message || 'Unable to load vessel settings.';
        },
      });
  }

  loadGroups(force = false): void {
    if (this.groupsRequestInFlight) return;
    if (this.groupDefinitions.length > 0 && !force) return;
    this.groupsRequestInFlight = true;

    this.settingsData
      .getVesselGroups(force)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.groupsRequestInFlight = false;
        }),
      )
      .subscribe({
        next: (groups) => {
          this.groupDefinitions = groups;
          this.invalidateGroupCaches();
        },
        error: (error) => {
          console.warn('[SettingsComponent] load vessel groups error:', error);
        },
      });
  }

  loadUserAccessRecords(force = false): void {
    if (this.userAccessRequestInFlight) return;
    if (this.userAccessRecords.length > 0 && !force) return;
    this.userAccessRequestInFlight = true;
    const firstLoad = this.userAccessRecords.length === 0;
    this.userAccessLoading = firstLoad;
    this.userAccessRefreshing = !firstLoad;
    this.userAccessError = '';
    this.settingsData
      .getUserAccessRecords(force)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.userAccessRequestInFlight = false;
        }),
      )
      .subscribe({
        next: (rows) => {
          this.userAccessRecords = rows;
          this.invalidateUserAccessCaches();
          this.userAccessLoading = false;
          this.userAccessRefreshing = false;
          this.userAccessControl.notifyRecordsChanged();
        },
        error: (error) => {
          this.userAccessLoading = false;
          this.userAccessRefreshing = false;
          this.userAccessError = error?.message || 'Unable to load user access records.';
        },
      });
  }

  openAddUserAccess(): void {
    this.editingUserAccessId = '';
    this.userAccessForm = this.emptyUserAccessForm();
    this.userAccountSetupMode =
      this.userAccountApiEnabled && this.userAccountApiSecure ? 'create' : 'link';
    this.resetUserCredentialState();
    this.userAccessSaveNotice = '';
    this.userAccessVesselSearchTerm = '';
    this.userAccessGroupSearchTerm = '';
    this.userAccessDrawerOpen = true;
  }

  openEditUserAccess(user: UserAccessRecord): void {
    this.editingUserAccessId = user.id;
    this.userAccessForm = {
      ...user,
      groupIds: [...user.groupIds],
      vesselIds: [...user.vesselIds],
      additionalVesselIds: [...user.additionalVesselIds],
      excludedVesselIds: [...user.excludedVesselIds],
      modulePermissions: this.clonePermissions(user.modulePermissions),
    };
    this.userAccountSetupMode = 'link';
    this.resetUserCredentialState();
    this.userAccessSaveNotice = '';
    this.userAccessVesselSearchTerm = '';
    this.userAccessGroupSearchTerm = '';
    this.userAccessDrawerOpen = true;
  }

  closeUserAccessDrawer(): void {
    if (this.userAccessSaving || this.resetPasswordSaving) return;
    this.userAccessDrawerOpen = false;
    this.resetUserCredentialState();
  }

  setUserAccountSetupMode(mode: UserAccountSetupMode): void {
    if (mode === 'create' && (!this.userAccountApiEnabled || !this.userAccountApiSecure)) {
      this.userAccessSaveNotice = this.userAccountApiEnabled
        ? 'Account creation is blocked until every User Account API endpoint uses HTTPS.'
        : 'Enable the User Account API before creating a login account.';
      return;
    }
    this.userAccountSetupMode = mode;
    this.userAccessSaveNotice = '';
    if (mode === 'link') {
      this.userPassword = '';
      this.userPasswordConfirm = '';
      this.showUserPassword = false;
    }
  }

  onUserRoleChange(role: UserAccessRole): void {
    this.userAccessForm.role = role;
    if (role === 'custom') return;
    this.userAccessForm.modulePermissions = this.createRolePermissions(role);
    if (role === 'administrator') {
      this.userAccessForm.accessScope = 'all';
      this.userAccessForm.status = 'active';
    } else if (this.userAccessForm.accessScope === 'all') {
      this.userAccessForm.accessScope = 'groups';
    }
  }

  setUserAccessScope(scope: UserAccessScope): void {
    this.userAccessForm.accessScope = scope;
  }

  toggleUserGroup(groupId: string, checked: boolean): void {
    this.userAccessForm.groupIds = this.toggleStringValue(
      this.userAccessForm.groupIds,
      groupId,
      checked,
    );
  }

  toggleUserVessel(vesselId: string, checked: boolean): void {
    this.userAccessForm.vesselIds = this.toggleStringValue(
      this.userAccessForm.vesselIds,
      vesselId,
      checked,
    );
  }

  toggleAdditionalVessel(vesselId: string, checked: boolean): void {
    this.userAccessForm.additionalVesselIds = this.toggleStringValue(
      this.userAccessForm.additionalVesselIds,
      vesselId,
      checked,
    );
    if (checked) {
      this.userAccessForm.excludedVesselIds = this.userAccessForm.excludedVesselIds.filter(
        (id) => id !== vesselId,
      );
    }
  }

  toggleExcludedVessel(vesselId: string, checked: boolean): void {
    this.userAccessForm.excludedVesselIds = this.toggleStringValue(
      this.userAccessForm.excludedVesselIds,
      vesselId,
      checked,
    );
    if (checked) {
      this.userAccessForm.additionalVesselIds = this.userAccessForm.additionalVesselIds.filter(
        (id) => id !== vesselId,
      );
    }
  }

  userGroupSelected(groupId: string): boolean {
    return this.userAccessForm.groupIds.includes(groupId);
  }

  userVesselSelected(vesselId: string): boolean {
    return this.userAccessForm.vesselIds.includes(vesselId);
  }

  userAdditionalVesselSelected(vesselId: string): boolean {
    return this.userAccessForm.additionalVesselIds.includes(vesselId);
  }

  userExcludedVesselSelected(vesselId: string): boolean {
    return this.userAccessForm.excludedVesselIds.includes(vesselId);
  }

  onModuleViewChange(module: FleetModuleKey, checked: boolean): void {
    const permission = this.userAccessForm.modulePermissions[module];
    permission.view = checked;
    if (!checked) {
      permission.export = false;
      permission.manage = false;
    }
    this.userAccessForm.role = 'custom';
  }

  onModulePermissionChange(): void {
    this.userAccessForm.role = 'custom';
  }

  saveUserAccess(): void {
    if (this.userAccessSaving) return;

    const username = this.userAccessForm.username.trim();
    const displayName = this.userAccessForm.displayName.trim();
    const validationMessage = this.validateUserAccess(username, displayName);
    if (validationMessage) {
      this.userAccessSaveNotice = validationMessage;
      return;
    }

    const existing = this.userAccessRecords.find((user) => user.id === this.editingUserAccessId);
    const now = new Date().toISOString();
    let record: UserAccessRecord = {
      ...this.userAccessForm,
      id: existing?.id || `user-access-${Date.now().toString(36)}`,
      username,
      displayName,
      email: this.userAccessForm.email.trim(),
      groupIds: Array.from(new Set(this.userAccessForm.groupIds)),
      vesselIds: Array.from(new Set(this.userAccessForm.vesselIds)),
      additionalVesselIds: Array.from(new Set(this.userAccessForm.additionalVesselIds)),
      excludedVesselIds: Array.from(new Set(this.userAccessForm.excludedVesselIds)),
      modulePermissions: this.clonePermissions(this.userAccessForm.modulePermissions),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      source: existing?.source === 'backend' ? 'backend' : 'local',
    };

    const createLogin = !existing && this.userAccountSetupMode === 'create';
    const identityMetadataChanged = Boolean(
      existing &&
      (existing.displayName.trim() !== displayName ||
        existing.email.trim() !== record.email ||
        existing.role !== record.role ||
        existing.status !== record.status),
    );
    const syncManagedAccount = Boolean(
      existing?.accountProvisioning === 'managed' &&
      identityMetadataChanged &&
      this.userAccountApiEnabled &&
      this.userAccountApiSecure,
    );

    this.userAccessSaving = true;
    this.userAccessSaveNotice = createLogin
      ? 'Creating login account and access profile...'
      : syncManagedAccount
        ? 'Synchronising login account and permissions...'
        : 'Saving access profile...';

    const identityOperation$: Observable<{
      accountId: string;
      provisioning: UserAccountProvisioning;
      identityChanged: boolean;
    }> = createLogin
      ? this.userAccountService
          .createAccount({
            username,
            password: this.userPassword,
            displayName,
            email: record.email,
            role: record.role,
            status: record.status,
          })
          .pipe(
            map((account) => ({
              accountId: account.id || username,
              provisioning: 'managed' as const,
              identityChanged: true,
            })),
          )
      : syncManagedAccount
        ? this.userAccountService
            .updateAccount(existing?.accountId || username, {
              username,
              displayName,
              email: record.email,
              role: record.role,
              status: record.status,
            })
            .pipe(
              map((account) => ({
                accountId: account.id || existing?.accountId || username,
                provisioning: 'managed' as const,
                identityChanged: true,
              })),
            )
        : of({
            accountId:
              existing?.accountId || (this.userAccountSetupMode === 'link' ? username : ''),
            provisioning: existing?.accountProvisioning || ('linked' as const),
            identityChanged: false,
          });

    identityOperation$
      .pipe(
        switchMap((identity) => {
          record = {
            ...record,
            accountId: identity.accountId || undefined,
            accountProvisioning: identity.provisioning,
            accountLastSyncedAt: identity.identityChanged ? now : existing?.accountLastSyncedAt,
          };
          return this.settingsData
            .saveUserAccess(record)
            .pipe(map((target) => ({ target, identityChanged: identity.identityChanged })));
        }),
        takeUntil(this.destroy$),
        finalize(() => {
          this.userAccessSaving = false;
        }),
      )
      .subscribe({
        next: ({ target, identityChanged }) => {
          record = { ...record, source: target === 'database' ? 'backend' : 'local' };
          this.userPassword = '';
          this.userPasswordConfirm = '';
          const identityText = createLogin
            ? 'Login account created. '
            : identityChanged
              ? 'Login account synchronised. '
              : '';
          this.userAccessSaveNotice =
            identityText +
            (target === 'database'
              ? 'User access saved to the database.'
              : 'User access saved in this browser. Enable the userAccess endpoint to share permissions across devices.');
          this.userAccessRecords = existing
            ? this.userAccessRecords.map((user) => (user.id === record.id ? record : user))
            : [record, ...this.userAccessRecords];
          this.invalidateUserAccessCaches();
          this.userAccessControl.notifyRecordsChanged();
          timer(900)
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => this.closeUserAccessDrawer());
        },
        error: (error) => {
          this.userPassword = '';
          this.userPasswordConfirm = '';
          this.userAccessSaveNotice =
            error?.message || 'Unable to save the user account and access profile.';
        },
      });
  }

  toggleResetPasswordPanel(): void {
    if (!this.editingUserAccessId) return;
    this.resetPasswordPanelOpen = !this.resetPasswordPanelOpen;
    this.resetPassword = '';
    this.resetPasswordConfirm = '';
    this.resetPasswordNotice = '';
    this.showResetPassword = false;
  }

  resetUserPassword(): void {
    if (this.resetPasswordSaving || !this.editingUserAccessId) return;
    if (!this.userAccountApiEnabled || !this.userAccountApiSecure) {
      this.resetPasswordNotice = this.userAccountApiEnabled
        ? 'Password reset is blocked because the configured endpoint is not HTTPS.'
        : 'Enable the User Account API before resetting passwords.';
      return;
    }
    if (!this.isPasswordPolicyValid(this.resetPassword)) {
      this.resetPasswordNotice =
        'Use at least 10 characters with uppercase, lowercase, a number and a special character.';
      return;
    }
    if (this.resetPassword !== this.resetPasswordConfirm) {
      this.resetPasswordNotice = 'The password confirmation does not match.';
      return;
    }

    const accountId = this.userAccessForm.accountId || this.userAccessForm.username;
    this.resetPasswordSaving = true;
    this.resetPasswordNotice = 'Resetting password securely...';
    this.userAccountService
      .resetPassword(accountId, this.userAccessForm.username, this.resetPassword)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.resetPasswordSaving = false;
        }),
      )
      .subscribe({
        next: () => {
          this.resetPassword = '';
          this.resetPasswordConfirm = '';
          this.showResetPassword = false;
          this.resetPasswordNotice =
            'Password reset successfully. The password was not stored in the browser.';
        },
        error: (error) => {
          this.resetPassword = '';
          this.resetPasswordConfirm = '';
          this.resetPasswordNotice = error?.message || 'Unable to reset the password.';
        },
      });
  }

  get userPasswordStrengthScore(): number {
    return this.passwordStrengthScore(this.userPassword);
  }

  get resetPasswordStrengthScore(): number {
    return this.passwordStrengthScore(this.resetPassword);
  }

  passwordStrengthLabel(score: number): string {
    if (score >= 5) return 'Strong';
    if (score >= 4) return 'Good';
    if (score >= 2) return 'Weak';
    return 'Enter a password';
  }

  passwordStrengthClass(score: number): string {
    if (score >= 5) return 'strong';
    if (score >= 4) return 'good';
    if (score >= 2) return 'weak';
    return 'empty';
  }

  passwordHasLower(value: string): boolean {
    return /[a-z]/.test(value);
  }
  passwordHasUpper(value: string): boolean {
    return /[A-Z]/.test(value);
  }
  passwordHasNumber(value: string): boolean {
    return /[0-9]/.test(value);
  }
  passwordHasSpecial(value: string): boolean {
    return /[^A-Za-z0-9\s]/.test(value);
  }

  accountProvisioningLabel(user: UserAccessRecord): string {
    if (user.accountProvisioning === 'managed') return 'Managed login account';
    if (user.accountProvisioning === 'linked') return 'Linked existing account';
    return 'Access profile only';
  }

  deleteUserAccess(user: UserAccessRecord): void {
    if (this.isCurrentUser(user)) {
      this.userAccessError = 'The account currently in use cannot be deleted.';
      return;
    }
    if (user.role === 'administrator' && this.userAccessAdministratorCount <= 1) {
      this.userAccessError = 'At least one administrator must remain in the system.';
      return;
    }
    if (
      !window.confirm(
        `Delete the access profile for ${user.displayName}? The login account will not be deleted.`,
      )
    )
      return;
    this.settingsData
      .deleteUserAccess(user.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.userAccessRecords = this.userAccessRecords.filter((item) => item.id !== user.id);
          this.invalidateUserAccessCaches();
          this.userAccessControl.notifyRecordsChanged();
        },
        error: (error) => {
          this.userAccessError = error?.message || 'Unable to delete user access.';
        },
      });
  }

  userAccessSummary(user: UserAccessRecord): string {
    if (user.accessScope === 'all') return `All vessels (${this.vessels.length || 'fleet'})`;
    if (user.accessScope === 'groups') {
      const count = this.effectiveVesselIds(user).length;
      return `${user.groupIds.length} ${user.groupIds.length === 1 ? 'group' : 'groups'} · ${count} vessels`;
    }
    return `${this.effectiveVesselIds(user).length} selected vessels`;
  }

  assignedGroupNames(user: UserAccessRecord): string[] {
    this.ensureLookupIndexes();
    return user.groupIds.map((id) => this.groupById.get(id)?.name || id);
  }

  moduleAccessCount(user: UserAccessRecord): number {
    return Object.values(user.modulePermissions).filter((permission) => permission.view).length;
  }

  effectiveVesselIds(user: UserAccessRecord): string[] {
    if (user.accessScope === 'all') return this.vessels.map((vessel) => vessel.id);

    this.ensureLookupIndexes();
    const allowed = new Set<string>();
    if (user.accessScope === 'groups') {
      user.groupIds.forEach((groupId) => {
        this.groupById.get(groupId)?.vesselIds.forEach((id) => allowed.add(id));
      });
    } else {
      user.vesselIds.forEach((id) => allowed.add(id));
    }
    user.additionalVesselIds.forEach((id) => allowed.add(id));
    user.excludedVesselIds.forEach((id) => allowed.delete(id));
    return Array.from(allowed);
  }

  effectiveVesselPreview(user: UserAccessRecord): string {
    this.ensureLookupIndexes();
    const names = this.effectiveVesselIds(user)
      .map((id) => this.vesselById.get(id)?.name || id)
      .filter(Boolean);
    if (!names.length)
      return user.accessScope === 'all' ? 'All available vessels' : 'No vessel access';
    const preview = names.slice(0, 4).join(', ');
    return names.length > 4 ? `${preview} +${names.length - 4}` : preview;
  }

  userRoleLabel(role: UserAccessRole): string {
    return this.userRoleOptions.find((option) => option.value === role)?.label || role;
  }

  isCurrentUser(user: Pick<UserAccessRecord, 'username'>): boolean {
    return user.username.trim().toLowerCase() === this.username.trim().toLowerCase();
  }

  trackByUserAccess(_: number, user: UserAccessRecord): string {
    return user.id;
  }

  trackByUserModule(_: number, module: UserModuleDefinition): FleetModuleKey {
    return module.key;
  }

  openAdd(): void {
    this.editingId = '';
    this.form = this.emptyForm();
    this.selectedEngineProfileId = '';
    this.manualEngineComposerOpen = false;
    this.manualEngineName = '';
    this.expandedEngineAssignmentId = '';
    this.engineLibraryOpen = false;
    this.realtimeMachinery = [];
    this.realtimeMachineryNotice =
      'Enter the vessel Telemetry Prefix to load its Realtime machinery.';
    this.pendingEngineProfiles.clear();
    this.drawerOpen = true;
    this.saveNotice = '';
    this.loadEngineProfiles();
  }

  openEdit(vessel: VesselSettingsRecord): void {
    this.editingId = vessel.id;
    this.form = {
      ...vessel,
      groups: this.getVesselGroups(vessel),
      engines: [...vessel.engines],
      engineAssignments: this.cloneEngineAssignments(vessel),
    };
    this.selectedEngineProfileId = '';
    this.manualEngineComposerOpen = false;
    this.manualEngineName = '';
    this.expandedEngineAssignmentId = '';
    this.engineLibraryOpen = false;
    this.pendingEngineProfiles.clear();
    this.drawerOpen = true;
    this.saveNotice = '';
    this.syncRealtimeMachinery(false);
    this.loadEngineProfiles();
  }

  closeDrawer(): void {
    if (this.isSavingVessel) return;
    if (this.pendingEngineProfiles.size > 0) {
      const discard = window.confirm(
        'Engine profile changes have not been saved. Discard these changes?',
      );
      if (!discard) return;
    }
    this.drawerOpen = false;
    this.engineLibraryOpen = false;
    this.manualEngineComposerOpen = false;
    this.manualEngineName = '';
    this.expandedEngineAssignmentId = '';
    this.engineProfileSaveNotice = '';
    this.realtimeMachinery = [];
    this.realtimeMachineryNotice = '';
    this.pendingEngineProfiles.clear();
  }

  openGroupManagement(): void {
    this.drawerOpen = false;
    this.router.navigate(['/main/settings', 'groups']);
  }

  onVesselPrefixChanged(): void {
    this.syncRealtimeMachinery(true);
  }

  syncRealtimeMachinery(showNotice = true): void {
    const prefix = this.form.prefix.trim();
    this.realtimeMachinery = this.realtimeMachineryService.getForPrefix(prefix);

    if (!this.realtimeMachinery.length) {
      this.form.engineAssignments = (this.form.engineAssignments || []).filter(
        (assignment) => !this.isRealtimeAssignment(assignment),
      );
      this.syncLegacyEngineNames();
      this.realtimeMachineryNotice = prefix
        ? `No Realtime engine layout matches prefix “${prefix}”. Check the prefix or keep manual engine entries.`
        : 'Enter the vessel Telemetry Prefix to load its Realtime machinery.';
      return;
    }

    this.form.engineAssignments = this.realtimeMachineryService.mergeAssignments(
      this.form.engineAssignments || [],
      this.realtimeMachinery,
    );
    this.syncLegacyEngineNames();
    this.realtimeMachineryNotice = `${this.realtimeMachinery.length} machinery positions loaded from the Realtime layout for ${prefix}.`;
    if (showNotice) {
      this.saveNotice =
        'Realtime engine positions refreshed. Review the shared profile for each position, then save once.';
    }
  }

  saveVessel(): void {
    if (this.isSavingVessel) return;

    const id = this.form.id.trim();
    const name = this.form.name.trim();
    const prefix = this.form.prefix.trim();
    if (!id || !name || !prefix) {
      this.saveNotice = 'Vessel ID, name and prefix are required.';
      return;
    }

    const duplicateId = this.vessels.some(
      (vessel) =>
        vessel.id !== this.editingId && vessel.id.trim().toLowerCase() === id.toLowerCase(),
    );
    if (duplicateId) {
      this.saveNotice = `Vessel ID “${id}” is already in use.`;
      return;
    }

    const normalizedPrefix = this.realtimeMachineryService.normalizePrefix(prefix);
    const duplicatePrefix = this.vessels.some(
      (vessel) =>
        vessel.id !== this.editingId &&
        this.realtimeMachineryService.normalizePrefix(vessel.prefix) === normalizedPrefix,
    );
    if (duplicatePrefix) {
      this.saveNotice = `Telemetry Prefix “${prefix}” is already assigned to another vessel.`;
      return;
    }

    const expectedMachinery = this.realtimeMachineryService.getForPrefix(prefix);
    if (expectedMachinery.length) {
      this.realtimeMachinery = expectedMachinery;
      this.form.engineAssignments = this.realtimeMachineryService.mergeAssignments(
        this.form.engineAssignments || [],
        expectedMachinery,
      );
    } else {
      this.form.engineAssignments = (this.form.engineAssignments || []).filter(
        (assignment) => !this.isRealtimeAssignment(assignment),
      );
    }

    const engineAssignments = this.normalizedEngineAssignments();
    const duplicateRealtimeSlots = new Set<string>();
    for (const assignment of engineAssignments.filter((item) => item.source === 'realtime')) {
      const slot = `${assignment.realtimeRow}-${assignment.realtimeCol}`;
      if (duplicateRealtimeSlots.has(slot)) {
        this.saveNotice = `Duplicate Realtime engine slot detected at row ${assignment.realtimeRow}, column ${assignment.realtimeCol}.`;
        return;
      }
      duplicateRealtimeSlots.add(slot);
    }

    const record: VesselSettingsRecord = {
      ...this.form,
      id,
      name,
      prefix,
      groups: Array.from(new Set(this.form.groups)),
      engineAssignments,
      engines: this.engineNamesFromAssignments(engineAssignments),
      source: this.editingId ? this.form.source : 'local',
    };

    const profileRecords = Array.from(this.pendingEngineProfiles.values());
    const saveProfiles$ = profileRecords.length
      ? forkJoin(profileRecords.map((profile) => this.engineProfileService.saveProfile(profile)))
      : of([]);

    this.isSavingVessel = true;
    this.saveNotice = profileRecords.length
      ? `Saving vessel and ${profileRecords.length} engine profile change(s)...`
      : 'Saving vessel and engine assignments...';

    saveProfiles$
      .pipe(
        switchMap(() => this.settingsData.saveVessel(record)),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (target) => {
          this.isSavingVessel = false;

          const hydratedRecord = this.realtimeMachineryService.hydrateVessel({
            ...record,
            source: target === 'database' ? 'backend' : 'local',
          });
          const previousId = this.editingId;
          const exists = this.vessels.some((vessel) => vessel.id === previousId || vessel.id === record.id);
          this.vessels = exists
            ? this.vessels.map((vessel) =>
                vessel.id === previousId || vessel.id === record.id ? hydratedRecord : vessel,
              )
            : [hydratedRecord, ...this.vessels];

          // Profiles are already persisted above. Keep the in-memory library in sync instead of
          // immediately issuing another GET for the entire profile collection.
          if (profileRecords.length) {
            const savedProfiles = new Map(profileRecords.map((profile) => [profile.id, profile]));
            this.engineProfiles = [
              ...profileRecords,
              ...this.engineProfiles.filter((profile) => !savedProfiles.has(profile.id)),
            ];
          }

          this.pendingEngineProfiles.clear();
          this.invalidateVesselCaches();
          this.saveNotice =
            target === 'database'
              ? 'Vessel and engine settings saved to the database.'
              : 'Database unavailable. Vessel and engine settings were saved in this browser as a fallback.';
          timer(650)
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => (this.drawerOpen = false));
        },
        error: (error) => {
          this.isSavingVessel = false;
          this.saveNotice = error?.message || 'Unable to save vessel and engine settings.';
        },
      });
  }

  deleteVessel(vessel: VesselSettingsRecord): void {
    if (
      !window.confirm(
        `Remove saved metadata for ${vessel.name}? Telemetry data will not be deleted.`,
      )
    )
      return;
    this.settingsData
      .deleteVessel(vessel.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.vessels = this.vessels.filter((item) => item.id !== vessel.id);
          this.groupDefinitions = this.groupDefinitions.map((group) => ({
            ...group,
            vesselIds: group.vesselIds.filter((id) => id !== vessel.id),
          }));
          this.invalidateVesselCaches();
          this.invalidateGroupCaches();
          this.page = Math.min(this.page, this.totalPages);
        },
        error: (error) => {
          this.errorMessage = error?.message || 'Unable to remove vessel metadata.';
        },
      });
  }

  openAddGroup(): void {
    this.editingGroupId = '';
    this.groupForm = { name: '', description: '', vesselIds: [] };
    this.groupVesselSearchTerm = '';
    this.groupSaveNotice = '';
    this.groupDrawerOpen = true;
  }

  openEditGroup(group: VesselGroupSummary): void {
    if (!group.editable) return;
    const definition = this.groupDefinitions.find((item) => item.id === group.id);
    if (!definition) return;
    this.editingGroupId = definition.id;
    this.groupForm = {
      name: definition.name,
      description: definition.description,
      vesselIds: [...group.vesselIds],
    };
    this.groupVesselSearchTerm = '';
    this.groupSaveNotice = '';
    this.groupDrawerOpen = true;
  }

  closeGroupDrawer(): void {
    this.groupDrawerOpen = false;
  }

  toggleGroupVessel(vesselId: string, checked: boolean): void {
    this.groupForm.vesselIds = checked
      ? Array.from(new Set([...this.groupForm.vesselIds, vesselId]))
      : this.groupForm.vesselIds.filter((id) => id !== vesselId);
  }

  groupVesselSelected(vesselId: string): boolean {
    return this.groupForm.vesselIds.includes(vesselId);
  }

  saveGroup(): void {
    const name = this.groupForm.name.trim();
    const description = this.groupForm.description.trim();
    if (!name) {
      this.groupSaveNotice = 'Group name is required.';
      return;
    }

    const duplicate = this.groupDefinitions.some(
      (group) =>
        group.id !== this.editingGroupId && group.name.toLowerCase() === name.toLowerCase(),
    );
    if (duplicate) {
      this.groupSaveNotice = 'A group with this name already exists.';
      return;
    }

    const existing = this.groupDefinitions.find((group) => group.id === this.editingGroupId);
    const definition: VesselGroupDefinition = {
      id: existing?.id || this.createGroupId(name),
      name,
      description,
      vesselIds: Array.from(new Set(this.groupForm.vesselIds)),
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: existing?.source || 'local',
    };

    this.groupSaveNotice = 'Saving group...';
    this.settingsData
      .saveVesselGroup(definition)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (target) => {
          const savedDefinition: VesselGroupDefinition = {
            ...definition,
            source: target === 'database' ? 'backend' : 'local',
          };
          this.groupDefinitions = existing
            ? this.groupDefinitions.map((group) =>
                group.id === existing.id ? savedDefinition : group,
              )
            : [...this.groupDefinitions, savedDefinition];
          this.invalidateGroupCaches();
          this.groupSaveNotice =
            target === 'database'
              ? existing
                ? 'Group updated in the database.'
                : 'Group created in the database.'
              : 'Database unavailable. Group saved in this browser as a fallback.';
          timer(450)
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => this.closeGroupDrawer());
        },
        error: (error) => {
          this.groupSaveNotice = error?.message || 'Unable to save group.';
        },
      });
  }

  deleteGroup(group: VesselGroupSummary): void {
    if (!group.editable) return;
    if (!window.confirm(`Delete the group ${group.name}? Vessel records will not be deleted.`))
      return;
    this.settingsData
      .deleteVesselGroup(group.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.groupDefinitions = this.groupDefinitions.filter((item) => item.id !== group.id);
          this.vessels = this.vessels.map((vessel) => ({
            ...vessel,
            groups: (vessel.groups || []).filter((name) => name !== group.name),
          }));
          this.invalidateGroupCaches();
          this.invalidateVesselCaches();
        },
        error: (error) => {
          this.groupSaveNotice = error?.message || 'Unable to delete group.';
        },
      });
  }

  getVesselGroups(vessel: VesselSettingsRecord): string[] {
    const names = new Set(vessel.groups);
    this.groupDefinitions
      .filter((group) => group.vesselIds.includes(vessel.id))
      .forEach((group) => names.add(group.name));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }

  vesselGroupCount(vessel: VesselSettingsRecord): number {
    return this.getVesselGroups(vessel).length;
  }

  vesselEngineCount(vessel: VesselSettingsRecord): number {
    if (vessel.engineAssignments?.length) {
      return vessel.engineAssignments.reduce(
        (total, assignment) => total + (Number(assignment.quantity) || 1),
        0,
      );
    }
    return vessel.engines.length;
  }

  vesselEngineSummary(vessel: VesselSettingsRecord): string {
    const count = this.vesselEngineCount(vessel);
    if (!count) return 'Not assigned';
    const realtimeCount = (vessel.engineAssignments || []).filter((assignment) =>
      this.isRealtimeAssignment(assignment),
    ).length;
    if (realtimeCount) {
      const manualCount = Math.max(0, count - realtimeCount);
      return manualCount
        ? `${realtimeCount} Realtime +${manualCount}`
        : `${realtimeCount} Realtime engines`;
    }
    const profileCount = new Set(
      (vessel.engineAssignments || []).map((assignment) => assignment.profileId).filter(Boolean),
    ).size;
    return profileCount
      ? `${count} · ${profileCount} profile${profileCount === 1 ? '' : 's'}`
      : `${count} legacy`;
  }

  groupVesselNames(group: VesselGroupSummary): string {
    this.ensureLookupIndexes();
    const names = group.vesselIds
      .map((id) => this.vesselById.get(id)?.name)
      .filter((name): name is string => !!name);
    if (!names.length) return 'No vessels assigned';
    const preview = names.slice(0, 3).join(', ');
    return names.length > 3 ? `${preview} +${names.length - 3}` : preview;
  }

  loadEngineProfiles(forceRefresh = false): void {
    if (this.engineProfilesLoading) return;
    if (this.engineProfiles.length > 0 && !forceRefresh) return;
    this.engineProfilesLoading = true;
    this.engineProfilesError = '';
    this.engineProfileService
      .getProfiles(forceRefresh)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (profiles) => {
          this.engineProfiles = profiles;
          this.engineProfilesLoading = false;
          this.linkLegacyEngineAssignments();
        },
        error: (error) => {
          this.engineProfilesLoading = false;
          this.engineProfilesError = error?.message || 'Unable to load the engine profile library.';
        },
      });
  }

  get filteredEngineProfiles(): EngineProfileRecord[] {
    const search = this.engineProfileSearchTerm.trim().toLowerCase();
    if (!search) return this.engineProfiles;
    return this.engineProfiles.filter((profile) =>
      [profile.name, profile.manufacturer, profile.model, profile.fuelType]
        .join(' ')
        .toLowerCase()
        .includes(search),
    );
  }

  get assignedEngineCount(): number {
    return (this.form.engineAssignments || []).reduce(
      (total, assignment) => total + assignment.quantity,
      0,
    );
  }

  assignEngineProfile(): void {
    const profile = this.engineProfiles.find((item) => item.id === this.selectedEngineProfileId);
    if (!profile) {
      this.saveNotice = 'Select an engine profile before assigning it.';
      return;
    }

    const assignments = [...(this.form.engineAssignments || [])];
    const assignmentId = `engine-assignment-${Date.now().toString(36)}`;
    const position =
      this.manualEngineName.trim() ||
      this.defaultEnginePosition(profile.category, assignments.length);
    this.form.engineAssignments = [
      ...assignments,
      {
        id: assignmentId,
        profileId: profile.id,
        displayName: profile.name,
        position,
        quantity: 1,
        source: 'manual',
      },
    ];

    this.selectedEngineProfileId = '';
    this.manualEngineName = '';
    this.manualEngineComposerOpen = false;
    this.expandedEngineAssignmentId = assignmentId;
    this.syncLegacyEngineNames();
    this.saveNotice = `${position} added with ${this.engineProfileDisplayName(profile)}. Save once when the setup is complete.`;
  }

  openManualEngineComposer(): void {
    this.manualEngineComposerOpen = true;
    this.manualEngineName = '';
    this.selectedEngineProfileId = '';
    this.expandedEngineAssignmentId = '';
  }

  closeManualEngineComposer(): void {
    this.manualEngineComposerOpen = false;
    this.manualEngineName = '';
    this.selectedEngineProfileId = '';
  }

  toggleEngineAssignmentEditor(assignment: VesselEngineAssignment): void {
    this.manualEngineComposerOpen = false;
    this.expandedEngineAssignmentId =
      this.expandedEngineAssignmentId === assignment.id ? '' : assignment.id;
  }

  isEngineAssignmentExpanded(assignment: VesselEngineAssignment): boolean {
    return this.expandedEngineAssignmentId === assignment.id;
  }

  engineAssignmentNumber(assignment: VesselEngineAssignment): number {
    const index = (this.form.engineAssignments || []).findIndex(
      (item) => item.id === assignment.id,
    );
    return index >= 0 ? index + 1 : 1;
  }

  engineAssignmentStatusLabel(assignment: VesselEngineAssignment): string {
    if (!this.engineProfileForAssignment(assignment)) return 'Setup required';
    return this.isRealtimeAssignment(assignment) ? 'Connected' : 'Manual';
  }

  engineAssignmentStatusIcon(assignment: VesselEngineAssignment): string {
    if (!this.engineProfileForAssignment(assignment)) return 'fa-exclamation-triangle';
    return this.isRealtimeAssignment(assignment) ? 'fa-check-circle' : 'fa-pencil';
  }

  engineProfileCategoryLabel(category: EngineProfileCategory): string {
    return (
      this.engineCategoryOptions.find((option) => option.value === category)?.label ||
      'Custom engine'
    );
  }

  removeEngineAssignment(id: string): void {
    this.form.engineAssignments = (this.form.engineAssignments || []).filter(
      (item) => item.id !== id,
    );
    if (this.expandedEngineAssignmentId === id) this.expandedEngineAssignmentId = '';
    this.syncLegacyEngineNames();
  }

  updateEngineAssignmentQuantity(assignment: VesselEngineAssignment): void {
    const quantity = Number(assignment.quantity);
    assignment.quantity = Number.isFinite(quantity)
      ? Math.min(12, Math.max(1, Math.round(quantity)))
      : 1;
    this.syncLegacyEngineNames();
  }

  isRealtimeAssignment(assignment: VesselEngineAssignment): boolean {
    return assignment.source === 'realtime' || Boolean(assignment.realtimeKey);
  }

  realtimePositionForAssignment(
    assignment: VesselEngineAssignment,
  ): RealtimeMachineryPosition | undefined {
    return this.realtimeMachinery.find(
      (position) =>
        position.key === assignment.realtimeKey ||
        (position.row === assignment.realtimeRow && position.col === assignment.realtimeCol),
    );
  }

  engineAssignmentCategory(assignment: VesselEngineAssignment): EngineProfileCategory {
    if (!this.isRealtimeAssignment(assignment)) {
      return this.engineProfileForAssignment(assignment)?.category || 'other';
    }
    return this.realtimeMachineryService.categoryForAssignment(assignment);
  }

  engineProfilesForAssignment(assignment: VesselEngineAssignment): EngineProfileRecord[] {
    const category = this.realtimeMachineryService.categoryForAssignment(assignment);
    return [...this.engineProfiles].sort((a, b) => {
      const aScore = a.category === category ? 0 : a.category === 'other' ? 2 : 1;
      const bScore = b.category === category ? 0 : b.category === 'other' ? 2 : 1;
      return (
        aScore - bScore ||
        this.engineProfileDisplayName(a).localeCompare(this.engineProfileDisplayName(b))
      );
    });
  }

  onEngineAssignmentProfileChange(assignment: VesselEngineAssignment): void {
    const profile = this.engineProfileForAssignment(assignment);
    assignment.displayName = profile?.name || assignment.position;
    assignment.quantity = 1;
    this.syncLegacyEngineNames();
    this.saveNotice = profile
      ? `${assignment.position} linked to ${this.engineProfileDisplayName(profile)}. Save once when finished.`
      : `${assignment.position} is not linked to a shared profile.`;
  }

  engineProfileForAssignment(assignment: VesselEngineAssignment): EngineProfileRecord | undefined {
    return this.engineProfiles.find((profile) => profile.id === assignment.profileId);
  }

  engineProfileUsageCount(profileId: string): number {
    return this.vessels.filter((vessel) =>
      (vessel.engineAssignments || []).some((assignment) => assignment.profileId === profileId),
    ).length;
  }

  engineProfileOptionLabel(profile: EngineProfileRecord): string {
    const name = this.engineProfileDisplayName(profile);
    const meta = this.engineProfileDisplayMeta(profile);
    return meta ? `${name} · ${meta}` : name;
  }

  engineProfileDisplayName(profile: EngineProfileRecord): string {
    switch (profile.id) {
      case 'generic-main-diesel':
        return 'Generic Main Engine Profile';
      case 'generic-generator-engine':
        return 'Generic Aux / Generator Profile';
      case 'telemetry-only-engine':
        return 'Direct Telemetry Profile';
      default:
        return profile.name;
    }
  }

  engineProfileDisplayMeta(profile: EngineProfileRecord): string {
    switch (profile.id) {
      case 'generic-main-diesel':
        return 'Template · Main propulsion';
      case 'generic-generator-engine':
        return 'Template · Auxiliary / generator';
      case 'telemetry-only-engine':
        return 'Backend values · No frontend calculation';
      default:
        return [profile.manufacturer, profile.model]
          .map((value) => String(value || '').trim())
          .filter(Boolean)
          .join(' · ');
    }
  }

  engineFormulaName(profile: EngineProfileRecord | undefined): string {
    return profile
      ? getEngineFormulaPreset(profile.formulaPresetId).shortName
      : 'Legacy / no shared formula';
  }

  engineFormulaDescription(profile: EngineProfileRecord | undefined): string {
    return profile
      ? getEngineFormulaPreset(profile.formulaPresetId).description
      : 'Link this legacy engine to a profile to reuse the same rated values and calculation formula.';
  }

  engineFormulaLines(profile: EngineProfileRecord | undefined): string[] {
    return profile ? [...getEngineFormulaPreset(profile.formulaPresetId).formulas] : [];
  }

  openEngineLibrary(): void {
    this.engineLibraryOpen = true;
    this.engineProfileSaveNotice = '';
    this.engineProfileSearchTerm = '';
    if (!this.engineProfiles.length) this.loadEngineProfiles();
  }

  closeEngineLibrary(): void {
    this.engineLibraryOpen = false;
    this.editingEngineProfileId = '';
    this.engineProfileForm = this.emptyEngineProfileForm();
    this.engineProfileSaveNotice = '';
    this.engineTelemetryMappingOpen = false;
  }

  startNewEngineProfile(): void {
    this.editingEngineProfileId = '';
    this.engineProfileForm = this.emptyEngineProfileForm();
    this.engineProfileSaveNotice = '';
    this.engineTelemetryMappingOpen = false;
  }

  editEngineProfile(profile: EngineProfileRecord): void {
    this.editingEngineProfileId = profile.id;
    this.engineProfileForm = {
      ...profile,
      telemetryMapping: { ...profile.telemetryMapping },
      source: profile.source === 'backend' ? 'backend' : 'local',
    };
    this.engineProfileSaveNotice =
      this.engineProfileUsageCount(profile.id) > 0
        ? `Shared profile: changes will affect ${this.engineProfileUsageCount(profile.id)} assigned vessel(s).`
        : '';
  }

  duplicateEngineProfile(profile: EngineProfileRecord): void {
    this.editingEngineProfileId = '';
    this.engineProfileForm = {
      ...profile,
      id: '',
      name: `${profile.name} Copy`,
      telemetryMapping: { ...profile.telemetryMapping },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'local',
    };
    this.engineProfileSaveNotice =
      'A safe copy was created. Saving it will not change vessels using the original profile.';
  }

  saveEngineProfile(): void {
    const name = this.engineProfileForm.name.trim();
    if (!name) {
      this.engineProfileSaveNotice = 'Engine profile name is required.';
      return;
    }
    const duplicate = this.engineProfiles.find(
      (profile) =>
        profile.id !== this.editingEngineProfileId &&
        profile.name.trim().toLowerCase() === name.toLowerCase() &&
        profile.model.trim().toLowerCase() === this.engineProfileForm.model.trim().toLowerCase(),
    );
    if (duplicate) {
      this.engineProfileSaveNotice = `A profile named “${duplicate.name}” with the same model already exists.`;
      return;
    }
    if (
      this.engineProfileForm.ratedPowerKw !== null &&
      Number(this.engineProfileForm.ratedPowerKw) <= 0
    ) {
      this.engineProfileSaveNotice = 'Rated power must be greater than zero.';
      return;
    }
    if (this.engineProfileForm.ratedRpm !== null && Number(this.engineProfileForm.ratedRpm) <= 0) {
      this.engineProfileSaveNotice = 'Rated RPM must be greater than zero.';
      return;
    }

    const now = new Date().toISOString();
    const record: EngineProfileRecord = {
      ...this.engineProfileForm,
      id: this.editingEngineProfileId || this.engineProfileService.createProfileId(name),
      name,
      manufacturer: this.engineProfileForm.manufacturer.trim(),
      model: this.engineProfileForm.model.trim(),
      fuelType: this.engineProfileForm.fuelType.trim(),
      ratedPowerKw: this.nullablePositiveNumber(this.engineProfileForm.ratedPowerKw),
      ratedRpm: this.nullablePositiveNumber(this.engineProfileForm.ratedRpm),
      cylinders: this.nullablePositiveInteger(this.engineProfileForm.cylinders),
      telemetryMapping: {
        powerKwTag: this.engineProfileForm.telemetryMapping.powerKwTag.trim(),
        rpmTag: this.engineProfileForm.telemetryMapping.rpmTag.trim(),
        fuelRateKgPerHourTag: this.engineProfileForm.telemetryMapping.fuelRateKgPerHourTag.trim(),
        runningHoursTag: this.engineProfileForm.telemetryMapping.runningHoursTag.trim(),
        statusTag: this.engineProfileForm.telemetryMapping.statusTag.trim(),
      },
      description: this.engineProfileForm.description.trim(),
      createdAt: this.engineProfileForm.createdAt || now,
      updatedAt: now,
      source:
        this.editingEngineProfileId && this.engineProfileForm.source === 'backend'
          ? 'backend'
          : 'local',
    };

    this.pendingEngineProfiles.set(record.id, record);
    const profileIndex = this.engineProfiles.findIndex((profile) => profile.id === record.id);
    if (profileIndex >= 0) {
      this.engineProfiles = this.engineProfiles.map((profile) =>
        profile.id === record.id ? record : profile,
      );
    } else {
      this.engineProfiles = [record, ...this.engineProfiles];
    }

    this.editingEngineProfileId = record.id;
    this.selectedEngineProfileId = record.id;
    this.engineProfileForm = { ...record, telemetryMapping: { ...record.telemetryMapping } };
    this.engineProfileSaveNotice =
      'Profile changes are ready. Use “Save Vessel & Engines” once to save everything.';

    (this.form.engineAssignments || []).forEach((assignment) => {
      if (assignment.profileId === record.id) assignment.displayName = record.name;
    });
    this.syncLegacyEngineNames();
  }

  deleteEngineProfile(profile: EngineProfileRecord): void {
    if (this.pendingEngineProfiles.has(profile.id)) {
      const assignedInCurrentEditor = (this.form.engineAssignments || []).some(
        (assignment) => assignment.profileId === profile.id,
      );
      if (assignedInCurrentEditor) {
        this.engineProfileSaveNotice =
          'This staged profile is assigned to the vessel currently being edited. Choose another profile first.';
        return;
      }
      this.pendingEngineProfiles.delete(profile.id);
      this.engineProfiles = this.engineProfiles.filter((item) => item.id !== profile.id);
      if (this.editingEngineProfileId === profile.id) this.startNewEngineProfile();
      this.engineProfileSaveNotice = 'Staged profile removed. No database change was made.';
      return;
    }

    const usage = this.engineProfileUsageCount(profile.id);
    const assignedInCurrentEditor = (this.form.engineAssignments || []).some(
      (assignment) => assignment.profileId === profile.id,
    );
    if (usage > 0 || assignedInCurrentEditor) {
      const label = usage > 0 ? `${usage} saved vessel(s)` : 'the vessel currently being edited';
      this.engineProfileSaveNotice = `Cannot delete this profile because it is assigned to ${label}. Remove the assignment first.`;
      return;
    }
    if (!window.confirm(`Delete engine profile “${profile.name}”?`)) return;
    this.engineProfileService
      .deleteProfile(profile.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          if (this.editingEngineProfileId === profile.id) this.startNewEngineProfile();
          this.engineProfiles = this.engineProfiles.filter((item) => item.id !== profile.id);
        },
        error: (error) => {
          this.engineProfileSaveNotice = error?.message || 'Unable to delete engine profile.';
        },
      });
  }

  trackByEngineProfile(_: number, profile: EngineProfileRecord): string {
    return profile.id;
  }

  trackByEngineAssignment(_: number, assignment: VesselEngineAssignment): string {
    return assignment.id;
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      this.saveNotice = 'Image must be 5 MB or smaller.';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => (this.form.image = String(reader.result || ''));
    reader.readAsDataURL(file);
  }

  saveGeneral(): void {
    this.themeMode.setMode(this.theme);
    this.alertRefreshSeconds = Math.min(300, Math.max(60, Number(this.alertRefreshSeconds) || 60));

    localStorage.setItem('fleet-default-landing-page', this.defaultLandingPage);
    localStorage.setItem('fleet-alert-refresh-seconds', String(this.alertRefreshSeconds));
    localStorage.setItem('fleet-alert-auto-refresh', String(this.alarmAutoRefresh));
    localStorage.setItem('fleet-time-format', this.timeFormat);

    // Rebuild the cached formatter only when the display mode changes.
    this.dateTimeFormatterMode = null;
    this.dateTimeFormatter = null;
    this.saveNotice = 'General preferences saved.';

  }

  goToPage(page: number): void {
    this.page = Math.max(1, Math.min(this.totalPages, page));
  }

  statusLabel(status: VesselSettingsStatus): string {
    if (status === 'online') return 'Online';
    if (status === 'idle') return 'Idle';
    if (status === 'offline') return 'Offline';
    return 'No Data';
  }

  formatDateTime(value?: string): string {
    if (!value) return '—';
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '—';

    if (!this.dateTimeFormatter || this.dateTimeFormatterMode !== this.timeFormat) {
      this.dateTimeFormatterMode = this.timeFormat;
      this.dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: this.timeFormat === '12h',
      });
    }

    return this.dateTimeFormatter.format(date);
  }

  trackByVessel(_: number, vessel: VesselSettingsRecord): string {
    return vessel.id;
  }

  trackByGroup(_: number, group: VesselGroupSummary): string {
    return group.id;
  }

  trackByGroupDefinition(_: number, group: VesselGroupDefinition): string {
    return group.id;
  }

  private validateUserAccess(username: string, displayName: string): string {
    if (!username || !displayName) return 'Username and display name are required.';
    if (!/^[a-zA-Z0-9._-]{3,50}$/.test(username)) {
      return 'Username must be 3–50 characters and use only letters, numbers, dot, underscore or hyphen.';
    }
    const email = this.userAccessForm.email.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return 'Enter a valid email address.';
    }
    const duplicate = this.userAccessRecords.some(
      (user) =>
        user.id !== this.editingUserAccessId &&
        user.username.toLowerCase() === username.toLowerCase(),
    );
    if (duplicate) return 'This username already has an access profile.';
    if (this.isCurrentUser(this.userAccessForm) && this.userAccessForm.status === 'suspended') {
      return 'You cannot suspend the account currently in use.';
    }
    if (this.userAccessForm.accessScope === 'groups' && !this.userAccessForm.groupIds.length) {
      return 'Select at least one vessel group.';
    }
    if (this.userAccessForm.accessScope === 'vessels' && !this.userAccessForm.vesselIds.length) {
      return 'Select at least one vessel.';
    }
    if (
      !Object.values(this.userAccessForm.modulePermissions).some((permission) => permission.view)
    ) {
      return 'Enable at least one module for this user.';
    }
    if (!this.editingUserAccessId && this.userAccountSetupMode === 'create') {
      if (!this.userAccountApiEnabled || !this.userAccountApiSecure) {
        return 'User Account API must be enabled over HTTPS before creating a login account.';
      }
      if (!this.isPasswordPolicyValid(this.userPassword)) {
        return 'Use at least 10 characters with uppercase, lowercase, a number and a special character.';
      }
      if (this.userPassword !== this.userPasswordConfirm) {
        return 'The password confirmation does not match.';
      }
    }
    return '';
  }

  private passwordStrengthScore(value: string): number {
    if (!value) return 0;
    let score = value.length >= 10 ? 1 : 0;
    if (this.passwordHasLower(value)) score += 1;
    if (this.passwordHasUpper(value)) score += 1;
    if (this.passwordHasNumber(value)) score += 1;
    if (this.passwordHasSpecial(value)) score += 1;
    return score;
  }

  private isPasswordPolicyValid(value: string): boolean {
    return value.length >= 10 && this.passwordStrengthScore(value) >= 5;
  }

  private resetUserCredentialState(): void {
    this.userPassword = '';
    this.userPasswordConfirm = '';
    this.showUserPassword = false;
    this.resetPasswordPanelOpen = false;
    this.resetPassword = '';
    this.resetPasswordConfirm = '';
    this.showResetPassword = false;
    this.resetPasswordSaving = false;
    this.resetPasswordNotice = '';
  }

  private emptyUserAccessForm(): UserAccessRecord {
    const now = new Date().toISOString();
    return {
      id: '',
      username: '',
      displayName: '',
      email: '',
      role: 'viewer',
      status: 'active',
      accountProvisioning: 'access-only',
      accessScope: 'groups',
      groupIds: [],
      vesselIds: [],
      additionalVesselIds: [],
      excludedVesselIds: [],
      modulePermissions: this.createRolePermissions('viewer'),
      createdAt: now,
      source: 'local',
    };
  }

  private createRolePermissions(role: UserAccessRole): UserModulePermissionMap {
    return this.userModuleDefinitions.reduce((permissions, module) => {
      const administrator = role === 'administrator';
      const operator = role === 'operator';
      const viewer = role === 'viewer';
      const view = administrator || ((operator || viewer) && module.key !== 'settings');
      permissions[module.key] = {
        view,
        export: view && module.supportsExport && (administrator || operator || viewer),
        manage: administrator || (operator && module.key === 'alarm'),
      };
      return permissions;
    }, {} as UserModulePermissionMap);
  }

  private clonePermissions(permissions: UserModulePermissionMap): UserModulePermissionMap {
    return this.userModuleDefinitions.reduce((result, module) => {
      const permission = permissions?.[module.key];
      result[module.key] = {
        view: Boolean(permission?.view),
        export: Boolean(permission?.export),
        manage: Boolean(permission?.manage),
      };
      return result;
    }, {} as UserModulePermissionMap);
  }

  private toggleStringValue(values: string[], value: string, checked: boolean): string[] {
    return checked
      ? Array.from(new Set([...values, value]))
      : values.filter((item) => item !== value);
  }

  private clearInitialVesselLoadGuard(): void {
    if (this.initialVesselLoadGuard !== null) {
      clearTimeout(this.initialVesselLoadGuard);
      this.initialVesselLoadGuard = null;
    }
  }

  private invalidateUserAccessCaches(): void {
    this.filteredUserAccessCacheSource = undefined;
    this.filteredUserAccessCacheKey = '';
  }

  private invalidateVesselCaches(): void {
    this.filteredCacheSource = undefined;
    this.filteredCacheKey = '';
    this.derivedCacheSource = undefined;
    this.vesselIndexSource = undefined;
    this.invalidateUserAccessCaches();
  }

  private invalidateGroupCaches(): void {
    this.derivedGroupDefinitionsSource = undefined;
    this.groupIndexSource = undefined;
    this.filteredCacheSource = undefined;
    this.filteredCacheKey = '';
    this.invalidateUserAccessCaches();
  }

  private ensureLookupIndexes(): void {
    if (this.vesselIndexSource !== this.vessels) {
      this.vesselById = new Map(this.vessels.map((vessel) => [vessel.id, vessel]));
      this.vesselIndexSource = this.vessels;
    }

    if (this.groupIndexSource !== this.groupDefinitions) {
      this.groupById = new Map(this.groupDefinitions.map((group) => [group.id, group]));
      this.groupIndexSource = this.groupDefinitions;
    }
  }

  private ensureVesselDerivatives(): void {
    if (
      this.derivedCacheSource === this.vessels &&
      this.derivedGroupDefinitionsSource === this.groupDefinitions
    ) {
      return;
    }

    const counts = new Map<
      string,
      { vesselIds: Set<string>; editable: boolean; id: string; description: string }
    >();
    let online = 0;
    let idle = 0;
    let offline = 0;

    this.groupDefinitions.forEach((group) => {
      counts.set(group.name, {
        vesselIds: new Set(group.vesselIds),
        editable: true,
        id: group.id,
        description: group.description,
      });
    });

    for (const vessel of this.vessels) {
      if (vessel.status === 'online') online += 1;
      if (vessel.status === 'idle') idle += 1;
      if (vessel.status === 'offline') offline += 1;

      for (const groupName of this.getVesselGroups(vessel)) {
        const current = counts.get(groupName) || {
          vesselIds: new Set<string>(),
          editable: false,
          id: `imported-${this.groupSlug(groupName)}`,
          description: 'Imported from vessel data',
        };
        current.vesselIds.add(vessel.id);
        counts.set(groupName, current);
      }
    }

    const groupedIds = new Set<string>();
    counts.forEach((item) => item.vesselIds.forEach((id) => groupedIds.add(id)));
    const ungroupedIds = this.vessels
      .filter((vessel) => !groupedIds.has(vessel.id))
      .map((vessel) => vessel.id);

    this.onlineCountCache = online;
    this.idleCountCache = idle;
    this.offlineCountCache = offline;
    this.groupSummaryCache = Array.from(counts, ([name, item]) => ({
      id: item.id,
      name,
      description: item.description,
      count: item.vesselIds.size,
      vesselIds: Array.from(item.vesselIds),
      editable: item.editable,
    })).sort(
      (a, b) =>
        Number(b.editable) - Number(a.editable) ||
        b.count - a.count ||
        a.name.localeCompare(b.name),
    );

    if (ungroupedIds.length) {
      this.groupSummaryCache.push({
        id: 'ungrouped',
        name: 'Ungrouped',
        description: 'Vessels not assigned to any group',
        count: ungroupedIds.length,
        vesselIds: ungroupedIds,
        editable: false,
      });
    }

    this.derivedCacheSource = this.vessels;
    this.derivedGroupDefinitionsSource = this.groupDefinitions;
  }

  private createGroupId(name: string): string {
    return `${this.groupSlug(name)}-${Date.now().toString(36)}`;
  }

  private groupSlug(name: string): string {
    return (
      name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'group'
    );
  }

  private clampSeconds(value: number, fallback: number): number {
    const number = Number(value);
    return Math.min(300, Math.max(60, Number.isFinite(number) ? number : fallback));
  }

  private readLandingPage(value: string | null): LandingPage {
    return this.landingPageOptions.some((option) => option.value === value)
      ? (value as LandingPage)
      : 'overview';
  }

  private isTab(value: string | null): value is SettingsTab['id'] {
    return value === 'general' || value === 'users' || value === 'vessels' || value === 'groups';
  }

  private emptyEngineProfileForm(): EngineProfileRecord {
    const now = new Date().toISOString();
    return {
      id: '',
      name: '',
      manufacturer: '',
      model: '',
      category: 'main',
      fuelType: 'Marine Diesel Oil',
      ratedPowerKw: null,
      ratedRpm: null,
      cylinders: null,
      formulaPresetId: 'main-diesel-standard-v1',
      telemetryMapping: {
        powerKwTag: '',
        rpmTag: '',
        fuelRateKgPerHourTag: '',
        runningHoursTag: '',
        statusTag: '',
      },
      description: '',
      createdAt: now,
      updatedAt: now,
      source: 'local',
    };
  }

  private cloneEngineAssignments(vessel: VesselSettingsRecord): VesselEngineAssignment[] {
    if (vessel.engineAssignments?.length) {
      return vessel.engineAssignments.map((assignment) => ({ ...assignment }));
    }
    return vessel.engines.map((name, index) => ({
      id: `legacy-${index + 1}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      profileId: '',
      displayName: name,
      position: `Engine ${index + 1}`,
      quantity: 1,
      source: 'legacy' as const,
    }));
  }

  private linkLegacyEngineAssignments(): void {
    if (!this.drawerOpen || !this.form.engineAssignments?.length || !this.engineProfiles.length)
      return;
    let changed = false;
    const assignments = this.form.engineAssignments.map((assignment) => {
      if (assignment.profileId) return assignment;
      const legacyName = assignment.displayName.trim().toLowerCase();
      const match = this.engineProfiles.find(
        (profile) =>
          profile.name.trim().toLowerCase() === legacyName ||
          profile.model.trim().toLowerCase() === legacyName,
      );
      if (!match) return assignment;
      changed = true;
      return { ...assignment, profileId: match.id, displayName: match.name };
    });
    if (changed) {
      this.form.engineAssignments = assignments;
      this.syncLegacyEngineNames();
    }
  }

  private normalizedEngineAssignments(): VesselEngineAssignment[] {
    return (this.form.engineAssignments || [])
      .filter((assignment) => assignment.profileId || assignment.displayName.trim())
      .map((assignment, index) => {
        const profile = this.engineProfileForAssignment(assignment);
        return {
          id: assignment.id || `engine-assignment-${index + 1}`,
          profileId: assignment.profileId,
          displayName: profile?.name || assignment.displayName.trim() || `Engine ${index + 1}`,
          position: assignment.position.trim() || `Engine ${index + 1}`,
          quantity: this.isRealtimeAssignment(assignment)
            ? 1
            : Math.min(12, Math.max(1, Math.round(Number(assignment.quantity) || 1))),
          realtimeKey: assignment.realtimeKey,
          realtimeRow: assignment.realtimeRow,
          realtimeCol: assignment.realtimeCol,
          realtimeType: assignment.realtimeType,
          source: assignment.source,
        };
      });
  }

  private engineNamesFromAssignments(assignments: VesselEngineAssignment[]): string[] {
    return this.realtimeMachineryService.engineNames(assignments);
  }

  private syncLegacyEngineNames(): void {
    this.form.engines = this.engineNamesFromAssignments(this.normalizedEngineAssignments());
  }

  private defaultEnginePosition(category: EngineProfileCategory, existingCount: number): string {
    const sequence = existingCount + 1;
    if (category === 'main') return `Main Engine ${sequence}`;
    if (category === 'generator') return `Generator ${sequence}`;
    if (category === 'auxiliary') return `Auxiliary Engine ${sequence}`;
    return `Engine ${sequence}`;
  }

  private nullablePositiveNumber(value: number | null): number | null {
    if (value === null || value === undefined || value === ('' as unknown as number)) return null;
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : null;
  }

  private nullablePositiveInteger(value: number | null): number | null {
    const number = this.nullablePositiveNumber(value);
    return number === null ? null : Math.round(number);
  }

  private emptyForm(): VesselSettingsRecord {
    return {
      id: '',
      name: '',
      prefix: '',
      image: '',
      description: '',
      nationality: '',
      customer: '',
      owner: '',
      agency: '',
      groups: [],
      engines: [],
      engineAssignments: [],
      status: 'unknown',
      source: 'local',
    };
  }
}