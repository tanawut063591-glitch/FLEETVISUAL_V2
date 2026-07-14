import { HttpContextToken } from '@angular/common/http';

/**
 * Requests that probe optional backend endpoints can opt out of the global
 * 401/403 logout redirect. The error is still returned to the caller so the
 * feature can show a proper backend error state or try its next endpoint.
 */
export const SKIP_AUTH_REDIRECT = new HttpContextToken<boolean>(() => false);
