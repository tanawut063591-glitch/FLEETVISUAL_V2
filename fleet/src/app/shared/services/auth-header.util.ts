/** Client-side header formatting only. Backend must validate tokens and vessel scope. */
export function bearerAuthorization(rawToken: string | null | undefined): string {
  const token = String(rawToken || '').trim();
  if (!token) return '';
  return /^Bearer\s+/i.test(token) ? token : `Bearer ${token}`;
}
