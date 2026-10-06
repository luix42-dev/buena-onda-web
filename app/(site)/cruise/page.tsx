import { createClient } from '@/lib/supabase/server'
import CruisePlayer, { type PlayerScene, type PlayerChannel } from './CruisePlayer'
import CruiseClient from './CruiseClient'
import PersistentPlayer from '@/components/ui/PersistentPlayer'
import { resolveCruiseCampaign } from '@/lib/cruise/campaigns'
import MiniMaxExperiment from '@/components/cruise/MiniMaxExperiment'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Buena Onda Cruise TV',
  description: 'An endless Miami-inspired drive, tuned to Buena Onda Radio.',
}

function publicBase() {
  return (process.env.R2_PUBLIC_URL ?? process.env.CF_R2_PUBLIC_URL ?? '').replace(/\/$/, '')
}

async function loadCruise(): Promise<{ scenes: PlayerScene[]; channels: PlayerChannel[] }> {
  try {
    const supabase = await createClient()
    const base = publicBase()

    const [scenesRes, channelsRes] = await Promise.all([
      supabase
        .from('cruise_scenes')
        .select('id, city, city_label, route_label, time_of_day, title, video_key, duration_seconds, sort')
        .eq('published', true)
        .order('sort', { ascending: true })
        .order('created_at', { ascending: true }),
      supabase
        .from('cruise_channels')
        .select('id, name, slug, track_keys, sort')
        .eq('published', true)
        .order('sort', { ascending: true })
        .order('created_at', { ascending: true }),
    ])

    if (scenesRes.error) {
      console.error('[site/cruise] Supabase cruise_scenes error:', scenesRes.error.message)
    }
    if (channelsRes.error) {
      console.error('[site/cruise] Supabase cruise_channels error:', channelsRes.error.message)
    }

    const scenes: PlayerScene[] = (scenesRes.data ?? [])
      .map(s => ({
        id: s.id,
        city: s.city,
        city_label: s.city_label,
        route_label: s.route_label ?? null,
        time_of_day: s.time_of_day,
        title: s.title,
        video_url: s.video_key ? `${base}/${s.video_key}` : null,
      }))

    const channels: PlayerChannel[] = (channelsRes.data ?? []).map(c => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      tracks: (Array.isArray(c.track_keys) ? c.track_keys : [])
        .filter((k: unknown): k is string => typeof k === 'string' && k.length > 0)
        .map((k: string) => ({ key: k, url: `${base}/${k}` })),
    }))

    return { scenes, channels }
  } catch (error) {
    console.error('[site/cruise] Failed to load cruise data:', error instanceof Error ? error.message : error)
    return { scenes: [], channels: [] }
  }
}

export default async function CruisePage({ searchParams }: { searchParams: { mode?: string; campaign?: string | string[] } }) {
  if (searchParams.mode === 'minimax-test') return <MiniMaxExperiment />
  if (searchParams.mode !== 'video') {
    const selection = resolveCruiseCampaign(searchParams.campaign)
    return <CruiseClient campaign={selection.campaign} campaignValid={selection.valid} />
  }
  const { scenes, channels } = await loadCruise()

  return <><a href="/cruise" style={{ display: 'block', padding: '16px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>Back to Cruise TV</a><CruisePlayer scenes={scenes} channels={channels} /><PersistentPlayer /></>
}
