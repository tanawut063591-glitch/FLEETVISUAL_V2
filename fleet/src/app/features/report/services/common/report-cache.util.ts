/**
 * Small bounded in-memory cache helper for Report services.
 *
 * Historical daily reports can be expensive (many historian tags), so keeping the
 * most recently viewed days makes back/forward navigation instant.  At the same
 * time, an unbounded Map would retain large report objects for the life of the SPA.
 * This helper removes expired entries and evicts the oldest entries once the cap
 * is reached.  It never persists telemetry to disk/browser storage.
 */
export function setBoundedReportCache<K, V extends { expiresAt: number }>(
  cache: Map<K, V>,
  key: K,
  value: V,
  maxEntries = 16,
): void {
  const now = Date.now();

  for (const [cachedKey, cachedValue] of cache) {
    if (!Number.isFinite(cachedValue.expiresAt) || cachedValue.expiresAt <= now) {
      cache.delete(cachedKey);
    }
  }

  // Refresh insertion order so the newest value is evicted last.
  cache.delete(key);
  cache.set(key, value);

  while (cache.size > maxEntries) {
    const oldest = cache.keys().next();
    if (oldest.done) break;
    cache.delete(oldest.value);
  }
}

/**
 * A service may live longer than a login session. Invalidate expensive in-memory
 * report values and in-flight lookups if the authenticated operator changes.
 * No token is written to disk or added to a request/cache key; the token is held
 * only by the service's ephemeral session marker for equality checks.
 * Call before reading either daily or period cache in each vessel adapter.
 */
export function resetReportCacheForAuthChange(
  marker: { token: string | null },
  ...caches: Array<{ clear(): void }>
): void {
  let token = '';
  if (typeof localStorage !== 'undefined') {
    try {
      token = localStorage.getItem('vesselToken2') || localStorage.getItem('vesselToken') || '';
    } catch {
      token = '';
    }
  }
  if (marker.token === token) return;
  marker.token = token;
  for (const cache of caches) cache.clear();
}
