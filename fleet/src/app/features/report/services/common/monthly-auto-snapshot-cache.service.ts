import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { finalize, shareReplay, tap } from 'rxjs/operators';
import {
  MONTHLY_AUTO_CACHE_MAX_ENTRIES,
  monthlyAutoCacheKey,
  monthlyAutoCacheTtlMs,
} from './monthly-auto-snapshot-policy';

interface StoredValue { value: unknown; expiresAt: number; }

/**
 * Automatically reuses successfully loaded MONTHLY UI results for any vessel,
 * month or year. Works for the same Historian-first report calculation on every
 * calendar month and vessel, WITHOUT transforming a measurement.
 *
 * Cache is intentionally in-memory only: authenticated fleet data must not be
 * written into localStorage / IndexedDB by a browser-side performance feature.
 * Closing the tab or changing login naturally invalidates the cache.
 *
 * This is an optional client optimization, NOT a server-side precomputed archive.
 * The first request for each month needs Historian unless a valid session result already exists.
 */
@Injectable({ providedIn: 'root' })
export class MonthlyAutoSnapshotCacheService {
  private readonly results = new Map<string, StoredValue>();
  private readonly inFlight = new Map<string, Observable<unknown>>();
  private authMarker: string | null = null;

  /** The source is cold; don't subscribe until the result is requested. */
  getOrLoad<T>(
    vesselIdentity: string,
    start: Date,
    end: Date,
    source$: Observable<T>,
    forceRefresh: boolean,
    cacheable: (result: T) => boolean,
  ): Observable<T> {
    this.checkAuthSession();
    if (!vesselIdentity.trim() || !Number.isFinite(start.getTime()) ||
        !Number.isFinite(end.getTime())) return source$;

    const key = monthlyAutoCacheKey(vesselIdentity, start, end);
    if (forceRefresh) {
      this.results.delete(key);
      // A newer request supersedes the old one; it must not overwrite cache.
      this.inFlight.delete(key);
    } else {
      const cached = this.results.get(key);
      if (cached && cached.expiresAt > Date.now()) {
        // LRU for monthly report entries, bounded to 32 vessel-month pairs.
        this.results.delete(key);
        this.results.set(key, cached);
        return of(cached.value as T);
      }
      if (cached) this.results.delete(key);
      const running = this.inFlight.get(key);
      if (running) return running as Observable<T>;
    }

    let shared$: Observable<T>;
    shared$ = source$.pipe(
      tap((result: T) => {
        if (this.inFlight.get(key) !== shared$ || !cacheable(result)) return;
        const ttl = monthlyAutoCacheTtlMs(start, end);
        this.results.delete(key);
        this.results.set(key, { value: result, expiresAt: Date.now() + ttl });
        while (this.results.size > MONTHLY_AUTO_CACHE_MAX_ENTRIES) {
          const oldest = this.results.keys().next().value;
          if (oldest === undefined) break;
          this.results.delete(oldest);
        }
      }),
      finalize(() => {
        if (this.inFlight.get(key) === shared$) this.inFlight.delete(key);
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    this.inFlight.set(key, shared$);
    return shared$;
  }

  private checkAuthSession(): void {
    let marker = '';
    try {
      if (typeof localStorage !== 'undefined') {
        marker = localStorage.getItem('vesselToken2') || localStorage.getItem('vesselToken') || '';
      }
    } catch { marker = ''; }
    if (marker !== this.authMarker) {
      this.authMarker = marker;
      this.results.clear();
      this.inFlight.clear();
    }
  }
}
