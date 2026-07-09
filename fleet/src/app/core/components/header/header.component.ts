import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';

interface HeaderMenuItem {
  label: string;
  icon: string;
  route: string;
  show?: boolean;
  isAlert?: boolean;
  isLog?: boolean;
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
export class HeaderComponent implements OnInit {
  username = 'sat';
  alertCount = 0;

  settingsMenuOpen = false;
  mobileMenuOpen = false;
  isDarkMode = false;

  userImage = 'assets/images/user-avatar.png';
  avatarError = false;

  logoSrc = 'assets/images/vessel/LocationEyeIcon.png';

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
      label: 'ALERTS',
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

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.loadUserData();
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

    const savedAlertCount =
      localStorage.getItem('alertCount') ||
      sessionStorage.getItem('alertCount');

    if (savedAlertCount) {
      this.alertCount = Number(savedAlertCount) || 0;
    }
  }

  toggleMobileMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.mobileMenuOpen = !this.mobileMenuOpen;
    this.settingsMenuOpen = false;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }

  toggleSettingsMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.settingsMenuOpen = !this.settingsMenuOpen;
  }

  closeSettingsMenu(): void {
    this.settingsMenuOpen = false;
  }

  toggleDarkMode(event: MouseEvent): void {
    event.stopPropagation();

    // ตอนนี้ทำเฉพาะสลับสถานะปุ่มก่อน
    // ฟังก์ชันเปลี่ยน Theme จริงค่อยเพิ่มทีหลัง
    this.isDarkMode = !this.isDarkMode;

    console.log('[HeaderComponent] Dark mode:', this.isDarkMode);
  }

  goTo(route: string): void {
    this.closeSettingsMenu();
    this.closeMobileMenu();
    this.router.navigate([route]);
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
    localStorage.clear();
    sessionStorage.clear();

    this.closeSettingsMenu();
    this.closeMobileMenu();

    this.router.navigate(['/login']);
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