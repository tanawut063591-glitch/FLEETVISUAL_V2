import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../../shared/services/auth.service';

interface HeaderMenuItem {
  label: string;
  icon: string;
  path: string;
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
  avatarError = false;
  userImage = 'assets/images/user-avatar.png';

  menuItems: HeaderMenuItem[] = [
    { label: 'OVERVIEW', icon: 'fa fa-map', path: '/main' },
    { label: 'REALTIME', icon: 'fa fa-tachometer', path: '/main' },
    { label: 'DATA LOGGER', icon: 'fa fa-database', path: '/main' },
    { label: 'CHART', icon: 'fa fa-area-chart', path: '/main' },
    { label: 'DIAGRAM', icon: 'fa fa-sitemap', path: '/main' },
    { label: 'REPORT', icon: 'fa fa-file-text-o', path: '/main' },
  ];

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.username =
      this.authService.getUsername() ||
      localStorage.getItem('username') ||
      sessionStorage.getItem('username') ||
      'sat';

    this.userImage =
      localStorage.getItem('userImage') ||
      sessionStorage.getItem('userImage') ||
      'assets/images/user-avatar.png';

    const savedAlertCount =
      localStorage.getItem('alertCount') ||
      sessionStorage.getItem('alertCount');

    this.alertCount = savedAlertCount ? Number(savedAlertCount) || 0 : 0;
  }

  get userInitial(): string {
    return this.username ? this.username.charAt(0).toUpperCase() : 'U';
  }

  goTo(path: string): void {
    this.closeSettingsMenu();
    this.router.navigate([path || '/main']);
  }

  toggleSettingsMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.settingsMenuOpen = !this.settingsMenuOpen;
  }

  closeSettingsMenu(): void {
    this.settingsMenuOpen = false;
  }

  onUserImageError(): void {
    this.avatarError = true;
  }

  logout(): void {
    this.authService.logout();
    sessionStorage.clear();
    this.router.navigate(['/login']);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.closeSettingsMenu();
  }

  @HostListener('click', ['$event'])
  onHeaderClick(event: MouseEvent): void {
    event.stopPropagation();
  }
}
