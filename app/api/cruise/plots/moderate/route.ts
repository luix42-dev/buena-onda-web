import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { STUDIO_COOKIE, hasCruiseStudioAccess, isSameOrigin } from '@/lib/cruise/studio-auth'
import { MAX_PLOT } from '@/components/cruise/master/plots'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const Actor = z.string().trim().min(1).max(40).regex(/^[\p{L}\p{N} ._-]+$/u)
const Body = z.discriminatedUnion('action', [
  z.object({ action: z.enum(['approve', 'pull', 'restore', 'note']), plot: z.number().int().min(1).max(MAX_PLOT), session: z.string().max(255).nullish(), reason: z.string().max(500).nullish(), actor: Actor.optional() }),
  z.object({ action: z.literal('refund_resolved'), session: z.string().min(1).max(255), reason: z.string().max(500).nullish(), actor: Actor.optional() }),
])

/**
 * Studio-only Avenue moderation. Fails closed: requires STUDIO_PASSWORD to be configured and a
 * matching studio_session cookie (constant-time compare), plus a same-origin request.
 * Every action is applied and audited atomically by the database (cruise_plot_moderation).
 */
export async function POST(request: NextRequest) {
  if (!hasCruiseStudioAccess(request.cookies.get(STUDIO_COOKIE)?.value)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isSameOrigin(request.headers, request.url)) return NextResponse.json({ error: 'Cross-origin request refused' }, { status: 403 })
  let parsed
  try { parsed = Body.safeParse(await request.json()) } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  if (!parsed.success) return NextResponse.json({ error: 'Invalid moderation request' }, { status: 400 })
  const input = parsed.data
  // The studio uses one shared password, so the actor is an operator-entered label, not a verified identity.
  const actor = `studio:${input.actor ?? 'operator'}`

  let db
  try { db = createServiceRoleClient() } catch { return NextResponse.json({ error: 'Avenue unavailable' }, { status: 503 }) }
  const { data, error } = input.action === 'refund_resolved'
    ? await db.rpc('cruise_plot_resolve_refund', { p_session_id: input.session, p_actor: actor, p_note: input.reason ?? null })
    : await db.rpc('cruise_plot_moderate', { p_plot: input.plot, p_action: input.action, p_actor: actor, p_reason: input.reason ?? null, p_expected_session: input.session ?? null })
  if (error) {
    console.error('[cruise/moderate] RPC failed:', error.message)
    return NextResponse.json({ error: 'Moderation failed' }, { status: 500 })
  }
  const result = String(data)
  const status = result === 'ok' ? 200 : result === 'stale' ? 409 : result === 'not_found' ? 404 : 422
  return NextResponse.json({ result }, { status })
}
