import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, shareReplay, switchMap, throwError, timeout } from 'rxjs';

import { environment } from '../../../environments/environment';
import { SKIP_AUTH_REDIRECT } from '../../core/interceptors/http-context.tokens';
import { AuthService } from './auth.service';
import { UserAccessRole, UserAccountStatus } from '../models/settings.model';

export type UserAccountHttpMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface PublicConfig {
  UrlApi?: string;
  UrlApiAuthen?: string;
  DatabaseApiUrl?: string;
}

export interface UserAccountApiConfig {
  enabled?: boolean;
  timeoutMs?: number;
  createUrl?: string;
  updateUrl?: string;
  resetPasswordUrl?: string;
  deleteUrl?: string;
  updateMethod?: UserAccountHttpMethod;
  resetPasswordMethod?: UserAccountHttpMethod;
  requireHttps?: boolean;
}

export interface ResolvedUserAccountApiConfig {
  enabled: boolean;
  timeoutMs: number;
  createUrl: string;
  updateUrl: string;
  resetPasswordUrl: string;
  deleteUrl: string;
  updateMethod: UserAccountHttpMethod;
  resetPasswordMethod: UserAccountHttpMethod;
  requireHttps: boolean;
  secureTransport: boolean;
}

export interface CreateUserAccountRequest {
  username: string;
  password: string;
  displayName: string;
  email: string;
  role: UserAccessRole;
  status: UserAccountStatus;
}

export interface UpdateUserAccountRequest {
  username: string;
  displayName: string;
  email: string;
  role: UserAccessRole;
  status: UserAccountStatus;
}

export interface UserAccountOperationResult {
  id: string;
  username: string;
  message: string;
  raw?: unknown;
}

@Injectable({ providedIn: 'root' })
export class UserAccountService {
  readonly config$: Observable<ResolvedUserAccountApiConfig>;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) {
    this.config$ = forkJoin({
      account: this.http
        .get<UserAccountApiConfig>('/user-account-api.config.json')
        .pipe(catchError(() => of({} as UserAccountApiConfig))),
      publicConfig: this.http
        .get<PublicConfig>('/config.json')
        .pipe(catchError(() => of({} as PublicConfig))),
    }).pipe(
      map(({ account, publicConfig }) => this.resolveConfig(account, publicConfig)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
  }

  createAccount(request: CreateUserAccountRequest): Observable<UserAccountOperationResult> {
    return this.config$.pipe(
      switchMap((config) => {
        this.assertOperation(config, config.createUrl, 'Create user account');
        // Password exists only in this in-memory request body. It is never logged or persisted.
        const payload = {
          username: request.username,
          password: request.password,
          displayName: request.displayName,
          fullname: request.displayName,
          email: request.email,
          role: request.role,
          Group: this.legacyGroup(request.role),
          status: request.status,
          pageAccess: [],
          siteAccess: [],
        };
        return this.http.post(config.createUrl, payload, {
          context: this.context(),
          headers: this.authService.getAuthHeaders(),
        }).pipe(
          timeout(config.timeoutMs),
          map((response) => this.normalizeResult(response, request.username)),
          catchError((error) => this.operationError('Unable to create the login account.', error)),
        );
      }),
    );
  }

  updateAccount(
    accountId: string,
    request: UpdateUserAccountRequest,
  ): Observable<UserAccountOperationResult> {
    return this.config$.pipe(
      switchMap((config) => {
        const url = this.resolveActionUrl(config.updateUrl, accountId, request.username);
        this.assertOperation(config, url, 'Update user account');
        const payload = {
          username: request.username,
          displayName: request.displayName,
          fullname: request.displayName,
          email: request.email,
          role: request.role,
          Group: this.legacyGroup(request.role),
          status: request.status,
        };
        return this.http.request(config.updateMethod, url, {
          body: payload,
          context: this.context(),
          headers: this.authService.getAuthHeaders(),
        }).pipe(
          timeout(config.timeoutMs),
          map((response) => this.normalizeResult(response, request.username, accountId)),
          catchError((error) => this.operationError('Unable to update the login account.', error)),
        );
      }),
    );
  }

  resetPassword(accountId: string, username: string, newPassword: string): Observable<UserAccountOperationResult> {
    return this.config$.pipe(
      switchMap((config) => {
        const url = this.resolveActionUrl(config.resetPasswordUrl, accountId, username);
        this.assertOperation(config, url, 'Reset password');
        const payload = {
          username,
          newPassword,
          newpassword: newPassword,
          forceChangeOnNextLogin: false,
        };
        return this.http.request(config.resetPasswordMethod, url, {
          body: payload,
          context: this.context(),
          headers: this.authService.getAuthHeaders(),
        }).pipe(
          timeout(config.timeoutMs),
          map((response) => this.normalizeResult(response, username, accountId)),
          catchError((error) => this.operationError('Unable to reset the password.', error)),
        );
      }),
    );
  }

  deleteAccount(accountId: string, username: string): Observable<UserAccountOperationResult> {
    return this.config$.pipe(
      switchMap((config) => {
        const url = this.resolveActionUrl(config.deleteUrl, accountId, username);
        this.assertOperation(config, url, 'Delete user account');
        return this.http.delete(url, {
          context: this.context(),
          headers: this.authService.getAuthHeaders(),
        }).pipe(
          timeout(config.timeoutMs),
          map((response) => this.normalizeResult(response, username, accountId)),
          catchError((error) => this.operationError('Unable to delete the login account.', error)),
        );
      }),
    );
  }

  private resolveConfig(
    value: UserAccountApiConfig,
    publicConfig: PublicConfig,
  ): ResolvedUserAccountApiConfig {
    const createUrl = this.resolveUrl(value.createUrl || '', publicConfig);
    const updateUrl = this.resolveUrl(value.updateUrl || '', publicConfig);
    const resetPasswordUrl = this.resolveUrl(value.resetPasswordUrl || '', publicConfig);
    const deleteUrl = this.resolveUrl(value.deleteUrl || '', publicConfig);
    const enabled = value.enabled === true && !!createUrl;
    const secureTransport = [createUrl, updateUrl, resetPasswordUrl, deleteUrl]
      .filter(Boolean)
      .every((url) => this.isSecureUrl(url));

    return {
      enabled,
      timeoutMs: this.clamp(Number(value.timeoutMs) || 8000, 2000, 30000),
      createUrl,
      updateUrl,
      resetPasswordUrl,
      deleteUrl,
      updateMethod: value.updateMethod === 'PATCH' ? 'PATCH' : 'PUT',
      resetPasswordMethod: value.resetPasswordMethod === 'PUT' || value.resetPasswordMethod === 'PATCH'
        ? value.resetPasswordMethod
        : 'POST',
      requireHttps: value.requireHttps !== false,
      secureTransport,
    };
  }

  private assertOperation(
    config: ResolvedUserAccountApiConfig,
    url: string,
    operation: string,
  ): ResolvedUserAccountApiConfig {
    if (!config.enabled) {
      throw new Error('User Account API is disabled. Enable it in public/user-account-api.config.json.');
    }
    if (!url) {
      throw new Error(`${operation} endpoint is not configured.`);
    }
    if (config.requireHttps && !this.isSecureUrl(url)) {
      throw new Error(`${operation} is blocked because the endpoint is not HTTPS.`);
    }
    return config;
  }

  private resolveActionUrl(template: string, id: string, username: string): string {
    return String(template || '')
      .replaceAll('{id}', encodeURIComponent(id || username))
      .replaceAll('{username}', encodeURIComponent(username));
  }

  private resolveUrl(template: string, config: PublicConfig): string {
    const trim = (value: string) => String(value || '').replace(/\/+$/, '');
    const resolved = String(template || '')
      .replaceAll('{API_URL}', trim(environment.API_URL || ''))
      .replaceAll('{API2_URL}', trim(environment.API2_URL || environment.API_URL || ''))
      .replaceAll('{CONFIG_API_URL}', trim(config.UrlApi || ''))
      .replaceAll('{AUTH_API_URL}', trim(config.UrlApiAuthen || config.UrlApi || ''))
      .replaceAll('{DATABASE_API_URL}', trim(config.DatabaseApiUrl || config.UrlApi || ''))
      .replace(/([^:]\/)\/{2,}/g, '$1');
    return resolved.includes('{') ? '' : resolved;
  }

  private normalizeResult(
    response: unknown,
    username: string,
    fallbackId = '',
  ): UserAccountOperationResult {
    const value = (response || {}) as Record<string, unknown>;
    const success = value['success'] ?? value['Success'];
    if (success === false) {
      throw new Error(String(value['message'] ?? value['Message'] ?? 'The user account operation was rejected.'));
    }
    const data = (value['data'] ?? value['Data'] ?? value['user'] ?? value['User'] ?? value) as Record<string, unknown>;
    return {
      id: String(data?.['_id'] ?? data?.['id'] ?? data?.['Id'] ?? (fallbackId || username)),
      username: String(data?.['username'] ?? data?.['Username'] ?? username),
      message: String(value['message'] ?? value['Message'] ?? 'User account operation completed.'),
      raw: response,
    };
  }

  private operationError(prefix: string, error: unknown): Observable<never> {
    const httpError = error as HttpErrorResponse;
    const backendMessage = String(
      httpError?.error?.message ??
      httpError?.error?.Message ??
      httpError?.error?.error ??
      httpError?.message ??
      '',
    ).trim();
    const status = Number(httpError?.status || 0);
    const suffix = status ? ` (HTTP ${status})` : '';
    return throwError(() => new Error(`${backendMessage || prefix}${suffix}`));
  }

  private context(): HttpContext {
    return new HttpContext().set(SKIP_AUTH_REDIRECT, true);
  }

  private legacyGroup(role: UserAccessRole): string {
    if (role === 'administrator') return 'Administrator';
    if (role === 'operator') return 'Operator';
    if (role === 'viewer') return 'Viewer';
    return 'Custom';
  }

  private isSecureUrl(url: string): boolean {
    if (!url) return true;
    if (url.startsWith('/') || url.startsWith('https://')) return true;
    return /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:\/|$)/i.test(url);
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }
}
