import { Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, catchError, of, switchMap, timer } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SelectivePreloadingStrategy implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
    if (!route.data?.['preload']) return of(null);

    const delayMs = Math.max(0, Number(route.data['preloadDelayMs']) || 0);
    return timer(delayMs).pipe(
      switchMap(() => load()),
      // A failed background preload must never block navigation.
      catchError(() => of(null)),
    );
  }
}
