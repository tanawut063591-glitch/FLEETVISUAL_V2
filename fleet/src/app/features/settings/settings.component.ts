import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, Subscription, takeUntil, timer } from 'rxjs';

import {
  UserPresenceStatus,
  UserSessionRecord,
  VesselGroupRecord,
  VesselSettingsRecord,
  VesselSettingsStatus,
} from '../../shared/models/settings.model';
import { SettingsDataService } from '../../shared/services/settings-data.service';
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
  readonly defaultGroupOptions = ['Offshore', 'Supply', 'Tug Boat', 'Charter', 'Survey', 'Other'];
  readonly nationalityOptions = ['Thailand', 'Singapore', 'Indonesia', 'Malaysia', 'Vietnam', 'Other'];
  readonly landingPageOptions: Array<{ value: LandingPage; label: string }> = [
    { value: 'overview', label: 'Overview' },
    { value: 'realtime', label: 'Realtime' },
    { value: 'data-logger', label: 'Data Logger' },
    { value: 'chart', label: 'Chart' },
    { value: 'diagram', label: 'Diagram' },
    { value: 'alerts', label: 'Alarm Center' },
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

  userSessions: UserSessionRecord[] = [];
  usersLoading = false;
  usersRefreshing = false;
  usersError = '';
  userSearchTerm = '';
  userStatusFilter: 'all' | UserPresenceStatus = 'all';

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
  newEngine = '';
  saveNotice = '';

  theme: ThemeMode = 'light';
  defaultLandingPage: LandingPage = 'overview';
  alertRefreshSeconds = 20;
  alarmAutoRefresh = true;
  presenceRefreshSeconds = 20;
  timeFormat: ClockFormat = '24h';
  username = 'Admin';

  private readonly destroy$ = new Subject<void>();
  private presenceRefreshSub?: Subscription;
  private filteredCacheSource?: VesselSettingsRecord[];
  private filteredCacheKey = '';
  private filteredCache: VesselSettingsRecord[] = [];
  private derivedCacheSource?: VesselSettingsRecord[];
  private derivedGroupDefinitionsSource?: VesselGroupDefinition[];
  private onlineCountCache = 0;
  private idleCountCache = 0;
  private offlineCountCache = 0;
  private groupSummaryCache: VesselGroupSummary[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private settingsData: SettingsDataService,
    private themeMode: ThemeModeService,
  ) {}

  ngOnInit(): void {
    this.username = localStorage.getItem('username') || sessionStorage.getItem('username') || 'Admin';
    this.groupDefinitions = [];
    this.theme = this.themeMode.getMode();
    this.defaultLandingPage = this.readLandingPage(localStorage.getItem('fleet-default-landing-page'));
    this.alertRefreshSeconds = Number(localStorage.getItem('fleet-alert-refresh-seconds')) || 20;
    this.alarmAutoRefresh = localStorage.getItem('fleet-alert-auto-refresh') !== 'false';
    this.presenceRefreshSeconds =
      Number(localStorage.getItem('fleet-user-presence-refresh-seconds')) || 20;
    this.timeFormat = localStorage.getItem('fleet-time-format') === '12h' ? '12h' : '24h';

    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const section = params.get('section');
      this.activeTab = this.isTab(section) ? section : 'general';

      if (this.activeTab === 'vessels' || this.activeTab === 'groups') {
        this.loadGroups();
        this.loadVessels();
      }
      if (this.activeTab === 'users') {
        this.loadUserSessions();
        this.restartPresenceRefresh();
      } else {
        this.presenceRefreshSub?.unsubscribe();
      }
    });
  }

  ngOnDestroy(): void {
    this.presenceRefreshSub?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
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

  get filteredUsers(): UserSessionRecord[] {
    const search = this.userSearchTerm.trim().toLowerCase();
    return this.userSessions.filter((user) => {
      if (this.userStatusFilter !== 'all' && user.status !== this.userStatusFilter) return false;
      if (!search) return true;
      return [
        user.username,
        user.displayName,
        user.role,
        user.status,
        user.ipAddress,
        user.device,
        user.browser,
      ]
        .join(' ')
        .toLowerCase()
        .includes(search);
    });
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

  get groupOptions(): string[] {
    const names = new Set<string>(this.defaultGroupOptions);
    this.groupDefinitions.forEach((group) => names.add(group.name));
    this.vessels.forEach((vessel) => vessel.groups.forEach((group) => names.add(group)));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }

  get groupVesselOptions(): VesselSettingsRecord[] {
    const search = this.groupVesselSearchTerm.trim().toLowerCase();
    if (!search) return this.vessels;
    return this.vessels.filter((vessel) =>
      [vessel.name, vessel.prefix, vessel.status].join(' ').toLowerCase().includes(search),
    );
  }

  get userOnlineCount(): number {
    return this.userSessions.filter((user) => user.status === 'online').length;
  }

  get userIdleCount(): number {
    return this.userSessions.filter((user) => user.status === 'idle').length;
  }

  get userOfflineCount(): number {
    return this.userSessions.filter((user) => user.status === 'offline').length;
  }

  get userPresenceIsBackend(): boolean {
    return this.userSessions.some((user) => user.source === 'backend');
  }

  selectTab(tab: SettingsTab['id']): void {
    this.activeTab = tab;
    this.router.navigate(tab === 'general' ? ['/main/settings'] : ['/main/settings', tab]);
  }

  loadVessels(force = false): void {
    if (this.vessels.length > 0 && !force) return;

    const firstLoad = this.vessels.length === 0;
    this.loading = firstLoad;
    this.refreshing = !firstLoad;
    this.errorMessage = '';
    this.settingsData
      .getVessels(force)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rows) => {
          this.vessels = rows;
          this.loading = false;
          this.refreshing = false;
          this.page = Math.min(this.page, this.totalPages);
        },
        error: (error) => {
          this.loading = false;
          this.refreshing = false;
          this.errorMessage = error?.message || 'Unable to load vessel settings.';
        },
      });
  }

  loadGroups(force = false): void {
    this.settingsData
      .getVesselGroups(force)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (groups) => {
          this.groupDefinitions = groups;
          this.derivedGroupDefinitionsSource = undefined;
        },
        error: (error) => {
          console.warn('[SettingsComponent] load vessel groups error:', error);
        },
      });
  }

  loadUserSessions(force = false): void {
    const firstLoad = this.userSessions.length === 0;
    this.usersLoading = firstLoad;
    this.usersRefreshing = !firstLoad;
    this.usersError = '';
    this.settingsData
      .getUserSessions(force)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rows) => {
          this.userSessions = rows;
          this.usersLoading = false;
          this.usersRefreshing = false;
        },
        error: (error) => {
          this.usersLoading = false;
          this.usersRefreshing = false;
          this.usersError = error?.message || 'Unable to load active user sessions.';
        },
      });
  }

  openAdd(): void {
    this.editingId = '';
    this.form = this.emptyForm();
    this.drawerOpen = true;
    this.saveNotice = '';
  }

  openEdit(vessel: VesselSettingsRecord): void {
    this.editingId = vessel.id;
    this.form = { ...vessel, groups: this.getVesselGroups(vessel), engines: [...vessel.engines] };
    this.drawerOpen = true;
    this.saveNotice = '';
  }

  closeDrawer(): void {
    this.drawerOpen = false;
  }

  saveVessel(): void {
    const id = this.form.id.trim();
    const name = this.form.name.trim();
    const prefix = this.form.prefix.trim();
    if (!id || !name || !prefix) {
      this.saveNotice = 'Vessel ID, name and prefix are required.';
      return;
    }

    this.syncDefinitionMembership(id, this.form.groups);
    const record: VesselSettingsRecord = {
      ...this.form,
      id,
      name,
      prefix,
      groups: Array.from(new Set(this.form.groups)),
      source: this.editingId ? this.form.source : 'local',
    };

    this.saveNotice = 'Saving vessel data...';
    this.settingsData
      .saveVessel(record)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (target) => {
          this.saveNotice = target === 'database'
            ? 'Vessel saved to the local SQLite database.'
            : 'Database unavailable. Vessel saved in this browser as a fallback.';
          this.loadGroups(true);
          this.loadVessels(true);
          window.setTimeout(() => (this.drawerOpen = false), 550);
        },
        error: (error) => {
          this.saveNotice = error?.message || 'Unable to save vessel.';
        },
      });
  }

  deleteVessel(vessel: VesselSettingsRecord): void {
    if (!window.confirm(`Remove saved metadata for ${vessel.name}? Telemetry data will not be deleted.`)) return;
    this.settingsData
      .deleteVessel(vessel.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadGroups(true);
          this.loadVessels(true);
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
      (group) => group.id !== this.editingGroupId && group.name.toLowerCase() === name.toLowerCase(),
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
          this.groupDefinitions = existing
            ? this.groupDefinitions.map((group) => (group.id === existing.id ? definition : group))
            : [...this.groupDefinitions, definition];
          this.derivedGroupDefinitionsSource = undefined;
          this.groupSaveNotice = target === 'database'
            ? existing ? 'Group updated in the database.' : 'Group created in the database.'
            : 'Database unavailable. Group saved in this browser as a fallback.';
          this.loadGroups(true);
          this.loadVessels(true);
          window.setTimeout(() => this.closeGroupDrawer(), 450);
        },
        error: (error) => {
          this.groupSaveNotice = error?.message || 'Unable to save group.';
        },
      });
  }

  deleteGroup(group: VesselGroupSummary): void {
    if (!group.editable) return;
    if (!window.confirm(`Delete the group ${group.name}? Vessel records will not be deleted.`)) return;
    this.settingsData
      .deleteVesselGroup(group.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.groupDefinitions = this.groupDefinitions.filter((item) => item.id !== group.id);
          this.derivedGroupDefinitionsSource = undefined;
          this.loadGroups(true);
          this.loadVessels(true);
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

  groupVesselNames(group: VesselGroupSummary): string {
    const names = group.vesselIds
      .map((id) => this.vessels.find((vessel) => vessel.id === id)?.name)
      .filter((name): name is string => !!name);
    if (!names.length) return 'No vessels assigned';
    const preview = names.slice(0, 3).join(', ');
    return names.length > 3 ? `${preview} +${names.length - 3}` : preview;
  }

  toggleGroup(group: string, checked: boolean): void {
    this.form.groups = checked
      ? Array.from(new Set([...this.form.groups, group]))
      : this.form.groups.filter((item) => item !== group);
  }

  addEngine(): void {
    const engine = this.newEngine.trim();
    if (!engine) return;
    this.form.engines = [...this.form.engines, engine];
    this.newEngine = '';
  }

  removeEngine(index: number): void {
    this.form.engines = this.form.engines.filter((_, itemIndex) => itemIndex !== index);
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
    this.alertRefreshSeconds = this.clampSeconds(this.alertRefreshSeconds, 20);
    this.presenceRefreshSeconds = this.clampSeconds(this.presenceRefreshSeconds, 20);

    localStorage.setItem('fleet-default-landing-page', this.defaultLandingPage);
    localStorage.setItem('fleet-alert-refresh-seconds', String(this.alertRefreshSeconds));
    localStorage.setItem('fleet-alert-auto-refresh', String(this.alarmAutoRefresh));
    this.saveNotice = 'General preferences saved.';
    if (this.activeTab === 'users') this.restartPresenceRefresh();
  }

  goToPage(page: number): void {
    this.page = Math.max(1, Math.min(this.totalPages, page));
  }

  statusLabel(status: VesselSettingsStatus | UserPresenceStatus): string {
    if (status === 'online') return 'Online';
    if (status === 'idle') return 'Idle';
    if (status === 'offline') return 'Offline';
    return 'No Data';
  }


  formatDateTime(value?: string): string {
    if (!value) return '—';
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '—';
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: this.timeFormat === '12h',
    }).format(date);
  }

  userDevice(user: UserSessionRecord): string {
    return user.device || (user.browser ? 'Web browser' : '—');
  }

  trackByVessel(_: number, vessel: VesselSettingsRecord): string {
    return vessel.id;
  }

  trackByUser(_: number, user: UserSessionRecord): string {
    return user.id;
  }

  trackByGroup(_: number, group: VesselGroupSummary): string {
    return group.id;
  }

  private restartPresenceRefresh(): void {
    this.presenceRefreshSub?.unsubscribe();
    if (this.activeTab !== 'users') return;
    const seconds = this.clampSeconds(this.presenceRefreshSeconds, 20);
    this.presenceRefreshSub = timer(seconds * 1000, seconds * 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadUserSessions(true));
  }

  private ensureVesselDerivatives(): void {
    if (
      this.derivedCacheSource === this.vessels &&
      this.derivedGroupDefinitionsSource === this.groupDefinitions
    ) {
      return;
    }

    const counts = new Map<string, { vesselIds: Set<string>; editable: boolean; id: string; description: string }>();
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
    })).sort((a, b) => Number(b.editable) - Number(a.editable) || b.count - a.count || a.name.localeCompare(b.name));

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

  private syncDefinitionMembership(vesselId: string, selectedGroupNames: string[]): void {
    const selected = new Set(selectedGroupNames.map((name) => name.toLowerCase()));
    let changed = false;
    this.groupDefinitions = this.groupDefinitions.map((group) => {
      const shouldInclude = selected.has(group.name.toLowerCase());
      const currentlyIncluded = group.vesselIds.includes(vesselId);
      if (shouldInclude === currentlyIncluded) return group;
      changed = true;
      return {
        ...group,
        vesselIds: shouldInclude
          ? Array.from(new Set([...group.vesselIds, vesselId]))
          : group.vesselIds.filter((id) => id !== vesselId),
      };
    });
    if (changed) this.derivedGroupDefinitionsSource = undefined;
  }


  private createGroupId(name: string): string {
    return `${this.groupSlug(name)}-${Date.now().toString(36)}`;
  }

  private groupSlug(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'group';
  }

  private clampSeconds(value: number, fallback: number): number {
    const number = Number(value);
    return Math.min(300, Math.max(10, Number.isFinite(number) ? number : fallback));
  }

  private readLandingPage(value: string | null): LandingPage {
    return this.landingPageOptions.some((option) => option.value === value)
      ? (value as LandingPage)
      : 'overview';
  }

  private isTab(value: string | null): value is SettingsTab['id'] {
    return value === 'general' || value === 'users' || value === 'vessels' || value === 'groups';
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
      status: 'unknown',
      source: 'local',
    };
  }
}
