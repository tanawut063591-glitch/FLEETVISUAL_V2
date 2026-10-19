import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';
import { isTrustedBackendUrl } from './backend-url.util';
import { SKIP_AUTH_REDIRECT } from './http-context.tokens';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const auth = inject(AuthService);
  const sessionAtRequestStart = auth.getToken();
  return next(req).pipe(catchError((error: HttpErrorResponse) => {
    const url = req.url || '';
    const isLoginRequest = /\/(authen|token)(?:[/?#]|$)/i.test(url);
    const isAssetRequest = /\/(assets|public)\//i.test(url) || /\.json(?:\?|$)/i.test(url);
    const isSessionRequest = isTrustedBackendUrl(url) && !isLoginRequest && !isAssetRequest;
    if (error.status === 401 && isSessionRequest && !req.context.get(SKIP_AUTH_REDIRECT)) {
      // 401: end only this application's auth session; retain theme and preferences.
      if (sessionAtRequestStart && auth.getToken() === sessionAtRequestStart) {
        auth.logout();
        void router.navigate(['/login']);
      }
    }
    // 403 means access denied, not session expired. Caller displays the error.
    if (error.status >= 700) void router.navigate(['/server-error']);
    return throwError(() => error);
  }));
};
