import { NextResponse } from 'next/server'
import type { Track } from '@/lib/radio'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function humanize(s: string) {
  return s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function parseName(name: string): Pick<Track, 'title' | 'artist'> {
  const base = name.replace(/\.mp3$/i, '')
  const parts = base.split('_')

  if (parts.length >= 3) {
    return { artist: humanize(parts[1]), title: humanize(parts.slice(2).join(' ')) }
  }

  if (parts.length === 2) {
    return { artist: humanize(parts[0]), title: humanize(parts[1]) }
  }

  return { artist: '', title: humanize(base) }
}

export async function GET() {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase.storage
      .from('audio')
      .list('', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'updated_at', order: 'desc' },
      })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    const tracks: Track[] = (data ?? [])
      .filter(file => {
        if (!file.name.toLowerCase().endsWith('.mp3')) return false
        return !file.name.startsWith('.')
      })
      .map(file => {
        const { data: publicUrl } = supabase.storage
          .from('audio')
          .getPublicUrl(file.name)

        return {
          ...parseName(file.name),
          src: publicUrl.publicUrl,
        }
      })

    return NextResponse.json(tracks, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    console.error('Supabase audio list error:', err)
    return NextResponse.json(
      { error: 'Failed to load tracks' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
