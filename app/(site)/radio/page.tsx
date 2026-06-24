import type { Metadata } from 'next'
import { createPublicClient } from '@/lib/supabase/public'
import BuenaOndaArchive from './_components/Archive'

export const metadata: Metadata = {
  title: 'Radio',
  description: 'Curated mixes, live sessions, and field recordings from the house archive.',
}

export const revalidate = 300

type EpisodeRow = {
  id: string
  title: string
  description: string | null
  audio_url: string | null
  audio_key: string | null
  duration: number | null
  episode_number: number | null
  published_at: string | null
  created_at: string
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
  if (seconds == null || Number.isNaN(seconds)) return ''
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  if (hours > 0) {
    return hours + ':' + String(minutes).padStart(2, '0') + ':' + String(remainingSeconds).padStart(2, '0')
  }

  return minutes + ':' + String(remainingSeconds).padStart(2, '0')
}

function buildEpisodeAudioUrl(row: EpisodeRow) {
  const publicBase = process.env.R2_EPISODES_PUBLIC_URL
  if (row.audio_key && publicBase) {
    return publicBase.replace(/\/$/, '') + '/' + row.audio_key.replace(/^\//, '')
  }

  return row.audio_url ?? ''
}

async function loadEpisodes() {
  try {
    const supabase = createPublicClient()
    const { data, error } = await supabase
      .from('episodes')
      .select('id,title,description,audio_url,audio_key,duration,episode_number,published_at,created_at,status')
      .eq('published', true)
      .order('episode_number', { ascending: false })

    if (error) throw error
    return (data ?? []) as EpisodeRow[]
  } catch (error) {
    console.error('[site/radio] Failed to load episodes:', error instanceof Error ? error.message : error)
    return []
  }
}

export default async function RadioPage() {
  const rows = await loadEpisodes()
  const episodes = rows.map((row, index) => ({
    id: row.id,
    no: String(row.episode_number ?? index + 1).padStart(2, '0'),
    title: row.title,
    date: formatDate(row.published_at ?? row.created_at),
    duration: formatDuration(row.duration),
    desc: row.description ?? 'No description yet.',
    audioUrl: buildEpisodeAudioUrl(row),
  }))

  return <BuenaOndaArchive episodes={episodes} />
}
