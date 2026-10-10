/** Avenue and shared Studio use one fail-closed signed session. */
export { STUDIO_COOKIE, timingSafeEqualString, hasStudioAccess as hasCruiseStudioAccess } from '@/lib/studio-auth'

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
