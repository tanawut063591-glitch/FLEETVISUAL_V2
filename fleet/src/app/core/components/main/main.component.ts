import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';

import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

import { FvState } from '../../../shared/state-managements/states/app.states';
import * as fvInfoReducer from '../../../shared/state-managements/reducers/fv-info.reducer';

import { CoordinatesService } from '../../../shared/services/coordinate.service';
import { FvTimeService } from '../../../shared/services/fv-time.service';
import { FvInfoService } from '../../../shared/services/fv-info.service';
import { FvRealtimeService } from '../../../shared/services/fv-realtime.service';
import { FvOverviewService } from '../../../shared/services/fv-overview.service';

import { Animaions } from './main.animation';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css'],
  animations: [Animaions.routeAnimation],
})
export class MainComponent implements OnInit, OnDestroy {
  activeOffCanvas = false;
  showSidebar = true;

  fvinfoActive$: Observable<any>;

  private destroy$ = new Subject<void>();

  constructor(
    public fvTimeService: FvTimeService,
    public coordinatesService: CoordinatesService,
    private store: Store<FvState>,
    private router: Router,
    private route: ActivatedRoute,
    private fvInfoService: FvInfoService,
    private fvRealtimeService: FvRealtimeService,
    private fvOverviewService: FvOverviewService
  ) {
    this.fvinfoActive$ = this.store.select(fvInfoReducer.getFvInfosActive);
  }

  ngOnInit(): void {
    const timer = this.getTimer();

    this.fvInfoService.start(timer);
    this.fvRealtimeService.start(timer);
    this.fvOverviewService.start(timer);

    this.handleRouteChange();

    this.updateSidebarVisibility(this.router.url);
  }

  ngOnDestroy(): void {
    this.fvInfoService.stop();
    this.fvOverviewService.stop();
    this.fvRealtimeService.stop();

    this.destroy$.next();
    this.destroy$.complete();
  }

  toggle(): void {
    this.activeOffCanvas = !this.activeOffCanvas;
  }

  onSelectVessel(event: any): void {
    this.activeOffCanvas = false;
  }

  getDepth(outlet: RouterOutlet): number {
    return outlet?.activatedRouteData?.['depth'] || 0;
  }

  private getTimer(): number {
    const timer = this.route.snapshot.data?.['timer'];

    if (timer && Number(timer) > 0) {
      return Number(timer);
    }

    return 5000;
  }

  private handleRouteChange(): void {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event: NavigationEnd) => {
        const url = event.urlAfterRedirects || event.url;
        this.updateSidebarVisibility(url);
      });
  }

  private updateSidebarVisibility(url: string): void {
    const cleanUrl = url.split('?')[0].split('#')[0];

    if (cleanUrl === '/main/overview' || cleanUrl === '/main' || cleanUrl === '/') {
      this.showSidebar = false;
      return;
    }

    this.showSidebar = true;
  }
}