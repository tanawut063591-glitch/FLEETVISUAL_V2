import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';

const API_URL = environment.API_URL;
const API2_URL = environment.API2_URL;

const TOKEN_KEY = 'vesselToken2';
const OLD_TOKEN_KEY = 'vesselToken';
const USERNAME_KEY = 'username';
const PAGES_KEY = 'pages';

interface OldLoginResponse {
  access_token?: string;
}

interface NewLoginResponse {
  Access?: {
    Token?: string;
    Pages?: any[];
    pages?: any[];
  };
  Pages?: any[];
  pages?: any[];
  Data?: {
    Pages?: any[];
    pages?: any[];
  };
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  redirectUrl = '';

  constructor(private http: HttpClient) {}

  async login(username: string, password: string): Promise<boolean> {
    if (!username?.trim() || !password?.trim()) {
      return false;
    }

    const body = new URLSearchParams();
    body.set('grant_type', 'password');
    body.set('username', username);
    body.set('password', password);

    try {
      const res = await firstValueFrom(
        this.http.post<OldLoginResponse>(`${API_URL}/token`, body.toString(), {
          headers: new HttpHeaders({
            'Content-Type': 'application/x-www-form-urlencoded',
          }),
        })
      );

      if (res?.access_token) {
        localStorage.setItem(OLD_TOKEN_KEY, res.access_token);
        localStorage.setItem(USERNAME_KEY, username);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }

  async login2(username: string, password: string): Promise<boolean> {
    if (!username?.trim() || !password?.trim()) {
      return false;
    }

    const body = {
      username,
      password,
    };

    try {
      const res = await firstValueFrom(
        this.http.post<NewLoginResponse>(`${API2_URL}/authen`, body)
      );

      const token = res?.Access?.Token;

      if (!token) {
        return false;
      }

      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USERNAME_KEY, username);

      const pages = this.extractPages(res);
      if (pages.length > 0) {
        localStorage.setItem(PAGES_KEY, JSON.stringify(pages));
      } else {
        localStorage.setItem(PAGES_KEY, JSON.stringify(['overview', 'main']));
      }

      return true;
    } catch (error) {
      console.error('Login2 error:', error);
      return false;
    }
  }

  async loginAndGetRedirect(
    username: string,
    password: string
  ): Promise<string> {
    const success = await this.login2(username, password);

    if (!success) {
      return '';
    }

    return this.redirectUrl || '/main/overview';
  }

  async tryLogin(): Promise<boolean> {
    const token = this.getToken();

    if (!token) {
      return false;
    }

    try {
      const res = await firstValueFrom(
        this.http.post(`${API_URL}/api/users/trytologin`, null, {
          headers: this.getAuthHeaders(),
        })
      );

      return !!res;
    } catch (error) {
      console.error('Try login error:', error);
      return false;
    }
  }

  getToken(): string {
    return (
      localStorage.getItem(TOKEN_KEY) ||
      localStorage.getItem(OLD_TOKEN_KEY) ||
      ''
    );
  }

  getUsername(): string {
    return localStorage.getItem(USERNAME_KEY) || '';
  }

  getPages(): string[] {
    const pageStr = localStorage.getItem(PAGES_KEY);

    if (!pageStr) {
      return ['overview', 'main'];
    }

    try {
      const pages = JSON.parse(pageStr);

      if (!Array.isArray(pages)) {
        return ['overview', 'main'];
      }

      return pages
        .map((page: any) => {
          if (typeof page === 'string') {
            return page;
          }

          return page?.path || page?.name || page?.page || '';
        })
        .filter((page: string) => !!page);
    } catch (error) {
      console.error('Cannot parse pages:', error);
      return ['overview', 'main'];
    }
  }

  isLoggedIn(): boolean {
    return this.getToken().length > 0;
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
    localStorage.removeItem(PAGES_KEY);
    sessionStorage.removeItem('navigate');
  }

  private extractPages(res: NewLoginResponse): any[] {
    return (
      res?.Access?.Pages ||
      res?.Access?.pages ||
      res?.Pages ||
      res?.pages ||
      res?.Data?.Pages ||
      res?.Data?.pages ||
      []
    );
  }
}