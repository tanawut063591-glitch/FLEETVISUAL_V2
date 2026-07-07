import { inject, Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
} from '@angular/router';

import { AppInitService } from '../../shared/services/app-init.service';

@Injectable({
  providedIn: 'root',
})
export class PermissionGuard implements CanActivate {
  private router = inject(Router);
  private initService = inject(AppInitService);

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    const routingUrl = this.getRoutePath(route);
    const fullUrl = state.url || '/';

    sessionStorage.setItem('navigate', fullUrl);

    const userPermissions = this.getUserPermissions();

    if (userPermissions.includes(routingUrl)) {
      return true;
    }

    sessionStorage.removeItem('navigate');

    alert('You do not have permission to access this page');

    const defaultRoute = this.initService.defaultRoute || '/main/overview';
    this.router.navigateByUrl(defaultRoute);

    return false;
  }

  private getRoutePath(route: ActivatedRouteSnapshot): string {
    const path = route.routeConfig?.path;

    if (path) {
      return path.split('/')[0];
    }

    if (route.url && route.url.length > 0) {
      return route.url[0].path;
    }

    return 'overview';
  }

  private getUserPermissions(): string[] {
    const pageStr = localStorage.getItem('pages');

    if (!pageStr) {
      return ['overview', 'main'];
    }

    try {
      const pages = JSON.parse(pageStr);

      if (Array.isArray(pages)) {
        return pages
          .map((page: any) => {
            if (typeof page === 'string') {
              return page;
            }

            return page?.path || page?.name || page?.page || '';
          })
          .filter((page: string) => !!page);
      }

      return ['overview', 'main'];
    } catch (error) {
      console.error('Cannot parse pages from localStorage:', error);
      return ['overview', 'main'];
    }
  }
}