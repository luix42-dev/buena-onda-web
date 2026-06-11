import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file     = formData.get('file') as File | null
  const folder   = (formData.get('folder') as string) || 'catalog'

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const ext      = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const ts       = Date.now()
  const path     = `${folder}/${ts}.${ext}`
  const arrayBuf = await file.arrayBuffer()
  const buffer   = Buffer.from(arrayBuf)

  let supabase: Awaited<ReturnType<typeof createServiceClient>>
  try {
    supabase = await createServiceClient()
  } catch {
    return NextResponse.json(
      { error: 'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and keys in .env.local.' },
      { status: 503 }
    )
  }

  const { error: uploadError } = await supabase.storage
    .from('catalog')
    .upload(path, buffer, {
      contentType: file.type,
      upsert:      false,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: urlData } = supabase.storage.from('catalog').getPublicUrl(path)

  return NextResponse.json({
    url:          urlData.publicUrl,
    storage_path: path,
  })
}
