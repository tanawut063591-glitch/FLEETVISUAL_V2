import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { VesselSettingsRecord } from '../../shared/models/settings.model';
import { SettingsDataService } from '../../shared/services/settings-data.service';
import { ThemeMode, ThemeModeService } from '../../shared/services/theme-mode.service';

interface SettingsTab {
  id: 'general' | 'users' | 'vessels' | 'groups';
  label: string;
  icon: string;
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
  readonly groupOptions = ['Offshore', 'Supply', 'Tug Boat', 'Charter', 'Survey', 'Other'];
  readonly nationalityOptions = ['Thailand', 'Singapore', 'Indonesia', 'Malaysia', 'Vietnam', 'Other'];

  activeTab: SettingsTab['id'] = 'vessels';
  vessels: VesselSettingsRecord[] = [];
  loading = false;
  refreshing = false;
  errorMessage = '';
  searchTerm = '';
  page = 1;
  pageSize = 10;
  drawerOpen = false;
  editingId = '';
  form = this.emptyForm();
  newEngine = '';
  saveNotice = '';
  theme: ThemeMode = 'light';
  alertRefreshSeconds = 20;
  username = 'Admin';

  private readonly destroy$ = new Subject<void>();
  private filteredCacheSource?: VesselSettingsRecord[];
  private filteredCacheTerm = '';
  private filteredCache: VesselSettingsRecord[] = [];
  private derivedCacheSource?: VesselSettingsRecord[];
  private onlineCountCache = 0;
  private offlineCountCache = 0;
  private groupSummaryCache: Array<{ name: string; count: number }> = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private settingsData: SettingsDataService,
    private themeMode: ThemeModeService
  ) {}

  ngOnInit(): void {
    this.username = localStorage.getItem('username') || sessionStorage.getItem('username') || 'Admin';
    this.theme = this.themeMode.getMode();
    this.alertRefreshSeconds = Number(localStorage.getItem('fleet-alert-refresh-seconds')) || 20;

    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const section = params.get('section');
      this.activeTab = this.isTab(section) ? section : 'general';
      if (this.activeTab === 'vessels' || this.activeTab === 'groups') this.loadVessels();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get filteredVessels(): VesselSettingsRecord[] {
    const search = this.searchTerm.trim().toLowerCase();
    if (this.filteredCacheSource === this.vessels && this.filteredCacheTerm === search) {
      return this.filteredCache;
    }

    this.filteredCache = !search
      ? this.vessels
      : this.vessels.filter((row) =>
          [row.id, row.name, row.prefix, row.nationality, row.customer, row.owner, row.agency, row.groups.join(' ')]
            .join(' ')
            .toLowerCase()
            .includes(search)
        );
    this.filteredCacheSource = this.vessels;
    this.filteredCacheTerm = search;
    return this.filteredCache;
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

  get offlineCount(): number {
    this.ensureVesselDerivatives();
    return this.offlineCountCache;
  }

  get groupSummary(): Array<{ name: string; count: number }> {
    this.ensureVesselDerivatives();
    return this.groupSummaryCache;
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
    this.settingsData.getVessels(force).pipe(takeUntil(this.destroy$)).subscribe({
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

  openAdd(): void {
    this.editingId = '';
    this.form = this.emptyForm();
    this.drawerOpen = true;
    this.saveNotice = '';
  }

  openEdit(vessel: VesselSettingsRecord): void {
    this.editingId = vessel.id;
    this.form = { ...vessel, groups: [...vessel.groups], engines: [...vessel.engines] };
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

    this.settingsData.saveVessel({
      ...this.form,
      id,
      name,
      prefix,
      source: this.editingId ? this.form.source : 'local',
    });
    this.saveNotice = 'Vessel saved in the local settings workspace.';
    this.loadVessels();
    window.setTimeout(() => (this.drawerOpen = false), 450);
  }

  deleteVessel(vessel: VesselSettingsRecord): void {
    if (!window.confirm(`Remove ${vessel.name} from this settings workspace?`)) return;
    this.settingsData.deleteVessel(vessel.id);
    this.loadVessels();
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
    const seconds = Math.min(300, Math.max(10, Number(this.alertRefreshSeconds) || 20));
    this.alertRefreshSeconds = seconds;
    localStorage.setItem('fleet-alert-refresh-seconds', String(seconds));
    this.saveNotice = 'General preferences saved.';
  }

  goToPage(page: number): void {
    this.page = Math.max(1, Math.min(this.totalPages, page));
  }

  trackByVessel(_: number, vessel: VesselSettingsRecord): string {
    return vessel.id;
  }

  private ensureVesselDerivatives(): void {
    if (this.derivedCacheSource === this.vessels) return;

    const counts = new Map<string, number>();
    let online = 0;
    let offline = 0;

    for (const vessel of this.vessels) {
      if (vessel.status === 'online') online += 1;
      if (vessel.status === 'offline') offline += 1;
      const groups = vessel.groups.length ? vessel.groups : ['Ungrouped'];
      groups.forEach((group) => counts.set(group, (counts.get(group) || 0) + 1));
    }

    this.onlineCountCache = online;
    this.offlineCountCache = offline;
    this.groupSummaryCache = Array.from(counts, ([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    this.derivedCacheSource = this.vessels;
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
