import { inject } from '@angular/core';
import { AuthService } from '../../shared/services/auth.service';
import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { PermissionDialog } from '../../shared/components/permission-dialog/permission-dialog';
import { AppInitService } from '../../shared/services/app-init.service';


@Injectable({
  providedIn: 'root'
})
export class PermissionGuard implements CanActivate {
  constructor(
    private router: Router,
    private dialog: MatDialog,
    private initService: AppInitService
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const routingUrl = route.url[0].path;
    const userPermissions = this.getUserPermissions(); // ดึงสิทธิ์ของ user
    //const checkToken = localStorage.getItem('token');
    //console.log(routingUrl, userPermissions, checkToken)
    const rt: any = route;
    const fullUrl: any = rt['_routerState']?.url;
    //console.log(fullUrl)
    sessionStorage.setItem('navigate', fullUrl);
    
    // if ( userPermissions.length === 0 && checkToken?.length === 0) {
    //   const rt: any = route;
    //   const fullUrl: any = rt['_routerState']?.url;
    //   console.log(fullUrl)
    //   sessionStorage.setItem('navigate', fullUrl);
    //   //this.router.navigate(['/login']);
    //   return false;
    // }

    if(userPermissions.includes(routingUrl)){
      return true;
    }

    this.dialog.open(PermissionDialog, {
      width: '480px',
      disableClose: false,
      panelClass: 'permission-dialog-panel',
      data: {
        routePath: routingUrl || 'ไม่ทราบ',
        requiredPermission: routingUrl,
        message: 'You do not have permission to access this page'
      }
    });
    sessionStorage.removeItem('navigate');
    this.router.navigate([this.initService.defaultRoute]);
    return false;
  }

  private getUserPermissions(): string[] {
    // ตัวอย่าง: ดึงสิทธิ์จาก localStorage, service, หรือ state management
    const pageStr = localStorage.getItem('pages');
    if (pageStr) {
      const pages = JSON.parse(pageStr);
      return pages || ['overview'];
    }
    return []; 
  }
}
