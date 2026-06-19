import type { Metadata } from 'next'
import Archive, { type ArchiveEpisode } from './_components/Archive'
import { createServiceClient } from '@/lib/supabase/server'
import type { Episode } from '@/types'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Radio',
  description: 'Curated mixes, live sessions, and field recordings from the house archive.',
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Unpublished'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function formatDuration(seconds: number | null | undefined) {
  if (seconds == null || Number.isNaN(seconds)) return '0:00'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
}

function mapEpisode(episode: Episode, index: number): ArchiveEpisode {
  return {
    id: episode.id,
    no: String(episode.episode_number ?? index + 1).padStart(2, '0'),
    title: episode.title,
    date: formatDate(episode.published_at ?? episode.created_at),
    duration: formatDuration(episode.duration),
    desc: episode.description ?? 'No description yet.',
    audioUrl: episode.audio_url ?? '',
  }
}

async function loadEpisodes() {
  try {
    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('episodes')
      .select('*')
      .eq('status', 'published')
      .order('episode_number', { ascending: false })
      .limit(50)

    if (error) throw error
    return ((data ?? []) as Episode[]).filter(episode => episode.audio_url).map(mapEpisode)
  } catch (error) {
    console.error('[site/radio] Failed to load episodes:', error instanceof Error ? error.message : error)
    return []
  }
}

export default async function RadioPage() {
  const episodes = await loadEpisodes()
  return <Archive episodes={episodes} />
}
