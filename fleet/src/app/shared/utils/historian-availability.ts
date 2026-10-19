/**
 * Skip a recently failed optional reporting host until its probe cooldown
 * expires. The caller MUST still retry its full, source-consistent API2 bundle
 * and mark that data as unverified by the official reporting historian.
 */
export function shouldSkipFailedReportHost(
  state: 'unknown' | 'available' | 'unavailable',
  retryAfterMs: number,
  nowMs: number,
): boolean {
  return state === 'unavailable' &&
    Number.isFinite(retryAfterMs) &&
    Number.isFinite(nowMs) &&
    retryAfterMs > nowMs;
}
