import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';

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

function inspectPayload(value: unknown, path: string): string[] {
  if (typeof value === 'string') {
    return SUSPICIOUS_PATTERNS
      .filter(({ pattern }) => pattern.test(value))
      .map(({ label }) =>
        `  [${path}] พบ "${label}" → "${value.substring(0, 100)}${value.length > 100 ? '…' : ''}"`
      );
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => inspectPayload(item, `${path}[${index}]`));
  }

  if (value !== null && typeof value === 'object') {
    return Object.keys(value as object).flatMap((key) =>
      inspectPayload((value as Record<string, unknown>)[key], `${path}.${key}`)
    );
  }

  return [];
}

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const url = req.url || '';
  const isLoginRequest = url.includes('/authen') || url.includes('/token');
  const isAssetRequest = url.includes('/assets/');

  if (!isAssetRequest && req.body !== null && req.body !== undefined) {
    const warnings = inspectPayload(req.body, 'body');

    if (warnings.length > 0) {
      console.warn('[tokenInterceptor] suspicious payload blocked', warnings);
      localStorage.clear();
      sessionStorage.clear();
      router.navigate(['/login']);
    }
  }

  if (!isLoginRequest && !isAssetRequest) {
    const token = authService.getToken();
    const username = authService.getUser() || '';

    if (token) {
      req = req.clone({
        setHeaders: {
          // API2 จาก Angular 5 ใช้ token แบบ raw
          Authorization: token,
          user: username,
        },
      });
    }
  }

  return next(req);
};
