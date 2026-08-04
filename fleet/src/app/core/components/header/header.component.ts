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

/*
  รูปแบบข้อมูลของเมนูบน Header
  ใช้กำหนดชื่อเมนู, icon, route และสถานะพิเศษ เช่น Alert / Log
*/
interface HeaderMenuItem {
  label: string;
  icon: string;
  route: string;
  show?: boolean;
  isAlert?: boolean;
  isLog?: boolean;
  module: FleetModuleKey;
}

/*
  รูปแบบข้อมูลของเมนู Settings Dropdown
*/
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
  // ชื่อผู้ใช้ที่แสดงมุมขวาบน
  username = 'sat';

  // จำนวน Alert ถ้ามีมากกว่า 0 จะแสดง badge
  alertCount = 0;

  // คุมสถานะเปิด/ปิด dropdown settings
  settingsMenuOpen = false;

  // คุมสถานะเปิด/ปิดเมนูบนมือถือ
  mobileMenuOpen = false;

  // คุมสถานะปุ่ม Dark / Light mode
  isDarkMode = false;

  // รูปผู้ใช้ ถ้าโหลดไม่ได้จะแสดงตัวอักษรแทน
  userImage = ''; // Use the account initial until a real avatar URL is available.
  avatarError = false;

  // รูปโลโก้ Fleet Visual มุมซ้ายบน
  logoSrc = 'assets/images/vessel/LocationEyeIcon.png';

  /*
    เมนูหลักบน Header
    route ต้องตรงกับ app routing เช่น /main/overview, /main/realtime
  */
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

  /*
    รายการเมนูใน Settings Dropdown
    กดแล้วจะ navigate ไป route ที่กำหนด
  */
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

  /*
    ngOnInit ทำงานครั้งแรกตอน Header ถูกสร้าง
    ใช้โหลดข้อมูลผู้ใช้จาก localStorage / sessionStorage
  */
  ngOnInit(): void {
    // Always start the authenticated shell with a clean navigation state.
    // This also removes a stale document class left by browser back/forward
    // cache, responsive-device emulation or an interrupted route transition.
    this.resetMobileNavigationState();

    this.loadUserData();
    this.initThemeMode();
    this.alertState.activeCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe((count) => (this.alertCount = count));

    this.startAlertMonitor();

    // Warm the lazy Settings feature only after the first authenticated view
    // has painted. This removes the one-time delay that previously made the
    // first Settings click feel frozen, while still protecting login startup.
    this.settingsWarmupTimer = setTimeout(() => {
      this.settingsWarmupTimer = null;
      void this.warmSettingsFeature();
    }, 1200);

    // A mobile drawer must never survive a route change. Some routes are
    // opened programmatically (Alarm -> Realtime, vessel selection, browser
    // back/forward), so relying only on menu-item click handlers is not enough.
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

    // Re-apply the closed state after the first authenticated layout paint.
    // This prevents a stale compositor layer/hitbox from the Login route from
    // making the hamburger appear stuck until a manual browser refresh.
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

  /**
   * Polls the real alarm feed while the main layout is open so the Alarm badge
   * stays current even before the user visits the Alerts page. Failures are kept
   * silent here; the full error is shown inside the Alarm Center page.
   */
  private startAlertMonitor(): void {
    this.alertsService
      .getRefreshSeconds()
      .pipe(
        switchMap((seconds) => timer(0, Math.max(10, seconds) * 1000)),
        exhaustMap(() => {
          // The Alarm page refreshes this source itself. Avoid a duplicate request
          // while that page is open; all other pages keep the badge live.
          if (this.isAlarmPage()) {
            return of(null);
          }
          // Keep the header badge on the same default window as the Alarm page
          // (Last 24 Hours). Using seven days here made the badge include older
          // unresolved alarms that were not visible in the Alarm Feed.
          const end = new Date();
          const start = new Date(end.getTime() - this.alarmBadgeWindowMs);

          return this.alertsService
            .fetchAlerts({
              startTime: start.toISOString(),
              endTime: end.toISOString(),
              page: 1,
              pageSize: 1000,
            })
            .pipe(catchError(() => of(null)));
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((result) => {
        // A request may have started just before navigation to Alarm.
        // Do not let that older header response overwrite the count loaded by
        // the Alarm page after navigation has completed.
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

  /*
    ใช้สร้างตัวอักษร avatar เช่น sat = S
    ถ้าไม่มีชื่อ จะใช้ U
  */
  get userInitial(): string {
    return this.username ? this.username.charAt(0).toUpperCase() : 'U';
  }

  /*
    โหลดข้อมูลผู้ใช้ที่เคยบันทึกไว้
    เช่น username, userImage, alertCount
  */
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

  /*
    เปิด/ปิดเมนู mobile
    stopPropagation กันไม่ให้ document click ปิดทันที
  */
  toggleMobileMenu(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const nextOpenState = !this.mobileMenuOpen;
    this.mobileMenuOpen = nextOpenState;
    this.settingsMenuOpen = false;
    this.syncMobileMenuDocumentState(nextOpenState);

    // Force the state to paint immediately on the first tap after Login.
    // Mobile Chrome can otherwise keep the previous composited button layer
    // until another resize/change-detection cycle occurs.
    this.changeDetectorRef.detectChanges();

    // Pointer taps can leave a sticky focus visual on mobile browsers. Remove
    // only pointer-created focus; keyboard focus remains available/accessibile.
    if (event.detail > 0 && event.currentTarget instanceof HTMLButtonElement) {
      const button = event.currentTarget;
      requestAnimationFrame(() => button.blur());
    }
  }

  /*
    ปิดเมนู mobile
  */
  closeMobileMenu(refreshView = true): void {
    const wasOpen = this.mobileMenuOpen;
    this.mobileMenuOpen = false;
    this.syncMobileMenuDocumentState(false);

    if (refreshView && wasOpen) {
      this.changeDetectorRef.detectChanges();
    }
  }

  /**
   * Clears both Angular state and document-level classes in one place.
   */
  private resetMobileNavigationState(): void {
    this.mobileMenuOpen = false;
    this.settingsMenuOpen = false;
    this.syncMobileMenuDocumentState(false);
  }

  /**
   * Shares the mobile drawer state with fixed controls outside this component.
   * The vessel button uses this class to move out of the navigation action bar.
   */
  private syncMobileMenuDocumentState(open: boolean): void {
    if (typeof document === 'undefined' || !document.body) {
      return;
    }

    document.documentElement?.classList.toggle('fv-mobile-navigation-open', open);
    document.body.classList.toggle('fv-mobile-navigation-open', open);
  }

  /*
    เปิด/ปิด Settings Dropdown
  */
  toggleSettingsMenu(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    // Start downloading the lazy feature on the first interaction. Do not wait
    // for it here: the dropdown must respond immediately even on a cold cache.
    void this.warmSettingsFeature();
    this.settingsMenuOpen = !this.settingsMenuOpen;

    // A cold login can still be finishing several async layout/data callbacks.
    // Force this small header state to paint in the same turn rather than being
    // visually delayed until the next unrelated change-detection cycle.
    this.changeDetectorRef.detectChanges();
  }

  /*
    ปิด Settings Dropdown
  */
  closeSettingsMenu(): void {
    this.settingsMenuOpen = false;
  }

  /*
    โหลด theme จาก localStorage
    default เป็น Light และจำโหมดล่าสุดที่ผู้ใช้เลือกไว้ใน localStorage
  */
  private initThemeMode(): void {
    const mode = this.themeModeService.init();
    this.isDarkMode = mode === 'dark';
  }

  /*
    สลับ Dark / Light mode จริงทั้งระบบ
    service จะใส่ data-theme ให้ <html> และจำค่าที่เลือกไว้ใน localStorage
  */
  toggleDarkMode(event: MouseEvent): void {
    event.stopPropagation();

    const nextMode = this.themeModeService.toggleMode();
    this.isDarkMode = nextMode === 'dark';
  }

  /*
    ใช้พาไปหน้าอื่นจาก Settings Dropdown
  */
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

      // Very early after login another navigation can still be settling. Retry
      // once without refreshing the browser if Angular reports cancellation.
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

  /**
   * Loads the lazy Settings chunk once and shares the same promise with the
   * router. A failed background warm-up is cleared so the next click can retry.
   */
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

  /*
    ถ้าโลโก้โหลดไม่ได้ ให้ซ่อนรูป
    กันรูปแตกบนหน้าเว็บ
  */
  onLogoError(event: Event): void {
    const img = event.target as HTMLImageElement | null;

    if (img) {
      img.style.display = 'none';
    }
  }

  /*
    ถ้ารูป user โหลดไม่ได้ ให้แสดงตัวอักษรแทน
  */
  onUserImageError(): void {
    this.avatarError = true;
  }

  /*
    Logout:
    ล้างข้อมูล localStorage/sessionStorage
    แล้วส่งกลับไปหน้า login
  */
  logout(): void {
    const themeMode = this.themeModeService.getMode();
    this.userPresence.signOut();

    localStorage.clear();
    sessionStorage.clear();

    // เก็บ theme ที่ผู้ใช้เลือกไว้ แม้ logout แล้วกลับมาใหม่ก็ยังเป็น mode เดิม
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

    // Main layout and Sidebar switch at 991px. Header must use exactly the
    // same breakpoint or the hamburger can be active while the rest of the
    // shell is still in desktop mode.
    if (window.innerWidth > 991) {
      this.closeMobileMenu();
    } else if (!this.mobileMenuOpen) {
      // Remove any stale global class even when Angular state is already false.
      this.syncMobileMenuDocumentState(false);
    }
  }

  @HostListener('window:orientationchange')
  onOrientationChange(): void {
    this.closeMobileMenu();
  }

  @HostListener('window:pageshow')
  onPageShow(): void {
    // Browser back/forward cache restores the old DOM without a full reload.
    // Start from a predictable closed state instead of restoring a stale menu.
    this.closeMobileMenu();
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.closeSettingsMenu();
    this.closeMobileMenu();
  }

  /*
    ถ้าคลิกนอก Header ให้ปิด dropdown/menu
  */
  @HostListener('document:click')
  onDocumentClick(): void {
    this.closeSettingsMenu();
    this.closeMobileMenu();
  }

  /*
    ถ้าคลิกใน Header ไม่ให้ event ไหลไป document
    เพื่อไม่ให้เมนูปิดเองทันที
  */
  @HostListener('click', ['$event'])
  onHeaderClick(event: MouseEvent): void {
    event.stopPropagation();
  }
}