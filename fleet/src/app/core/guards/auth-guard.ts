import { Injectable } from '@angular/core';
import {
  CanActivate,
  CanActivateChild,
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';

import { AuthService } from '../../shared/services/auth.service';
import { FleetModuleKey } from '../../shared/models/settings.model';
import { UserAccessControlService } from '../../shared/services/user-access-control.service';

@Injectable({
  providedIn: 'root',
})
export class PermissionGuard implements CanActivate, CanActivateChild {
  constructor(
    private authService: AuthService,
    private userAccess: UserAccessControlService,
    private router: Router
  ) {}

  async canActivate(
    _route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Promise<boolean | UrlTree> {
    if (this.authService.isLoggedIn()) {
      return true;
    }

    this.authService.redirectUrl = state.url;

    return this.router.createUrlTree(['/login']);
  }
  canActivateChild(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): boolean | UrlTree {
    if (!this.authService.isLoggedIn()) {
      this.authService.redirectUrl = state.url;
      return this.router.createUrlTree(['/login']);
    }

    const access = this.userAccess.getCurrentAccess();
    if (access?.status === 'suspended' || !this.userAccess.hasAnyModuleAccess()) {
      this.authService.logout();
      return this.router.createUrlTree(['/login']);
    }

    const module = this.moduleFromRoute(route);
    if (!module) return true;
    const allowed = module === 'settings'
      ? this.userAccess.canManageModule('settings')
      : this.userAccess.canAccessModule(module);
    return allowed ? true : this.router.parseUrl(this.userAccess.firstAllowedRoute());
  }

  private moduleFromRoute(route: ActivatedRouteSnapshot): FleetModuleKey | null {
    const path = route.routeConfig?.path || '';
    if (path === 'datalogger') return 'data-logger';
    if (path === 'alerts') return 'alarm';
    if (path === 'past-track') return 'overview';
    if (path === 'overview' || path === 'realtime' || path === 'data-logger' || path === 'chart' ||
        path === 'diagram' || path === 'report' || path === 'alarm' || path === 'log' || path === 'settings') {
      return path as FleetModuleKey;
    }
    return null;
  }

}

export { PermissionGuard as AuthGuard };