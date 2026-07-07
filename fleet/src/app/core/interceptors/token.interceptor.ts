import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';

import { AuthService } from '../../shared/services/auth.service';

const SUSPICIOUS_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /<script[\s\S]*?>/i, label: '<script> tag' },
  { pattern: /javascript\s*:/i, label: 'javascript: protocol' },
  { pattern: /on\w+\s*=\s*["']?[^"'>]+/i, label: 'inline event handler' },
  { pattern: /eval\s*\(/i, label: 'eval()' },
  { pattern: /expression\s*\(/i, label: 'CSS expression()' },
  { pattern: /vbscript\s*:/i, label: 'vbscript: protocol' },
  { pattern: /<iframe[\s\S]*?>/i, label: '<iframe> tag' },
  { pattern: /<object[\s\S]*?>/i, label: '<object> tag' },
  { pattern: /<embed[\s\S]*?>/i, label: '<embed> tag' },
  { pattern: /data\s*:\s*text\/html/i, label: 'data:text/html URI' },
  { pattern: /document\s*\.\s*cookie/i, label: 'document.cookie access' },
];

function inspectPayload(value: unknown, path: string): string[] {
  if (typeof value === 'string') {
    return SUSPICIOUS_PATTERNS
      .filter(({ pattern }) => pattern.test(value))
      .map(({ label }) => {
        const preview =
          value.length > 100 ? `${value.substring(0, 100)}...` : value;

        return `[${path}] พบ ${label}: ${preview}`;
      });
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => {
      return inspectPayload(item, `${path}[${index}]`);
    });
  }

  if (value !== null && typeof value === 'object') {
    if (value instanceof FormData || value instanceof Blob || value instanceof ArrayBuffer) {
      return [];
    }

    return Object.keys(value as Record<string, unknown>).flatMap((key) => {
      return inspectPayload(
        (value as Record<string, unknown>)[key],
        `${path}.${key}`
      );
    });
  }

  return [];
}

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = authService.getToken();
  const username = authService.getUsername ? authService.getUsername() : '';

  if (req.body !== null && req.body !== undefined) {
    const warnings = inspectPayload(req.body, 'body');

    if (warnings.length > 0) {
      console.warn('Suspicious request blocked:', warnings);

      authService.logout();
      sessionStorage.clear();

      router.navigate(['/login']);

      throw new Error('Suspicious request payload blocked.');
    }
  }

  if (!token) {
    return next(req);
  }

  const authReq = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
      user: username,
    },
  });

  return next(authReq);
};