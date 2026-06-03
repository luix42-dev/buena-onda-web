import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { isStudioAuthorized, unauthorizedStudioResponse } from '@/lib/studio-auth'

export const dynamic = 'force-dynamic'

const SETTINGS_KEY = 'track_labels'

async function getLabels(supabase: Awaited<ReturnType<typeof createServiceClient>>): Promise<Record<string, string>> {
  const { data } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', SETTINGS_KEY)
    .single()
  if (!data?.value || typeof data.value !== 'object') return {}
  return data.value as Record<string, string>
}

// GET — returns { [filename]: displayName }
export async function GET(request: NextRequest) {
  if (!(await isStudioAuthorized(request))) return unauthorizedStudioResponse()
  const supabase = await createServiceClient()
  return NextResponse.json(await getLabels(supabase))
}

// PATCH { fileName, displayName } — upserts one label
export async function PATCH(request: NextRequest) {
  if (!(await isStudioAuthorized(request))) return unauthorizedStudioResponse()

  const { fileName, displayName } = await request.json()
  if (!fileName || !displayName) {
    return NextResponse.json({ error: 'fileName and displayName required' }, { status: 400 })
  }

  const supabase = await createServiceClient()
  const labels = await getLabels(supabase)
  labels[fileName] = displayName

  const { error } = await supabase
    .from('site_settings')
    .upsert({ key: SETTINGS_KEY, value: labels }, { onConflict: 'key' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE { fileName } — removes label and deletes from Supabase storage
export async function DELETE(request: NextRequest) {
  if (!(await isStudioAuthorized(request))) return unauthorizedStudioResponse()

  const { fileName } = await request.json()
  if (!fileName) return NextResponse.json({ error: 'fileName required' }, { status: 400 })

  const supabase = await createServiceClient()

  const { error: storageError } = await supabase.storage.from('audio').remove([fileName])
  if (storageError) return NextResponse.json({ error: storageError.message }, { status: 500 })

  // Clean up label (best-effort)
  const labels = await getLabels(supabase)
  if (labels[fileName]) {
    delete labels[fileName]
    await supabase.from('site_settings').upsert({ key: SETTINGS_KEY, value: labels }, { onConflict: 'key' })
  }

  return NextResponse.json({ ok: true })
}
