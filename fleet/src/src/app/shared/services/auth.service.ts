import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { firstValueFrom, TimeoutError, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';

export type LoginFailureReason =
  | 'invalid_credentials'
  | 'timeout'
  | 'network'
  | 'invalid_response'
  | 'server';

export class LoginError extends Error {
  constructor(
    public readonly reason: LoginFailureReason,
    public readonly status = 0,
    message = 'Login failed',
  ) {
    super(message);
    this.name = 'LoginError';
  }
}

const LOGIN_TIMEOUT_MS = 8_000;

const URL = environment.API_URL || '';
const URL2 = environment.API2_URL || environment.API_URL || '';

const TOKEN_KEY = 'vesselToken2';
const OLD_TOKEN_KEY = 'vesselToken';
const USERNAME_KEY = 'username';
const USER_KEY = 'user';
const SITES_KEY = 'sites';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  redirectUrl = '';

  constructor(private http: HttpClient) {}

  async login(username: string, password: string): Promise<boolean> {
    if (!username || !password) {
      return false;
    }

    const body = new HttpParams()
      .set('grant_type', 'password')
      .set('username', username)
      .set('password', password);

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
    });

    try {
      const res: any = await firstValueFrom(
        this.http
          .post(`${URL}/token`, body.toString(), { headers })
          .pipe(timeout(LOGIN_TIMEOUT_MS)),
      );

      const token = res?.access_token || res?.AccessToken || res?.token || '';

      if (!token) {
        return false;
      }

      localStorage.setItem(OLD_TOKEN_KEY, token);
      localStorage.setItem(USERNAME_KEY, username);

      return true;
    } catch (err) {
      console.error('[AuthService] login error:', err);
      return false;
    }
  }

  async login2(username: string, password: string): Promise<boolean> {
    if (!username || !password) {
      throw new LoginError('invalid_credentials', 400, 'Username and password are required.');
    }

    this.clearLoginSession();

    try {
      const res: any = await firstValueFrom(
        this.http
          .post(`${URL2}/authen`, {
            username,
            password,
          })
          .pipe(timeout(LOGIN_TIMEOUT_MS)),
      );

      const token =
        res?.Access?.Token ||
        res?.Access?.access_token ||
        res?.access?.token ||
        res?.access_token ||
        res?.accessToken ||
        res?.Token ||
        res?.token ||
        res?.data?.token ||
        res?.data?.access_token ||
        '';

      if (!token) {
        const backendMessage = String(
          res?.message || res?.Message || res?.error_description || res?.error || '',
        );

        const rejected =
          res?.success === false ||
          res?.authenticated === false ||
          res?.isAuthenticated === false ||
          /invalid|incorrect|unauthori[sz]ed|credential|password/i.test(backendMessage);

        throw new LoginError(
          rejected ? 'invalid_credentials' : 'invalid_response',
          200,
          backendMessage || 'The login server returned no access token.',
        );
      }

      localStorage.setItem(TOKEN_KEY, String(token));
      localStorage.setItem(USERNAME_KEY, username);

      const user = res?.User ||
        res?.user ||
        res?.Access?.User ||
        res?.Access?.user || {
          username,
        };

      localStorage.setItem(USER_KEY, JSON.stringify(user));

      const sites =
        res?.Sites ||
        res?.sites ||
        res?.User?.Sites ||
        res?.User?.sites ||
        res?.user?.Sites ||
        res?.user?.sites ||
        res?.Access?.Sites ||
        res?.Access?.sites ||
        [];

      localStorage.setItem(SITES_KEY, JSON.stringify(sites));

      return true;
    } catch (error: unknown) {
      const loginError = this.normalizeLoginError(error);

      console.warn('[AuthService] Login failed:', {
        reason: loginError.reason,
        status: loginError.status,
      });

      throw loginError;
    }
  }

  async loginAndGetRedirect(username: string, password: string): Promise<string> {
    const success = await this.login2(username, password);

    if (!success) {
      return '';
    }

    const redirect = this.redirectUrl;

    this.redirectUrl = '';

    if (redirect && redirect !== '/login' && redirect !== '/notfound' && redirect !== '/main') {
      return redirect;
    }

    const preferredPage = localStorage.getItem('fleet-default-landing-page') || 'overview';
    const allowedPages = new Set([
      'overview',
      'realtime',
      'data-logger',
      'chart',
      'diagram',
      'alerts',
    ]);
    return `/main/${allowedPages.has(preferredPage) ? preferredPage : 'overview'}`;
  }

  async tryLogin(): Promise<boolean> {
    const token = this.getToken();

    if (!token) {
      return false;
    }

    try {
      const res: any = await firstValueFrom(
        this.http.post(`${URL}/api/users/trytologin`, null, {
          headers: this.getAuthHeaders(),
        }),
      );

      if (res) {
        const user = res?.User || res?.user || res;

        if (user) {
          localStorage.setItem(USER_KEY, JSON.stringify(user));
        }

        const sites =
          res?.Sites ||
          res?.sites ||
          res?.User?.Sites ||
          res?.User?.sites ||
          res?.user?.Sites ||
          res?.user?.sites ||
          [];

        if (Array.isArray(sites)) {
          localStorage.setItem(SITES_KEY, JSON.stringify(sites));
        }
      }

      return true;
    } catch (err) {
      console.error('[AuthService] tryLogin error:', err);
      return false;
    }
  }

  private normalizeLoginError(error: unknown): LoginError {
    if (error instanceof LoginError) {
      return error;
    }

    if (
      error instanceof TimeoutError ||
      (error as { name?: string } | null)?.name === 'TimeoutError'
    ) {
      return new LoginError('timeout', 0, 'The login request timed out.');
    }

    const status = Number((error as { status?: number } | null)?.status ?? 0);

    if (status === 400 || status === 401 || status === 403) {
      return new LoginError(
        'invalid_credentials',
        status,
        'The username or password is incorrect.',
      );
    }

    if (status === 0) {
      return new LoginError('network', status, 'Unable to connect to the login server.');
    }

    return new LoginError('server', status, 'The login server returned an error.');
  }

  private clearLoginSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(OLD_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(SITES_KEY);
  }

  getToken(): string {
    return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(OLD_TOKEN_KEY) || '';
  }

  getUsername(): string {
    return localStorage.getItem(USERNAME_KEY) || '';
  }

  getUser(): string {
    const username = localStorage.getItem(USERNAME_KEY);

    if (username) {
      return username;
    }

    const rawUser = localStorage.getItem(USER_KEY);

    if (!rawUser) {
      return '';
    }

    try {
      const user = JSON.parse(rawUser);

      return (
        user?.username ||
        user?.Username ||
        user?.userName ||
        user?.UserName ||
        user?.name ||
        user?.Name ||
        ''
      );
    } catch {
      return '';
    }
  }

  getSites(): string[] {
    const rawSites = localStorage.getItem(SITES_KEY);

    if (!rawSites) {
      return [];
    }

    try {
      const sites = JSON.parse(rawSites);

      if (!Array.isArray(sites)) {
        return [];
      }

      return sites
        .map((site: any) => {
          if (typeof site === 'string') {
            return site;
          }

          return (
            site?.id ||
            site?.Id ||
            site?.siteId ||
            site?.SiteId ||
            site?.name ||
            site?.Name ||
            site?.siteName ||
            site?.SiteName ||
            ''
          );
        })
        .filter((site: string) => site.length > 0);
    } catch {
      return [];
    }
  }

  isLoggedIn(): boolean {
    return this.getToken().trim().length > 0;
  }

  getAuthHeaders(): HttpHeaders {
    const token = this.getToken();

    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(OLD_TOKEN_KEY);
    localStorage.removeItem(USERNAME_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(SITES_KEY);

    this.redirectUrl = '';
  }
}
