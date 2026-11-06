/** Avenue and shared Studio use one fail-closed signed session. */
export { STUDIO_COOKIE, timingSafeEqualString, hasStudioAccess as hasCruiseStudioAccess } from '@/lib/studio-auth'
import { isStudioSameOrigin } from '@/lib/studio-auth'
import type { NextRequest } from 'next/server'

/**
 * Same-origin check for state-changing studio requests (defence in depth on top of the
 * SameSite=Lax session cookie). Requires an Origin header whose host matches the request host.
 */
export function isSameOrigin(headers: Headers, requestUrl: string) {
  return isStudioSameOrigin({ headers, url: requestUrl } as NextRequest)
}
