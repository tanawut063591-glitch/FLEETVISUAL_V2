import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const url = req.url || '';
      const isLoginRequest = url.includes('/authen') || url.includes('/token');
      const isAssetRequest = url.includes('/assets/');

      if (!isLoginRequest && !isAssetRequest && (error.status === 401 || error.status === 403)) {
        localStorage.clear();
        sessionStorage.clear();
        router.navigate(['/login']);
      } else if (error.status >= 700) {
        router.navigate(['/server-error']);
      }

      return throwError(() => error);
    })
  );
};
