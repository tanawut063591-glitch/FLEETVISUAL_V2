import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {

  // username เดิม ใช้เช็กสิทธิ์เมนู DIAGRAM
  username: string = 'sat';

  // จำนวนแจ้งเตือน
  alertCount: number = 0;

  // สถานะเปิด / ปิด dropdown settings
  settingsMenuOpen: boolean = false;

  // รูปโปรไฟล์
  userImage: string = '/assets/images/user-avatar.png';

  // ถ้ารูปโหลดไม่ได้ จะแสดงตัวอักษรแรกแทน
  avatarError: boolean = false;

  constructor(private router: Router) {}

  ngOnInit(): void {
    const savedUsername =
      localStorage.getItem('username') ||
      sessionStorage.getItem('username');

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

  get userInitial(): string {
    if (!this.username) {
      return 'U';
    }

    return this.username.charAt(0).toUpperCase();
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
    localStorage.clear();
    sessionStorage.clear();

    this.router.navigate(['/login']);

    console.log('Logout completed successfully.');
  }

  onNavbarSearch(event: any): void {
    const value = event.target.value;

    this.router.navigate([], {
      queryParams: { search: value || null },
      queryParamsHandling: 'merge'
    });
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