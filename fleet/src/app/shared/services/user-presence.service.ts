import { HttpClient, HttpContext, HttpHeaders } from '@angular/common/http';
import { Injectable, OnDestroy } from '@angular/core';
import { Subscription, catchError, of, take, timer } from 'rxjs';

import { SKIP_AUTH_REDIRECT } from '../../core/interceptors/http-context.tokens';
import { AuthService } from './auth.service';
import { DatabaseApiConfigService } from './database-api-config.service';

@Injectable({ providedIn: 'root' })
export class UserPresenceService implements OnDestroy {
  private endpoint = '';
  private heartbeatSub?: Subscription;
  private started = false;
  private lastActivityAt = Date.now();
  private readonly sessionStorageKey = 'fleet-user-session-id';
  private readonly loginStorageKey = 'fleet-user-session-login-at';
  private readonly activityHandler = () => (this.lastActivityAt = Date.now());
  private readonly unloadHandler = () => this.sendBeaconLogout();

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private databaseConfig: DatabaseApiConfigService,
  ) {}

  start(): void {
    if (this.started || !this.auth.isLoggedIn()) return;
    this.started = true;
    this.lastActivityAt = Date.now();
    this.attachActivityListeners();

    this.databaseConfig.config$.pipe(take(1)).subscribe((config) => {
      if (!config.userSessions.enabled) return;
      this.endpoint = String(config.userSessions.url || '').replace(/\/+$/, '');
      if (!this.endpoint) return;

      this.heartbeatSub = timer(0, 60_000).subscribe(() => this.sendHeartbeat());
    });
  }

  stop(): void {
    this.heartbeatSub?.unsubscribe();
    this.heartbeatSub = undefined;
    this.detachActivityListeners();
    this.started = false;
  }

  signOut(): void {
    const endpoint = this.endpoint;
    const sessionId = this.getSessionId(false);
    if (endpoint && sessionId) {
      const context = new HttpContext().set(SKIP_AUTH_REDIRECT, true);
      this.http
        .post(
          `${endpoint}/logout`,
          { sessionId },
          { context, headers: this.authHeaders() },
        )
        .pipe(catchError(() => of(null)), take(1))
        .subscribe();
    }
    sessionStorage.removeItem(this.sessionStorageKey);
    sessionStorage.removeItem(this.loginStorageKey);
    this.stop();
  }

  ngOnDestroy(): void {
    this.stop();
  }

  private sendHeartbeat(): void {
    if (!this.endpoint || !this.auth.isLoggedIn()) return;
    const context = new HttpContext().set(SKIP_AUTH_REDIRECT, true);
    const payload = this.sessionPayload();
    this.http
      .post(`${this.endpoint}/heartbeat`, payload, {
        context,
        headers: this.authHeaders(),
      })
      .pipe(catchError(() => of(null)), take(1))
      .subscribe();
  }

  private sessionPayload(): Record<string, unknown> {
    const rawUser = this.readUser();
    const username = this.auth.getUser() || this.auth.getUsername() || 'Current user';
    const displayName = String(
      rawUser?.displayName ??
        rawUser?.DisplayName ??
        rawUser?.fullname ??
        rawUser?.fullName ??
        rawUser?.name ??
        rawUser?.Name ??
        username,
    );
    const role = String(
      rawUser?.role ?? rawUser?.Role ?? rawUser?.group ?? rawUser?.Group ?? 'User',
    );

    return {
      sessionId: this.getSessionId(true),
      username,
      displayName,
      role,
      loginAt: this.getLoginAt(),
      lastActiveAt: new Date(this.lastActivityAt).toISOString(),
      device: this.deviceLabel(),
      browser: this.browserLabel(),
    };
  }

  private getSessionId(create: boolean): string {
    let value = sessionStorage.getItem(this.sessionStorageKey) || '';
    if (!value && create) {
      value = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem(this.sessionStorageKey, value);
    }
    return value;
  }

  private getLoginAt(): string {
    let value = sessionStorage.getItem(this.loginStorageKey) || '';
    if (!value) {
      value = new Date().toISOString();
      sessionStorage.setItem(this.loginStorageKey, value);
    }
    return value;
  }

  private readUser(): any {
    try {
      return JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }

  private authHeaders(): HttpHeaders {
    return this.auth.getToken() ? this.auth.getAuthHeaders() : new HttpHeaders();
  }

  private deviceLabel(): string {
    if (typeof navigator === 'undefined') return 'Web browser';
    const agent = navigator.userAgent;
    if (/Android/i.test(agent)) return 'Android';
    if (/iPhone|iPad|iPod/i.test(agent)) return 'iOS';
    if (/Windows/i.test(agent)) return 'Windows';
    if (/Macintosh|Mac OS/i.test(agent)) return 'macOS';
    if (/Linux/i.test(agent)) return 'Linux';
    return 'Web browser';
  }

  private browserLabel(): string {
    if (typeof navigator === 'undefined') return '';
    const agent = navigator.userAgent;
    if (/Edg\//i.test(agent)) return 'Microsoft Edge';
    if (/Chrome\//i.test(agent)) return 'Google Chrome';
    if (/Firefox\//i.test(agent)) return 'Mozilla Firefox';
    if (/Safari\//i.test(agent) && !/Chrome\//i.test(agent)) return 'Safari';
    return agent;
  }

  private attachActivityListeners(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    for (const event of ['pointerdown', 'keydown', 'scroll', 'touchstart']) {
      document.addEventListener(event, this.activityHandler, { passive: true });
    }
    document.addEventListener('visibilitychange', this.activityHandler);
    window.addEventListener('beforeunload', this.unloadHandler);
  }

  private detachActivityListeners(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    for (const event of ['pointerdown', 'keydown', 'scroll', 'touchstart']) {
      document.removeEventListener(event, this.activityHandler);
    }
    document.removeEventListener('visibilitychange', this.activityHandler);
    window.removeEventListener('beforeunload', this.unloadHandler);
  }

  private sendBeaconLogout(): void {
    if (!this.endpoint || typeof navigator === 'undefined' || !navigator.sendBeacon) return;
    const sessionId = this.getSessionId(false);
    if (!sessionId) return;
    try {
      navigator.sendBeacon(
        `${this.endpoint}/logout`,
        new Blob([JSON.stringify({ sessionId })], { type: 'application/json' }),
      );
    } catch {}
  }
}
