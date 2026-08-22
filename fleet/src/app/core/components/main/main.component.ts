import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

import { CoordinatesService } from '../../../shared/services/coordinate.service';
import { FvTimeService } from '../../../shared/services/fv-time.service';
import { FvInfoService } from '../../../shared/services/fv-info.service';
import { FvOverviewService } from '../../../shared/services/fv-overview.service';
import { FvRealtimeService } from '../../../shared/services/fv-realtime.service';
import { FleetVesselDataService } from '../../../shared/services/fleet-vessel-data.service';
import { VesselPopupService } from '../../../shared/services/vessel-popup.service';
import { UserPresenceService } from '../../../shared/services/user-presence.service';
import { UserAccessControlService } from '../../../shared/services/user-access-control.service';
import { AuthService } from '../../../shared/services/auth.service';
import { FleetModuleKey } from '../../../shared/models/settings.model';

import { Animaions } from './main.animation';

interface VesselLike {
  id?: string | number;
  _id?: string | number;
  vesselId?: string | number;
  shipId?: string | number;
  prefix?: string;
  name?: string;
  vesselName?: string;
  fv?: VesselLike;
  fvInfo?: VesselLike;
}

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css'],
  animations: [Animaions.routeAnimation],
  standalone: false,
})
export class MainComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('contentViewport', { static: true })
  private contentViewport?: ElementRef<HTMLElement>;

  activeOffCanvas = false;
  showSidebar = true;
  isOverviewRoute = false;

  vessels: VesselLike[] = [];
  selectedVessel: VesselLike | null = null;

  private readonly destroy$ = new Subject<void>();
  private readonly defaultRealtimeInterval = 5_000;
  private readonly minimumRealtimeInterval = 5_000;
  private readonly sidebarRefreshInterval = 60_000;
  private readonly fvInfoRefreshInterval = 60_000;
  private readonly overviewRefreshInterval = 30_000;
  private readonly reportRefreshInterval = 60_000;
  private readonly liveRoutePattern = /\/main\/(realtime|diagram|report)(?:\/|$)/;
  private readonly overviewRoutePattern = /\/main\/overview(?:\/|$)/;
  private readonly layoutRoutePattern = /\/main\/(overview|realtime|diagram|chart|report)(?:\/|$)/;

  private refreshTimer = this.defaultRealtimeInterval;
  private accessReady = false;
  private vesselsReady = false;
  private fvInfoStarted = false;
  private overviewStarted = false;
  private realtimeStarted = false;
  private layoutSettleTimer: ReturnType<typeof setTimeout> | null = null;
  private scrollResetTimer: ReturnType<typeof setTimeout> | null = null;
  private layoutFrameOne: number | null = null;
  private layoutFrameTwo: number | null = null;
  private scrollFrameOne: number | null = null;
  private scrollFrameTwo: number | null = null;
  private lastPublishedVesselKey = '';

  constructor(
    public fvTimeService: FvTimeService,
    public coordinatesService: CoordinatesService,
    private router: Router,
    private route: ActivatedRoute,
    private fvInfoService: FvInfoService,
    private fvOverviewService: FvOverviewService,
    private fvRealtimeService: FvRealtimeService,
    private vesselData: FleetVesselDataService,
    private vesselPopup: VesselPopupService,
    private userPresence: UserPresenceService,
    private userAccess: UserAccessControlService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.refreshTimer = this.resolveRealtimeInterval(this.route.snapshot.data['timer']);

    this.userPresence.start();
    this.watchActiveVesselSelection();
    this.updateLayout(this.router.url);

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntil(this.destroy$),
      )
      .subscribe((event: NavigationEnd) => {
        this.applyRouteState(event.urlAfterRedirects || event.url);
      });

    this.userAccess
      .refreshCurrentAccess()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (access) => {
          if (access?.status === 'suspended' || !this.userAccess.hasAnyModuleAccess()) {
            this.handleUnauthorizedAccess();
            return;
          }

          this.accessReady = true;

          const currentModule = this.moduleFromUrl(this.router.url);
          const moduleAllowed =
            !currentModule ||
            (currentModule === 'settings'
              ? this.userAccess.canManageModule('settings')
              : this.userAccess.canAccessModule(currentModule));

          this.loadSidebarVessels();

          if (!moduleAllowed) {
            void this.router.navigateByUrl(this.userAccess.firstAllowedRoute());
            return;
          }

          this.applyRouteState(this.router.url);
        },
        error: (error) => {
          console.error('[MainComponent] access check failed:', error);
          this.accessReady = false;
          this.vesselsReady = false;
          this.vessels = [];
          this.selectedVessel = null;
          this.stopAllDataServices();
        },
      });
  }

  ngAfterViewInit(): void {
    if (this.layoutRoutePattern.test(this.router.url)) {
      this.scheduleLayoutSettle();
    }
  }

  ngOnDestroy(): void {
    this.stopAllDataServices();
    this.userPresence.stop();
    this.clearLayoutWork();
    this.clearScrollWork();
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggle(): void {
    this.activeOffCanvas = !this.activeOffCanvas;
  }

  onSelectVessel(vessel: VesselLike): void {
    if (!vessel) {
      return;
    }

    const previousKey = this.normalizeVesselIdentity(this.selectedVessel);
    const nextKey = this.normalizeVesselIdentity(vessel);

    this.selectedVessel = vessel;
    this.activeOffCanvas = false;
    this.persistSelectedVessel(vessel);

    if (nextKey && (nextKey !== previousKey || nextKey !== this.lastPublishedVesselKey)) {
      this.fvRealtimeService.setActiveVessel(vessel);
      this.lastPublishedVesselKey = nextKey;
    }

    this.vesselPopup.openPopup(vessel);

    if (/\/main\/(realtime|diagram)(?:\/|$)/.test(this.router.url)) {
      this.scheduleContentScrollReset();
    }

    if (this.router.url.includes('/main/past-track')) {
      const routeId = this.getVesselRouteId(vessel);
      if (routeId) {
        void this.router.navigate(['/main/past-track', routeId]);
      }
    }
  }

  getDepth(outlet: any): number {
    return outlet?.activatedRouteData?.['depth'] || 0;
  }

  private resolveRealtimeInterval(value: unknown): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return this.defaultRealtimeInterval;
    }
    return Math.max(parsed, this.minimumRealtimeInterval);
  }

  private getVesselRouteId(vessel: VesselLike): string {
    return String(
      vessel?.prefix ||
        vessel?.fv?.prefix ||
        vessel?.fvInfo?.prefix ||
        vessel?.id ||
        vessel?._id ||
        vessel?.vesselId ||
        vessel?.fv?.id ||
        vessel?.fvInfo?.id ||
        vessel?.name ||
        '',
    ).trim();
  }

  private loadSidebarVessels(): void {
    this.vesselsReady = false;

    this.vesselData
      .getSidebarVessels(this.sidebarRefreshInterval)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rows) => {
          this.vessels = Array.isArray(rows) ? (rows as VesselLike[]) : [];

          const selectedMatch = this.findMatchingVessel(this.selectedVessel, this.vessels);

          if (selectedMatch) {
            this.selectedVessel = selectedMatch;
            this.publishSelectedVesselIfNeeded(selectedMatch);
          } else if (this.vessels.length > 0) {
            this.selectedVessel = this.vessels[0];
            this.persistSelectedVessel(this.selectedVessel);
            this.publishSelectedVesselIfNeeded(this.selectedVessel);
          } else {
            this.selectedVessel = null;
            this.lastPublishedVesselKey = '';
          }

          this.vesselsReady = true;
          this.fvOverviewService.setVessels(this.vessels);
          this.applyRouteState(this.router.url);
        },
        error: (error) => {
          console.warn('[MainComponent] loadSidebarVessels error:', error);
          this.vessels = [];
          this.selectedVessel = null;
          this.vesselsReady = false;
          this.stopAllDataServices();
        },
      });
  }

  private publishSelectedVesselIfNeeded(vessel: VesselLike): void {
    const selectedKey = this.normalizeVesselIdentity(vessel);
    if (!selectedKey || selectedKey === this.lastPublishedVesselKey) {
      return;
    }

    this.fvRealtimeService.setActiveVessel(vessel);
    this.lastPublishedVesselKey = selectedKey;
  }

  private persistSelectedVessel(vessel: VesselLike): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const serialized = JSON.stringify(vessel);
      window.localStorage.setItem('selectedVessel', serialized);
      window.localStorage.setItem('realtimeVessel', serialized);
      window.localStorage.setItem('pastTrackVessel', serialized);
    } catch {}
  }

  private watchActiveVesselSelection(): void {
    this.fvRealtimeService.activeVessel$
      .pipe(takeUntil(this.destroy$))
      .subscribe((vessel: VesselLike | null) => {
        if (!vessel) {
          return;
        }

        const matchingVessel = this.findMatchingVessel(vessel, this.vessels);
        if (this.vessels.length > 0 && !matchingVessel) {
          return;
        }

        const match = matchingVessel || vessel;
        const nextKey = this.normalizeVesselIdentity(match);
        const currentKey = this.normalizeVesselIdentity(this.selectedVessel);

        if (nextKey) {
          this.lastPublishedVesselKey = nextKey;
        }

        if (nextKey && nextKey !== currentKey) {
          this.selectedVessel = match;
        }
      });
  }

  private findMatchingVessel(target: VesselLike | null, rows: VesselLike[]): VesselLike | null {
    if (!target || !Array.isArray(rows) || rows.length === 0) {
      return null;
    }

    const targetKeys = this.collectVesselIdentities(target);
    if (targetKeys.size === 0) {
      return null;
    }

    return (
      rows.find((row) => {
        const rowKeys = this.collectVesselIdentities(row);
        return Array.from(targetKeys).some((key) => rowKeys.has(key));
      }) || null
    );
  }

  private collectVesselIdentities(vessel: VesselLike): Set<string> {
    const sources: Array<VesselLike | undefined> = [vessel, vessel?.fv, vessel?.fvInfo];
    const values: unknown[] = [];

    for (const source of sources) {
      if (!source) {
        continue;
      }

      values.push(
        source.id,
        source._id,
        source.vesselId,
        source.shipId,
        source.prefix,
        source.name,
        source.vesselName,
      );
    }

    return new Set(
      values.map((value) => this.normalizeIdentityPart(value)).filter((value) => value.length > 0),
    );
  }

  private normalizeVesselIdentity(vessel: VesselLike | null): string {
    if (!vessel) {
      return '';
    }
    return Array.from(this.collectVesselIdentities(vessel))[0] || '';
  }

  private normalizeIdentityPart(value: unknown): string {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  private applyRouteState(url: string): void {
    this.updateLayout(url);

    if (this.accessReady && this.vesselsReady) {
      this.syncRouteServices(url);
    } else {
      this.stopAllDataServices();
    }

    if (url.includes('/main/')) {
      this.scheduleContentScrollReset();
    }

    if (this.layoutRoutePattern.test(url)) {
      this.scheduleLayoutSettle();
    }
  }

  private syncRouteServices(url: string): void {
    const needsOverview = this.overviewRoutePattern.test(url);
    const needsLiveServices = this.liveRoutePattern.test(url);

    if (needsOverview) {
      this.stopLiveServices();
      this.fvOverviewService.ensureStarted(this.overviewRefreshInterval);
      this.overviewStarted = true;
      this.fvOverviewService.setVessels(this.vessels);
      return;
    }

    this.stopOverviewService();

    if (!needsLiveServices) {
      this.stopLiveServices();
      return;
    }

    const isLiveReport = /\/main\/report(?:\/|$)/.test(url);
    const realtimeInterval = isLiveReport ? this.reportRefreshInterval : this.refreshTimer;

    this.fvInfoService.ensureStarted(this.fvInfoRefreshInterval);
    this.fvInfoStarted = true;

    this.fvRealtimeService.ensureStarted(realtimeInterval);
    this.realtimeStarted = true;
  }

  private stopOverviewService(): void {
    if (!this.overviewStarted) {
      return;
    }
    this.fvOverviewService.stop();
    this.overviewStarted = false;
  }

  private stopLiveServices(): void {
    if (this.fvInfoStarted) {
      this.fvInfoService.stop();
      this.fvInfoStarted = false;
    }

    if (this.realtimeStarted) {
      this.fvRealtimeService.stop();
      this.realtimeStarted = false;
    }
  }

  private stopAllDataServices(): void {
    this.stopOverviewService();
    this.stopLiveServices();
  }

  private scheduleContentScrollReset(): void {
    if (typeof window === 'undefined') {
      return;
    }

    this.clearScrollWork();

    const reset = (): void => {
      const viewport = this.contentViewport?.nativeElement;
      if (!viewport) {
        return;
      }
      viewport.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    };

    this.scrollFrameOne = window.requestAnimationFrame(() => {
      this.scrollFrameTwo = window.requestAnimationFrame(reset);
    });

    this.scrollResetTimer = setTimeout(() => {
      reset();
      this.scrollResetTimer = null;
    }, 180);
  }

  private scheduleLayoutSettle(): void {
    if (typeof window === 'undefined') {
      return;
    }

    this.clearLayoutWork();

    const notify = (): void => {
      window.dispatchEvent(new Event('resize'));
    };

    this.layoutFrameOne = window.requestAnimationFrame(() => {
      this.layoutFrameTwo = window.requestAnimationFrame(notify);
    });

    this.layoutSettleTimer = setTimeout(() => {
      notify();
      this.layoutSettleTimer = null;
    }, 350);
  }

  private clearScrollWork(): void {
    if (typeof window !== 'undefined') {
      if (this.scrollFrameOne !== null) {
        window.cancelAnimationFrame(this.scrollFrameOne);
      }
      if (this.scrollFrameTwo !== null) {
        window.cancelAnimationFrame(this.scrollFrameTwo);
      }
    }

    this.scrollFrameOne = null;
    this.scrollFrameTwo = null;

    if (this.scrollResetTimer !== null) {
      clearTimeout(this.scrollResetTimer);
      this.scrollResetTimer = null;
    }
  }

  private clearLayoutWork(): void {
    if (typeof window !== 'undefined') {
      if (this.layoutFrameOne !== null) {
        window.cancelAnimationFrame(this.layoutFrameOne);
      }
      if (this.layoutFrameTwo !== null) {
        window.cancelAnimationFrame(this.layoutFrameTwo);
      }
    }

    this.layoutFrameOne = null;
    this.layoutFrameTwo = null;

    if (this.layoutSettleTimer !== null) {
      clearTimeout(this.layoutSettleTimer);
      this.layoutSettleTimer = null;
    }
  }

  private handleUnauthorizedAccess(): void {
    this.accessReady = false;
    this.vesselsReady = false;
    this.vessels = [];
    this.selectedVessel = null;
    this.stopAllDataServices();
    this.authService.logout();
    void this.router.navigate(['/login']);
  }

  private moduleFromUrl(url: string): FleetModuleKey | null {
    const path = String(url || '')
      .split('?')[0]
      .split('#')[0];

    if (path.includes('/main/data-logger') || path.includes('/main/datalogger')) {
      return 'data-logger';
    }

    if (path.includes('/main/past-track')) {
      return 'overview';
    }

    const modules: FleetModuleKey[] = [
      'overview',
      'realtime',
      'chart',
      'diagram',
      'report',
      'alarm',
      'log',
      'settings',
    ];

    return modules.find((module) => path.includes(`/main/${module}`)) || null;
  }

  private updateLayout(url: string): void {
    this.showSidebar = url.includes('/main');
    this.isOverviewRoute = url.includes('/main/overview');
  }
}
