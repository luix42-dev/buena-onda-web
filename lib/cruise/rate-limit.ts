/**
 * Best-effort, in-memory, per-key token bucket for the Avenue API routes.
 *
 * Honest limits: state lives in one server isolate/instance. Serverless and edge platforms run
 * many isolates and recycle them, so this only slows down a single noisy client hitting a warm
 * instance. It cannot stop a distributed attacker. The drive-by counter also has a DB-side
 * dedupe (cruise_plot_drive_bys); claims are ultimately protected by Stripe payment.
 * Works in both the Node.js and Edge runtimes (no Node APIs).
 */
export type RateLimiter = { take: (key: string, now?: number) => boolean; size: () => number }

export function createRateLimiter({ capacity, refillPerMinute, maxKeys = 5_000 }: { capacity: number; refillPerMinute: number; maxKeys?: number }): RateLimiter {
  const buckets = new Map<string, { tokens: number; at: number }>()
  const perMs = refillPerMinute / 60_000
  return {
    take(key, now = Date.now()) {
      let b = buckets.get(key)
      if (b) {
        b.tokens = Math.min(capacity, b.tokens + (now - b.at) * perMs); b.at = now
        buckets.delete(key) // re-insert to keep Map order = least recently used first
      } else {
        b = { tokens: capacity, at: now }
        if (buckets.size >= maxKeys) { const oldest = buckets.keys().next().value; if (oldest !== undefined) buckets.delete(oldest) }
      }
      buckets.set(key, b)
      if (b.tokens < 1) return false
      b.tokens -= 1
      return true
    },
    size: () => buckets.size,
  }
}

/**
 * Client IP for rate limiting. On Vercel the platform sets x-forwarded-for / x-real-ip; elsewhere
 * these headers are client-controlled and can be spoofed, which only weakens a best-effort limiter.
 */
export function clientIp(headers: Headers) {
  const fwd = headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return (fwd || headers.get('x-real-ip')?.trim() || 'unknown').slice(0, 64)
}

/**
 * Salted, daily-rotating client hash for drive-by dedupe: HMAC-SHA256(secret, UTC day | IP | UA).
 * The raw IP and user agent are never stored or logged. The secret is CRUISE_DRIVEBY_SALT, falling
 * back to SUPABASE_SERVICE_ROLE_KEY so dedupe works without extra setup (the key is only used as
 * HMAC key material and never leaves the server). Returns null if no secret is configured.
 */
export async function driveByClientHash(ip: string, userAgent: string, now = new Date()) {
  const secret = process.env.CRUISE_DRIVEBY_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) return null
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const day = now.toISOString().slice(0, 10)
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`cruise-drive-by|${day}|${ip}|${userAgent.slice(0, 256)}`))
  return Array.from(new Uint8Array(sig), b => b.toString(16).padStart(2, '0')).join('')
}
