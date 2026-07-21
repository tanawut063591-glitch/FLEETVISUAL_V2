import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

import { CoordinatesService } from '../../../shared/services/coordinate.service';
import { FvTimeService } from '../../../shared/services/fv-time.service';
import { FvInfoService } from '../../../shared/services/fv-info.service';
import { FvRealtimeService } from '../../../shared/services/fv-realtime.service';
import { FvOverviewService } from '../../../shared/services/fv-overview.service';
import { FleetVesselDataService } from '../../../shared/services/fleet-vessel-data.service';
import { VesselPopupService } from '../../../shared/services/vessel-popup.service';
import { UserPresenceService } from '../../../shared/services/user-presence.service';

import { Animaions } from './main.animation';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css'],
  animations: [Animaions.routeAnimation],
  standalone: false,
})
export class MainComponent implements OnInit, OnDestroy {
  activeOffCanvas = false;
  showSidebar = true;
  isOverviewRoute = false;

  vessels: any[] = [];
  selectedVessel: any = null;
  
  private destroy$ = new Subject<void>();
  private readonly defaultTimer = 5000;

  constructor(
    public fvTimeService: FvTimeService,
    public coordinatesService: CoordinatesService,
    private router: Router,
    private route: ActivatedRoute,
    private fvOverviewService: FvOverviewService,
    private fvInfoService: FvInfoService,
    private fvRealtimeService: FvRealtimeService,
    private vesselData: FleetVesselDataService,
    private vesselPopup: VesselPopupService,
    private userPresence: UserPresenceService
  ) {}

  ngOnInit(): void {
    const timer = this.route.snapshot.data['timer'] || this.defaultTimer;

    this.fvInfoService.start(timer);
    this.fvRealtimeService.start(timer);
    this.fvOverviewService.start(timer);
    this.userPresence.start();

    this.loadSidebarVessels();
    this.watchActiveVesselSelection();
    this.updateLayout(this.router.url);

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event: NavigationEnd) => {
        this.updateLayout(event.urlAfterRedirects || event.url);
      });
  }

  ngOnDestroy(): void {
    this.fvInfoService.stop();
    this.fvRealtimeService.stop();
    this.fvOverviewService.stop();
    this.userPresence.stop();

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
    this.vesselPopup.openPopup(vessel);

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
          this.fvOverviewService.setVessels(this.vessels);

          const selectedMatch = this.findMatchingVessel(this.selectedVessel, this.vessels);

          if (selectedMatch) {
            // Keep the active vessel attached to the latest backend row so the
            // Sidebar, Overview popup, Realtime and Past Track all share one selection.
            this.selectedVessel = selectedMatch;
          } else if (!this.selectedVessel && this.vessels.length > 0) {
            this.selectedVessel = this.vessels[0];
            this.fvRealtimeService.setActiveVessel(this.selectedVessel);
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

        const match = this.findMatchingVessel(vessel, this.vessels) || vessel;
        const nextKey = this.normalizeVesselIdentity(match);
        const currentKey = this.normalizeVesselIdentity(this.selectedVessel);

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

  private updateLayout(url: string): void {
    this.showSidebar = url.includes('/main');
    this.isOverviewRoute = url.includes('/main/overview');
  }
}
