import { AfterViewInit, ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { Subject, of, timer } from 'rxjs';
import { catchError, exhaustMap, switchMap, takeUntil } from 'rxjs/operators';
import { ThemeModeService } from '../../../shared/services/theme-mode.service';
import { AlertStateService } from '../../../shared/services/alert-state.service';
import { AlertsService } from '../../../shared/services/alerts.service';
import { UserPresenceService } from '../../../shared/services/user-presence.service';
import { FleetModuleKey } from '../../../shared/models/settings.model';
import { UserAccessControlService } from '../../../shared/services/user-access-control.service';





interface HeaderMenuItem {
  label: string;
  icon: string;
  route: string;
  show?: boolean;
  isAlert?: boolean;
  isLog?: boolean;
  module: FleetModuleKey;
}




interface SettingsItem {
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  route: string;
}

@Component({
  selector: 'app-header',
  standalone: false,
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent implements OnInit, AfterViewInit, OnDestroy {

  username = 'sat';


  alertCount = 0;


  settingsMenuOpen = false;


  mobileMenuOpen = false;


  isDarkMode = false;


  userImage = '';
  avatarError = false;


  logoSrc = 'assets/images/vessel/LocationEyeIcon.png';





  menuItems: HeaderMenuItem[] = [
    {
      label: 'OVERVIEW',
      icon: 'fa fa-map',
      route: '/main/overview',
      show: true,
      module: 'overview',
    },
    {
      label: 'REALTIME',
      icon: 'fa fa-tachometer',
      route: '/main/realtime',
      show: true,
      module: 'realtime',
    },
    {
      label: 'DATA LOGGER',
      icon: 'fa fa-database',
      route: '/main/data-logger',
      show: true,
      module: 'data-logger',
    },
    {
      label: 'CHART',
      icon: 'fa fa-area-chart',
      route: '/main/chart',
      show: true,
      module: 'chart',
    },
    {
      label: 'DIAGRAM',
      icon: 'fa fa-sitemap',
      route: '/main/diagram',
      show: true,
      module: 'diagram',
    },
    {
      label: 'REPORT',
      icon: 'fa fa-file-text-o',
      route: '/main/report',
      show: true,
      module: 'report',
    },
    {
      label: 'ALARM',
      icon: 'fa fa-bell-o',
      route: '/main/alarm',
      show: true,
      module: 'alarm',
      isAlert: true,
    },
    {
      label: 'LOG',
      icon: 'fa fa-history',
      route: '/main/log',
      show: true,
      module: 'log',
      isLog: true,
    },
  ];





  settingsItems: SettingsItem[] = [
    {
      title: 'General Settings',
      subtitle: 'System preferences',
      icon: 'fa fa-sliders',
      color: 'blue',
      route: '/main/settings',
    },
    {
      title: 'User Management',
      subtitle: 'Roles and permissions',
      icon: 'fa fa-user-o',
      color: 'purple',
      route: '/main/settings/users',
    },
    {
      title: 'Vessel Management',
      subtitle: 'Add or edit vessel data',
      icon: 'fa fa-ship',
      color: 'green',
      route: '/main/settings/vessels',
    },
    {
      title: 'Vessel Groups',
      subtitle: 'Manage fleet grouping',
      icon: 'fa fa-object-group',
      color: 'orange',
      route: '/main/settings/groups',
    },
  ];

  private readonly destroy$ = new Subject<void>();
  private readonly alarmBadgeWindowMs = 24 * 60 * 60 * 1000;
  private settingsFeatureWarmup?: Promise<unknown>;
  private settingsWarmupTimer: ReturnType<typeof setTimeout> | null = null;
  private mobileStateFrame: number | null = null;
  settingsNavigationPending = false;

  constructor(
    private router: Router,
    private themeModeService: ThemeModeService,
    private alertState: AlertStateService,
    private alertsService: AlertsService,
    private userPresence: UserPresenceService,
    private userAccess: UserAccessControlService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}





  ngOnInit(): void {



    this.resetMobileNavigationState();

    this.loadUserData();
    this.initThemeMode();
    this.alertState.activeCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe((count) => (this.alertCount = count));

    this.startAlertMonitor();




    this.settingsWarmupTimer = setTimeout(() => {
      this.settingsWarmupTimer = null;
      void this.warmSettingsFeature();
    }, 1200);




    this.router.events
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        if (event instanceof NavigationStart) {
          this.closeMobileMenu(false);
        }
      });
  }

  ngAfterViewInit(): void {
    if (typeof window === 'undefined') {
      return;
    }




    this.mobileStateFrame = window.requestAnimationFrame(() => {
      this.mobileStateFrame = window.requestAnimationFrame(() => {
        this.mobileStateFrame = null;
        this.resetMobileNavigationState();
        this.changeDetectorRef.detectChanges();
      });
    });
  }

  canAccessModule(module: FleetModuleKey): boolean {
    return this.userAccess.canAccessModule(module);
  }

  canAccessSettingsRoute(): boolean {
    return this.userAccess.canManageModule('settings');
  }






  private startAlertMonitor(): void {
    this.alertsService
      .getRefreshSeconds()
      .pipe(
        switchMap((seconds) => timer(0, Math.max(10, seconds) * 1000)),
        exhaustMap(() => {
          if (typeof document !== 'undefined' && document.hidden) {
            return of(null);
          }
          if (this.isAlarmPage()) {
            return of(null);
          }



          const end = new Date();
          const start = new Date(end.getTime() - this.alarmBadgeWindowMs);

          return this.alertsService
            .fetchAlerts({
              startTime: start.toISOString(),
              endTime: end.toISOString(),
              page: 1,
              pageSize: 100,
            })
            .pipe(catchError(() => of(null)));
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((result) => {



        if (!result || this.isAlarmPage()) return;

        const activeAlerts = result.alerts.filter(
          (alert) => alert.state !== 'resolved'
        );

        this.alertState.setActiveAlerts(activeAlerts);
      });
  }

  private isAlarmPage(): boolean {
    return /^\/main\/alarm(?:[/?#]|$)/.test(this.router.url);
  }

  ngOnDestroy(): void {
    this.resetMobileNavigationState();
    if (this.mobileStateFrame !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(this.mobileStateFrame);
      this.mobileStateFrame = null;
    }
    if (this.settingsWarmupTimer !== null) {
      clearTimeout(this.settingsWarmupTimer);
      this.settingsWarmupTimer = null;
    }
    this.destroy$.next();
    this.destroy$.complete();
  }





  get userInitial(): string {
    return this.username ? this.username.charAt(0).toUpperCase() : 'U';
  }





  private loadUserData(): void {
    const savedUsername =
      localStorage.getItem('username') ||
      sessionStorage.getItem('username') ||
      localStorage.getItem('userName') ||
      sessionStorage.getItem('userName');

    if (savedUsername) {
      this.username = savedUsername;
    }

    const savedUserImage =
      localStorage.getItem('userImage') ||
      sessionStorage.getItem('userImage');

    if (savedUserImage) {
      this.userImage = savedUserImage;
    }

  }





  toggleMobileMenu(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const nextOpenState = !this.mobileMenuOpen;
    this.mobileMenuOpen = nextOpenState;
    this.settingsMenuOpen = false;
    this.syncMobileMenuDocumentState(nextOpenState);




    this.changeDetectorRef.detectChanges();



    if (event.detail > 0 && event.currentTarget instanceof HTMLButtonElement) {
      const button = event.currentTarget;
      requestAnimationFrame(() => button.blur());
    }
  }




  closeMobileMenu(refreshView = true): void {
    const wasOpen = this.mobileMenuOpen;
    this.mobileMenuOpen = false;
    this.syncMobileMenuDocumentState(false);

    if (refreshView && wasOpen) {
      this.changeDetectorRef.detectChanges();
    }
  }




  private resetMobileNavigationState(): void {
    this.mobileMenuOpen = false;
    this.settingsMenuOpen = false;
    this.syncMobileMenuDocumentState(false);
  }





  private syncMobileMenuDocumentState(open: boolean): void {
    if (typeof document === 'undefined' || !document.body) {
      return;
    }

    document.documentElement?.classList.toggle('fv-mobile-navigation-open', open);
    document.body.classList.toggle('fv-mobile-navigation-open', open);
  }




  toggleSettingsMenu(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();



    void this.warmSettingsFeature();
    this.settingsMenuOpen = !this.settingsMenuOpen;




    this.changeDetectorRef.detectChanges();
  }




  closeSettingsMenu(): void {
    this.settingsMenuOpen = false;
  }





  private initThemeMode(): void {
    const mode = this.themeModeService.init();
    this.isDarkMode = mode === 'dark';
  }





  toggleDarkMode(event: MouseEvent): void {
    event.stopPropagation();

    const nextMode = this.themeModeService.toggleMode();
    this.isDarkMode = nextMode === 'dark';
  }




  async goTo(route: string): Promise<void> {
    if (this.settingsNavigationPending) return;

    if (this.router.url === route) {
      this.closeSettingsMenu();
      this.closeMobileMenu();
      return;
    }

    this.settingsNavigationPending = true;
    this.changeDetectorRef.detectChanges();
    void this.warmSettingsFeature();

    try {
      let navigated = await this.router.navigateByUrl(route);



      if (!navigated && this.router.url !== route) {
        await new Promise<void>((resolve) => setTimeout(resolve, 120));
        navigated = await this.router.navigateByUrl(route);
      }

      if (navigated || this.router.url === route) {
        this.closeSettingsMenu();
        this.closeMobileMenu();
      }
    } catch (error) {
      console.error('[HeaderComponent] Settings navigation failed:', error);
    } finally {
      this.settingsNavigationPending = false;
      this.changeDetectorRef.detectChanges();
    }
  }





  private warmSettingsFeature(): Promise<unknown> {
    if (!this.settingsFeatureWarmup) {
      this.settingsFeatureWarmup = import('../../../features/settings/settings.module')
        .catch((error) => {
          this.settingsFeatureWarmup = undefined;
          console.warn('[HeaderComponent] Settings warm-up skipped:', error);
          return undefined;
        });
    }

    return this.settingsFeatureWarmup;
  }





  onLogoError(event: Event): void {
    const img = event.target as HTMLImageElement | null;

    if (img) {
      img.style.display = 'none';
    }
  }




  onUserImageError(): void {
    this.avatarError = true;
  }






  logout(): void {
    const themeMode = this.themeModeService.getMode();
    this.userPresence.signOut();

    localStorage.clear();
    sessionStorage.clear();


    this.themeModeService.setMode(themeMode);

    this.closeSettingsMenu();
    this.closeMobileMenu();

    this.router.navigate(['/login']);
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (typeof window === 'undefined') {
      return;
    }




    if (window.innerWidth > 991) {
      this.closeMobileMenu();
    } else if (!this.mobileMenuOpen) {

      this.syncMobileMenuDocumentState(false);
    }
  }

  @HostListener('window:orientationchange')
  onOrientationChange(): void {
    this.closeMobileMenu();
  }

  @HostListener('window:pageshow')
  onPageShow(): void {


    this.closeMobileMenu();
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.closeSettingsMenu();
    this.closeMobileMenu();
  }




  @HostListener('document:click')
  onDocumentClick(): void {
    this.closeSettingsMenu();
    this.closeMobileMenu();
  }





  @HostListener('click', ['$event'])
  onHeaderClick(event: MouseEvent): void {
    event.stopPropagation();
  }
}