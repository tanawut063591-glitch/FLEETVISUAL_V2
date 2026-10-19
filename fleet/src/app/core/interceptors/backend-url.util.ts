import { environment } from '../../../environments/environment';

/** Never attach credentials to arbitrary third-party origins. */
export function isTrustedBackendUrl(requestUrl: string): boolean {
  if (!requestUrl || /^(data:|blob:|javascript:)/i.test(requestUrl)) return false;
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
  try {
    const target = new URL(requestUrl, origin);
    if (target.protocol !== 'https:' && target.protocol !== 'http:') return false;
    const trustedBases = [environment.API_URL, environment.API2_URL, environment.REPORT_API_URL];
    return trustedBases.some((value) => {
      if (!value) return false;
      const base = new URL(value, origin);
      const pathname = base.pathname.replace(/\/+$/, '');
      // A server base of '/' trusts only the exact origin, never third-party sites.
      const pathMatches = !pathname || target.pathname === pathname ||
        target.pathname.startsWith(`${pathname}/`);
      return target.origin === base.origin && pathMatches;
    });
  } catch {
    return false;
  }
}
