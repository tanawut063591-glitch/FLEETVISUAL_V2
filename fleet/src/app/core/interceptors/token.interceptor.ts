import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { AuthService } from '../../shared/services/auth.service';
import { bearerAuthorization } from '../../shared/services/auth-header.util';
import { isTrustedBackendUrl } from './backend-url.util';

/** Attach credentials only to configured Fleet APIs, never assets or third-party URLs.
 * Security validation must happen at the backend, not via regex over form data. */
export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const url = req.url || '';
  const isLoginRequest = /\/(authen|token)(?:[/?#]|$)/i.test(url);
  const isAssetRequest = /\/(assets|public)\//i.test(url) || /\.json(?:\?|$)/i.test(url);
  if (isLoginRequest || isAssetRequest || !isTrustedBackendUrl(url)) return next(req);

  const auth = inject(AuthService);
  const token = bearerAuthorization(auth.getToken());
  const username = auth.getUser();
  const headers: Record<string, string> = {};
  if (token && !req.headers.has('Authorization')) headers['Authorization'] = token;
  if (username && !req.headers.has('user')) headers['user'] = username;
  return next(Object.keys(headers).length ? req.clone({ setHeaders: headers }) : req);
};
