import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

import { CoordinatesService } from '../../../shared/services/coordinate.service';
import { FvTimeService } from '../../../shared/services/fv-time.service';
import { FvInfoService } from '../../../shared/services/fv-info.service';
import { FvRealtimeService } from '../../../shared/services/fv-realtime.service';
import { FleetVesselDataService } from '../../../shared/services/fleet-vessel-data.service';
import { VesselPopupService } from '../../../shared/services/vessel-popup.service';
import { UserPresenceService } from '../../../shared/services/user-presence.service';
import { UserAccessControlService } from '../../../shared/services/user-access-control.service';
import { AuthService } from '../../../shared/services/auth.service';
import { FleetModuleKey } from '../../../shared/models/settings.model';

import { Animaions } from './main.animation';

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

  vessels: any[] = [];
  selectedVessel: any = null;
  
  private destroy$ = new Subject<void>();
  private readonly defaultTimer = 5000;
  private refreshTimer = this.defaultTimer;
  private fvInfoStarted = false;
  private realtimeStarted = false;
  private layoutSettleTimer: ReturnType<typeof setTimeout> | null = null;
  private scrollResetTimer: ReturnType<typeof setTimeout> | null = null;
  private lastPublishedVesselKey = '';

  constructor(
    public fvTimeService: FvTimeService,
    public coordinatesService: CoordinatesService,
    private router: Router,
    private route: ActivatedRoute,
    private fvInfoService: FvInfoService,
    private fvRealtimeService: FvRealtimeService,
    private vesselData: FleetVesselDataService,
    private vesselPopup: VesselPopupService,
    private userPresence: UserPresenceService,
    private userAccess: UserAccessControlService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.refreshTimer =
      this.route.snapshot.data['timer'] || this.defaultTimer;

    this.userPresence.start();
    this.userAccess.refreshCurrentAccess()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (access) => {
          if (access?.status === 'suspended' || !this.userAccess.hasAnyModuleAccess()) {
            this.authService.logout();
            void this.router.navigate(['/login']);
            return;
          }
          const currentModule = this.moduleFromUrl(this.router.url);
          const moduleAllowed = !currentModule || (currentModule === 'settings'
            ? this.userAccess.canManageModule('settings')
            : this.userAccess.canAccessModule(currentModule));
          if (!moduleAllowed) {
            void this.router.navigateByUrl(this.userAccess.firstAllowedRoute());
          }
          this.loadSidebarVessels();
        },
        error: () => this.loadSidebarVessels(),
      });
    this.watchActiveVesselSelection();
    this.applyRouteState(this.router.url);

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event: NavigationEnd) => {
        this.applyRouteState(event.urlAfterRedirects || event.url);
      });
  }

  ngAfterViewInit(): void {
    // ngOnInit runs before the authenticated grid and Header have their final
    // dimensions. A second settle after paint prevents first-login hitboxes from
    // being calculated against the old Login layout.
    this.scheduleLayoutSettle();
  }

  ngOnDestroy(): void {
    this.fvInfoService.stop();
    this.fvRealtimeService.stop();
    this.userPresence.stop();

    if (this.layoutSettleTimer !== null) {
      clearTimeout(this.layoutSettleTimer);
      this.layoutSettleTimer = null;
    }

    if (this.scrollResetTimer !== null) {
      clearTimeout(this.scrollResetTimer);
      this.scrollResetTimer = null;
    }

    this.destroy$.next();
    this.destroy$.complete();
  }

  toggle(): void {
    this.activeOffCanvas = !this.activeOffCanvas;
  }

  onSelectVessel(vessel: any): void {
    if (!vessel) {
      return;
    }

    this.selectedVessel = vessel;
    this.activeOffCanvas = false;

    try {
      localStorage.setItem('selectedVessel', JSON.stringify(vessel));
      localStorage.setItem('realtimeVessel', JSON.stringify(vessel));
      localStorage.setItem('pastTrackVessel', JSON.stringify(vessel));
    } catch {}

    this.fvRealtimeService.setActiveVessel(vessel);
    this.lastPublishedVesselKey = this.normalizeVesselIdentity(vessel);
    this.vesselPopup.openPopup(vessel);

    // Realtime cards are long on phones. When a vessel is changed from the
    // mobile drawer, returning to the previous scroll offset can leave the
    // first card hidden under the fixed header. Start the selected vessel at
    // the top so its identity and latest status are always visible.
    if (/\/main\/(realtime|diagram)(?:\/|$)/.test(this.router.url)) {
      this.scheduleContentScrollReset();
    }

    // On Past Track, selecting another vessel must change the route parameter.
    // PastTrackComponent subscribes to paramMap and reloads that vessel automatically.
    if (this.router.url.includes('/main/past-track')) {
      const routeId = this.getVesselRouteId(vessel);

      if (routeId) {
        this.router.navigate(['/main/past-track', routeId]);
      }
    }
  }

  getDepth(outlet: any): number {
    return outlet?.activatedRouteData?.['depth'] || 0;
  }

  private getVesselRouteId(vessel: any): string {
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
        ''
    ).trim();
  }

  private loadSidebarVessels(): void {
    this.vesselData
      .getOverviewVessels()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rows: any[]) => {
          this.vessels = Array.isArray(rows) ? rows : [];

          const selectedMatch = this.findMatchingVessel(this.selectedVessel, this.vessels);

          if (selectedMatch) {
            // Keep the active vessel attached to the latest backend row so the
            // Sidebar, Manage Tags, Realtime and Past Track share one selection.
            this.selectedVessel = selectedMatch;

            const selectedKey = this.normalizeVesselIdentity(selectedMatch);
            if (selectedKey && selectedKey !== this.lastPublishedVesselKey) {
              this.fvRealtimeService.setActiveVessel(selectedMatch);
              this.lastPublishedVesselKey = selectedKey;
            }
          } else if (this.vessels.length > 0) {
            // เรือที่เคยเลือกอาจถูกนำออกจากระบบ ให้ย้ายไปลำแรกที่ยังใช้งาน
            // และเขียนทับ localStorage เพื่อไม่ให้ Realtime โหลดเรือเก่ากลับมาอีก
            this.selectedVessel = this.vessels[0];

            try {
              localStorage.setItem('selectedVessel', JSON.stringify(this.selectedVessel));
              localStorage.setItem('realtimeVessel', JSON.stringify(this.selectedVessel));
              localStorage.setItem('pastTrackVessel', JSON.stringify(this.selectedVessel));
            } catch {}

            this.fvRealtimeService.setActiveVessel(this.selectedVessel);
            this.lastPublishedVesselKey = this.normalizeVesselIdentity(this.selectedVessel);
          } else {
            this.selectedVessel = null;
            this.lastPublishedVesselKey = '';
          }
        },
        error: (error) => {
          console.warn('[MainComponent] loadSidebarVessels error:', error);
          this.vessels = [];
        },
      });
  }


  /**
   * Central selection bridge.
   * Sidebar clicks, Overview map markers and Alarm -> Realtime navigation all
   * publish the selected vessel through FvRealtimeService.  MainComponent then
   * updates the Sidebar highlight from the same source of truth.
   */
  private watchActiveVesselSelection(): void {
    this.fvRealtimeService.activeVessel$
      .pipe(takeUntil(this.destroy$))
      .subscribe((vessel) => {
        if (!vessel) {
          return;
        }

        const matchingVessel = this.findMatchingVessel(vessel, this.vessels);

        // เมื่อรายการเรือโหลดแล้ว ห้ามรับ selection ที่ไม่อยู่ในรายการอีก
        // ป้องกันเรือที่ถูกนำออกย้อนกลับมาจาก localStorage หรือ route เก่า
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

  private findMatchingVessel(target: any, rows: any[]): any | null {
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

  private collectVesselIdentities(vessel: any): Set<string> {
    const sources = [vessel, vessel?.fv, vessel?.fvInfo];
    const values: unknown[] = [];

    for (const source of sources) {
      if (!source) continue;
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
      values
        .map((value) => this.normalizeIdentityPart(value))
        .filter((value) => value.length > 0),
    );
  }

  private normalizeVesselIdentity(vessel: any): string {
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
    this.syncRouteServices(url);
    this.scheduleContentScrollReset();
    this.scheduleLayoutSettle();
  }

  /**
   * Only run expensive telemetry polling on pages that consume it. The old
   * shell started Info, Realtime and Overview polling together immediately
   * after login, which duplicated requests and made the first screen feel
   * slower than a browser refresh.
   */
  private syncRouteServices(url: string): void {
    const needsFvInfo = /\/main\/(realtime|diagram|report)(?:\/|$)/.test(url);
    const isLiveReport = /\/main\/report(?:\/|$)/.test(url);
    const needsRealtime = /\/main\/(realtime|diagram|report)(?:\/|$)/.test(url);
    const realtimeInterval = isLiveReport ? 60_000 : this.refreshTimer;
    const fvInfoInterval = isLiveReport ? 60_000 : this.refreshTimer;

    if (needsFvInfo) {
      this.fvInfoService.ensureStarted(fvInfoInterval);
      this.fvInfoStarted = true;
    } else if (this.fvInfoStarted) {
      this.fvInfoService.stop();
      this.fvInfoStarted = false;
    }

    if (needsRealtime) {
      // Realtime/Diagram keep their fast operational refresh. Report reuses the
      // same current-values service at a bounded 60-second interval, so it never
      // creates a second polling loop or regenerates PDFs automatically.
      this.fvRealtimeService.ensureStarted(realtimeInterval);
      this.realtimeStarted = true;
    } else if (this.realtimeStarted) {
      this.fvRealtimeService.stop();
      this.realtimeStarted = false;
    }
  }


  /**
   * Main uses an internal scroll container instead of the browser window.
   * Angular therefore keeps its old scrollTop when switching tabs. On mobile
   * this could reopen Realtime halfway through an engine card, visually
   * placing content underneath the fixed header. Reset after the routed view
   * has rendered and repeat once after the route animation settles.
   */
  private scheduleContentScrollReset(): void {
    if (typeof window === 'undefined') {
      return;
    }

    if (this.scrollResetTimer !== null) {
      clearTimeout(this.scrollResetTimer);
      this.scrollResetTimer = null;
    }

    const reset = () => {
      const viewport = this.contentViewport?.nativeElement;
      if (!viewport) {
        return;
      }

      viewport.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    };

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(reset);
    });

    this.scrollResetTimer = setTimeout(() => {
      reset();
      this.scrollResetTimer = null;
    }, 220);
  }

  private scheduleLayoutSettle(): void {
    if (typeof window === 'undefined') {
      return;
    }

    if (this.layoutSettleTimer !== null) {
      clearTimeout(this.layoutSettleTimer);
    }

    const notify = (): void => {
      window.dispatchEvent(new Event('resize'));
    };

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(notify);
    });

    // The first authenticated page may still be decoding map imagery and lazy
    // route chunks. Repeat after the shell has fully settled.
    setTimeout(notify, 120);
    this.layoutSettleTimer = setTimeout(() => {
      notify();
      this.layoutSettleTimer = null;
    }, 520);
  }

  private moduleFromUrl(url: string): FleetModuleKey | null {
    const path = String(url || '').split('?')[0].split('#').pop() || '';
    if (path.includes('/main/data-logger') || path.includes('/main/datalogger')) return 'data-logger';
    if (path.includes('/main/past-track')) return 'overview';
    const modules: FleetModuleKey[] = ['overview', 'realtime', 'chart', 'diagram', 'report', 'alarm', 'log', 'settings'];
    return modules.find((module) => path.includes(`/main/${module}`)) || null;
  }

  private updateLayout(url: string): void {
    this.showSidebar = url.includes('/main');
    this.isOverviewRoute = url.includes('/main/overview');
  }
}
