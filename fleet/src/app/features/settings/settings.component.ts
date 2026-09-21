import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Observable,
  Subject,
  catchError,
  distinctUntilChanged,
  finalize,
  forkJoin,
  map,
  of,
  switchMap,
  takeUntil,
  throwError,
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

interface RealtimeDetectionSummary {
  total: number;
  existing: number;
  newCount: number;
  conflicts: number;
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
  styleUrls: ['./settings.shared.css', './settings.component.css'],
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
  userAccessDatabaseEnabled = false;
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
  vesselGroupIds: string[] = [];
  vesselGroupSearchTerm = '';
  vesselGroupComposerOpen = false;
  vesselNewGroupName = '';
  vesselNewGroupDescription = '';
  vesselGroupInlineNotice = '';
  vesselGroupSaving = false;

  engineProfiles: EngineProfileRecord[] = [];
  engineProfilesLoading = false;
  engineProfilesError = '';
  selectedEngineProfileId = '';
  manualEngineName = '';
  expandedEngineAssignmentId = '';
  engineLibraryOpen = false;
  editingEngineProfileId = '';
  engineProfileSearchTerm = '';
  engineProfileForm = this.emptyEngineProfileForm();
  engineProfileSaveNotice = '';
  engineProfileSaving = false;
  engineTelemetryMappingOpen = false;
  realtimeMachinery: RealtimeMachineryPosition[] = [];
  realtimeMachineryNotice = '';
  realtimeDetectionPending = false;
  realtimeDetectionSummary: RealtimeDetectionSummary = { total: 0, existing: 0, newCount: 0, conflicts: 0 };
  isSavingVessel = false;

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

  private userAccessEditorSnapshot = '';
  private vesselEditorSnapshot = '';
  private groupEditorSnapshot = '';
  private engineProfileEditorSnapshot = '';

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
    this.settingsData
      .getUserAccessPersistenceMode()
      .pipe(takeUntil(this.destroy$))
      .subscribe((mode) => {
        this.userAccessDatabaseEnabled = mode === 'database';
      });

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
    this.syncSettingsDrawerDocumentState(false);
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

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.hasUnsavedChanges()) return;
    event.preventDefault();
    event.returnValue = '';
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

  get userAccessActiveAdministratorCount(): number {
    return this.userAccessRecords.filter(
      (user) => user.role === 'administrator' && user.status === 'active',
    ).length;
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

  get vesselGroupOptions(): VesselGroupDefinition[] {
    const search = this.vesselGroupSearchTerm.trim().toLowerCase();
    if (!search) return this.groupDefinitions;
    return this.groupDefinitions.filter((group) =>
      [group.name, group.description].join(' ').toLowerCase().includes(search),
    );
  }

  selectTab(tab: SettingsTab['id']): void {
    if (tab === this.activeTab) return;
    if (
      this.hasUnsavedChanges() &&
      !window.confirm('You have unsaved Settings changes. Discard them and switch section?')
    )
      return;

    this.closeOpenEditorsForNavigation();
    this.activeTab = tab;
    this.router.navigate(tab === 'general' ? ['/main/settings'] : ['/main/settings', tab]);
  }

  canDeactivateSettings(): boolean {
    if (!this.hasUnsavedChanges()) return true;
    return window.confirm('You have unsaved Settings changes. Leave this page without saving?');
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
          if (this.drawerOpen && this.editingId) {
            const vesselGroupNames = new Set(
              this.form.groups.map((name) => name.trim().toLowerCase()),
            );
            this.vesselGroupIds = groups
              .filter(
                (group) =>
                  group.vesselIds.includes(this.editingId) ||
                  vesselGroupNames.has(group.name.trim().toLowerCase()),
              )
              .map((group) => group.id);
          }
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
      this.userAccountApiEnabled && this.userAccountApiSecure && this.userAccessDatabaseEnabled
        ? 'create'
        : 'link';
    this.resetUserCredentialState();
    this.userAccessSaveNotice = '';
    this.userAccessVesselSearchTerm = '';
    this.userAccessGroupSearchTerm = '';
    this.userAccessDrawerOpen = true;
    this.syncSettingsDrawerDocumentState();
    this.captureUserAccessEditorSnapshot();
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
    this.syncSettingsDrawerDocumentState();
    this.captureUserAccessEditorSnapshot();
  }

  closeUserAccessDrawer(force = false): void {
    if (this.userAccessSaving || this.resetPasswordSaving) return;
    if (!force && this.isUserAccessEditorDirty()) {
      const discard = window.confirm(
        'This user has unsaved account or permission changes. Discard these changes?',
      );
      if (!discard) return;
    }
    this.userAccessDrawerOpen = false;
    this.syncSettingsDrawerDocumentState();
    this.userAccessEditorSnapshot = '';
    this.resetUserCredentialState();
  }

  setUserAccountSetupMode(mode: UserAccountSetupMode): void {
    if (
      mode === 'create' &&
      (!this.userAccountApiEnabled || !this.userAccountApiSecure || !this.userAccessDatabaseEnabled)
    ) {
      this.userAccessSaveNotice = !this.userAccessDatabaseEnabled
        ? 'Create Login is disabled while User Access is local-only. Enable the userAccess database endpoint first so account creation and permissions stay consistent.'
        : this.userAccountApiEnabled
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

    const createLogin =
      !existing && this.userAccountSetupMode === 'create' && this.userAccessDatabaseEnabled;
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
        this.userAccountApiSecure &&
        this.userAccessDatabaseEnabled,
    );

    this.userAccessSaving = true;
    this.userAccessSaveNotice = createLogin
      ? 'Creating login account and access profile...'
      : syncManagedAccount
        ? 'Synchronising login account and permissions...'
        : this.userAccessDatabaseEnabled
          ? 'Saving access profile to the database...'
          : 'Saving LOCAL-ONLY access profile...';

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

          return this.settingsData.saveUserAccess(record).pipe(
            map((target) => ({ target, identityChanged: identity.identityChanged })),
            catchError((accessError) => {
              if (createLogin && identity.identityChanged) {
                return this.userAccountService.deleteAccount(identity.accountId, username).pipe(
                  catchError((rollbackError) =>
                    throwError(
                      () =>
                        new Error(
                          `${accessError?.message || 'User Access could not be saved.'} The new login account was created, and automatic rollback also failed: ${rollbackError?.message || 'unknown rollback error'}`,
                        ),
                    ),
                  ),
                  switchMap(() =>
                    throwError(
                      () =>
                        new Error(
                          `${accessError?.message || 'User Access could not be saved.'} The newly created login account was rolled back successfully.`,
                        ),
                    ),
                  ),
                );
              }

              if (syncManagedAccount && existing && identity.identityChanged) {
                return this.userAccountService
                  .updateAccount(existing.accountId || existing.username, {
                    username: existing.username,
                    displayName: existing.displayName,
                    email: existing.email,
                    role: existing.role,
                    status: existing.status,
                  })
                  .pipe(
                    catchError((rollbackError) =>
                      throwError(
                        () =>
                          new Error(
                            `${accessError?.message || 'User Access could not be saved.'} Login metadata changed before the failure and automatic rollback also failed: ${rollbackError?.message || 'unknown rollback error'}`,
                          ),
                      ),
                    ),
                    switchMap(() =>
                      throwError(
                        () =>
                          new Error(
                            `${accessError?.message || 'User Access could not be saved.'} Login metadata was restored to its previous values.`,
                          ),
                      ),
                    ),
                  );
              }

              return throwError(() => accessError);
            }),
          );
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
              : 'LOCAL ONLY — user access was saved in this browser because the userAccess database endpoint is disabled. It is not shared across devices.');
          this.userAccessRecords = existing
            ? this.userAccessRecords.map((user) => (user.id === record.id ? record : user))
            : [record, ...this.userAccessRecords];
          this.invalidateUserAccessCaches();
          this.userAccessControl.notifyRecordsChanged();
          this.captureUserAccessEditorSnapshot();
          timer(900)
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => this.closeUserAccessDrawer(true));
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
    if (
      user.role === 'administrator' &&
      user.status === 'active' &&
      this.userAccessActiveAdministratorCount <= 1
    ) {
      this.userAccessError = 'At least one active administrator must remain in the system.';
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
    this.vesselGroupIds = [];
    this.vesselGroupSearchTerm = '';
    this.resetVesselGroupComposer();
    this.selectedEngineProfileId = '';
    this.manualEngineName = '';
    this.expandedEngineAssignmentId = '';
    this.engineLibraryOpen = false;
    this.editingEngineProfileId = '';
    this.engineProfileForm = this.emptyEngineProfileForm();
    this.engineProfileSaveNotice = '';
    this.engineTelemetryMappingOpen = false;
    this.realtimeMachinery = [];
    this.realtimeMachineryNotice =
      'Enter the vessel Telemetry Prefix to preview its Realtime machinery.';
    this.realtimeDetectionPending = false;
    this.realtimeDetectionSummary = { total: 0, existing: 0, newCount: 0, conflicts: 0 };
    this.drawerOpen = true;
    this.syncSettingsDrawerDocumentState();
    this.saveNotice = '';
    this.captureVesselEditorSnapshot();
    this.loadGroups();
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
    const vesselGroupNames = new Set(this.form.groups.map((name) => name.trim().toLowerCase()));
    this.vesselGroupIds = this.groupDefinitions
      .filter(
        (group) =>
          group.vesselIds.includes(vessel.id) || vesselGroupNames.has(group.name.trim().toLowerCase()),
      )
      .map((group) => group.id);
    this.vesselGroupSearchTerm = '';
    this.resetVesselGroupComposer();
    this.selectedEngineProfileId = '';
    this.manualEngineName = '';
    this.expandedEngineAssignmentId = '';
    this.engineLibraryOpen = false;
    this.editingEngineProfileId = '';
    this.engineProfileForm = this.emptyEngineProfileForm();
    this.engineProfileSaveNotice = '';
    this.engineTelemetryMappingOpen = false;
    this.drawerOpen = true;
    this.syncSettingsDrawerDocumentState();
    this.saveNotice = '';
    this.loadGroups();
    this.syncRealtimeMachinery(false);
    this.captureVesselEditorSnapshot();
    this.loadEngineProfiles();
  }

  closeDrawer(force = false): void {
    if (this.isSavingVessel || this.vesselGroupSaving || this.engineProfileSaving) return;
    if (!force && this.isVesselEditorDirty()) {
      const discard = window.confirm(
        'This vessel has unsaved information, group, engine or engine-profile changes. Discard these changes?',
      );
      if (!discard) return;
    }
    this.drawerOpen = false;
    this.syncSettingsDrawerDocumentState();
    this.vesselGroupIds = [];
    this.vesselGroupSearchTerm = '';
    this.resetVesselGroupComposer();
    this.engineLibraryOpen = false;
    this.manualEngineName = '';
    this.expandedEngineAssignmentId = '';
    this.engineProfileSaveNotice = '';
    this.realtimeMachinery = [];
    this.realtimeMachineryNotice = '';
    this.realtimeDetectionPending = false;
    this.realtimeDetectionSummary = { total: 0, existing: 0, newCount: 0, conflicts: 0 };
    this.vesselEditorSnapshot = '';
    this.engineProfileEditorSnapshot = '';
  }

  openVesselGroupComposer(): void {
    this.vesselGroupComposerOpen = true;
    this.vesselGroupInlineNotice = '';
  }

  closeVesselGroupComposer(): void {
    if (this.vesselGroupSaving) return;
    this.vesselGroupComposerOpen = false;
    this.vesselNewGroupName = '';
    this.vesselNewGroupDescription = '';
    this.vesselGroupInlineNotice = '';
  }

  createAndSelectVesselGroup(): void {
    const name = this.vesselNewGroupName.trim();
    const description = this.vesselNewGroupDescription.trim();
    if (!name || this.vesselGroupSaving || this.isSavingVessel) return;

    const duplicate = this.groupDefinitions.find(
      (group) => group.name.trim().toLowerCase() === name.toLowerCase(),
    );
    if (duplicate) {
      this.toggleVesselGroup(duplicate.id, true);
      this.vesselGroupInlineNotice = `“${duplicate.name}” already exists and has been selected.`;
      return;
    }

    const now = new Date().toISOString();
    const definition: VesselGroupDefinition = {
      id: this.createGroupId(name),
      name,
      description,
      vesselIds: [],
      createdAt: now,
      updatedAt: now,
      source: 'local',
    };

    this.vesselGroupSaving = true;
    this.vesselGroupInlineNotice = 'Creating group...';
    this.settingsData
      .saveVesselGroup(definition)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.vesselGroupSaving = false)),
      )
      .subscribe({
        next: (target) => {
          const savedDefinition: VesselGroupDefinition = {
            ...definition,
            source: target === 'database' ? 'backend' : 'local',
          };
          this.groupDefinitions = [...this.groupDefinitions, savedDefinition].sort((a, b) =>
            a.name.localeCompare(b.name),
          );
          this.invalidateGroupCaches();
          this.toggleVesselGroup(savedDefinition.id, true);
          this.vesselNewGroupName = '';
          this.vesselNewGroupDescription = '';
          this.vesselGroupInlineNotice =
            target === 'database'
              ? `“${savedDefinition.name}” created and selected. Save the vessel to confirm membership.`
              : `Database unavailable. “${savedDefinition.name}” was saved locally and selected.`;
        },
        error: (error) => {
          this.vesselGroupInlineNotice = error?.message || 'Unable to create vessel group.';
        },
      });
  }

  private resetVesselGroupComposer(): void {
    this.vesselGroupComposerOpen = false;
    this.vesselNewGroupName = '';
    this.vesselNewGroupDescription = '';
    this.vesselGroupInlineNotice = '';
    this.vesselGroupSaving = false;
  }

  openGroupManagement(): void {
    if (
      this.isVesselEditorDirty() &&
      !window.confirm('The vessel editor has unsaved changes. Discard them and open Group Management?')
    )
      return;
    this.closeDrawer(true);
    this.activeTab = 'groups';
    this.router.navigate(['/main/settings', 'groups']);
  }

  toggleVesselGroup(groupId: string, checked: boolean): void {
    this.vesselGroupIds = checked
      ? Array.from(new Set([...this.vesselGroupIds, groupId]))
      : this.vesselGroupIds.filter((id) => id !== groupId);
    this.form.groups = this.selectedVesselGroupNames();
  }

  vesselGroupSelected(groupId: string): boolean {
    return this.vesselGroupIds.includes(groupId);
  }

  vesselGroupMemberCount(group: VesselGroupDefinition): number {
    const currentId = this.form.id.trim();
    const alreadyIncluded = currentId ? group.vesselIds.includes(currentId) : false;
    const selected = this.vesselGroupSelected(group.id);
    return group.vesselIds.length + (selected && !alreadyIncluded ? 1 : 0) - (!selected && alreadyIncluded ? 1 : 0);
  }

  onVesselPrefixChanged(): void {
    this.syncRealtimeMachinery(true);
  }

  get hasRealtimeEngineAssignments(): boolean {
    return (this.form.engineAssignments || []).some((assignment) =>
      this.isRealtimeAssignment(assignment),
    );
  }

  syncRealtimeMachinery(showNotice = true): void {
    const prefix = this.form.prefix.trim();
    this.realtimeMachinery = this.realtimeMachineryService.getForPrefix(prefix);

    if (!this.realtimeMachinery.length) {
      this.realtimeDetectionPending = false;
      this.realtimeDetectionSummary = { total: 0, existing: 0, newCount: 0, conflicts: 0 };
      this.realtimeMachineryNotice = prefix
        ? `No Realtime engine layout matches prefix “${prefix}”. Existing engine assignments were left unchanged.`
        : 'Enter the vessel Telemetry Prefix to preview its Realtime machinery.';
      if (showNotice && prefix) {
        this.saveNotice =
          'No Realtime machinery was applied. Check the Telemetry Prefix or keep the vessel in manual engine mode.';
      }
      return;
    }

    const assignments = this.form.engineAssignments || [];
    let existing = 0;
    let conflicts = 0;

    for (const position of this.realtimeMachinery) {
      const candidates = assignments.filter((assignment) =>
        this.realtimePositionMatchesAssignment(position, assignment),
      );
      if (candidates.length > 0) existing += 1;
      if (candidates.length > 1) conflicts += candidates.length - 1;
    }

    this.realtimeDetectionSummary = {
      total: this.realtimeMachinery.length,
      existing,
      newCount: Math.max(0, this.realtimeMachinery.length - existing),
      conflicts,
    };
    this.realtimeDetectionPending = showNotice;
    this.realtimeMachineryNotice = `Preview: ${this.realtimeMachinery.length} Realtime position(s) detected for ${prefix}; ${existing} already mapped, ${Math.max(0, this.realtimeMachinery.length - existing)} new, ${conflicts} conflict(s).`;

    if (showNotice) {
      this.saveNotice =
        'Realtime detection is in preview mode. Review the result and choose “Apply Detected Engines” before saving.';
    }
  }

  applyRealtimeMachinery(): void {
    if (!this.realtimeMachinery.length || this.isSavingVessel) return;
    if (this.realtimeDetectionSummary.conflicts > 0) {
      this.saveNotice =
        'Resolve duplicate/conflicting engine positions before applying the Realtime layout.';
      return;
    }

    this.form.engineAssignments = this.realtimeMachineryService.mergeAssignments(
      this.form.engineAssignments || [],
      this.realtimeMachinery,
    );
    this.form.engineSyncMode = 'realtime';
    this.realtimeDetectionPending = false;
    this.realtimeMachineryNotice = `${this.realtimeMachinery.length} Realtime engine position(s) are applied to this vessel.`;
    this.saveNotice = `${this.realtimeMachinery.length} Realtime engine position(s) applied. Review the shared profile for each engine, then save once.`;
  }

  cancelRealtimeDetectionPreview(): void {
    this.realtimeDetectionPending = false;
    this.saveNotice = 'Realtime detection preview dismissed. Existing engine assignments were not changed.';
  }

  clearRealtimeEngineAssignments(): void {
    const realtimeCount = (this.form.engineAssignments || []).filter((assignment) =>
      this.isRealtimeAssignment(assignment),
    ).length;
    if (!realtimeCount) return;
    if (
      !window.confirm(
        `Remove ${realtimeCount} Realtime engine assignment(s) and keep only manual engines for this vessel?`,
      )
    )
      return;

    this.form.engineAssignments = (this.form.engineAssignments || []).filter(
      (assignment) => !this.isRealtimeAssignment(assignment),
    );
    this.form.engineSyncMode = 'manual';
    this.realtimeDetectionPending = false;
    this.saveNotice = 'Realtime assignments removed. This vessel will remain in manual engine mode after saving.';
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
    const engineAssignments = this.normalizedEngineAssignments();

    const duplicateEngine = this.duplicateEngineAssignmentLabel(engineAssignments);
    if (duplicateEngine) {
      this.saveNotice = `Duplicate engine position “${duplicateEngine}” detected. Use a unique name/position for each engine.`;
      return;
    }

    const realtimeAssignments = engineAssignments.filter((assignment) =>
      this.isRealtimeAssignment(assignment),
    );
    if (this.form.engineSyncMode === 'realtime') {
      if (!expectedMachinery.length) {
        this.saveNotice =
          'This vessel is in Realtime engine mode, but the current Telemetry Prefix has no known machinery layout. Use “Remove Realtime / Manual Mode” or correct the prefix.';
        return;
      }
      const expectedKeys = new Set(expectedMachinery.map((position) => position.key));
      const mappedKeys = new Set(
        realtimeAssignments.map((assignment) => assignment.realtimeKey || '').filter(Boolean),
      );
      if (
        realtimeAssignments.length !== expectedMachinery.length ||
        expectedMachinery.some((position) => !mappedKeys.has(position.key)) ||
        realtimeAssignments.some(
          (assignment) => assignment.realtimeKey && !expectedKeys.has(assignment.realtimeKey),
        )
      ) {
        this.saveNotice =
          'Realtime machinery does not match the current Telemetry Prefix. Use Import from Realtime and Apply Detected Engines before saving.';
        return;
      }
    } else if (realtimeAssignments.length > 0) {
      this.saveNotice =
        'Realtime assignments are present while the vessel is in manual mode. Remove them or apply the current Realtime layout before saving.';
      return;
    }
    const duplicateRealtimeSlots = new Set<string>();
    for (const assignment of engineAssignments.filter((item) => item.source === 'realtime')) {
      const slot = `${assignment.realtimeRow}-${assignment.realtimeCol}`;
      if (duplicateRealtimeSlots.has(slot)) {
        this.saveNotice = `Duplicate Realtime engine slot detected at row ${assignment.realtimeRow}, column ${assignment.realtimeCol}.`;
        return;
      }
      duplicateRealtimeSlots.add(slot);
    }

    const selectedGroupNames = this.selectedVesselGroupNames();
    this.form.groups = selectedGroupNames;
    const record: VesselSettingsRecord = {
      ...this.form,
      id,
      name,
      prefix,
      groups: selectedGroupNames,
      engineAssignments,
      engines: this.engineNamesFromAssignments(engineAssignments),
      source: this.editingId ? this.form.source : 'local',
    };

    const previousId = this.editingId;
    const groupUpdates = this.buildVesselGroupUpdates(id, previousId);

    this.isSavingVessel = true;
    this.saveNotice = groupUpdates.length
      ? `Saving vessel and ${groupUpdates.length} group membership change(s)...`
      : 'Saving vessel and engine assignments...';

    this.settingsData
      .saveVessel(record)
      .pipe(
        switchMap((vesselTarget) => {
          if (!groupUpdates.length) return of({ vesselTarget, savedGroups: [] as VesselGroupDefinition[] });
          return forkJoin(
            groupUpdates.map((group) =>
              this.settingsData.saveVesselGroup(group).pipe(
                map((groupTarget) => ({
                  ...group,
                  source: groupTarget === 'database' ? ('backend' as const) : ('local' as const),
                })),
              ),
            ),
          ).pipe(map((savedGroups) => ({ vesselTarget, savedGroups })));
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: ({ vesselTarget, savedGroups }) => {
          this.isSavingVessel = false;

          const hydratedRecord = this.realtimeMachineryService.hydrateVessel({
            ...record,
            source: vesselTarget === 'database' ? 'backend' : 'local',
          });
          const exists = this.vessels.some((vessel) => vessel.id === previousId || vessel.id === record.id);
          this.vessels = exists
            ? this.vessels.map((vessel) =>
                vessel.id === previousId || vessel.id === record.id ? hydratedRecord : vessel,
              )
            : [hydratedRecord, ...this.vessels];

          if (savedGroups.length) {
            const savedGroupById = new Map(savedGroups.map((group) => [group.id, group]));
            this.groupDefinitions = this.groupDefinitions.map(
              (group) => savedGroupById.get(group.id) || group,
            );
            this.invalidateGroupCaches();
          }

          this.form = {
            ...hydratedRecord,
            groups: [...hydratedRecord.groups],
            engines: [...hydratedRecord.engines],
            engineAssignments: this.cloneEngineAssignments(hydratedRecord),
          };
          this.invalidateVesselCaches();
          this.saveNotice =
            vesselTarget === 'database'
              ? 'Vessel, group membership and engine settings saved successfully.'
              : 'Database unavailable. Vessel, group membership and engine settings were saved in this browser as a fallback.';
          this.captureVesselEditorSnapshot();
          timer(650)
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => this.closeDrawer(true));
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
    this.syncSettingsDrawerDocumentState();
    this.captureGroupEditorSnapshot();
    this.loadUserAccessRecords();
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
    this.syncSettingsDrawerDocumentState();
    this.captureGroupEditorSnapshot();
    this.loadUserAccessRecords();
  }

  closeGroupDrawer(force = false): void {
    if (!force && this.isGroupEditorDirty()) {
      const discard = window.confirm('This vessel group has unsaved changes. Discard them?');
      if (!discard) return;
    }
    this.groupDrawerOpen = false;
    this.syncSettingsDrawerDocumentState();
    this.groupEditorSnapshot = '';
  }

  toggleGroupVessel(vesselId: string, checked: boolean): void {
    this.groupForm.vesselIds = checked
      ? Array.from(new Set([...this.groupForm.vesselIds, vesselId]))
      : this.groupForm.vesselIds.filter((id) => id !== vesselId);
  }

  groupVesselSelected(vesselId: string): boolean {
    return this.groupForm.vesselIds.includes(vesselId);
  }

  get groupAssignedUserCount(): number {
    if (!this.editingGroupId) return 0;
    return this.userAccessRecords.filter(
      (user) => user.accessScope === 'groups' && user.groupIds.includes(this.editingGroupId),
    ).length;
  }

  get groupAddedVesselCount(): number {
    const existing = this.groupDefinitions.find((group) => group.id === this.editingGroupId);
    if (!existing) return this.groupForm.vesselIds.length;
    const before = new Set(existing.vesselIds);
    return this.groupForm.vesselIds.filter((id) => !before.has(id)).length;
  }

  get groupRemovedVesselCount(): number {
    const existing = this.groupDefinitions.find((group) => group.id === this.editingGroupId);
    if (!existing) return 0;
    const after = new Set(this.groupForm.vesselIds);
    return existing.vesselIds.filter((id) => !after.has(id)).length;
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

    if (
      this.editingGroupId &&
      this.groupAssignedUserCount > 0 &&
      (this.groupAddedVesselCount > 0 || this.groupRemovedVesselCount > 0) &&
      !window.confirm(
        `This group is assigned to ${this.groupAssignedUserCount} user(s). Saving will change group vessel access (+${this.groupAddedVesselCount} / -${this.groupRemovedVesselCount}). Continue?`,
      )
    )
      return;

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
          this.groupForm = {
            name: savedDefinition.name,
            description: savedDefinition.description,
            vesselIds: [...savedDefinition.vesselIds],
          };
          this.groupSaveNotice =
            target === 'database'
              ? existing
                ? 'Group updated in the database.'
                : 'Group created in the database.'
              : 'Database unavailable. Group saved in this browser as a fallback.';
          this.captureGroupEditorSnapshot();
          timer(450)
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => this.closeGroupDrawer(true));
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
      [profile.name, profile.manufacturer, profile.model, profile.engineType]
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
    const enteredName = this.manualEngineName.trim();
    if (!enteredName && !profile) {
      this.saveNotice = 'Enter an engine name or select a shared engine profile.';
      return;
    }

    const assignments = [...(this.form.engineAssignments || [])];
    const assignmentId = `engine-assignment-${Date.now().toString(36)}`;
    const position =
      enteredName || this.defaultEnginePosition(profile?.category || 'other', assignments.length);
    const displayName = position;
    const duplicatePosition = assignments.find(
      (assignment) =>
        this.normalizeEngineIdentity(assignment.position || assignment.displayName) ===
        this.normalizeEngineIdentity(position),
    );
    if (duplicatePosition) {
      this.saveNotice = `Engine position “${position}” already exists. Use a unique engine name/position before adding another engine.`;
      return;
    }

    this.form.engineAssignments = [
      ...assignments,
      {
        id: assignmentId,
        profileId: profile?.id || '',
        displayName,
        position,
        quantity: 1,
        source: 'manual',
      },
    ];

    this.selectedEngineProfileId = '';
    this.manualEngineName = '';
    this.expandedEngineAssignmentId = assignmentId;
    this.saveNotice = profile
      ? `${position} added with ${this.engineProfileDisplayName(profile)}. Save once when the setup is complete.`
      : `${position} added as a manual engine. A shared profile can be linked later if needed.`;
  }

  toggleEngineAssignmentEditor(assignment: VesselEngineAssignment): void {
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
    if (!this.isRealtimeAssignment(assignment)) return 'Manual';
    return this.engineProfileForAssignment(assignment) ? 'Connected' : 'Setup required';
  }

  engineAssignmentStatusIcon(assignment: VesselEngineAssignment): string {
    if (!this.isRealtimeAssignment(assignment)) return 'fa-pencil';
    return this.engineProfileForAssignment(assignment) ? 'fa-check-circle' : 'fa-exclamation-triangle';
  }

  engineProfileCategoryLabel(category: EngineProfileCategory): string {
    return (
      this.engineCategoryOptions.find((option) => option.value === category)?.label ||
      'Custom engine'
    );
  }

  engineProfileTypeLabel(profile: EngineProfileRecord): string {
    const customType = String(profile.engineType || '').trim();
    return customType || this.engineProfileCategoryLabel(profile.category);
  }

  removeEngineAssignment(id: string): void {
    this.form.engineAssignments = (this.form.engineAssignments || []).filter(
      (item) => item.id !== id,
    );
    if (this.expandedEngineAssignmentId === id) this.expandedEngineAssignmentId = '';
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

  onEngineAssignmentPositionChange(assignment: VesselEngineAssignment): void {
    assignment.displayName = assignment.position;
    assignment.quantity = 1;
  }

  onEngineAssignmentProfileChange(assignment: VesselEngineAssignment): void {
    const profile = this.engineProfileForAssignment(assignment);
    assignment.displayName = assignment.position;
    assignment.quantity = 1;
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
        return [this.engineProfileTypeLabel(profile), profile.manufacturer, profile.model]
          .map((value) => String(value || '').trim())
          .filter(Boolean)
          .join(' · ');
    }
  }

  openEngineLibrary(): void {
    this.engineLibraryOpen = true;
    this.engineProfileSaveNotice = '';
    this.engineProfileSearchTerm = '';
    this.captureEngineProfileEditorSnapshot();
    if (!this.engineProfiles.length) this.loadEngineProfiles();
  }

  closeEngineLibrary(force = false): void {
    if (this.engineProfileSaving) return;
    if (!force && this.isEngineProfileEditorDirty()) {
      const discard = window.confirm('This engine profile has unsaved changes. Discard them?');
      if (!discard) return;
    }
    this.engineLibraryOpen = false;
    this.editingEngineProfileId = '';
    this.engineProfileForm = this.emptyEngineProfileForm();
    this.engineProfileSaveNotice = '';
    this.engineTelemetryMappingOpen = false;
    this.engineProfileEditorSnapshot = '';
  }

  startNewEngineProfile(force = false): void {
    if (this.engineProfileSaving) return;
    if (!force && this.isEngineProfileEditorDirty()) {
      const discard = window.confirm('Discard the unsaved engine profile changes and start a new profile?');
      if (!discard) return;
    }
    this.editingEngineProfileId = '';
    this.engineProfileForm = this.emptyEngineProfileForm();
    this.engineProfileSaveNotice = '';
    this.engineTelemetryMappingOpen = false;
    this.captureEngineProfileEditorSnapshot();
  }

  editEngineProfile(profile: EngineProfileRecord): void {
    if (this.engineProfileSaving) return;
    if (
      profile.id !== this.editingEngineProfileId &&
      this.isEngineProfileEditorDirty() &&
      !window.confirm('Discard the unsaved engine profile changes and open another profile?')
    )
      return;
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
    this.captureEngineProfileEditorSnapshot();
  }

  duplicateEngineProfile(profile: EngineProfileRecord): void {
    if (this.engineProfileSaving) return;
    if (
      this.isEngineProfileEditorDirty() &&
      !window.confirm('Discard the unsaved engine profile changes and create a copy?')
    )
      return;
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
    // A duplicated profile is a new unsaved draft even before the user edits a field.
    this.engineProfileEditorSnapshot = '__unsaved-duplicate-profile__';
  }

  saveEngineProfile(): void {
    if (this.engineProfileSaving || this.isSavingVessel) return;

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
    const affectedVessels = this.editingEngineProfileId
      ? this.engineProfileUsageCount(this.editingEngineProfileId)
      : 0;
    if (
      affectedVessels > 0 &&
      !window.confirm(
        `This shared engine profile is used by ${affectedVessels} saved vessel(s). Save these shared changes now?`,
      )
    )
      return;

    const now = new Date().toISOString();
    const engineType = this.engineProfileForm.engineType.trim() || 'Other / Custom';
    const record: EngineProfileRecord = {
      ...this.engineProfileForm,
      id: this.editingEngineProfileId || this.engineProfileService.createProfileId(name),
      name,
      manufacturer: this.engineProfileForm.manufacturer.trim(),
      model: this.engineProfileForm.model.trim(),
      engineType,
      category: this.engineCategoryFromType(engineType),
      // These legacy specification fields remain in the persisted schema for backwards
      // compatibility, but are intentionally no longer exposed in the simplified UI.
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

    this.engineProfileSaving = true;
    this.engineProfileSaveNotice = 'Saving engine profile...';
    this.engineProfileService
      .saveProfile(record)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (target) => {
          this.engineProfileSaving = false;
          const savedRecord: EngineProfileRecord = {
            ...record,
            source: target === 'database' ? 'backend' : 'local',
          };
          const profileIndex = this.engineProfiles.findIndex((profile) => profile.id === record.id);
          this.engineProfiles =
            profileIndex >= 0
              ? this.engineProfiles.map((profile) =>
                  profile.id === savedRecord.id ? savedRecord : profile,
                )
              : [savedRecord, ...this.engineProfiles];

          this.editingEngineProfileId = savedRecord.id;
          if (!this.selectedEngineProfileId) this.selectedEngineProfileId = savedRecord.id;
          this.engineProfileForm = {
            ...savedRecord,
            telemetryMapping: { ...savedRecord.telemetryMapping },
          };
          this.engineProfileSaveNotice =
            target === 'database'
              ? 'Engine profile saved successfully.'
              : 'Database unavailable. Engine profile was saved in this browser as a fallback.';
          this.captureEngineProfileEditorSnapshot();
        },
        error: (error) => {
          this.engineProfileSaving = false;
          this.engineProfileSaveNotice = error?.message || 'Unable to save engine profile.';
        },
      });
  }

  deleteEngineProfile(profile: EngineProfileRecord): void {
    if (this.engineProfileSaving) return;
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
          if (this.editingEngineProfileId === profile.id) this.startNewEngineProfile(true);
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
    const existing = this.userAccessRecords.find((user) => user.id === this.editingUserAccessId);
    if (
      existing?.role === 'administrator' &&
      existing.status === 'active' &&
      this.userAccessActiveAdministratorCount <= 1 &&
      (this.userAccessForm.role !== 'administrator' || this.userAccessForm.status !== 'active')
    ) {
      return 'This is the last active administrator. Create or activate another administrator before changing this account.';
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
      if (!this.userAccessDatabaseEnabled) {
        return 'Enable the User Access database endpoint before creating a login account. Local-only permissions are not sufficient for account provisioning.';
      }
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

  private engineCategoryFromType(value: string): EngineProfileCategory {
    const normalized = value.trim().toLowerCase();
    if (normalized.includes('aux')) return 'auxiliary';
    if (normalized.includes('gen')) return 'generator';
    if (normalized.includes('main') || normalized.includes('propulsion')) return 'main';
    return 'other';
  }

  private emptyEngineProfileForm(): EngineProfileRecord {
    const now = new Date().toISOString();
    return {
      id: '',
      name: '',
      manufacturer: '',
      model: '',
      engineType: 'Main / Propulsion Engine',
      category: 'main',
      fuelType: '',
      ratedPowerKw: null,
      ratedRpm: null,
      cylinders: null,
      formulaPresetId: 'telemetry-only-v1',
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

  private selectedVesselGroupNames(): string[] {
    if (!this.groupDefinitions.length) {
      return Array.from(new Set(this.form.groups.map((name) => name.trim()).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b),
      );
    }
    const selectedIds = new Set(this.vesselGroupIds);
    return this.groupDefinitions
      .filter((group) => selectedIds.has(group.id))
      .map((group) => group.name)
      .sort((a, b) => a.localeCompare(b));
  }

  private buildVesselGroupUpdates(vesselId: string, previousId: string): VesselGroupDefinition[] {
    const selectedIds = new Set(this.vesselGroupIds);
    const updatedAt = new Date().toISOString();

    return this.groupDefinitions.flatMap((group) => {
      const before = new Set(group.vesselIds);
      const after = new Set(group.vesselIds);
      if (previousId && previousId !== vesselId) after.delete(previousId);
      after.delete(vesselId);
      if (selectedIds.has(group.id)) after.add(vesselId);

      const beforeIds = Array.from(before).sort();
      const afterIds = Array.from(after).sort();
      const changed =
        beforeIds.length !== afterIds.length || beforeIds.some((value, index) => value !== afterIds[index]);
      if (!changed) return [];

      return [
        {
          ...group,
          vesselIds: afterIds,
          updatedAt,
        },
      ];
    });
  }

  private cloneEngineAssignments(vessel: VesselSettingsRecord): VesselEngineAssignment[] {
    if (vessel.engineAssignments?.length) {
      return vessel.engineAssignments.map((assignment) => ({ ...assignment }));
    }
    return vessel.engines.map((name, index) => ({
      id: `legacy-${index + 1}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      profileId: '',
      displayName: name,
      position: name,
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
      return { ...assignment, profileId: match.id };
    });
    if (changed) {
      this.form.engineAssignments = assignments;
    }
  }

  private realtimePositionMatchesAssignment(
    position: RealtimeMachineryPosition,
    assignment: VesselEngineAssignment,
  ): boolean {
    if (assignment.realtimeKey && assignment.realtimeKey === position.key) return true;
    if (
      Number(assignment.realtimeRow) === position.row &&
      Number(assignment.realtimeCol) === position.col
    )
      return true;
    return (
      this.normalizeEngineIdentity(assignment.position || assignment.displayName) ===
      this.normalizeEngineIdentity(position.title)
    );
  }

  private normalizeEngineIdentity(value: string): string {
    return String(value || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
  }

  private duplicateEngineAssignmentLabel(assignments: VesselEngineAssignment[]): string {
    const seen = new Map<string, string>();
    for (const assignment of assignments) {
      const label = (assignment.position || assignment.displayName || '').trim();
      const key = this.normalizeEngineIdentity(label);
      if (!key) continue;
      if (seen.has(key)) return label || seen.get(key) || 'Engine';
      seen.set(key, label);
    }
    return '';
  }

  private captureUserAccessEditorSnapshot(): void {
    this.userAccessEditorSnapshot = JSON.stringify(this.userAccessEditorState());
  }

  private isUserAccessEditorDirty(): boolean {
    if (!this.userAccessDrawerOpen || !this.userAccessEditorSnapshot) return false;
    return (
      this.userAccessEditorSnapshot !== JSON.stringify(this.userAccessEditorState()) ||
      Boolean(this.userPassword || this.userPasswordConfirm || this.resetPassword || this.resetPasswordConfirm)
    );
  }

  private userAccessEditorState(): unknown {
    const { raw: _raw, ...form } = this.userAccessForm as UserAccessRecord & { raw?: unknown };
    return { form, setupMode: this.userAccountSetupMode };
  }

  private captureVesselEditorSnapshot(): void {
    this.vesselEditorSnapshot = JSON.stringify(this.vesselEditorState());
  }

  private isVesselEditorDirty(): boolean {
    if (!this.drawerOpen || !this.vesselEditorSnapshot) return false;
    return (
      this.vesselEditorSnapshot !== JSON.stringify(this.vesselEditorState()) ||
      (this.engineLibraryOpen && this.isEngineProfileEditorDirty())
    );
  }

  private vesselEditorState(): unknown {
    const { raw: _raw, ...form } = this.form;
    return {
      form,
      draftEngine: {
        profileId: this.selectedEngineProfileId,
        name: this.manualEngineName,
      },
    };
  }

  private captureGroupEditorSnapshot(): void {
    this.groupEditorSnapshot = JSON.stringify(this.groupForm);
  }

  private isGroupEditorDirty(): boolean {
    return Boolean(
      this.groupDrawerOpen &&
        this.groupEditorSnapshot &&
        this.groupEditorSnapshot !== JSON.stringify(this.groupForm),
    );
  }

  private captureEngineProfileEditorSnapshot(): void {
    this.engineProfileEditorSnapshot = JSON.stringify({
      editingId: this.editingEngineProfileId,
      form: this.engineProfileForm,
    });
  }

  private isEngineProfileEditorDirty(): boolean {
    if (!this.engineLibraryOpen || !this.engineProfileEditorSnapshot) return false;
    return (
      this.engineProfileEditorSnapshot !==
      JSON.stringify({ editingId: this.editingEngineProfileId, form: this.engineProfileForm })
    );
  }


  private syncSettingsDrawerDocumentState(forceOpen?: boolean): void {
    if (typeof document === 'undefined' || !document.body) return;

    const open =
      forceOpen ?? (this.userAccessDrawerOpen || this.groupDrawerOpen || this.drawerOpen);

    document.documentElement?.classList.toggle('fv-settings-drawer-open', open);
    document.body.classList.toggle('fv-settings-drawer-open', open);
  }

  private closeOpenEditorsForNavigation(): void {
    if (this.userAccessDrawerOpen) this.closeUserAccessDrawer(true);
    if (this.groupDrawerOpen) this.closeGroupDrawer(true);
    if (this.drawerOpen) this.closeDrawer(true);
    else if (this.engineLibraryOpen) this.closeEngineLibrary(true);
  }

  private hasUnsavedChanges(): boolean {
    return (
      this.isUserAccessEditorDirty() ||
      this.isGroupEditorDirty() ||
      this.isVesselEditorDirty() ||
      this.isEngineProfileEditorDirty()
    );
  }

  private normalizedEngineAssignments(): VesselEngineAssignment[] {
    return (this.form.engineAssignments || [])
      .filter(
        (assignment) => assignment.profileId || assignment.position.trim() || assignment.displayName.trim(),
      )
      .map((assignment, index) => {
        const profile = this.engineProfileForAssignment(assignment);
        return {
          id: assignment.id || `engine-assignment-${index + 1}`,
          profileId: assignment.profileId,
          displayName:
            assignment.displayName.trim() || assignment.position.trim() || profile?.name || `Engine ${index + 1}`,
          position: assignment.position.trim() || assignment.displayName.trim() || `Engine ${index + 1}`,
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
      engineSyncMode: 'manual',
      status: 'unknown',
      source: 'local',
    };
  }
}