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
export class LoginGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  async canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Promise<boolean | UrlTree> {
    return this.checkLogin(state.url);
  }

  private async checkLogin(url: string): Promise<boolean | UrlTree> {
    /**
     * ตอนนี้โปรเจกต์ยังเหลือแค่หน้า Login
     * เลยให้เข้า Login ได้ก่อนเสมอ
     */
    if (!this.authService.isLoggedIn()) {
      return true;
    }

    return this.router.createUrlTree(['/main/overview']);
  }
}