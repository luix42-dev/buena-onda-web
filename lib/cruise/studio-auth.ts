/**
 * Fail-closed studio authorization for the Avenue moderation page and API.
 *
 * Unlike middleware.ts (which lets everyone in when STUDIO_PASSWORD is unset and does not cover
 * /api) and lib/studio-auth.ts hasStudioAccess (which allows access outside production when the
 * password is unset), this denies access whenever STUDIO_PASSWORD is not configured, in every
 * environment. The cookie is compared in constant time.
 */
export const STUDIO_COOKIE = 'studio_session'

/** Constant-time string comparison (length difference is folded into the result, not short-circuited). */
export function timingSafeEqualString(a: string, b: string) {
  const enc = new TextEncoder()
  const x = enc.encode(a), y = enc.encode(b)
  const len = Math.max(x.length, y.length)
  let diff = x.length ^ y.length
  for (let i = 0; i < len; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0)
  return diff === 0
}

export function hasCruiseStudioAccess(cookieValue: string | undefined | null) {
  const expected = process.env.STUDIO_PASSWORD?.trim()
  if (!expected || !cookieValue) return false
  return timingSafeEqualString(cookieValue, expected)
}

/**
 * Same-origin check for state-changing studio requests (defence in depth on top of the
 * SameSite=Lax session cookie). Requires an Origin header whose host matches the request host.
 */
export function isSameOrigin(headers: Headers, requestUrl: string) {
  const origin = headers.get('origin')
  if (!origin) return false
  try {
    const host = headers.get('x-forwarded-host') ?? headers.get('host') ?? new URL(requestUrl).host
    return new URL(origin).host === host
  } catch { return false }
}
