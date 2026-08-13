import { Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, catchError, of, switchMap, timer } from 'rxjs';

import { AuthService } from '../../shared/services/auth.service';

type IdleWindow = Window & {
  requestIdleCallback?: (
    callback: () => void,
    options?: { timeout: number }
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

@Injectable({ providedIn: 'root' })
export class SelectivePreloadingStrategy implements PreloadingStrategy {





  private readonly authenticatedWarmupMs = 2_000;

  constructor(private authService: AuthService) {}

  preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
    if (!route.data?.['preload'] || !this.authService.isLoggedIn()) {
      return of(null);
    }

    const routeDelayMs = Math.max(
      0,
      Number(route.data['preloadDelayMs']) || 0
    );

    return timer(this.authenticatedWarmupMs + routeDelayMs).pipe(
      switchMap(() => this.waitForBrowserIdle()),
      switchMap(() => load()),

      catchError(() => of(null))
    );
  }

  private waitForBrowserIdle(): Observable<void> {
    return new Observable<void>((observer) => {
      if (typeof window === 'undefined') {
        observer.next();
        observer.complete();
        return;
      }

      const idleWindow = window as IdleWindow;
      let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
      let idleHandle: number | null = null;
      let completed = false;

      const complete = (): void => {
        if (completed) return;
        completed = true;
        observer.next();
        observer.complete();
      };

      if (typeof idleWindow.requestIdleCallback === 'function') {
        idleHandle = idleWindow.requestIdleCallback(complete, { timeout: 1_500 });
      } else {
        fallbackTimer = setTimeout(complete, 250);
      }

      return () => {
        if (fallbackTimer !== null) clearTimeout(fallbackTimer);
        if (
          idleHandle !== null &&
          typeof idleWindow.cancelIdleCallback === 'function'
        ) {
          idleWindow.cancelIdleCallback(idleHandle);
        }
      };
    });
  }
}
