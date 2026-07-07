import { inject, Injectable } from '@angular/core';
import { HttpService } from './http.service';
import { Router } from '@angular/router';
import { AuthRespondModel } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private http = inject(HttpService);
    private router = inject(Router);
    private tokenKey = 'token';

    isLoggedIn(): boolean {
        return !!localStorage.getItem(this.tokenKey);
    }

    getToken(): string | null {
        return localStorage.getItem(this.tokenKey);
    }

    getUser(): string | null {
        return localStorage.getItem('user');
    }

    getRole(): string | null {
        return localStorage.getItem('role');
    }

    getSites(): string[] | null {
        return localStorage.getItem('sites') ? JSON.parse(localStorage.getItem('sites') || '[]') : [];
    }

    getPages(): string[] | null {
        return localStorage.getItem('pages') ? JSON.parse(localStorage.getItem('pages') || '[]') : [];
    }

    async login(username: string, password: string) {
        try {
            const result: AuthRespondModel = await this.http.authentication(username, password);
            if(result && result.Access.Token){
                localStorage.setItem('token', result.Access.Token);
                localStorage.setItem('refreshtoken', result?.Access?.RefreshToken??'');
                localStorage.setItem('role', result?.Access?.Role??'');
                localStorage.setItem('user', username);
                // let pageAccess = result.Access.Pages.map(x => {
                //     const key = Object.keys(x)[0];
                //     return x[key] ? key.toLowerCase() : null;
                // }).filter(x => x!=null);
                let pageAccess = result.Access.Pages??[];
                localStorage.setItem('pages', JSON.stringify(pageAccess));
                let siteList = result.Access.Sites??[];
                localStorage.setItem('sites', JSON.stringify(siteList));
                return {
                    success: true,
                    message: 'login success !'
                }
            } else {
                return {
                    success: false,
                    message: 'username or password is incorrect !'
                }
            }
        } catch (error: any) {
            return {
                success: false,
                message: error?.message
            }
        }
    }

    logout() {
        localStorage.clear();
        sessionStorage.clear();
        this.router.navigate(['/login']);
        //window.location.replace('https://solaris-insight.com/');
    }

    hasRole(role: string): boolean {
        const userRoles = ['administrator', 'user'];
        return userRoles.includes(role);
    }
}
