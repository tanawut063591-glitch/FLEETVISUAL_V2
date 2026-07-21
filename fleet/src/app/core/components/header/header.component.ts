import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, of, timer } from 'rxjs';
import { catchError, exhaustMap, switchMap, takeUntil } from 'rxjs/operators';
import { ThemeModeService } from '../../../shared/services/theme-mode.service';
import { AlertStateService } from '../../../shared/services/alert-state.service';
import { AlertsService } from '../../../shared/services/alerts.service';
import { UserPresenceService } from '../../../shared/services/user-presence.service';

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
export class HeaderComponent implements OnInit, OnDestroy {
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
  userImage = 'assets/images/user-avatar.png';
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
    },
    {
      label: 'REALTIME',
      icon: 'fa fa-tachometer',
      route: '/main/realtime',
      show: true,
    },
    {
      label: 'DATA LOGGER',
      icon: 'fa fa-database',
      route: '/main/data-logger',
      show: true,
    },
    {
      label: 'CHART',
      icon: 'fa fa-area-chart',
      route: '/main/chart',
      show: true,
    },
    {
      label: 'DIAGRAM',
      icon: 'fa fa-sitemap',
      route: '/main/diagram',
      show: true,
    },
    {
      label: 'REPORT',
      icon: 'fa fa-file-text-o',
      route: '/main/report',
      show: true,
    },
    {
      label: 'ALARM',
      icon: 'fa fa-bell-o',
      route: '/main/alerts',
      show: true,
      isAlert: true,
    },
    {
      label: 'LOG',
      icon: 'fa fa-history',
      route: '/main/log',
      show: true,
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
      title: 'Vessel Management',
      subtitle: 'Add or edit vessel data',
      icon: 'fa fa-ship',
      color: 'green',
      route: '/main/settings/vessels',
    },
    {
      title: 'User Management',
      subtitle: 'Roles and permissions',
      icon: 'fa fa-user-o',
      color: 'purple',
      route: '/main/settings/users',
    },
    {
      title: 'System Config',
      subtitle: 'Advanced configuration',
      icon: 'fa fa-cogs',
      color: 'orange',
      route: '/main/settings/system',
    },
  ];

  private readonly destroy$ = new Subject<void>();
  private readonly alarmBadgeWindowMs = 24 * 60 * 60 * 1000;

  constructor(
    private router: Router,
    private themeModeService: ThemeModeService,
    private alertState: AlertStateService,
    private alertsService: AlertsService,
    private userPresence: UserPresenceService
  ) {}

  /*
    ngOnInit ทำงานครั้งแรกตอน Header ถูกสร้าง
    ใช้โหลดข้อมูลผู้ใช้จาก localStorage / sessionStorage
  */
  ngOnInit(): void {
    this.loadUserData();
    this.initThemeMode();
    this.alertState.activeCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe((count) => (this.alertCount = count));

    this.startAlertMonitor();
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

        const activeCount = result.alerts.filter(
          (alert) => alert.state !== 'resolved'
        ).length;

        this.alertState.setActiveCount(activeCount);
      });
  }

  private isAlarmPage(): boolean {
    return /^\/main\/alerts(?:[/?#]|$)/.test(this.router.url);
  }

  ngOnDestroy(): void {
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
    event.stopPropagation();
    this.mobileMenuOpen = !this.mobileMenuOpen;
    this.settingsMenuOpen = false;
  }

  /*
    ปิดเมนู mobile
  */
  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }

  /*
    เปิด/ปิด Settings Dropdown
  */
  toggleSettingsMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.settingsMenuOpen = !this.settingsMenuOpen;
  }

  /*
    ปิด Settings Dropdown
  */
  closeSettingsMenu(): void {
    this.settingsMenuOpen = false;
  }

  /*
    โหลด theme จาก localStorage
    default เป็น Dark และจำโหมดล่าสุดของผู้ใช้ไว้ใน localStorage
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
  goTo(route: string): void {
    this.closeSettingsMenu();
    this.closeMobileMenu();
    this.router.navigate([route]);
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
    const themeMode = localStorage.getItem('fleet-theme-mode');
    this.userPresence.signOut();

    localStorage.clear();
    sessionStorage.clear();

    // เก็บ theme ที่ผู้ใช้เลือกไว้ แม้ logout แล้วกลับมาใหม่ก็ยังเป็น mode เดิม
    if (themeMode) {
      localStorage.setItem('fleet-theme-mode', themeMode);
    }

    this.closeSettingsMenu();
    this.closeMobileMenu();

    this.router.navigate(['/login']);
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