import { Injectable } from '@angular/core';
import {
  CanActivate,
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';

import { AuthService } from '../../shared/services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class PermissionGuard implements CanActivate {
  private readonly diagramAccess: string[] = ['tads'];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  async canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Promise<boolean | UrlTree> {
    const url = state.url;

    return this.checkLogin(url);
  }

  private async checkLogin(url: string): Promise<boolean | UrlTree> {
    /**
     * ถ้ามี token ใน localStorage ให้ผ่านก่อน
     */
    if (this.authService.isLoggedIn()) {
      return true;
    }

    /**
     * ถ้าไม่มี token ให้จำ URL เดิมไว้
     * หลัง Login สำเร็จจะ redirect กลับมาได้
     */
    this.authService.redirectUrl = url;

    return this.router.createUrlTree(['/login']);
  }

  /**
   * เผื่ออนาคตต้องล็อกสิทธิ์หน้า diagram
   */
  private canAccessDiagram(): boolean {
    const username = this.authService.getUsername();

    if (!username) {
      return false;
    }

    return this.diagramAccess.includes(username.toLowerCase());
  }
}

/**
 * เผื่อไฟล์เก่าบางจุดยัง import ชื่อ AuthGuard อยู่
 */
export { PermissionGuard as AuthGuard };