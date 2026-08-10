import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from '../../shared/services/auth.service';

const SUSPICIOUS_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /<script[\s\S]*?>/i, label: '<script> tag' },
  { pattern: /javascript\s*:/i, label: 'javascript: protocol' },
  { pattern: /on\w+\s*=\s*["']?[^"'>]+/i, label: 'inline event handler (on*)' },
  { pattern: /eval\s*\(/i, label: 'eval()' },
  { pattern: /expression\s*\(/i, label: 'CSS expression()' },
  { pattern: /vbscript\s*:/i, label: 'vbscript: protocol' },
  { pattern: /<iframe[\s\S]*?>/i, label: '<iframe> tag' },
  { pattern: /<object[\s\S]*?>/i, label: '<object> tag' },
  { pattern: /<embed[\s\S]*?>/i, label: '<embed> tag' },
  { pattern: /data\s*:\s*text\/html/i, label: 'data:text/html URI' },
  { pattern: /document\s*\.\s*cookie/i, label: 'document.cookie access' },
  { pattern: /window\s*\.\s*location/i, label: 'window.location manipulation' },
];

const MAX_INSPECTION_DEPTH = 6;

function isBinaryOrFormValue(value: unknown): boolean {
  return (
    (typeof Blob !== 'undefined' && value instanceof Blob) ||
    (typeof FormData !== 'undefined' && value instanceof FormData) ||
    (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer)
  );
}

function inspectPayload(
  value: unknown,
  path: string,
  depth = 0,
  seen: WeakSet<object> = new WeakSet<object>(),
): string[] {
  if (depth > MAX_INSPECTION_DEPTH || value === null || value === undefined) return [];

  if (typeof value === 'string') {
    return SUSPICIOUS_PATTERNS.filter(({ pattern }) => pattern.test(value)).map(
      ({ label }) =>
        `  [${path}] detected "${label}" -> "${value.substring(0, 100)}${value.length > 100 ? '…' : ''}"`,
    );
  }

  if (isBinaryOrFormValue(value)) return [];

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => inspectPayload(item, `${path}[${index}]`, depth + 1, seen));
  }

  if (typeof value === 'object') {
    const objectValue = value as Record<string, unknown>;
    if (seen.has(objectValue)) return [];
    seen.add(objectValue);
    return Object.keys(objectValue).flatMap((key) =>
      inspectPayload(objectValue[key], `${path}.${key}`, depth + 1, seen),
    );
  }

  return [];
}

function normalizeBase(value: string): string {
  return String(value || '').trim().replace(/\/+$/, '');
}

function isTrustedBackendUrl(url: string): boolean {
  const requestUrl = String(url || '').trim();
  if (!requestUrl) return false;

  return [environment.API_URL, environment.API2_URL]
    .map(normalizeBase)
    .filter(Boolean)
    .some((base) => requestUrl === base || requestUrl.startsWith(`${base}/`));
}

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const url = req.url || '';
  const isLoginRequest = url.includes('/authen') || url.includes('/token');
  const isAssetRequest = url.includes('/assets/');
  const isTrustedBackend = isTrustedBackendUrl(url);

  if (isTrustedBackend && !isAssetRequest && req.body !== null && req.body !== undefined) {
    const warnings = inspectPayload(req.body, 'body');
    if (warnings.length > 0) {
      console.warn('[FleetVisual Security] unsafe request payload blocked', warnings);
      authService.logout();
      router.navigate(['/login']);

      return throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            statusText: 'Unsafe request blocked',
            url,
            error: { message: 'The request payload failed the client safety check.' },
          }),
      );
    }
  }

  if (!isLoginRequest && !isAssetRequest && isTrustedBackend) {
    const token = authService.getToken();
    const username = authService.getUser() || '';
    const headers: Record<string, string> = {};

    if (token && !req.headers.has('Authorization')) headers['Authorization'] = token;
    if (username && !req.headers.has('user')) headers['user'] = username;

    if (Object.keys(headers).length > 0) req = req.clone({ setHeaders: headers });
  }

  return next(req);
};
