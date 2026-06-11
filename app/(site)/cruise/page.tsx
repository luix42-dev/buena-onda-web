import { createClient } from '@/lib/supabase/server'
import CruisePlayer, { type PlayerScene, type PlayerChannel } from './CruisePlayer'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Cruise — Buena Onda',
  description: 'Time-reactive cruising scenes, synced to Miami time.',
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

    const scenes: PlayerScene[] = (scenesRes.data ?? [])
      .filter(s => typeof s.video_key === 'string' && s.video_key.length > 0)
      .map(s => ({
        id: s.id,
        city: s.city,
        city_label: s.city_label,
        route_label: s.route_label ?? null,
        time_of_day: s.time_of_day,
        title: s.title,
        video_url: `${base}/${s.video_key}`,
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
  } catch {
    return { scenes: [], channels: [] }
  }
}

export default async function CruisePage() {
  const { scenes, channels } = await loadCruise()

  return <CruisePlayer scenes={scenes} channels={channels} />
}
