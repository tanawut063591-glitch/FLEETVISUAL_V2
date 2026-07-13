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
    private vesselPopup: VesselPopupService
  ) {}

  ngOnInit(): void {
    const timer = this.route.snapshot.data['timer'] || this.defaultTimer;

    this.fvInfoService.start(timer);
    this.fvRealtimeService.start(timer);
    this.fvOverviewService.start(timer);

    this.loadSidebarVessels();
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
  }

  getDepth(outlet: any): number {
    return outlet?.activatedRouteData?.['depth'] || 0;
  }

  private loadSidebarVessels(): void {
    this.vesselData
      .getOverviewVessels()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rows: any[]) => {
          this.vessels = Array.isArray(rows) ? rows : [];
          this.fvOverviewService.setVessels(this.vessels);

          if (!this.selectedVessel && this.vessels.length > 0) {
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

  private updateLayout(url: string): void {
    this.showSidebar = url.includes('/main');
    this.isOverviewRoute = url.includes('/main/overview');
  }
}
