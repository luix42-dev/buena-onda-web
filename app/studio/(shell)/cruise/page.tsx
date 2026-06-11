import { createServiceClient } from '@/lib/supabase/server'
import CruiseClient from './CruiseClient'

export const dynamic = 'force-dynamic'

async function loadCruiseData() {
  try {
    const supabase = await createServiceClient()

    const [scenesRes, channelsRes] = await Promise.all([
      supabase
        .from('cruise_scenes')
        .select('*')
        .order('sort', { ascending: true })
        .order('created_at', { ascending: false }),
      supabase
        .from('cruise_channels')
        .select('*')
        .order('sort', { ascending: true })
        .order('created_at', { ascending: false }),
    ])

    return {
      scenes:   scenesRes.data ?? [],
      channels: channelsRes.data ?? [],
    }
  } catch {
    return { scenes: [], channels: [] }
  }
}

export default async function CruisePage() {
  const { scenes, channels } = await loadCruiseData()

  return <CruiseClient initialScenes={scenes} initialChannels={channels} />
}
