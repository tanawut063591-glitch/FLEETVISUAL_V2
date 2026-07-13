import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

// URL API จาก environment
const URL = environment.API_URL || '';
const URL2 = environment.API2_URL || environment.API_URL || '';

// key สำหรับเก็บข้อมูลใน localStorage
const TOKEN_KEY = 'vesselToken2';
const OLD_TOKEN_KEY = 'vesselToken';
const USERNAME_KEY = 'username';
const PASSWORD_KEY = 'password';
const USER_KEY = 'user';
const SITES_KEY = 'sites';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  // เก็บ URL ที่ต้องการกลับไปหลัง Login สำเร็จ
  redirectUrl = '';

  constructor(private http: HttpClient) {}

  // Login แบบเก่า ใช้ API /token
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
        this.http.post(`${URL}/token`, body.toString(), { headers })
      );

      const token =
        res?.access_token ||
        res?.AccessToken ||
        res?.token ||
        '';

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

  // Login แบบใหม่ ใช้ API /authen
  async login2(username: string, password: string): Promise<boolean> {
    if (!username || !password) {
      return false;
    }

    try {
      const res: any = await firstValueFrom(
        this.http.post(`${URL2}/authen`, {
          username,
          password,
        })
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
        return false;
      }

      localStorage.setItem(TOKEN_KEY, String(token));
      localStorage.setItem(USERNAME_KEY, username);

      const user =
        res?.User ||
        res?.user ||
        res?.Access?.User ||
        res?.Access?.user ||
        {
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
    } catch (err) {
      console.error('[AuthService] login2 error:', err);
      return false;
    }
  }

  // Login แล้วคืน URL ที่ต้องไปต่อ
  async loginAndGetRedirect(
    username: string,
    password: string
  ): Promise<string> {
    const success = await this.login2(username, password);

    if (!success) {
      return '';
    }

    /**
     * ถ้า guard เคยบันทึกหน้าที่ต้องไปไว้ และไม่ใช่หน้า login ให้กลับไปหน้านั้น
     * ถ้าไม่มี ให้ไปหน้า Main
     */
    const redirect = this.redirectUrl;

    this.redirectUrl = '';

    if (
      redirect &&
      redirect !== '/login' &&
      redirect !== '/notfound' &&
      redirect !== '/main'
    ) {
      return redirect;
    }

    return '/main/overview';
  }

  // เช็กว่า token เดิมยังใช้ได้ไหม
  async tryLogin(): Promise<boolean> {
    const token = this.getToken();

    if (!token) {
      return false;
    }

    try {
      const res: any = await firstValueFrom(
        this.http.post(`${URL}/api/users/trytologin`, null, {
          headers: this.getAuthHeaders(),
        })
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
      return this.tryLoginUserPass();
    }
  }

  // ลอง Login ใหม่ด้วย username/password เดิม
  async tryLoginUserPass(): Promise<boolean> {
    const username = localStorage.getItem(USERNAME_KEY);
    const password = localStorage.getItem(PASSWORD_KEY);

    if (!username || !password) {
      return false;
    }

    return this.login(username, password);
  }

  // ดึง token ปัจจุบัน
  getToken(): string {
    return (
      localStorage.getItem(TOKEN_KEY) ||
      localStorage.getItem(OLD_TOKEN_KEY) ||
      ''
    );
  }

  // ดึง username ที่เก็บไว้
  getUsername(): string {
    return localStorage.getItem(USERNAME_KEY) || '';
  }

  // token.interceptor.ts เรียกใช้ตัวนี้
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

  // filtersite-pipe.ts เรียกใช้ตัวนี้
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

  // เช็กว่า Login อยู่ไหม
  isLoggedIn(): boolean {
    return this.getToken().trim().length > 0;
  }

  // Header สำหรับยิง API
  getAuthHeaders(): HttpHeaders {
    const token = this.getToken();

    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  // Logout และลบข้อมูลออกจาก localStorage
  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(OLD_TOKEN_KEY);
    localStorage.removeItem(USERNAME_KEY);
    localStorage.removeItem(PASSWORD_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(SITES_KEY);

    this.redirectUrl = '';
  }
}