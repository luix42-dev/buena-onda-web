import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { listRadioTracks } from '@/lib/radio'
import { mergeTrackMetadata, reorderTracks, renameTrackTitle, RADIO_META_KV_MISSING_MESSAGE } from '@/lib/radio-metadata'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RenamePayload = {
  key?: string
  title?: string
}

type ReorderPayload = {
  orderedKeys?: string[]
}

async function isAuthorized(request: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD?.trim()
  const adminCookie = request.cookies.get('bo_admin')?.value

  if (adminPassword && adminCookie === adminPassword) return true

  const allowedEmail = process.env.STUDIO_ALLOWED_EMAIL?.trim().toLowerCase()
  if (!allowedEmail) {
    return !adminPassword
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const email = user?.email?.trim().toLowerCase()
    return !!user && email === allowedEmail
  } catch {
    return false
  }
}

export async function GET() {
  try {
    const tracks = await mergeTrackMetadata(await listRadioTracks())

    return NextResponse.json(tracks, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    console.error('R2 list error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load tracks' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}

export async function PATCH(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: RenamePayload | ReorderPayload
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    if (Array.isArray((body as ReorderPayload).orderedKeys)) {
      const orderedKeys = (body as ReorderPayload).orderedKeys
        ?.filter((key): key is string => typeof key === 'string' && key.trim().length > 0)
        .map(key => key.trim())

      if (!orderedKeys || orderedKeys.length === 0) {
        return NextResponse.json({ error: 'orderedKeys is required' }, { status: 400 })
      }

      await reorderTracks(orderedKeys)
      return NextResponse.json({ ok: true, orderedKeys })
    }

    const renameBody = body as RenamePayload
    const key = renameBody.key?.trim()
    const title = renameBody.title?.trim()

    if (!key || !title) {
      return NextResponse.json({ error: 'key and title are required' }, { status: 400 })
    }

    await renameTrackTitle(key, title)
    return NextResponse.json({ ok: true, key, title })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update tracks'
    const status = message === RADIO_META_KV_MISSING_MESSAGE ? 503 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
