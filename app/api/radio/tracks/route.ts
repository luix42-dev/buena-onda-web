import { NextResponse } from 'next/server'
import { listRadioTracks } from '@/lib/radio'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [tracks, supabase] = await Promise.all([
      listRadioTracks(),
      createServiceClient(),
    ])

    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'track_labels')
      .single()

    const labels: Record<string, string> =
      data?.value && typeof data.value === 'object'
        ? (data.value as Record<string, string>)
        : {}

    const merged = tracks.map(track => {
      const label = track.fileName ? labels[track.fileName] : undefined
      if (!label) return track
      return { ...track, title: label, artist: '' }
    })

    return NextResponse.json(merged, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load tracks'
    console.error('Radio tracks error:', err)
    return NextResponse.json(
      { error: message },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
