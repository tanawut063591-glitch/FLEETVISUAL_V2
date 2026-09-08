import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { SKIP_AUTH_REDIRECT } from './http-context.tokens';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const url = req.url || '';
      const isLoginRequest = url.includes('/authen') || url.includes('/token');
      const isAssetRequest =
        url.includes('/assets/') ||
        url.endsWith('/config.json') ||
        url.endsWith('/alerts.config.json');
      const skipAuthRedirect = req.context.get(SKIP_AUTH_REDIRECT);

      if (
        !skipAuthRedirect &&
        !isLoginRequest &&
        !isAssetRequest &&
        (error.status === 401 || error.status === 403)
      ) {
        localStorage.clear();
        sessionStorage.clear();
        router.navigate(['/login']);
      } else if (error.status >= 700) {
        router.navigate(['/server-error']);
      }

      return throwError(() => error);
    }),
  );
};
