/** Shared in-memory LRU/expiry helper. No browser storage or side effects. */
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

