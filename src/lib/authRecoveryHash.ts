/**
 * Supabase implicit email links put tokens in the URL **fragment** only:
 * #access_token=...&refresh_token=...&type=recovery&...
 * Do not use `location.search` for this flow.
 */
export type ParsedAuthHash = {
  type: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  error: string | null;
  errorDescription: string | null;
};

export function parseAuthHashFragment(hash: string): ParsedAuthHash {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!raw) {
    return {type: null, accessToken: null, refreshToken: null, error: null, errorDescription: null};
  }
  const params = new URLSearchParams(raw);
  return {
    type: params.get('type'),
    accessToken: params.get('access_token'),
    refreshToken: params.get('refresh_token'),
    error: params.get('error'),
    errorDescription: params.get('error_description'),
  };
}

/** True when the fragment looks like a Supabase password-recovery implicit callback. */
export function isRecoveryImplicitHash(hash: string): boolean {
  const p = parseAuthHashFragment(hash);
  if (p.type !== 'recovery') return false;
  return Boolean(p.accessToken || p.error || p.errorDescription);
}
